// Yurt listesi kartları (kullanıcı isteği 18.10.2026): yurtlu kurumda
// öğretmenler akşam yoklamasında olmayanların, evci ve çarşı iznine
// çıkacakların listesini WhatsApp kartı olarak yoklama isteyen müdür
// yardımcısına gönderir. Kız öğrencilerin listesini kadın, erkek
// öğrencilerinkini erkek öğretmenler hazırlar; müdür ikisini de görür.
//
// Liste resmî öğrenci listesinden (ön kayıt) gelir — sisteme henüz girmemiş
// yurt öğrencileri de görünür. Kayıtlı öğrenci okul numarasıyla eşleşir;
// sınıfı ve güncel yurt durumu kayıttan okunur. Saf, test edilebilir.
import { kartTarihi } from "@/lib/whatsapp-duyuru";

export type OgrenciCinsiyeti = "kiz" | "erkek";
export type OgretmenCinsiyeti = "kadin" | "erkek";
export type YurtListeTuru = "aksam-yoklamasi" | "evci-izni" | "carsi-izni";

export interface YurtAlani { anahtar: string; etiket: string; tur: "tarih" | "saat"; varsayilan?: string }
export interface YurtSablonu {
  anahtar: YurtListeTuru;
  ad: string;
  renk: string;
  foto: string;
  notEtiketi: string;    // tablodaki son sütun
  notOrnegi: string;
  bosMesaj: string;      // listede kimse yokken kartta yazan
  alanlar: YurtAlani[];
}

export const YURT_SABLONLARI: YurtSablonu[] = [
  {
    anahtar: "aksam-yoklamasi", ad: "Akşam Yoklamasında Olmayanlar", renk: "#1f3a68", foto: "aksam-yoklamasi.jpg",
    notEtiketi: "Açıklama", notOrnegi: "İzinli, revirde…", bosMesaj: "Akşam yoklamasında eksik öğrenci yok.",
    alanlar: [{ anahtar: "tarih", etiket: "Tarih", tur: "tarih" }, { anahtar: "saat", etiket: "Yoklama saati", tur: "saat", varsayilan: "21:30" }],
  },
  {
    anahtar: "evci-izni", ad: "Evci İznine Gidecekler", renk: "#0f7a5c", foto: "evci-izni.jpg",
    notEtiketi: "Not", notOrnegi: "Velisi alacak…", bosMesaj: "Bu dönem evci iznine çıkan öğrenci yok.",
    alanlar: [
      { anahtar: "cikisTarihi", etiket: "Çıkış tarihi", tur: "tarih" }, { anahtar: "cikisSaati", etiket: "Çıkış saati", tur: "saat", varsayilan: "16:00" },
      { anahtar: "donusTarihi", etiket: "Dönüş tarihi", tur: "tarih" }, { anahtar: "donusSaati", etiket: "Dönüş saati", tur: "saat", varsayilan: "18:00" },
    ],
  },
  {
    anahtar: "carsi-izni", ad: "Çarşı İznine Gidecekler", renk: "#b5541b", foto: "carsi-izni.jpg",
    notEtiketi: "Not", notOrnegi: "Berber, kırtasiye…", bosMesaj: "Çarşı iznine çıkan öğrenci yok.",
    alanlar: [
      { anahtar: "tarih", etiket: "Tarih", tur: "tarih" },
      { anahtar: "cikisSaati", etiket: "Çıkış saati", tur: "saat", varsayilan: "13:00" }, { anahtar: "donusSaati", etiket: "Dönüş saati", tur: "saat", varsayilan: "17:00" },
    ],
  },
];

// Kartta liste üç blok (kullanıcı isteği 18.10.2026: mesaj uzamasın): 36'ya
// kadar 12'şer satır, 36'yı aşınca öğrenciler üç sütuna eşit dağılır ve
// satırlar sıklaşır. Okunurluk için bir kart en çok 90 öğrenci taşır.
export const YURT_BLOK_SATIRI = 12;
export const YURT_LISTE_SAYFA_SATIRI = 90;
export const yurtSutunSatiri = (n: number) => Math.max(YURT_BLOK_SATIRI, Math.ceil(n / 3));

export function yurtVarsayilanlari(s: YurtSablonu, bugun: string): Record<string, string> {
  return Object.fromEntries(s.alanlar.map((a) => [a.anahtar, a.varsayilan ?? (a.tur === "tarih" ? bugun : "")]));
}

const dolu = (s: string | undefined) => (s ?? "").trim();
const tarihSaat = (t: string | undefined, s: string | undefined) => [dolu(t) ? kartTarihi(dolu(t)) : "", dolu(s)].filter(Boolean).join(" · ");

// Kartta başlığın altındaki bilgi satırları.
export function yurtBilgiSatirlari(tur: YurtListeTuru, d: Record<string, string>): string[] {
  if (tur === "aksam-yoklamasi") return [dolu(d.tarih) ? kartTarihi(dolu(d.tarih)) : "", dolu(d.saat) ? `Yoklama saati ${dolu(d.saat)}` : ""].filter(Boolean);
  if (tur === "evci-izni") {
    const cikis = tarihSaat(d.cikisTarihi, d.cikisSaati);
    const donus = tarihSaat(d.donusTarihi, d.donusSaati);
    return [cikis ? `Çıkış: ${cikis}` : "", donus ? `Dönüş: ${donus}` : ""].filter(Boolean);
  }
  const saat = [dolu(d.cikisSaati), dolu(d.donusSaati)].filter(Boolean).join(" – ");
  return [dolu(d.tarih) ? kartTarihi(dolu(d.tarih)) : "", saat ? `Çıkış-dönüş ${saat}` : ""].filter(Boolean);
}

export const grupEtiketi = (c: OgrenciCinsiyeti) => (c === "kiz" ? "Kız Öğrenciler" : "Erkek Öğrenciler");

// Bütün yurt kartlarında aynı nöbetçi imzası kullanılır.
export function yurtKartImzasi(gonderen: string, ekOgretmen?: string): string {
  const birinci = gonderen.trim().replace(/\s+/g, " ") || "Nöbetçi öğretmen";
  const ikinci = ekOgretmen?.trim().replace(/\s+/g, " ");
  return `Nöbetçiler: ${[birinci, ikinci].filter(Boolean).join(", ")}`;
}

// Kadın öğretmen kız, erkek öğretmen erkek öğrencilerin listesini hazırlar.
export function ogretmeninGrubu(c: OgretmenCinsiyeti | null): OgrenciCinsiyeti | null {
  return c === "kadin" ? "kiz" : c === "erkek" ? "erkek" : null;
}

// "AHMET YILMAZ" → "Ahmet Yılmaz" (resmî liste büyük harfle gelebilir).
export function adBaslik(ad: string): string {
  return ad.trim().replace(/\s+/g, " ").split(" ")
    .map((s) => s.toLocaleLowerCase("tr-TR").replace(/^./, (h) => h.toLocaleUpperCase("tr-TR"))).join(" ");
}

export interface ResmiYurtSatiri { id: string; ad_soyad: string; okul_no: string; yurt_ogrencisi: boolean; cinsiyet?: string | null }
export interface KayitliOgrenciSatiri { id: string; ad: string; okul_no: string | null; yurt_ogrencisi: boolean; sinif: string | null; seviye: string | null; sube: string | null; cinsiyet?: string | null }

export interface YurtOgrencisi {
  anahtar: string;            // "r:<resmi id>" ya da "s:<öğrenci id>" — cinsiyet kaydı buna yazılır
  ogrenciId: string | null;   // sisteme kayıtlıysa öğrenci kimliği (profil bağlantısı)
  ad: string;
  okulNo: string | null;
  sinif: string | null;
  seviye: string | null;
  sube: string | null;
  kayitli: boolean;
  cinsiyet: OgrenciCinsiyeti | null;
}

const cinsiyetOku = (c: string | null | undefined): OgrenciCinsiyeti | null => (c === "kiz" || c === "erkek" ? c : null);

// Resmî liste + kayıtlı öğrenciler → yurt öğrencileri. Kayıtlı öğrencinin
// güncel yurt durumu (öğretmen değiştirebiliyor) resmî listedekinin önüne
// geçer; resmî listede olmayan kayıtlı yurt öğrencisi de eklenir.
export function yurtOgrencileriniBirlestir(resmi: ResmiYurtSatiri[], kayitli: KayitliOgrenciSatiri[]): YurtOgrencisi[] {
  return tumOgrencileriBirlestir(resmi, kayitli).filter((o) => o.yurt).map((o) => {
    const kopya: Partial<DurumluOgrenci> = { ...o };
    delete kopya.yurt;
    return kopya as YurtOgrencisi;
  });
}

// Yurt durumu işaretleme (kullanıcı isteği 18.10.2026): ön kayıt dahil bütün
// öğrenciler, yurt öğrencisi olup olmadıklarıyla.
export type DurumluOgrenci = YurtOgrencisi & { yurt: boolean };

export function tumOgrencileriBirlestir(resmi: ResmiYurtSatiri[], kayitli: KayitliOgrenciSatiri[]): DurumluOgrenci[] {
  const kayitByNo = new Map(kayitli.filter((k) => k.okul_no).map((k) => [k.okul_no!, k]));
  const kullanilan = new Set<string>();
  const sonuc: DurumluOgrenci[] = [];
  for (const r of resmi) {
    const k = kayitByNo.get(r.okul_no);
    if (k) kullanilan.add(k.id);
    sonuc.push({
      anahtar: `r:${r.id}`, ogrenciId: k?.id ?? null, ad: k?.ad?.trim() || adBaslik(r.ad_soyad), okulNo: r.okul_no,
      sinif: k?.sinif ?? null, seviye: k?.seviye ?? null, sube: k?.sube ?? null, kayitli: !!k,
      cinsiyet: cinsiyetOku(r.cinsiyet) ?? cinsiyetOku(k?.cinsiyet),
      yurt: k ? k.yurt_ogrencisi : r.yurt_ogrencisi,
    });
  }
  for (const k of kayitli) {
    if (kullanilan.has(k.id)) continue;
    sonuc.push({ anahtar: `s:${k.id}`, ogrenciId: k.id, ad: k.ad.trim(), okulNo: k.okul_no, sinif: k.sinif, seviye: k.seviye, sube: k.sube, kayitli: true, cinsiyet: cinsiyetOku(k.cinsiyet), yurt: k.yurt_ogrencisi });
  }
  return sonuc.sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
}

export function yurtSayfalari<T>(liste: T[], sayfaSatiri = YURT_LISTE_SAYFA_SATIRI): T[][] {
  if (liste.length === 0) return [[]];
  const sayfalar: T[][] = [];
  for (let i = 0; i < liste.length; i += sayfaSatiri) sayfalar.push(liste.slice(i, i + sayfaSatiri));
  return sayfalar;
}
