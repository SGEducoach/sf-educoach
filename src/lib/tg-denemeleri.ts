import { tgDenemeDosyaUrl, type TgDenemeIlani } from "@/lib/tg-deneme-ilanlari";
import { tgDenemeBitisTarihi } from "@/lib/tg-deneme-tarih";
import { bugununTarihiTR } from "@/lib/tarih";

export interface TgDenemeHaberi {
  id: string;
  kategori: "Genel takvim" | "Yayın takvimi" | "Duyuru";
  baslik: string;
  aciklama: string;
  tarihEtiketi: string;
  sonTarih: string;
  gorsel: string;
  genislik: number;
  yukseklik: number;
  alt: string;
  kaynakHref?: string;
  // Google Drive bypass planı (27.08.2026) — admin panelinden eklenen
  // ilanlar PDF olabilir; bu durumda `gorsel` boş kalır, TgDenemeleri.tsx
  // <embed> ile tarayıcının kendi PDF görüntüleyicisini kullanır (bkz. o
  // dosyadaki render mantığı). Belirtilmemişse (statik takvim kayıtları)
  // "resim" kabul edilir.
  dosyaTipi?: "resim" | "pdf";
}

// Haber alanında en fazla 10 kayıt gösterilir. Yeni afiş geldiğinde en güncel
// kayıtlar bu listeye eklenir; sonTarih alanı GEÇTİ mührünü otomatik yönetir.
export const TG_DENEME_HABERLERI: TgDenemeHaberi[] = [
  {
    id: "limit-9-10-11-genel-takvim",
    kategori: "Genel takvim",
    baslik: "9, 10 ve 11. Sınıf Genel Deneme Takvimi",
    aciklama: "Limit Yayınları 2026-2027 kurumsal deneme sınavları genel takvimi.",
    tarihEtiketi: "18 Eylül 2026 - 14 Haziran 2027",
    sonTarih: "2027-06-14",
    gorsel: "/tg-denemeleri/genel-takvim-9-10-11.png",
    genislik: 893,
    yukseklik: 1263,
    alt: "9, 10 ve 11. sınıf 2026-2027 kurumsal deneme sınav takvimi",
    kaynakHref: "/tg-denemeleri/limit-genel-takvim.pdf",
  },
  {
    id: "limit-tyt-ayt-genel-takvim",
    kategori: "Genel takvim",
    baslik: "TYT-AYT Genel Deneme Takvimi",
    aciklama: "Limit Yayınları TYT ve AYT kurumsal deneme sınavlarının yıllık takvimi.",
    tarihEtiketi: "18 Eylül 2026 - 14 Haziran 2027",
    sonTarih: "2027-06-14",
    gorsel: "/tg-denemeleri/genel-takvim-tyt-ayt.png",
    genislik: 893,
    yukseklik: 1263,
    alt: "TYT ve AYT 2026-2027 kurumsal deneme sınav takvimi",
    kaynakHref: "/tg-denemeleri/limit-genel-takvim.pdf",
  },
  {
    id: "isler-lise-genel",
    kategori: "Yayın takvimi",
    baslik: "İşler Kitabevleri Lise Grubu Takvimi",
    aciklama: "TYT, AYT ve MSÜ denemelerinin 2026-2027 Türkiye geneli uygulama tarihleri.",
    tarihEtiketi: "9 Ekim 2026 - 6 Haziran 2027",
    sonTarih: "2027-06-06",
    gorsel: "/tg-denemeleri/isler-lise-genel.jpeg",
    genislik: 1131,
    yukseklik: 1600,
    alt: "İşler Kitabevleri lise grubu Türkiye geneli deneme sınavları takvimi",
  },
  {
    id: "isler-11-sinif",
    kategori: "Yayın takvimi",
    baslik: "11. Sınıflar İçin 2028 Hazırlık Takvimi",
    aciklama: "İşler Kitabevleri 11. sınıflar için Türkiye geneli deneme sınavları.",
    tarihEtiketi: "23 Ağustos 2026 - 6 Haziran 2027",
    sonTarih: "2027-06-06",
    gorsel: "/tg-denemeleri/isler-11-sinif.jpeg",
    genislik: 1131,
    yukseklik: 1600,
    alt: "11. sınıflar için 2028 üniversite sınavına hazırlık deneme takvimi",
  },
  {
    id: "kr-akademi-genel",
    kategori: "Yayın takvimi",
    baslik: "KR Akademi Türkiye Geneli Takvim",
    aciklama: "Lise grubu kurumsal denemelerin 2026-2027 eğitim yılı genel programı.",
    tarihEtiketi: "25 Eylül 2026 - 14 Haziran 2027",
    sonTarih: "2027-06-14",
    gorsel: "/tg-denemeleri/kr-akademi-genel.jpeg",
    genislik: 1440,
    yukseklik: 2560,
    alt: "KR Akademi 2026-2027 Türkiye geneli kurumsal deneme takvimi",
  },
  {
    id: "kr-akademi-secili",
    kategori: "Yayın takvimi",
    baslik: "KR Akademi Seçili Denemeler",
    aciklama: "Maarif, TYT, AYT ve MSÜ denemeleri için öne çıkan uygulama tarihleri.",
    tarihEtiketi: "23 Ekim 2026 - 14 Haziran 2027",
    sonTarih: "2027-06-14",
    gorsel: "/tg-denemeleri/kr-akademi-secili.jpeg",
    genislik: 1440,
    yukseklik: 2560,
    alt: "KR Akademi seçili TYT AYT MSÜ deneme sınavları takvimi",
  },
  {
    id: "karekok-genel",
    kategori: "Yayın takvimi",
    baslik: "Karekök Yayınları Deneme Takvimi",
    aciklama: "9, 10 ve 11. sınıflar ile TYT-AYT grubu süreç değerlendirme takvimi.",
    tarihEtiketi: "30 Ekim 2026 - 4 Haziran 2027",
    sonTarih: "2027-06-04",
    gorsel: "/tg-denemeleri/karekok-genel.jpeg",
    genislik: 1600,
    yukseklik: 1136,
    alt: "Karekök Yayınları 2026-2027 deneme takvimi",
  },
  {
    id: "limit-turkiye-geneli",
    kategori: "Yayın takvimi",
    baslik: "Limit Türkiye Geneli TYT-AYT",
    aciklama: "Limit Yayınları Türkiye geneli TYT-AYT deneme sınavları.",
    tarihEtiketi: "3 Aralık 2026 - 6 Haziran 2027",
    sonTarih: "2027-06-06",
    gorsel: "/tg-denemeleri/limit-turkiye-geneli.jpeg",
    genislik: 900,
    yukseklik: 1600,
    alt: "Limit Yayınları Türkiye geneli TYT AYT deneme sınavı tarihleri",
  },
  {
    id: "toder-genel",
    kategori: "Yayın takvimi",
    baslik: "TÖDER YKS Genel Deneme Tarihleri",
    aciklama: "TÖDER Yayınları 2026-2027 TYT ve YKS genel deneme sınavları.",
    tarihEtiketi: "6 Kasım 2026 - 30 Mayıs 2027",
    sonTarih: "2027-05-30",
    gorsel: "/tg-denemeleri/toder-genel.jpeg",
    genislik: 1054,
    yukseklik: 1492,
    alt: "TÖDER 2026-2027 TYT ve YKS genel deneme sınavı tarihleri",
  },
  {
    id: "yayinlar-ortak-takvim",
    kategori: "Yayın takvimi",
    baslik: "Yayınlar Ortak Deneme Takvimi",
    aciklama: "Ergi, Bıyıklı Matematik, Format ve Paraf Akademi denemelerinin toplu takvimi.",
    tarihEtiketi: "Ekim 2026 - Haziran 2027",
    sonTarih: "2027-06-06",
    gorsel: "/tg-denemeleri/yayinlar-ortak-takvim.jpeg",
    genislik: 900,
    yukseklik: 1600,
    alt: "Farklı yayınların 2026-2027 toplu deneme sınavı takvimi",
  },
];

// Google Drive bypass planı (27.08.2026) — admin panelinden eklenen
// ilanlar, yukarıdaki elle bakımı yapılan takvim listesinin BAŞINA
// (en yeni ilan en önde) ekleniyor; statik takvim listesi bilinçli olarak
// hiç değiştirilmedi/silinmedi, sonuna aynen ekleniyor. Arşivleme (20
// ilan sınırı) SADECE admin ilanları için geçerli — bkz. tg-deneme-ilanlari.ts.
export function tgDenemeAkisiOlustur(dbIlanlari: TgDenemeIlani[], bugun = bugununTarihiTR()): TgDenemeHaberi[] {
  const donusturulmus: TgDenemeHaberi[] = dbIlanlari.map((ilan) => ({
    id: `ilan-${ilan.id}`,
    kategori: "Duyuru",
    baslik: ilan.baslik,
    aciklama: ilan.aciklama,
    // Serbest metin korunur; açık bitiş tarihi varsa akıştan zamanında çıkarılır.
    tarihEtiketi: ilan.tarih,
    sonTarih: tgDenemeBitisTarihi(ilan.tarih) ?? "9999-12-31",
    gorsel: ilan.dosyaTipi === "resim" ? tgDenemeDosyaUrl(ilan.dosyaYolu) : "",
    genislik: ilan.genislik ?? 1200,
    yukseklik: ilan.yukseklik ?? 1600,
    alt: ilan.baslik,
    kaynakHref: ilan.dosyaTipi === "pdf" ? tgDenemeDosyaUrl(ilan.dosyaYolu) : undefined,
    dosyaTipi: ilan.dosyaTipi,
  }));
  return [...donusturulmus, ...TG_DENEME_HABERLERI].filter(ilan => ilan.sonTarih >= bugun);
}
