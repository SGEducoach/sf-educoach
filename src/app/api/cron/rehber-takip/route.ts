import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { takipBildirimleriniUret, type TakipKapsami } from "@/lib/rehber-takip-verisi";
import { sinifTakipKapsamiVarMi } from "@/lib/sinif-takip";

export const maxDuration = 120;

// Rehber Takip Bildirimleri'nin günlük taraması (migration 0171). Rehberi
// olan her kurum bir kez taranır: okulda rehberlik servisinin düzeylerinin
// birleşimi, dershane ve grup koçlukta bütün öğrenciler; ayrıca sınıf
// öğretmenlerinin sınıfları (rehberin kapsamadığı düzeylerde, migration 0176). Bildirim kutusuna
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
  // Sınıf öğretmenleri (migration 0176): kendi sınıfları için de taranır. Rehber
  // taramasının zaten kapsadığı düzeydeki sınıflar atlanır (kayıtlar ortak, tekrar taramaya gerek yok).
  const { data: sinifOgretmenleri } = await admin.from("teachers").select("id, school_id, class_id").not("class_id", "is", null);
  const kurumIdleri = [...new Set([...(servis ?? []), ...(rehberler ?? []), ...(sinifOgretmenleri ?? [])].map((r) => r.school_id as string).filter(Boolean))];
  if (kurumIdleri.length === 0) return NextResponse.json({ kurum: 0, eklenen: 0 });
  const { data: kurumlar } = await admin.from("schools").select("id, tur, kademe, grup_kapasitesi, aktif").in("id", kurumIdleri);
  const { data: sinifSatirlari } = await admin.from("classes").select("id, seviye").in("school_id", kurumIdleri);
  const seviyeOf = new Map((sinifSatirlari ?? []).map((c) => [c.id as string, c.seviye as string]));

  let eklenen = 0;
  const hatalar: string[] = [];
  for (const kurum of kurumlar ?? []) {
    if (kurum.aktif === false) continue;
    const tumu = kurum.tur === "dershane" || kurum.grup_kapasitesi !== null;
    const seviyeler = [...new Set((servis ?? []).filter((s) => s.school_id === kurum.id).flatMap((s) => (s.sinif_duzeyleri as string[] | null) ?? []))];
    const kademe = kurum.kademe === "ortaokul" ? "ortaokul" as const : "lise" as const;
    if (tumu || seviyeler.length > 0) {
      const kapsam: TakipKapsami = {
        schoolId: kurum.id, seviyeler: tumu ? null : seviyeler,
        kademe, ogrenciBaglantisi: tumu ? "takip" : "analiz",
      };
      try { eklenen += await takipBildirimleriniUret(admin, kapsam); } catch (e) { hatalar.push(`${kurum.id}: ${e instanceof Error ? e.message : "hata"}`); }
    }
    // Sınıf öğretmeni sınıfları: grup kurumunda ve rehber taramasının (düzey ya da tüm kurum) kapsadığı düzeyde atla.
    if (kurum.grup_kapasitesi !== null || tumu) continue;
    const taranan = new Set(seviyeler);
    const siniflar = new Set((sinifOgretmenleri ?? []).filter((t) => t.school_id === kurum.id).map((t) => t.class_id as string));
    for (const sinifId of siniflar) {
      const sinifSeviyesi = seviyeOf.get(sinifId) ?? null;
      if (!sinifTakipKapsamiVarMi({ sinifId, sinifSeviyesi, grupMu: false }) || taranan.has(sinifSeviyesi!)) continue;
      const kapsam: TakipKapsami = { schoolId: kurum.id, seviyeler: [sinifSeviyesi!], kademe, ogrenciBaglantisi: "analiz", sinifId };
      try { eklenen += await takipBildirimleriniUret(admin, kapsam); } catch (e) { hatalar.push(`${kurum.id}/${sinifId}: ${e instanceof Error ? e.message : "hata"}`); }
    }
  }
  return NextResponse.json({ kurum: kurumlar?.length ?? 0, eklenen, hatalar });
}
