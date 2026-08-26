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

// ============ Gerçek bildirim akışı (Faz 2 — bkz. migration 0079) ============
// "Sistem içerisindeki bildirimleri kullanıcı buradan takip edecek" —
// yukarıdaki tercihler sadece push/opt-out ayarı, bunlar ise GERÇEK
// içerik (bkz. src/lib/bildirim-gonder.ts).
export interface Bildirim {
  id: string; tur: string; baslik: string; mesaj: string; okundu: boolean; olusturulmaTarihi: string;
}

export async function bildirimlerGetir(): Promise<{ error: string | null; bildirimler: Bildirim[]; okunmamisSayisi: number }> {
  const { supabase, user } = await kendi();
  const { data, error } = await supabase
    .from("bildirimler")
    .select("id, tur, baslik, mesaj, okundu, created_at")
    .eq("profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) return { error: error.message, bildirimler: [], okunmamisSayisi: 0 };
  const bildirimler = (data ?? []).map((b) => ({
    id: b.id, tur: b.tur, baslik: b.baslik, mesaj: b.mesaj, okundu: b.okundu, olusturulmaTarihi: b.created_at,
  }));
  return { error: null, bildirimler, okunmamisSayisi: bildirimler.filter((b) => !b.okundu).length };
}

export async function bildirimOkunduIsaretle(id: string): Promise<{ error: string | null }> {
  const { supabase, user } = await kendi();
  const { error } = await supabase.from("bildirimler").update({ okundu: true }).eq("id", id).eq("profile_id", user.id);
  if (error) return { error: error.message };
  return { error: null };
}

export async function bildirimlerTumunuOkunduIsaretle(): Promise<{ error: string | null }> {
  const { supabase, user } = await kendi();
  const { error } = await supabase.from("bildirimler").update({ okundu: true }).eq("profile_id", user.id).eq("okundu", false);
  if (error) return { error: error.message };
  return { error: null };
}
