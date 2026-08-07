import { NextResponse } from "next/server";
import { Resend } from "resend";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Vercel Cron bu route'u çağırır (vercel.json'daki schedule'a göre).
// Veri giriş sıklığı (günlük/3günlük/haftalık) sistemi kaldırıldı — artık
// herkes için tek, sabit bir kural var: 3 gündür hiç veri girişi
// yapılmadıysa hatırlat. son_hatirlatma_deadline, bir sonraki hatırlatmanın
// gönderilebileceği en erken zamanı tutuyor (aynı öğrenciye art arda her
// gün göndermemek için).
const UC_GUN_MS = 3 * 24 * 3600 * 1000;

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
      admin.from("students").select("id, son_hatirlatma_deadline, created_at, profiles!students_id_fkey(ad, email)"),
      admin.from("konu_calismalar").select("student_id, created_at"),
      admin.from("soru_cozumleri").select("student_id, created_at"),
      admin.from("denemeler").select("student_id, created_at").eq("kaynak", "ogrenci"),
      admin.from("parent_students").select("student_id, parent_id, profiles!parent_students_parent_id_fkey(email)"),
      admin.from("push_subscriptions").select("id, profile_id, endpoint, p256dh, auth"),
    ]);

    if (studentsError) {
      return NextResponse.json({ error: studentsError.message }, { status: 500 });
    }

    // student_id -> en son giriş zamanı (ms)
    const sonGirisMap = new Map<string, number>();
    for (const row of konular ?? []) enSonTarih(sonGirisMap, row.student_id, row.created_at);
    for (const row of sorular ?? []) enSonTarih(sonGirisMap, row.student_id, row.created_at);
    for (const row of denemeler ?? []) enSonTarih(sonGirisMap, row.student_id, row.created_at);

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

      const sonGirisMs = sonGirisMap.get(s.id) ?? new Date(s.created_at).getTime();
      const sonGiris = new Date(sonGirisMs);
      const gecenSure = now.getTime() - sonGirisMs;

      const tekrarGonderilebilirMi =
        !s.son_hatirlatma_deadline || now.getTime() >= new Date(s.son_hatirlatma_deadline).getTime();

      if (gecenSure >= UC_GUN_MS && tekrarGonderilebilirMi) {
        const veliler = veliMap.get(s.id) ?? [];
        const gecenGun = Math.floor(gecenSure / (24 * 3600 * 1000));
        const sonGirisStr = sonGiris.toLocaleDateString("tr-TR");

        // Öğrenciye ve veliye ayrı tonda mesaj: öğrenciye kendine yönelik bir
        // hatırlatma, veliye ise çocuğu hakkında bilgilendirme.
        const ogrenciBaslik = "Veri girişi hatırlatması";
        const ogrenciGovde = `${gecenGun} gündür veri girişi yapmadın. SG EduCoach'a girip güncel verilerini ekle.`;
        const veliBaslik = `Öğrenciniz ${gecenGun} gündür veri girmiyor!`;
        const veliGovde = `${profile.ad} adlı öğrenciniz ${gecenGun} gündür veri girişi yapmadı (son giriş: ${sonGirisStr}). Bir hatırlatmak ister misiniz?`;

        try {
          await resend.emails.send({
            from: "SG EduCoach <onboarding@resend.dev>",
            to: profile.email,
            subject: ogrenciBaslik,
            html: `<p>Merhaba ${profile.ad},</p><p>${ogrenciGovde}</p>`,
          });
        } catch (e) {
          detaylar.push(`${profile.ad}: öğrenci e-posta HATASI - ${e instanceof Error ? e.message : String(e)}`);
        }
        const veliEmailler = veliler.map((v) => v.email).filter((e): e is string => Boolean(e));
        if (veliEmailler.length > 0) {
          try {
            await resend.emails.send({
              from: "SG EduCoach <onboarding@resend.dev>",
              to: veliEmailler,
              subject: veliBaslik,
              html: `<p>Merhaba,</p><p>${veliGovde}</p>`,
            });
          } catch (e) {
            detaylar.push(`${profile.ad}: veli e-posta HATASI - ${e instanceof Error ? e.message : String(e)}`);
          }
        }
        detaylar.push(`${profile.ad}: hatırlatma gönderildi (${gecenGun} gün, ${veliler.length} veli)`);

        await pushGonder(s.id, ogrenciBaslik, ogrenciGovde);
        for (const veli of veliler) await pushGonder(veli.id, veliBaslik, veliGovde);

        gonderilen++;
        await admin.from("students").update({ son_hatirlatma_deadline: new Date(now.getTime() + UC_GUN_MS).toISOString() }).eq("id", s.id);
      }
    }

    return NextResponse.json({ ok: true, gonderilen, detaylar });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
