import { NextResponse } from "next/server";
import { Resend } from "resend";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { KATEGORI_GERIYE_DONUK_SINIR } from "@/lib/types";
import { bugununTarihiTR } from "@/lib/tarih";

export const maxDuration = 60;

// Vercel Cron bu route'u çağırır (vercel.json'daki schedule'a göre).
// Rozet sistemi v2 ile birlikte hatırlatma da KATEGORİ BAZLI oldu: tek bir
// "3 gündür veri girmiyor" kuralı yerine, her kategorinin kendi eşiği var —
// konu/soru 3 gün, deneme 7 gün (KATEGORI_GERIYE_DONUK_SINIR ile birebir
// aynı, çünkü backdating penceresi kapandığında telafi de imkânsızlaşıyor).
// Bir öğrenci aynı anda birden fazla kategoride geride kalmışsa, her biri
// için AYRI bildirim gidiyor.
type KategoriAnahtar = "konu" | "soru" | "deneme";

const KATEGORI_TANIM: Record<KategoriAnahtar, {
  tablo: "konu_calismalar" | "soru_cozumleri" | "denemeler";
  deadlineKolonu: "son_hatirlatma_konu_deadline" | "son_hatirlatma_soru_deadline" | "son_hatirlatma_deneme_deadline";
  ad: string;
  ogrenciGovde: (gun: number) => string;
  veliBaslik: (gun: number) => string;
  veliGovde: (ad: string, gun: number) => string;
}> = {
  konu: {
    tablo: "konu_calismalar",
    deadlineKolonu: "son_hatirlatma_konu_deadline",
    ad: "Konu Çalışma",
    ogrenciGovde: (gun) => `${gun} gündür konu çalışması girmedin. SeFu Koç'a girip güncel verilerini ekle.`,
    veliBaslik: () => "Öğrenciniz konu verisi girmiyor!",
    veliGovde: (ad, gun) => `${ad} adlı öğrenciniz ${gun} gündür konu çalışması verisi girmedi.`,
  },
  soru: {
    tablo: "soru_cozumleri",
    deadlineKolonu: "son_hatirlatma_soru_deadline",
    ad: "Soru Çözümü",
    ogrenciGovde: (gun) => `${gun} gündür soru çözümü girmedin. SeFu Koç'a girip güncel verilerini ekle.`,
    veliBaslik: () => "Öğrenciniz soru çözümü girmiyor!",
    veliGovde: (ad, gun) => `${ad} adlı öğrenciniz ${gun} gündür soru çözümü verisi girmedi.`,
  },
  deneme: {
    tablo: "denemeler",
    deadlineKolonu: "son_hatirlatma_deneme_deadline",
    ad: "Deneme",
    ogrenciGovde: () => `Bu hafta deneme girişi yapmadın. SeFu Koç'a girip güncel verilerini ekle.`,
    veliBaslik: () => "Öğrenciniz bu hafta deneme girişi yapmadı!",
    veliGovde: (ad) => `${ad} adlı öğrenciniz bu hafta deneme sınavı girmedi.`,
  },
};

if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:destek@sgeducoach.app",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

function yetkiliMi(authHeader: string | null): boolean {
  const beklenen = (process.env.CRON_SECRET ?? "").trim();
  const gelen = (authHeader ?? "").replace(/^Bearer\s+/i, "").trim();
  return beklenen.length > 0 && gelen === beklenen;
}

function enSonTarih(mevcut: Map<string, number>, studentId: string, iso: string) {
  const t = new Date(iso).getTime();
  const onceki = mevcut.get(studentId);
  if (onceki === undefined || t > onceki) mevcut.set(studentId, t);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (!yetkiliMi(authHeader)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const now = new Date();
    let gonderilen = 0;
    const detaylar: string[] = [];

    const [
      { data: students, error: studentsError },
      { data: konular },
      { data: sorular },
      { data: denemeler },
      { data: veliBaglantilari },
      { data: pushAbonelikleri },
    ] = await Promise.all([
      admin.from("students").select(
        "id, created_at, son_hatirlatma_konu_deadline, son_hatirlatma_soru_deadline, son_hatirlatma_deneme_deadline, profiles!students_id_fkey(ad, email)",
      ),
      admin.from("konu_calismalar").select("student_id, created_at"),
      admin.from("soru_cozumleri").select("student_id, created_at"),
      admin.from("denemeler").select("student_id, created_at").eq("kaynak", "ogrenci"),
      admin.from("parent_students").select("student_id, parent_id, profiles!parent_students_parent_id_fkey(email)"),
      admin.from("push_subscriptions").select("id, profile_id, endpoint, p256dh, auth"),
    ]);

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    // Her kategori için ayrı "student_id -> en son giriş zamanı (ms)" haritası.
    const sonGirisMap: Record<KategoriAnahtar, Map<string, number>> = {
      konu: new Map(), soru: new Map(), deneme: new Map(),
    };
    for (const row of konular ?? []) enSonTarih(sonGirisMap.konu, row.student_id, row.created_at);
    for (const row of sorular ?? []) enSonTarih(sonGirisMap.soru, row.student_id, row.created_at);
    for (const row of denemeler ?? []) enSonTarih(sonGirisMap.deneme, row.student_id, row.created_at);

    // student_id -> [{parent_id, email}]
    type VeliBaglanti = { student_id: string; parent_id: string; profiles: { email: string | null } | null };
    const veliMap = new Map<string, { id: string; email: string | null }[]>();
    for (const row of (veliBaglantilari as unknown as VeliBaglanti[]) ?? []) {
      const liste = veliMap.get(row.student_id) ?? [];
      liste.push({ id: row.parent_id, email: row.profiles?.email ?? null });
      veliMap.set(row.student_id, liste);
    }

    // profile_id -> push abonelikleri
    type PushRow = { id: string; profile_id: string; endpoint: string; p256dh: string; auth: string };
    const pushMap = new Map<string, PushRow[]>();
    for (const row of (pushAbonelikleri as PushRow[]) ?? []) {
      const liste = pushMap.get(row.profile_id) ?? [];
      liste.push(row);
      pushMap.set(row.profile_id, liste);
    }

    async function pushGonder(profileId: string, baslik: string, govde: string) {
      const abonelikler = pushMap.get(profileId) ?? [];
      for (const ab of abonelikler) {
        try {
          await webpush.sendNotification(
            { endpoint: ab.endpoint, keys: { p256dh: ab.p256dh, auth: ab.auth } },
            JSON.stringify({ title: baslik, body: govde, url: "/dashboard" }),
          );
        } catch (e) {
          const statusCode = (e as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", ab.id);
          }
        }
      }
    }

    for (const s of students ?? []) {
      const profile = (s as unknown as { profiles: { ad: string; email: string | null } | null }).profiles;
      if (!profile?.email) continue;
      const veliler = veliMap.get(s.id) ?? [];
      const veliEmailler = veliler.map((v) => v.email).filter((e): e is string => Boolean(e));

      for (const kategoriKey of Object.keys(KATEGORI_TANIM) as KategoriAnahtar[]) {
        const tanim = KATEGORI_TANIM[kategoriKey];
        const esikMs = KATEGORI_GERIYE_DONUK_SINIR[kategoriKey] * 24 * 3600 * 1000;

        const sonGirisMs = sonGirisMap[kategoriKey].get(s.id) ?? new Date(s.created_at).getTime();
        const gecenSure = now.getTime() - sonGirisMs;

        const deadlineHam = (s as unknown as Record<string, string | null>)[tanim.deadlineKolonu];
        const tekrarGonderilebilirMi = !deadlineHam || now.getTime() >= new Date(deadlineHam).getTime();

        if (gecenSure < esikMs || !tekrarGonderilebilirMi) continue;

        const gecenGun = Math.floor(gecenSure / (24 * 3600 * 1000));
        const ogrenciBaslik = `${tanim.ad} hatırlatması`;
        const ogrenciGovde = tanim.ogrenciGovde(gecenGun);
        const veliBaslik = tanim.veliBaslik(gecenGun);
        const veliGovde = tanim.veliGovde(profile.ad, gecenGun);

        try {
          await resend.emails.send({
            from: "SeFu Koç <onboarding@resend.dev>",
            to: profile.email,
            subject: ogrenciBaslik,
            html: `<p>Merhaba ${profile.ad},</p><p>${ogrenciGovde}</p>`,
          });
        } catch (e) {
          detaylar.push(`${profile.ad} (${kategoriKey}): öğrenci e-posta HATASI - ${e instanceof Error ? e.message : String(e)}`);
        }
        if (veliEmailler.length > 0) {
          try {
            await resend.emails.send({
              from: "SeFu Koç <onboarding@resend.dev>",
              to: veliEmailler,
              subject: veliBaslik,
              html: `<p>Merhaba,</p><p>${veliGovde}</p>`,
            });
          } catch (e) {
            detaylar.push(`${profile.ad} (${kategoriKey}): veli e-posta HATASI - ${e instanceof Error ? e.message : String(e)}`);
          }
        }
        detaylar.push(`${profile.ad} (${kategoriKey}): hatırlatma gönderildi (${gecenGun} gün, ${veliler.length} veli)`);

        await pushGonder(s.id, ogrenciBaslik, ogrenciGovde);
        for (const veli of veliler) await pushGonder(veli.id, veliBaslik, veliGovde);

        gonderilen++;
        await admin.from("students").update({ [tanim.deadlineKolonu]: new Date(now.getTime() + esikMs).toISOString() }).eq("id", s.id);
      }
    }

    // Faz 3 (§5): süresi (son_tarih) geçmiş, hâlâ "bekliyor" olan görev
    // atamalarını "tamamlanmadı" işaretle.
    const bugunISO = bugununTarihiTR();
    const { data: suresiGecenGorevler } = await admin
      .from("gorev_atamalari")
      .select("id, gorevler!inner(son_tarih)")
      .eq("durum", "bekliyor")
      .lt("gorevler.son_tarih", bugunISO);
    const suresiGecenIdler = (suresiGecenGorevler ?? []).map((g) => g.id as string);
    if (suresiGecenIdler.length > 0) {
      await admin.from("gorev_atamalari").update({ durum: "tamamlanmadi" }).in("id", suresiGecenIdler);
      detaylar.push(`${suresiGecenIdler.length} görev ataması süresi geçtiği için tamamlanmadı işaretlendi.`);
    }

    return NextResponse.json({ ok: true, gonderilen, detaylar });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
