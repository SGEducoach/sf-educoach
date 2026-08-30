import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { KATEGORI_GERIYE_DONUK_SINIR } from "@/lib/types";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

// Yurt öğrencisi hafta içi telefonuna erişemiyor — bugün hafta sonu
// (Cmt/Paz) değilse konu/soru hatırlatmaları onlar için bastırılıyor
// (bkz. migration 0053). Deneme hatırlatması zaten haftalık bir eşik
// kullandığından (7 gün) hafta sonu toplu girişle uyumlu, dokunulmadı.
function bugunHaftaSonuMu(): boolean {
  const gun = new Date(`${bugununTarihiTR()}T12:00:00Z`).getUTCDay();
  return gun === 0 || gun === 6;
}

export const maxDuration = 60;

// Vercel Cron bu route'u çağırır (vercel.json'daki schedule'a göre).
// Rozet sistemi v2 ile birlikte hatırlatma da KATEGORİ BAZLI oldu: tek bir
// "3 gündür veri girmiyor" kuralı yerine, her kategorinin kendi eşiği var —
// konu/soru 3 gün, deneme 7 gün (KATEGORI_GERIYE_DONUK_SINIR ile birebir
// aynı, çünkü backdating penceresi kapandığında telafi de imkânsızlaşıyor).
// Bir öğrenci aynı anda birden fazla kategoride geride kalmışsa, her biri
// için AYRI bildirim gidiyor.
//
// Kullanıcı kararı (24 Ağustos 2026): bildirimler artık SADECE web push
// üzerinden gidiyor, e-posta (Resend) tamamen kaldırıldı — hem gerçek
// ölçekte Resend'in ücretsiz günlük kotasını aşma riski hem de sandbox
// modda gerçek kullanıcılara ulaşmama riski ortadan kalktı. Bir kullanıcının
// e-postası olmaması artık hatırlatmayı hiç engellemiyor; push aboneliği
// yoksa zaten pushGonder() sessizce hiçbir şey göndermiyor.
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
    ogrenciGovde: (gun) => `${gun} gündür konu çalışması girmedin. www.sefukoc.com'a girip güncel verilerini ekle.`,
    veliBaslik: () => "Öğrenciniz konu verisi girmiyor!",
    veliGovde: (ad, gun) => `${ad} adlı öğrenciniz ${gun} gündür konu çalışması verisi girmedi.`,
  },
  soru: {
    tablo: "soru_cozumleri",
    deadlineKolonu: "son_hatirlatma_soru_deadline",
    ad: "Soru Çözümü",
    ogrenciGovde: (gun) => `${gun} gündür soru çözümü girmedin. www.sefukoc.com'a girip güncel verilerini ekle.`,
    veliBaslik: () => "Öğrenciniz soru çözümü girmiyor!",
    veliGovde: (ad, gun) => `${ad} adlı öğrenciniz ${gun} gündür soru çözümü verisi girmedi.`,
  },
  deneme: {
    tablo: "denemeler",
    deadlineKolonu: "son_hatirlatma_deneme_deadline",
    ad: "Deneme",
    ogrenciGovde: () => `Bu hafta deneme girişi yapmadın. www.sefukoc.com'a girip güncel verilerini ekle.`,
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
    const now = new Date();
    const bugunHaftaSonu = bugunHaftaSonuMu();
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
        "id, created_at, yurt_ogrencisi, son_hatirlatma_konu_deadline, son_hatirlatma_soru_deadline, son_hatirlatma_deneme_deadline, profiles!students_id_fkey(ad)",
      ),
      admin.from("konu_calismalar").select("student_id, created_at"),
      admin.from("soru_cozumleri").select("student_id, created_at"),
      admin.from("denemeler").select("student_id, created_at").eq("kaynak", "ogrenci"),
      admin.from("parent_students").select("student_id, parent_id"),
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

    // student_id -> [parent_id] — bildirimler artık sadece web push
    // üzerinden gidiyor (kullanıcı kararı), veli e-postasına gerek kalmadı.
    type VeliBaglanti = { student_id: string; parent_id: string };
    const veliMap = new Map<string, string[]>();
    for (const row of (veliBaglantilari as unknown as VeliBaglanti[]) ?? []) {
      const liste = veliMap.get(row.student_id) ?? [];
      liste.push(row.parent_id);
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
      const profile = (s as unknown as { profiles: { ad: string } | null }).profiles;
      if (!profile) continue;
      const veliler = veliMap.get(s.id) ?? [];
      const yurtOgrencisi = (s as unknown as { yurt_ogrencisi: boolean }).yurt_ogrencisi;

      for (const kategoriKey of Object.keys(KATEGORI_TANIM) as KategoriAnahtar[]) {
        // Yurt öğrencisi hafta içi telefonuna erişemiyor — konu/soru
        // hatırlatması sadece hafta sonu değerlendiriliyor (bkz. yukarıdaki
        // bugunHaftaSonuMu). Deneme zaten haftalık bir eşik kullanıyor,
        // dokunulmadı.
        if (yurtOgrencisi && kategoriKey !== "deneme" && !bugunHaftaSonu) continue;

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

        await pushGonder(s.id, ogrenciBaslik, ogrenciGovde);
        for (const veliId of veliler) await pushGonder(veliId, veliBaslik, veliGovde);

        detaylar.push(`${profile.ad} (${kategoriKey}): hatırlatma push ile gönderildi (${gecenGun} gün, ${veliler.length} veli)`);

        gonderilen++;
        await admin.from("students").update({ [tanim.deadlineKolonu]: new Date(now.getTime() + esikMs).toISOString() }).eq("id", s.id);
      }
    }

    // Yurt Nöbeti hatırlatması ARTIK BURADA DEĞİL — kullanıcı isteğini
    // (2026-08-25) "09:00/15:00/21:00, ilki okunana kadar diğerini
    // aktifleştirme" şeklinde netleştirdi; bu günde 3 kez tetiklenen,
    // okunma durumuna göre dallanan bir akış olduğundan ayrı bir cron
    // route'una taşındı (bkz. /api/cron/yurt-nobeti-bildirim,
    // vercel.json'daki 3 ayrı schedule, migration 0066
    // ogretmen_yurt_nobeti_bildirim tablosu).

    // Kullanıcı isteği (26.08.2026, Bildirimler yeniden tasarımı):
    // "yaklaşan görev/plan" hatırlatması — son_tarih'i TAM OLARAK yarın
    // olan, hâlâ "bekliyor" durumundaki görev/plan atamaları için (görev
    // ve öğrencinin kendi "Plan Yap"ı AYNI tabloyu kullanıyor, bkz.
    // gorev-actions.ts planEkle). Tarih eşitliği tek seferlik eşleştiği
    // için ayrı bir "gönderildi" bayrağına gerek yok. bildirim_yaklasan_gorev
    // tercihini kapatan öğrenciye gönderilmiyor (migration 0077).
    const bugunISO = bugununTarihiTR();
    const yarinISO = tarihEkle(bugunISO, 1);
    const { data: yaklasanGorevler } = await admin
      .from("gorev_atamalari")
      .select("student_id, gorevler!inner(son_tarih)")
      .eq("durum", "bekliyor")
      .eq("gorevler.son_tarih", yarinISO);
    type YaklasanGorevRow = { student_id: string };
    const yaklasanOgrenciIdleri = [...new Set((yaklasanGorevler as unknown as YaklasanGorevRow[] ?? []).map((g) => g.student_id))];
    if (yaklasanOgrenciIdleri.length > 0) {
      const { data: tercihler } = await admin.from("profiles").select("id, bildirim_yaklasan_gorev").in("id", yaklasanOgrenciIdleri);
      const kapatanlar = new Set((tercihler ?? []).filter((p) => p.bildirim_yaklasan_gorev === false).map((p) => p.id));
      const gorevSayisi = new Map<string, number>();
      for (const g of (yaklasanGorevler as unknown as YaklasanGorevRow[] ?? [])) {
        gorevSayisi.set(g.student_id, (gorevSayisi.get(g.student_id) ?? 0) + 1);
      }
      for (const studentId of yaklasanOgrenciIdleri) {
        if (kapatanlar.has(studentId)) continue;
        const sayi = gorevSayisi.get(studentId) ?? 1;
        const baslik = "Yaklaşan ödev hatırlatması";
        const govde = sayi > 1 ? `Yarın son tarihli ${sayi} ödevin/programın var. www.sefukoc.com'dan kontrol et.` : "Yarın son tarihli bir ödevin/programın var. www.sefukoc.com'dan kontrol et.";
        await pushGonder(studentId, baslik, govde);
        const { data: duyuru } = await admin.from("duyurular").insert({ gonderen_id: null, baslik, mesaj: govde }).select("id").single();
        if (duyuru) await admin.from("duyuru_aliciler").insert({ duyuru_id: duyuru.id, profile_id: studentId });
      }
      if (yaklasanOgrenciIdleri.length - kapatanlar.size > 0) {
        detaylar.push(`${yaklasanOgrenciIdleri.length - kapatanlar.size} öğrenciye yaklaşan görev/plan hatırlatması gönderildi.`);
      }
    }

    // Faz 3 (§5): süresi (son_tarih) geçmiş, hâlâ "bekliyor" olan görev
    // atamalarını "tamamlanmadı" işaretle.
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
