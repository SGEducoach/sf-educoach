import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mezunOtomatikAktarTumOkullar } from "@/lib/mezun-veri";
import { bugununTarihiTR } from "@/lib/tarih";

// Mezun Takip (migration 0184): ders yılı bitince (1 Temmuz–31 Ağustos) lise
// öğrencisi olan okulların 12. sınıflarındaki öğrencileri o yılın mezunu
// olarak ekler. Diğer aylarda hiçbir şey yapmaz; aynı kişi iki kez eklenmez.
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  return NextResponse.json(await mezunOtomatikAktarTumOkullar(createAdminClient(), bugununTarihiTR()));
}
