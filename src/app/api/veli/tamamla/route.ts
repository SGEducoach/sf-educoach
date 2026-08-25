import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// GÜVENLİK DÜZELTMESİ (2026-08-25) — bu route ÖNCEDEN request body'sinden
// (formdan) gelen veli_ad/veli_telefon'u DOĞRUDAN hesap oluşturmakta
// kullanıyordu — kod'un GERÇEKTEN kime onaylandığıyla hiç karşılaştırmadan.
// Sonuç: kod'u bilen HERKES (örn. öğrenciden sızmış bir kod), öğretmenin
// onayladığı kişiden TAMAMEN FARKLI bir isimle veli hesabı açıp öğrencinin
// özel verilerine erişebiliyordu. Artık isim/telefon bu istekten HİÇ
// alınmıyor — aşağıda `talep.veli_ad`/`talep.veli_telefon` (onay anında
// öğretmenin gördüğü değerler) kullanılıyor. bkz. /api/veli/dogrula (form,
// şifre belirlemeden önce bu ismi kullanıcıya gösterip "bu ben değilim"
// fark edilmesini sağlıyor).
const KVKK_ONAY_VERSIYON = "v1-2026-08-05";

export async function POST(request: Request) {
  const { school_id, okul_no, kod, sifre, kvkkOnay } = await request.json();

  if (!school_id || !okul_no || !kod) {
    return NextResponse.json({ error: "Okul, okul no ve kod gerekli." }, { status: 400 });
  }
  if (typeof sifre !== "string" || sifre.length < 8 || !/[A-Za-z]/.test(sifre) || !/[0-9]/.test(sifre) || !/[^A-Za-z0-9\s]/.test(sifre)) {
    return NextResponse.json({ error: "Şifre en az 8 karakter olmalı; harf, rakam ve özel işaret içermelidir." }, { status: 400 });
  }
  if (kvkkOnay !== true) {
    return NextResponse.json({ error: "Devam etmek için KVKK aydınlatma metnini onaylamanız gerekiyor." }, { status: 400 });
  }

  const admin = createAdminClient();

  // İsteği bul: durum='onaylandi', kod eşleşiyor, öğrenci okul_no eşleşiyor.
  // okul_no sadece okul içinde benzersiz olduğu için school_id ile birlikte
  // filtreleniyor (bkz. migration 0023) — yoksa başka bir okuldaki aynı
  // numaralı öğrenciyle karışabilir.
  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("school_id", school_id)
    .eq("okul_no", okul_no)
    .single();

  if (!student) {
    return NextResponse.json({ error: "Okul no veya kod hatalı." }, { status: 400 });
  }

  const kodTemiz = String(kod).trim().toUpperCase();
  const { data: talep } = await admin
    .from("veli_link_requests")
    .select("*")
    .eq("student_id", student.id)
    .eq("kod", kodTemiz)
    .eq("durum", "onaylandi")
    .gt("kod_expires_at", new Date().toISOString())
    .single();

  if (!talep) {
    return NextResponse.json({ error: "Okul no veya kod hatalı." }, { status: 400 });
  }

  const syntheticEmail = `veli+${talep.id}@sgeducoach.internal`;

  // GÜVENLİK: hesap SADECE talebin ONAYLANDIĞI ANDAKİ (öğretmenin gördüğü)
  // veli_ad/veli_telefon ile oluşturulur — bu istekten alınan bir isim/
  // telefon YOK ARTIK (bkz. dosya başı notu). Kod'u bilen biri farklı bir
  // kimlikle hesap açamaz.
  const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: sifre,
    email_confirm: true,
    user_metadata: {
      role: "veli",
      ad: talep.veli_ad,
      telefon: talep.veli_telefon,
      request_id: talep.id,
    },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // KVKK rıza beyanını zaman damgasıyla kaydet (trigger profiles'ı oluşturduktan sonra).
  if (createdUser.user) {
    await admin
      .from("profiles")
      .update({ kvkk_onay_at: new Date().toISOString(), kvkk_onay_versiyon: KVKK_ONAY_VERSIYON })
      .eq("id", createdUser.user.id);
  }

  // Hesap oluştu (trigger profiles+parent_students'ı kurdu, talebi 'kullanildi' yaptı).
  // Şimdi kullanıcının tarayıcısında oturum açalım.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: sifre,
  });

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
