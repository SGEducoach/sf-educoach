import { NextResponse } from "next/server";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

// Yurt Nöbeti hatırlatma bildirimi (2026-08-25 kullanıcı isteği) — nöbet
// tarihinden BİR GÜN ÖNCE, o gün 09:00/15:00/21:00'da (vercel.json'daki 3
// ayrı cron, ?sira= parametresiyle bu route'u çağırıyor) kademeli
// hatırlatma gönderir: sira=1 (09:00) her zaman gönderilir; sira=2/3 ise
// SADECE bir önceki sıradaki bildirim henüz OKUNMAMIŞSA gönderilir —
// kullanıcı kararı: "ilki okunana kadar diğerini aktif etmesin". Okundu
// işareti /api/bildirim/okundu route'undan gelir (bkz. public/sw.js
// notificationclick).
export const maxDuration = 30;

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

const SIRA_SAAT_ETIKET: Record<number, string> = { 1: "09:00", 2: "15:00", 3: "21:00" };

export async function GET(request: Request) {
  if (!yetkiliMi(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sira = Number(new URL(request.url).searchParams.get("sira"));
  if (![1, 2, 3].includes(sira)) {
    return NextResponse.json({ error: "Geçersiz sira parametresi (1, 2 veya 3 olmalı)." }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const yarinISO = tarihEkle(bugununTarihiTR(), 1);

    const { data: nobetciler, error } = await admin
      .from("ogretmen_yurt_nobeti")
      .select("teacher_id")
      .eq("tarih", yarinISO);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const teacherIdleri = [...new Set((nobetciler ?? []).map((n) => n.teacher_id as string))];
    if (teacherIdleri.length === 0) return NextResponse.json({ ok: true, gonderilen: 0, detay: "Yarın nöbeti olan öğretmen yok." });

    // sira=2/3 için bir önceki sıradaki bildirimin okunma durumunu topluca
    // çekiyoruz (N+1 yerine tek sorgu).
    let atlanacakTeacherIdleri = new Set<string>();
    if (sira > 1) {
      const { data: oncekiler } = await admin
        .from("ogretmen_yurt_nobeti_bildirim")
        .select("teacher_id, okundu_at")
        .eq("tarih", yarinISO)
        .eq("sira", sira - 1)
        .in("teacher_id", teacherIdleri);
      // Önceki bildirim GÖNDERİLMİŞ VE OKUNMUŞSA bu sırada hatırlatmaya
      // gerek yok. Önceki hiç gönderilmemişse (beklenmedik durum, örn. cron
      // kaçtıysa) yine de bu sırada göndeririz — sessizce hiç hatırlatma
      // gitmemesindense fazladan bir tane gitmesi daha güvenli.
      atlanacakTeacherIdleri = new Set(
        (oncekiler ?? []).filter((o) => o.okundu_at !== null).map((o) => o.teacher_id as string),
      );
    }

    const gonderilecekler = teacherIdleri.filter((id) => !atlanacakTeacherIdleri.has(id));
    let gonderilen = 0;
    const detaylar: string[] = [];

    for (const teacherId of gonderilecekler) {
      const { data: bildirim, error: insertHatasi } = await admin
        .from("ogretmen_yurt_nobeti_bildirim")
        .insert({ teacher_id: teacherId, tarih: yarinISO, sira })
        .select("id")
        .single();
      // 23505 (unique conflict) = bu sıra için zaten gönderilmiş (cron iki
      // kez tetiklendiyse), sessizce atla.
      if (insertHatasi) {
        if (insertHatasi.code !== "23505") detaylar.push(`${teacherId}: kayıt hatası — ${insertHatasi.message}`);
        continue;
      }

      const { data: abonelikler } = await admin
        .from("push_subscriptions")
        .select("id, endpoint, p256dh, auth")
        .eq("profile_id", teacherId);

      for (const ab of abonelikler ?? []) {
        try {
          await webpush.sendNotification(
            { endpoint: ab.endpoint, keys: { p256dh: ab.p256dh, auth: ab.auth } },
            JSON.stringify({
              title: "Yurt nöbeti hatırlatması",
              body: `Yarın yurt nöbetiniz var. (${SIRA_SAAT_ETIKET[sira]})`,
              url: "/dashboard",
              bildirimId: bildirim.id,
            }),
          );
        } catch (e) {
          const statusCode = (e as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await admin.from("push_subscriptions").delete().eq("id", ab.id);
          }
        }
      }
      gonderilen++;
    }

    detaylar.push(`sira=${sira}: ${gonderilen}/${teacherIdleri.length} öğretmene gönderildi (${atlanacakTeacherIdleri.size} kişi zaten okumuştu, atlandı).`);
    return NextResponse.json({ ok: true, gonderilen, detaylar });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
