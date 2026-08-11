import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adNormalize, okulNoGecerliMi, telefonGecerliMi } from "@/lib/validators";

const GENEL_YANIT = "Talebiniz alındı. Onaylandığında kod öğrencinin Mesajlarım kutusuna gönderilecektir.";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const schoolId = String(body.school_id ?? "").trim();
  const okulNo = String(body.okul_no ?? "").trim();
  const veliAd = adNormalize(String(body.veli_ad ?? "").trim());
  const veliTelefon = String(body.veli_telefon ?? "").trim();

  if (!/^[0-9a-f-]{36}$/i.test(schoolId) || !okulNoGecerliMi(okulNo) || !veliAd || !telefonGecerliMi(veliTelefon)) {
    return NextResponse.json({ error: "Girilen bilgileri kontrol edin." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("school_id", schoolId)
    .eq("okul_no", okulNo)
    .maybeSingle();

  // Öğrenci numarası taramasına karşı, kayıt bulunamadığında da aynı yanıtı
  // döndürürüz. Böylece anonim kişi sistemde kimlerin kayıtlı olduğunu öğrenemez.
  if (!student) return genelBasariYaniti();

  const { data: mevcut } = await admin
    .from("veli_link_requests")
    .select("id")
    .eq("student_id", student.id)
    .eq("veli_telefon", veliTelefon)
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
    veli_telefon: veliTelefon,
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
