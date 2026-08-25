import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Yurt nöbeti hatırlatma bildirimine tıklanınca service worker'ın
// çağırdığı uç (bkz. public/sw.js notificationclick, 2026-08-25 kullanıcı
// isteği: "ilki okunana kadar diğerini aktif etmesin"). Bilerek oturum
// gerektirmiyor — service worker context'inde normal fetch cookie'leri
// taşımayabiliyor (özellikle kapalı sekme/arka plan durumunda), ve
// buradaki tek veri "bir bildirim id'si okundu işaretlendi" — düşük
// hassasiyetli, rastgele bir UUID'yi tahmin edip başkasının bildirimini
// erken "okundu" yapmanın pratik bir zararı yok.
export async function POST(request: Request) {
  let id: string | undefined;
  try {
    const govde = await request.json();
    id = govde?.id;
  } catch {
    return NextResponse.json({ error: "Geçersiz istek gövdesi." }, { status: 400 });
  }
  if (!id) return NextResponse.json({ error: "id gerekli." }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("ogretmen_yurt_nobeti_bildirim")
    .update({ okundu_at: new Date().toISOString() })
    .eq("id", id)
    .is("okundu_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
