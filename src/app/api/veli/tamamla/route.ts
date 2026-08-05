import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { okul_no, kod } = await request.json();

  if (!okul_no || !kod) {
    return NextResponse.json({ error: "Okul no ve kod gerekli." }, { status: 400 });
  }

  const admin = createAdminClient();

  // İsteği bul: durum='onaylandi', kod eşleşiyor, öğrenci okul_no eşleşiyor.
  const { data: student } = await admin
    .from("students")
    .select("id")
    .eq("okul_no", okul_no)
    .single();

  if (!student) {
    return NextResponse.json({ error: "Okul no veya kod hatalı." }, { status: 400 });
  }

  const { data: talep } = await admin
    .from("veli_link_requests")
    .select("*")
    .eq("student_id", student.id)
    .eq("kod", kod)
    .eq("durum", "onaylandi")
    .single();

  if (!talep) {
    return NextResponse.json({ error: "Okul no veya kod hatalı." }, { status: 400 });
  }

  const syntheticEmail = `veli+${talep.id}@sgeducoach.internal`;

  const { error: createError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password: kod,
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

  // Hesap oluştu (trigger profiles+parent_students'ı kurdu, talebi 'kullanildi' yaptı).
  // Şimdi kullanıcının tarayıcısında oturum açalım.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: kod,
  });

  if (signInError) {
    return NextResponse.json({ error: signInError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
