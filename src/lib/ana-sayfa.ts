import type { SupabaseClient } from "@supabase/supabase-js";

// Ana Sayfa (yeni "/" tasarımı, 27.08.2026 kullanıcı isteği) — admin
// panelinden yönetilen başlık/gövde metni + slider görselleri. Aynı
// Supabase Storage deseni (bkz. tg-deneme-ilanlari.ts) — public bucket,
// admin-only yazma.
export interface AnaSayfaAyarlari {
  baslik: string;
  govde: string;
  sliderGecisSaniye: number;
}

export interface AnaSayfaSliderGorseli {
  id: string;
  dosyaYolu: string;
  sira: number;
}

const VARSAYILAN_AYARLAR: AnaSayfaAyarlari = {
  baslik: "www.sefukoc.com",
  govde: "",
  sliderGecisSaniye: 6,
};

export async function anaSayfaAyarlariniGetir(supabase: SupabaseClient): Promise<AnaSayfaAyarlari> {
  const { data, error } = await supabase
    .from("ana_sayfa_ayarlari")
    .select("baslik, govde, slider_gecis_saniye")
    .eq("id", 1)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("ana_sayfa_ayarlari okunamadı:", error.message);
    return VARSAYILAN_AYARLAR;
  }
  return { baslik: data.baslik, govde: data.govde, sliderGecisSaniye: data.slider_gecis_saniye };
}

export async function anaSayfaSliderGorselleriGetir(supabase: SupabaseClient): Promise<AnaSayfaSliderGorseli[]> {
  const { data, error } = await supabase
    .from("ana_sayfa_slider_gorselleri")
    .select("id, dosya_yolu, sira")
    .order("sira", { ascending: true });
  if (error) { console.error("ana_sayfa_slider_gorselleri okunamadı:", error.message); return []; }
  return (data ?? []).map((r) => ({ id: r.id, dosyaYolu: r.dosya_yolu, sira: r.sira }));
}

export function anaSayfaDosyaUrl(dosyaYolu: string): string {
  const taban = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${taban}/storage/v1/object/public/ana-sayfa/${dosyaYolu}`;
}
