import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Sisteme üye olmamış öğrencilere verilen ödev/duyurunun 10 günlük saklama
// süresi dolduktan sonra bekleyen bağları siler (migration 0179). Üyelikte süre
// zaten ayrıca kontrol edilir; bu iş yalnızca eski kayıtların birikmesini önler
// (hesapsız öğrencinin kişisel verisini gereğinden uzun tutmamak için).
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("bekleyen_on_kayit_temizle");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ silinen: data ?? 0 });
}
