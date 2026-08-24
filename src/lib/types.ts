export type UserRole = "ogrenci" | "ogretmen" | "veli" | "mudur" | "admin";
export type KurumTuru = "okul" | "dershane";
export type AytAlan = "SAY" | "EA" | "SOZ";
export type VeriGirisSikligi = "gunluk" | "3gunluk" | "haftalik";
export type VeliTalepDurum = "bekliyor" | "onaylandi" | "reddedildi" | "kullanildi";
export type HedefeYakinlik = "yakin" | "belirsiz" | "uzak";
export type VerimlilikDuzeyi = "cok_dusuk" | "dusuk" | "orta" | "iyi" | "cok_iyi";
// BRANS = Branş Denemesi — 9 ve 10. sınıf öğrencilerinde TYT/AYT yerine
// kullanılıyor (bkz. 9_10_sinif_ekleme_senaryosu.pdf, "Ürün kararı").
export type DenemeTuru = "TYT" | "AYT" | "BRANS";
export type DenemeZorlugu = "kolay" | "orta" | "zor";
export type SinifSeviyesi = "9" | "10" | "11" | "12";

// 9 ve 10. sınıflarda TYT/AYT alan ayrımı yok — Branş Denemesi modeli
// kullanılıyor (bkz. 9_10_sinif_ekleme_senaryosu.pdf). Sınıf seçilince
// TYT/AYT/AYT-alan soruları hiç sorulmuyor; deneme, öğretmen toplu girişi
// ve öğrenci kayıt formları bu fonksiyonla moda karar veriyor.
export function dokuzOnSinifMi(seviye: string | null | undefined): boolean {
  return seviye === "9" || seviye === "10";
}

// Konu bilme/bilmeme göstergesi (Faz K4) — müfredat üst başlık/alt başlık
// hiyerarşisi 9-10-11. sınıf için geçerli (12. sınıf TYT/AYT'ye tam
// girdiği için düz liste kalıyor). BİLEREK dokuzOnSinifMi'den bağımsız
// bir fonksiyon: o hâlâ sadece TYT/AYT↔Branş Denemesi ayrımı için
// kullanılıyor (11. sınıf gerçek TYT/AYT'ye girer, Branş Denemesi'ne
// değil) — iki kontrol farklı amaçlara hizmet ediyor, birleştirilmedi.
export function maarifHiyerarsiSinifMi(seviye: string | null | undefined): boolean {
  return seviye === "9" || seviye === "10" || seviye === "11";
}

// classes.seviye bir text sütun olduğu için DB'nin kendi .order("seviye")'si
// alfabetik sıralar ("10" < "11" < "12" < "9") — 9-10 eklenene kadar 11/12
// tesadüfen doğru sıradaydı. Sınıf listesi gösterilen her yerde (kayıt formu,
// admin/müdür panelleri) bu karşılaştırıcıyla sayısal sıralanmalı: 9-A_D,
// 10-A_D, 11-A_D, 12-A_D.
export function sinifSiraKarsilastir(a: { seviye: string; sube: string }, b: { seviye: string; sube: string }): number {
  return Number(a.seviye) - Number(b.seviye) || a.sube.localeCompare(b.sube, "tr");
}

export interface Profile {
  id: string;
  ad: string;
  email: string | null;
  telefon: string | null;
  role: UserRole;
  gecici_sifre: boolean;
  created_at: string;
}

export interface School {
  id: string;
  ad: string;
  tur: KurumTuru;
  created_at: string;
}

export interface SchoolClass {
  id: string;
  school_id: string;
  seviye: SinifSeviyesi;
  sube: string;
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  class_id: string;
  okul_no: string;
  ayt_alan: AytAlan;
  hedef_bolum: string;
  veri_giris_sikligi: VeriGirisSikligi;
  created_at: string;
}

export interface Teacher {
  id: string;
  school_id: string;
  class_id: string | null;
  brans: string;
  created_at: string;
}

export interface VeliLinkRequest {
  id: string;
  student_id: string;
  veli_ad: string;
  veli_telefon: string;
  durum: VeliTalepDurum;
  kod: string | null;
  onaylayan_ogretmen_id: string | null;
  created_at: string;
  onaylanma_at: string | null;
}

export interface KonuCalisma {
  id: string;
  student_id: string;
  tarih: string;
  ders: string;
  konu: string;
  sure_dakika: number;
  hedefe_yakinlik: HedefeYakinlik;
  takip_cevabi: TakipCevabi | null;
  yayinevi: string;
  created_at: string;
}

export interface SoruCozumu {
  id: string;
  student_id: string;
  tarih: string;
  ders: string;
  dogru: number;
  yanlis: number;
  bos: number;
  sure_dakika: number;
  konu: string | null;
  yayinevi: string;
  kaynak: "ogrenci" | "ogretmen";
  onaylandi_mi: boolean;
  onaylayan_id: string | null;
  onaylanma_at: string | null;
  created_at: string;
}

export interface OgretmenDersi {
  id: string;
  teacher_id: string;
  class_id: string;
  ders: string;
  created_at: string;
}

export interface DenemeDersSonucu {
  ders: string;
  dogru: number;
  yanlis: number;
}

// ============ Görevler (Faz 3, yenilikler_1.txt §4-6) ============
export type GorevTuru = "konu" | "soru" | "deneme";
export type GorevDurumu = "bekliyor" | "tamamlandi" | "tamamlanmadi";

export const GOREV_TURU_ETIKET: Record<GorevTuru, string> = {
  konu: "Konu Çalışma",
  soru: "Soru Çözümü",
  deneme: "Deneme",
};

export const GOREV_DURUMU_ETIKET: Record<GorevDurumu, string> = {
  bekliyor: "Bekliyor",
  tamamlandi: "Tamamlandı",
  tamamlanmadi: "Tamamlanmadı",
};

export interface Gorev {
  id: string;
  olusturan_ogretmen_id: string | null;
  olusturan_ogrenci_id: string | null;
  tur: GorevTuru;
  ders: string;
  konu: string | null;
  hedef_soru_sayisi: number | null;
  hedef_dakika: number | null;
  tarih: string;
  son_tarih: string;
  baslangic_saat: string | null;
  bitis_saat: string | null;
  aciklama: string | null;
  created_at: string;
}

export interface GorevAtama {
  id: string;
  gorev_id: string;
  student_id: string;
  durum: GorevDurumu;
  created_at: string;
}

export interface Deneme {
  id: string;
  student_id: string;
  tarih: string;
  tur: DenemeTuru;
  sure_dakika: number | null;
  hedefe_yakinlik: HedefeYakinlik;
  zorluk: DenemeZorlugu | null;
  yayinevi: string;
  kaynak: "ogrenci" | "ogretmen";
  created_at: string;
  deneme_ders_sonuclari?: DenemeDersSonucu[];
}

export interface HaftalikVerimlilik {
  id: string;
  student_id: string;
  duzey: VerimlilikDuzeyi;
  created_at: string;
}

export const HEDEFE_YAKINLIK_ETIKET: Record<HedefeYakinlik, string> = {
  yakin: "Yakın",
  belirsiz: "Belirsiz",
  uzak: "Uzak",
};

// Konu Hakimiyeti (Faz H) — öğrencinin müfredat konuları için KALICI
// hakimiyet beyanı, konu_calismalar.hedefe_yakinlik'ten (bir çalışma
// oturumunun o anki değerlendirmesi) BAĞIMSIZ. Ölçek tipi aynı
// (hedefe_yakinlik reuse ediliyor, bkz. migration 0055) ama etiketler
// bu ekrana özel — Konu Çalışma'daki "Yetersiz/Orta/Yeterli" ile aynı
// anlamı taşıyor.
export const HAKIMIYET_SEVIYESI_ETIKET: Record<HedefeYakinlik, string> = {
  uzak: "Yetersiz",
  belirsiz: "Orta",
  yakin: "Yeterli",
};

export type OgrenmeSekli = "derste" | "video" | "kitap" | "dershane";
export const OGRENME_SEKLI_ETIKET: Record<OgrenmeSekli, string> = {
  derste: "Derste",
  video: "Video",
  kitap: "Kitap",
  dershane: "Dershane",
};
export const OGRENME_SEKLI_LISTESI: OgrenmeSekli[] = ["derste", "video", "kitap", "dershane"];

export type TekrarDurumu = "tekrar_edebilirim" | "yuzeysel_bakarim" | "gerek_yok";
export const TEKRAR_DURUMU_ETIKET: Record<TekrarDurumu, string> = {
  tekrar_edebilirim: "Tekrar edebilirim",
  yuzeysel_bakarim: "Yüzeysel bakarım",
  gerek_yok: "Gerek yok",
};

// Konu bilme/bilmeme göstergesi — "Konuya hakimiyet" (hedefe_yakinlik)
// seçiminden HEMEN SONRA, seçilen değere özel 2. aşama bir takip sorusu
// soruluyor (bkz. KonuCalismaForm, Faz K2). Her kod, hangi 1. aşama
// seçeneğinden geldiğini önekinden taşıyor (az_/orta_/yeterli_) — DB'de
// tek bir konu_calismalar.takip_cevabi sütununda saklanıyor, migration
// 0054'teki CHECK constraint bu 10 kodla sınırlı.
export type TakipCevabi =
  | "az_hic" | "az_az" | "az_orta" | "az_yuksek"
  | "orta_evet" | "orta_biraz" | "orta_hayir"
  | "yeterli_hizli_dogru" | "yeterli_dogru_yavas" | "yeterli_hizli_hata";

export const TAKIP_SORUSU: Record<HedefeYakinlik, { baslik: string; secenekler: [TakipCevabi, string][] }> = {
  uzak: {
    baslik: "Bu konudaki soruları ne kadar çözüyorsun?",
    secenekler: [["az_hic", "Hiç"], ["az_az", "Az"], ["az_orta", "Orta"], ["az_yuksek", "Yüksek"]],
  },
  belirsiz: {
    baslik: "Bu konuyu tekrar etmen gerekiyor mu?",
    secenekler: [["orta_evet", "Evet, kesinlikle"], ["orta_biraz", "Biraz tekrar iyi olur"], ["orta_hayir", "Hayır, gerek yok"]],
  },
  yakin: {
    baslik: "Bu konudaki sorularda hızın ve doğruluğun nasıl?",
    secenekler: [["yeterli_hizli_dogru", "Hızlı ve doğru"], ["yeterli_dogru_yavas", "Doğru ama yavaş"], ["yeterli_hizli_hata", "Hızlı ama hatalı"]],
  },
};

// TAKIP_SORUSU'nun düz kod→etiket sözlüğü — "Konu Haritası" raporunda
// (Faz K3) en sık seçilen takip_cevabi kodunu insan-okunur göstermek için.
export const TAKIP_CEVABI_ETIKET: Record<TakipCevabi, string> = Object.fromEntries(
  Object.values(TAKIP_SORUSU).flatMap((s) => s.secenekler),
) as Record<TakipCevabi, string>;

export const VERIMLILIK_ETIKET: Record<VerimlilikDuzeyi, string> = {
  cok_dusuk: "Çok Düşük",
  dusuk: "Düşük",
  orta: "Orta",
  iyi: "İyi",
  cok_iyi: "Çok İyi",
};

export const DENEME_ZORLUGU_ETIKET: Record<DenemeZorlugu, string> = {
  kolay: "Kolay",
  orta: "Orta",
  zor: "Zor",
};

// Tek bir çalışma/soru çözümü oturumu için makul üst sınır (dakika) — bir
// öğrencinin yanlışlıkla haftalık/günlük TOPLAM süreyi tek bir alana girip
// (ör. "4000 dakika") istatistikleri bozmasını engellemek için. 480 dk = 8
// saat, tek oturum için zaten cömert bir üst sınır.
export const SURE_UST_SINIR = 480;

// Ders bazında ÖSYM'nin resmi TYT/AYT soru sayıları (2026). Deneme
// girerken doğru+yanlış toplamının bunu aşmaması için kullanılıyor.
// Kaynak: ÖSYM TYT-AYT soru dağılım tablosu.
const TYT_SORU_SAYISI: Record<string, number> = {
  "Türkçe": 40, "Matematik": 40, "Fizik": 7, "Kimya": 7, "Biyoloji": 6,
  "Tarih": 5, "Coğrafya": 5, "Felsefe": 5, "Din Kültürü": 5,
};

const AYT_SORU_SAYISI: Record<string, number> = {
  "Matematik": 40, "Fizik": 14, "Kimya": 13, "Biyoloji": 13,
  "Edebiyat": 24, "Tarih": 10, "Coğrafya": 6,
  "Tarih-1": 10, "Coğrafya-1": 6, "Tarih-2": 11, "Coğrafya-2": 11,
  "Felsefe Grubu": 12, "Din Kültürü": 6,
};

// 9-10-11. sınıf Branş Denemesi — kullanıcı isteğiyle (24.08.2026) yuvarlak/
// pratik bir dağılıma geçildi: Türkçe 30, Matematik 30, Fen 30 (Fizik/Kimya/
// Biyoloji'ye 10'ar), Sosyal 30 (Tarih 10, Coğrafya 10, Felsefe 5, Din
// Kültürü 5) — toplam 120 soru. Dersler artık TYT_DERSLERI'nin AYNISI
// (Türk Dili ve Edebiyatı/Sosyal Bilimler/Fen Bilimleri gibi BİRLEŞİK
// branş kavramı kaldırıldı) — bu sayede Branş'ın giriş formu TYT/AYT ile
// BİREBİR aynı yapıda: tek yayınevi alanı + ders başına D/Y girişi (bkz.
// OgrenciVeriGirisi.tsx DenemeForm, kullanıcı isteği "ikisinin de giriş
// şekilleri aynı olsun"). Tanım TYT_DERSLERI'ye ihtiyaç duyduğundan aşağıda,
// o tanımlandıktan hemen sonra (bkz. "export const BRANS_DENEMESI_DERSLERI").
const BRANS_SORU_SAYISI: Record<string, number> = {
  "Türkçe": 30, "Matematik": 30,
  "Fizik": 10, "Kimya": 10, "Biyoloji": 10,
  "Tarih": 10, "Coğrafya": 10, "Felsefe": 5, "Din Kültürü": 5,
};

export function dersSoruSayisi(tur: DenemeTuru, ders: string): number | undefined {
  const kaynak = tur === "TYT" ? TYT_SORU_SAYISI : tur === "AYT" ? AYT_SORU_SAYISI : BRANS_SORU_SAYISI;
  return kaynak[ders];
}

export function netHesapla(dogru: number, yanlis: number): number {
  return Math.round((dogru - yanlis / 4) * 100) / 100;
}

export const AYT_ALAN_ETIKET: Record<AytAlan, string> = {
  SAY: "Sayısal (SAY)",
  EA: "Eşit Ağırlık (EA)",
  SOZ: "Sözel (SÖZ)",
};

export const BRANS_LISTESI = [
  "Matematik",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Türkçe",
  "Edebiyat",
  "Tarih",
  "Coğrafya",
  "Felsefe",
  "Din Kültürü",
  "İngilizce",
  "Diğer",
] as const;

// Alan türüne göre "konu çalışma" / "soru çözümü" ders listeleri (TYT her zaman
// mevcut; AYT dersleri öğrencinin ayt_alan'ına göre değişir).
export const TYT_DERSLERI = [
  "Türkçe", "Matematik", "Fizik", "Kimya", "Biyoloji", "Tarih", "Coğrafya", "Felsefe", "Din Kültürü",
] as const;

// Branş Denemesi'nin ders listesi TYT ile birebir aynı (bkz. BRANS_SORU_SAYISI
// yukarıda) — sadece soru sayısı dağılımı farklı (yuvarlak/pratik değerler).
export const BRANS_DENEMESI_DERSLERI = TYT_DERSLERI;

export const AYT_DERSLERI: Record<AytAlan, readonly string[]> = {
  SAY: ["Matematik", "Fizik", "Kimya", "Biyoloji"],
  EA: ["Matematik", "Edebiyat", "Tarih", "Coğrafya"],
  SOZ: ["Edebiyat", "Tarih-1", "Coğrafya-1", "Tarih-2", "Coğrafya-2", "Felsefe Grubu", "Din Kültürü"],
};

// ============ Rozet sistemi v2 (kategori bazlı, canlı durum) ============
// Her kategori kendi ödül eşiklerine sahip; genel "SEFU KOÇ" rozeti bu
// üçünün kaç tanesinin altın olduğuna göre türetiliyor (bkz. migration
// 0029, rozet_kontrol_et). Rozetler KALICI DEĞİL — Duolingo mantığıyla,
// öğrenci pas geçtiğinde seviye düşebilir/sıfırlanabilir.
export type RozetKategori = "konu" | "soru" | "deneme" | "genel";
export type RozetSeviye = "yok" | "bronz" | "gumus" | "altin";

export const ROZET_SEVIYE_ETIKET: Record<RozetSeviye, string> = {
  yok: "Henüz yok",
  bronz: "Bronz",
  gumus: "Gümüş",
  altin: "Altın",
};

// Her kategoride geriye dönük veri girişi bu kadar günle sınırlı — hem tarih
// seçicide (client) hem server action'da (tarihDogrula) hem DB check
// constraint'inde uygulanıyor. Sınırın kendisi aynı zamanda "kaç gün
// girmezsen veliye bildirim gider" eşiğiyle birebir örtüşüyor (bkz.
// api/cron/hatirlatmalar).
export const KATEGORI_GERIYE_DONUK_SINIR: Record<"konu" | "soru" | "deneme", number> = {
  konu: 3,
  soru: 3,
  deneme: 7,
};

// Soru çözümü rozeti, TYT'nin bu 5 "çekirdek" dersinde AYRI AYRI son 3 günün
// toplamına bakıyor — hepsi eşiği geçmeden tier atlanmıyor.
export const SORU_ROZET_DERSLERI = ["Türkçe", "Matematik", "Fizik", "Kimya", "Biyoloji"] as const;
