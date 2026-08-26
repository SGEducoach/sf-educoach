"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Kullanıcı isteği (26.08.2026, Bildirimler yeniden tasarımı): tarayıcı
// bildirim izninin YANINDA, hangi TÜR bildirimlerin geleceğini de kişi
// kendisi seçebilsin (bkz. migration 0077 — profiles.bildirim_*).
export interface BildirimTercihleri {
  ogretmenMesaji: boolean;
  mudurMesaji: boolean;
  yaklasanGorev: boolean;
  yanlisGiris: boolean;
}

async function kendi() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function bildirimTercihleriGetir(): Promise<{ error: string | null; tercihler: BildirimTercihleri }> {
  const { supabase, user } = await kendi();
  const varsayilan: BildirimTercihleri = { ogretmenMesaji: true, mudurMesaji: true, yaklasanGorev: true, yanlisGiris: true };
  const { data, error } = await supabase
    .from("profiles")
    .select("bildirim_ogretmen_mesaji, bildirim_mudur_mesaji, bildirim_yaklasan_gorev, bildirim_yanlis_giris")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return { error: error?.message ?? null, tercihler: varsayilan };
  return {
    error: null,
    tercihler: {
      ogretmenMesaji: data.bildirim_ogretmen_mesaji, mudurMesaji: data.bildirim_mudur_mesaji,
      yaklasanGorev: data.bildirim_yaklasan_gorev, yanlisGiris: data.bildirim_yanlis_giris,
    },
  };
}

const ALAN_KOLON: Record<keyof BildirimTercihleri, string> = {
  ogretmenMesaji: "bildirim_ogretmen_mesaji", mudurMesaji: "bildirim_mudur_mesaji",
  yaklasanGorev: "bildirim_yaklasan_gorev", yanlisGiris: "bildirim_yanlis_giris",
};

export async function bildirimTercihiGuncelle(alan: keyof BildirimTercihleri, deger: boolean): Promise<{ error: string | null }> {
  const { supabase, user } = await kendi();
  const { error } = await supabase.from("profiles").update({ [ALAN_KOLON[alan]]: deger }).eq("id", user.id);
  if (error) return { error: error.message };
  return { error: null };
}
