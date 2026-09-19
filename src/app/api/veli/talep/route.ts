import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adNormalize, okulNoGecerliMi } from "@/lib/validators";
import { grupKodundanKurumId } from "@/lib/grup-kodu";

const GENEL_YANIT = "Talebiniz alındı. Onaylandığında kod öğrencinin Mesajlarım kutusuna gönderilecektir.";

// Sadeleştirme (29.08.2026 kullanıcı isteği): telefon artık İSTENMİYOR —
// hiçbir zaman doğrulanmıyordu (SMS/OTP yok), tek gerçek güvenlik kapısı
// zaten öğretmenin onayı. Kayıt artık sadece Ad Soyad + Öğrenci No.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const admin = createAdminClient();
  // Grup Koçluk (Faz 6): kurum listesi yerine grup kodu; kullanıcı adı küçük harf.
  const grupMu = body.grup_kodu !== undefined;
  const schoolId = grupMu ? await grupKodundanKurumId(admin, body.grup_kodu) : String(body.school_id ?? "").trim();
  const okulNoHam = String(body.okul_no ?? "").trim();
  const okulNo = grupMu ? okulNoHam.toLowerCase() : okulNoHam;
  const veliAd = adNormalize(String(body.veli_ad ?? "").trim());

  // Okul numarası (okul) ya da kullanıcı adı (dershane/grup).
  const noGecerli = okulNoGecerliMi(okulNo) || /^[a-zA-Z0-9_]{6,32}$/.test(okulNo);
  if (!noGecerli || !veliAd) {
    return NextResponse.json({ error: "Girilen bilgileri kontrol edin." }, { status: 400 });
  }
  // Bulunamayan grup kodu da kayıt taramasına karşı genel yanıt alır.
  if (grupMu && !schoolId) return genelBasariYaniti();
  if (!schoolId || !/^[0-9a-f-]{36}$/i.test(schoolId)) {
    return NextResponse.json({ error: "Girilen bilgileri kontrol edin." }, { status: 400 });
  }

  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("school_id", schoolId)
    .eq("okul_no", okulNo)
    .maybeSingle();

  // Öğrenci numarası taramasına karşı, kayıt bulunamadığında da aynı yanıtı
  // döndürürüz. Böylece anonim kişi sistemde kimlerin kayıtlı olduğunu öğrenemez.
  if (!student) return genelBasariYaniti();

  // Telefon kalktığı için mükerrer talep kontrolü artık isim üzerinden
  // (aynı öğrenci + aynı isim + hâlâ bekliyor) — tam koruma değil ama
  // yanlışlıkla çift tıklama/gönderimi engellemeye yeterli; asıl sınır
  // aşağıdaki günlük talep tavanı.
  const { data: mevcut } = await admin
    .from("veli_link_requests")
    .select("id")
    .eq("student_id", student.id)
    .eq("veli_ad", veliAd)
    .eq("durum", "bekliyor")
    .limit(1);
  if (mevcut?.length) return genelBasariYaniti();

  const birGunOnce = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("veli_link_requests")
    .select("id", { count: "exact", head: true })
    .eq("student_id", student.id)
    .gte("created_at", birGunOnce);

  // Bir öğrenci için günde en fazla üç yeni talep. Sınır aşıldığında yine
  // genel yanıt verilir; saldırgana oran sınırlama bilgisi sızdırılmaz.
  if ((count ?? 0) >= 3) return genelBasariYaniti();

  const { error } = await admin.from("veli_link_requests").insert({
    student_id: student.id,
    veli_ad: veliAd,
  });
  if (error) {
    console.error("Veli talebi oluşturulamadı:", error.message);
    return NextResponse.json({ error: "Talep şu anda oluşturulamadı. Lütfen daha sonra tekrar deneyin." }, { status: 500 });
  }

  return genelBasariYaniti();
}

function genelBasariYaniti() {
  return NextResponse.json(
    { ok: true, mesaj: GENEL_YANIT },
    { headers: { "Cache-Control": "no-store" } },
  );
}
