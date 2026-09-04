import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { anonSunucuOkuyucu } from "@/lib/supabase/anon-server";

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

// Performans (2026-09-04): ana sayfa ayarları ve slider listesi nadiren
// değişiyor; okumalar 60 saniyelik paylaşımlı önbellekte. Admin kaydetme
// action'ları revalidateTag("ana-sayfa") ile anında tazeler. Çerezsiz
// okuyucu kullanılır (tablolar select açısından herkese açık) — bu yüzden
// fonksiyonların supabase parametresi artık opsiyonel/geri uyumluluk içindir.
export const ANA_SAYFA_ONBELLEK_ETIKETI = "ana-sayfa";

const ayarlarOku = unstable_cache(
  async (): Promise<AnaSayfaAyarlari> => {
    const { data, error } = await anonSunucuOkuyucu()
      .from("ana_sayfa_ayarlari")
      .select("baslik, govde, slider_gecis_saniye")
      .eq("id", 1)
      .maybeSingle();
    if (error || !data) {
      if (error) console.error("ana_sayfa_ayarlari okunamadı:", error.message);
      return VARSAYILAN_AYARLAR;
    }
    return { baslik: data.baslik, govde: data.govde, sliderGecisSaniye: data.slider_gecis_saniye };
  },
  ["ana-sayfa-ayarlari"],
  { revalidate: 60, tags: [ANA_SAYFA_ONBELLEK_ETIKETI] },
);

const sliderOku = unstable_cache(
  async (): Promise<AnaSayfaSliderGorseli[]> => {
    const { data, error } = await anonSunucuOkuyucu()
      .from("ana_sayfa_slider_gorselleri")
      .select("id, dosya_yolu, sira")
      .order("sira", { ascending: true });
    if (error) { console.error("ana_sayfa_slider_gorselleri okunamadı:", error.message); return []; }
    return (data ?? []).map((r) => ({ id: r.id, dosyaYolu: r.dosya_yolu, sira: r.sira }));
  },
  ["ana-sayfa-slider"],
  { revalidate: 60, tags: [ANA_SAYFA_ONBELLEK_ETIKETI] },
);

export async function anaSayfaAyarlariniGetir(_supabase?: SupabaseClient): Promise<AnaSayfaAyarlari> {
  return ayarlarOku();
}

export async function anaSayfaSliderGorselleriGetir(_supabase?: SupabaseClient): Promise<AnaSayfaSliderGorseli[]> {
  return sliderOku();
}

export function anaSayfaDosyaUrl(dosyaYolu: string): string {
  const taban = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${taban}/storage/v1/object/public/ana-sayfa/${dosyaYolu}`;
}
