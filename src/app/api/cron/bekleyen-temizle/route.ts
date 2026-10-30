import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { eslesmeyenYurtNobetiSiniri } from "@/lib/nobet-yukleme";
import { bugununTarihiTR } from "@/lib/tarih";

// Sisteme üye olmamış öğrencilere verilen ödev/duyurunun 10 günlük saklama
// süresi dolduktan sonra bekleyen bağları siler (migration 0179). Üyelikte süre
// zaten ayrıca kontrol edilir; bu iş yalnızca eski kayıtların birikmesini önler
// (hesapsız öğrencinin kişisel verisini gereğinden uzun tutmamak için).
// Ayrıca hesapla eşleşmeyen yurt nöbetlerini ay bitiminde (ayın 25'inden itibaren) siler —
// bkz. eslesmeyenYurtNobetiSiniri. Eşleşen (teacher_id dolu) nöbetlere dokunulmaz.
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("bekleyen_on_kayit_temizle");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const { count: yurtNobeti, error: yurtHatasi } = await admin.from("yurt_nobet_gorevleri")
    .delete({ count: "exact" }).is("teacher_id", null).lt("tarih", eslesmeyenYurtNobetiSiniri(bugununTarihiTR()));
  if (yurtHatasi) return NextResponse.json({ error: yurtHatasi.message, silinen: data ?? 0 }, { status: 500 });
  return NextResponse.json({ silinen: data ?? 0, eslesmeyenYurtNobeti: yurtNobeti ?? 0 });
}
