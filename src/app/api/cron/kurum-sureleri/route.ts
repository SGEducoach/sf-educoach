import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bugununTarihiTR } from "@/lib/tarih";

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const { data, error } = await createAdminClient().from("schools")
    .update({ aktif: false }).eq("aktif", true).is("grup_kapasitesi", null)
    .lt("kullanim_bitis_tarihi", bugununTarihiTR()).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ pasiflestirilen: data?.length ?? 0 });
}
