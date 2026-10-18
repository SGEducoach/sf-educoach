// Şablon ayarlarını veritabanından okur (migration 0162). Tablo yoksa
// (migration uygulanmadıysa) boş döner: şablonlar varsayılanla çalışır.
import type { SupabaseClient } from "@supabase/supabase-js";
import { yuklenenFotoAdresi, type SablonAyari } from "@/lib/whatsapp-sablon-ayarlari";

export async function sablonAyarlariGetir(admin: SupabaseClient): Promise<{ ayarlar: SablonAyari[]; hazir: boolean }> {
  const [{ data: ayarlar, error: e1 }, { data: fotograflar, error: e2 }] = await Promise.all([
    admin.from("whatsapp_sablon_ayarlari").select("anahtar, ad, baslik, gizli, yerlesik_foto_gizli"),
    admin.from("whatsapp_sablon_fotograflari").select("id, anahtar").order("sira").order("created_at"),
  ]);
  if (e1 || e2) return { ayarlar: [], hazir: false };
  type A = { anahtar: string; ad: string | null; baslik: string | null; gizli: boolean; yerlesik_foto_gizli: boolean };
  const harita = new Map<string, SablonAyari>();
  const al = (anahtar: string) => {
    if (!harita.has(anahtar)) harita.set(anahtar, { anahtar, ad: null, baslik: null, gizli: false, yerlesikFotoGizli: false, fotograflar: [] });
    return harita.get(anahtar)!;
  };
  for (const a of (ayarlar ?? []) as A[]) Object.assign(al(a.anahtar), { ad: a.ad, baslik: a.baslik, gizli: a.gizli, yerlesikFotoGizli: a.yerlesik_foto_gizli });
  for (const f of (fotograflar ?? []) as { id: string; anahtar: string }[]) al(f.anahtar).fotograflar.push({ id: f.id, adres: yuklenenFotoAdresi(f.id) });
  return { ayarlar: [...harita.values()], hazir: true };
}
