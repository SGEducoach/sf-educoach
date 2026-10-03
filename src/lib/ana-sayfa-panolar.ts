import { unstable_cache } from "next/cache";
import { ANA_SAYFA_ONBELLEK_ETIKETI } from "@/lib/ana-sayfa";
import { createAdminClient } from "@/lib/supabase/admin";
import { tgDenemeDosyaUrl } from "@/lib/tg-deneme-ilanlari";
import { tgDenemeBitisTarihi } from "@/lib/tg-deneme-tarih";
import { bugununTarihiTR } from "@/lib/tarih";

export interface AnaSayfaPanoIlani {
  id: string;
  kurumAdi: string;
  tarih: string;
  baslik: string;
  aciklama: string;
  dosyaUrl: string;
  dosyaTipi: "resim" | "pdf";
}

// Kurum panolarının yönetim RLS'i değişmez. Ana sayfada yayınlanan alanlar
// sunucuda seçilir; öğrenci, öğretmen veya kurum üyeliği bilgisi aktarılmaz.
const panolariOku = unstable_cache(
  async (): Promise<AnaSayfaPanoIlani[]> => {
    const { data, error } = await createAdminClient()
      .from("tg_deneme_ilanlari")
      .select("id, tarih, baslik, aciklama, dosya_yolu, dosya_tipi, schools(ad)")
      .order("created_at", { ascending: false })
      .limit(80);
    if (error) {
      console.error("Ana sayfa panoları okunamadı:", error.message);
      return [];
    }
    type Row = {
      id: string; tarih: string; baslik: string; aciklama: string;
      dosya_yolu: string; dosya_tipi: "resim" | "pdf";
      schools: { ad: string } | null;
    };
    const bugun = bugununTarihiTR();
    return ((data ?? []) as unknown as Row[])
      .filter((r) => r.schools && (tgDenemeBitisTarihi(r.tarih) ?? "9999-12-31") >= bugun)
      .slice(0, 20)
      .map((r) => ({
        id: r.id, kurumAdi: r.schools!.ad, tarih: r.tarih,
        baslik: r.baslik, aciklama: r.aciklama,
        dosyaUrl: tgDenemeDosyaUrl(r.dosya_yolu), dosyaTipi: r.dosya_tipi,
      }));
  },
  ["ana-sayfa-panolar"],
  { revalidate: 60, tags: [ANA_SAYFA_ONBELLEK_ETIKETI] },
);

export async function anaSayfaPanolariniGetir(): Promise<AnaSayfaPanoIlani[]> {
  return panolariOku();
}
