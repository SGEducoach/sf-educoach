import type { SupabaseClient } from "@supabase/supabase-js";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";

export interface KurumAltKonusu {
  id: string;
  ders: string;
  ust_konu: string;
  alt_baslik: string;
}

export async function kurumAltKonulariGetir(client: SupabaseClient, schoolId: string): Promise<KurumAltKonusu[]> {
  const { data, error } = await client.from("kurum_mufredat_alt_konulari")
    .select("id, ders, ust_konu, alt_baslik")
    .eq("school_id", schoolId)
    .order("ders")
    .order("ust_konu")
    .order("alt_baslik");
  if (error) {
    console.error("Kurum alt konuları okunamadı:", error.message);
    return [];
  }
  return (data ?? []) as KurumAltKonusu[];
}

export function kurumKonuOnerileri(konular: KurumAltKonusu[]) {
  return konular.map((k) => ({
    ders: k.ders,
    konu: k.alt_baslik,
    seviye: MUFREDAT_KONULARI.find((ust) => ust.ders === k.ders && ust.konu === k.ust_konu)?.seviye ?? null,
    ustKonu: k.ust_konu,
  }));
}

export function kurumHiyerarsiKonulari(konular: KurumAltKonusu[]) {
  return konular.map((k) => ({ ders: k.ders, ustKonu: k.ust_konu, altBaslik: k.alt_baslik }));
}
