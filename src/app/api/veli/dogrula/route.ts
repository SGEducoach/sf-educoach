import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GÜVENLİK DÜZELTMESİ (2026-08-25) — /api/veli/tamamla ÖNCEDEN kod'u
// (öğrenci+onaylı talep eşleşmesi) doğruluyordu AMA hesabı, o anda
// FORMDA YAZILAN veli_ad/veli_telefon ile oluşturuyordu — öğretmenin
// ONAYLADIĞI kişiyle birebir aynı olması hiç kontrol edilmiyordu. Yani
// kod'u bilen (örn. öğrenciden sızan) HERKES, öğretmenin onayladığı
// kişiden TAMAMEN FARKLI bir isimle veli hesabı açıp öğrencinin özel
// verilerine erişebiliyordu (gerçek veriyle doğrulandı — aynı okul
// no'suyla farklı isimle talep kabul edildi).
//
// Düzeltme: hesap artık SADECE talebin ONAYLANDIĞI ANDAKİ veli_ad/
// veli_telefon ile oluşturuluyor (bkz. tamamla/route.ts) — form artık
// isim/telefon İSTEMİYOR. Bu route, kod girildikten SONRA (şifre
// belirlemeden ÖNCE) o kod'un GERÇEKTEN kime onaylandığını kullanıcıya
// GÖSTERMEK için — "bu isim ben değilim" fark edilebilsin diye.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const schoolId = String(body.school_id ?? "").trim();
  const okulNo = String(body.okul_no ?? "").trim();
  const kod = String(body.kod ?? "").trim().toUpperCase();

  if (!schoolId || !okulNo || !kod) {
    return NextResponse.json({ error: "Okul no ve kod gerekli." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: student } = await admin.from("students").select("id").eq("school_id", schoolId).eq("okul_no", okulNo).maybeSingle();
  if (!student) return NextResponse.json({ error: "Okul no veya kod hatalı." }, { status: 400 });

  const { data: talep } = await admin
    .from("veli_link_requests")
    .select("veli_ad, veli_telefon")
    .eq("student_id", student.id)
    .eq("kod", kod)
    .eq("durum", "onaylandi")
    .gt("kod_expires_at", new Date().toISOString())
    .maybeSingle();
  if (!talep) return NextResponse.json({ error: "Okul no veya kod hatalı." }, { status: 400 });

  // Telefonun tamamı yerine son 2 hanesi gösteriliyor — sahibinin kendini
  // tanıması için yeterli, tam numarayı bu (henüz kimliği doğrulanmamış)
  // aşamada ekrana basmaya gerek yok.
  const telefonMaskeli = talep.veli_telefon ? `••• ${String(talep.veli_telefon).slice(-2)}` : "";
  return NextResponse.json({ ok: true, veliAd: talep.veli_ad, veliTelefonMaskeli: telefonMaskeli });
}
