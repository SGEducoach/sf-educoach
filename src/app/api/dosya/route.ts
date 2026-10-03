import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yol = searchParams.get("yol");

  if (!yol) {
    return new NextResponse("Dosya bulunamadı", { status: 400 });
  }

  // Supabase'deki gerçek dosya adresi
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const hedefUrl = `${supabaseUrl}/storage/v1/object/public/tg-denemeleri/${yol}`;

  try {
    const res = await fetch(hedefUrl);
    if (!res.ok) {
      return new NextResponse("Dosya erişilemez", { status: 404 });
    }

    const blob = await res.blob();
    const headers = new Headers();
    headers.set("Content-Type", res.headers.get("Content-Type") || "application/octet-stream");

    return new NextResponse(blob, { status: 200, headers });
  } catch (e) {
    console.error("Proxy dosya hatası:", e);
    return new NextResponse("Sunucu hatası", { status: 500 });
  }
}