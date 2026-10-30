// WhatsApp şablonlarının admin ayarları (kullanıcı isteği 18.10.2026,
// migration 0162): ad, karttaki başlık, gizleme ve fotoğraf galerisi.
// Bu dosya saf: hangi şablonlar var, ayar uygulanınca ne görünür.
import { DEVAMSIZLIK_FOTO, DUYURU_SABLONLARI, varsayilanDegerler } from "@/lib/whatsapp-duyuru";
import { YURT_SABLONLARI } from "@/lib/yurt-listesi";
import { yerlesikFotoAdresi } from "@/lib/duyuru-foto-adresi";

export { FOTO_KOKU } from "@/lib/duyuru-foto-adresi";
export const DEVAMSIZLIK_ANAHTARI = "devamsizlik";
export const DEVAMSIZLIK_BASLIGI = "Devamsızlık Bilgilendirmesi";

export type SablonGrubu = "Duyurular" | "Veli Bildirimi" | "Yurt";

export interface SablonTanimi {
  anahtar: string;
  grup: SablonGrubu;
  ad: string;               // varsayılan ad
  baslik: string | null;    // varsayılan kart başlığı; null = başlığı kartı hazırlayan yazar
  yerlesikFoto: string;     // /duyuru-fotograflari/ içindeki dosya
}

export const TUM_SABLONLAR: SablonTanimi[] = [
  ...DUYURU_SABLONLARI.map((s) => ({
    anahtar: s.anahtar, grup: "Duyurular" as const, ad: s.ad, yerlesikFoto: s.foto,
    baslik: s.alanlar.some((a) => a.anahtar === "baslik") ? null : s.icerik(varsayilanDegerler(s)).baslik,
  })),
  { anahtar: DEVAMSIZLIK_ANAHTARI, grup: "Veli Bildirimi", ad: "Devamsızlık Bildirimi", baslik: DEVAMSIZLIK_BASLIGI, yerlesikFoto: DEVAMSIZLIK_FOTO },
  ...YURT_SABLONLARI.map((s) => ({ anahtar: s.anahtar, grup: "Yurt" as const, ad: s.ad, baslik: s.ad, yerlesikFoto: s.foto })),
];

export const sablonTanimi = (anahtar: string) => TUM_SABLONLAR.find((s) => s.anahtar === anahtar) ?? null;

export interface SablonAyari {
  anahtar: string;
  ad: string | null;
  baslik: string | null;
  gizli: boolean;
  yerlesikFotoGizli: boolean;
  fotograflar: { id: string; adres: string }[];   // admin'in eklediği, sıralı
}

export interface EtkinSablon {
  anahtar: string;
  ad: string;
  baslik: string | null;    // null = şablonun kendi başlığı (ya da hazırlayanın yazdığı)
  gizli: boolean;
  fotolar: string[];        // seçilebilir fotoğraflar; ilki varsayılan
}

export const yuklenenFotoAdresi = (id: string) => `/api/duyuru-fotografi?id=${id}`;

export function etkinSablon(anahtar: string, ayar: SablonAyari | undefined): EtkinSablon {
  const t = sablonTanimi(anahtar);
  const yerlesik = t ? yerlesikFotoAdresi(t.yerlesikFoto) : null;
  const fotolar = [...(yerlesik && !ayar?.yerlesikFotoGizli ? [yerlesik] : []), ...(ayar?.fotograflar ?? []).map((f) => f.adres)];
  return {
    anahtar,
    ad: ayar?.ad?.trim() || t?.ad || anahtar,
    // Başlığı kartı hazırlayan yazıyorsa (genel duyuru, özel gün) admin başlığı uygulanmaz.
    baslik: t?.baslik === null ? null : ayar?.baslik?.trim() || null,
    gizli: ayar?.gizli ?? false,
    fotolar,
  };
}

export type EtkinSablonlar = Record<string, EtkinSablon>;

export function etkinSablonlar(ayarlar: SablonAyari[]): EtkinSablonlar {
  const harita = new Map(ayarlar.map((a) => [a.anahtar, a]));
  return Object.fromEntries(TUM_SABLONLAR.map((t) => [t.anahtar, etkinSablon(t.anahtar, harita.get(t.anahtar))]));
}

// Ücret ve kayıt kartları dershane ile özel okula özgü (kullanıcı kararı
// 18.10.2026, migration 0166); devlet okulunda gizlenir.
export const UCRETLI_KURUM_SABLONLARI = ["ucret-hatirlatma", "kayit"];

export const ucretliKurumMu = (kurum: { tur: string; ozel?: boolean | null }) => kurum.tur !== "okul" || kurum.ozel === true;

export function kurumaUygunSablonlar(sablonlar: EtkinSablonlar, ucretliKurum: boolean): EtkinSablonlar {
  if (ucretliKurum) return sablonlar;
  return Object.fromEntries(Object.entries(sablonlar).map(([anahtar, s]) =>
    [anahtar, UCRETLI_KURUM_SABLONLARI.includes(anahtar) ? { ...s, gizli: true } : s]));
}
