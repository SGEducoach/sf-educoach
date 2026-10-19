import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { takipBildirimleriniUret, type TakipKapsami } from "@/lib/rehber-takip-verisi";

export const maxDuration = 120;

// Rehber Takip Bildirimleri'nin günlük taraması (migration 0171). Rehberi
// olan her kurum bir kez taranır: okulda rehberlik servisinin düzeylerinin
// birleşimi, dershane ve grup koçlukta bütün öğrenciler. Bildirim kutusuna
// hiçbir şey gönderilmez; kayıtlar rehberin Takip Bildirimleri bölümünde.
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  const admin = createAdminClient();
  const [{ data: servis }, { data: rehberler }] = await Promise.all([
    admin.from("rehberlik_servisi").select("school_id, sinif_duzeyleri"),
    admin.from("teachers").select("school_id").eq("brans", REHBER_BRANSI),
  ]);
  const kurumIdleri = [...new Set([...(servis ?? []), ...(rehberler ?? [])].map((r) => r.school_id as string).filter(Boolean))];
  if (kurumIdleri.length === 0) return NextResponse.json({ kurum: 0, eklenen: 0 });
  const { data: kurumlar } = await admin.from("schools").select("id, tur, kademe, grup_kapasitesi, aktif").in("id", kurumIdleri);

  let eklenen = 0;
  const hatalar: string[] = [];
  for (const kurum of kurumlar ?? []) {
    if (kurum.aktif === false) continue;
    const tumu = kurum.tur === "dershane" || kurum.grup_kapasitesi !== null;
    const seviyeler = [...new Set((servis ?? []).filter((s) => s.school_id === kurum.id).flatMap((s) => (s.sinif_duzeyleri as string[] | null) ?? []))];
    if (!tumu && seviyeler.length === 0) continue;
    const kapsam: TakipKapsami = {
      schoolId: kurum.id, seviyeler: tumu ? null : seviyeler,
      kademe: kurum.kademe === "ortaokul" ? "ortaokul" : "lise", ogrenciBaglantisi: tumu ? "takip" : "analiz",
    };
    try { eklenen += await takipBildirimleriniUret(admin, kapsam); } catch (e) { hatalar.push(`${kurum.id}: ${e instanceof Error ? e.message : "hata"}`); }
  }
  return NextResponse.json({ kurum: kurumlar?.length ?? 0, eklenen, hatalar });
}
