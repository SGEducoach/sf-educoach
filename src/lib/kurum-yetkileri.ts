import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { bugununTarihiTR } from "@/lib/tarih";

export const KURUM_MODULLERI = [
  { key: "gorevler", ad: "Görevler ve onaylar" },
  { key: "program", ad: "Çalışma programı" },
  { key: "calisma", ad: "Çalışma kayıtları" },
  { key: "konular", ad: "Konu hakimiyeti" },
  { key: "analiz", ad: "Analiz ve raporlar" },
  { key: "denemeler", ad: "Denemeler" },
  { key: "pano", ad: "Kurum panosu" },
  { key: "duyurular", ad: "Duyuru ve talepler" },
  { key: "rehberlik", ad: "Rehberlik" },
  { key: "dersler", ad: "Dersler" },
  { key: "yurt", ad: "Yurt" },
  { key: "gelisim", ad: "Gelişim raporu" },
  { key: "yonetim", ad: "Kurum yönetimi" },
  { key: "sms", ad: "SMS modülü" },
] as const;

export type KurumModulu = (typeof KURUM_MODULLERI)[number]["key"];
export type KurumModulYetkileri = Partial<Record<KurumModulu, boolean>>;

// Eksik anahtar normalde "açık" sayılır (geçiş uyumluluğu). SMS bunun dışında:
// kurumun kendi SMS paketi bağlanmadan işe yaramaz ve yönetici açıkça açana
// kadar kapalı kalır (kullanıcı kararı 28.10.2026).
const VARSAYILAN_KAPALI_MODULLER: readonly KurumModulu[] = ["sms"];

const BOLUM_MODULU: Partial<Record<DashboardBolumu, KurumModulu>> = {
  gorevler: "gorevler", onaylar: "gorevler", "ortaokul-onaylar": "gorevler",
  planlar: "program", "program-destegi": "program",
  "veri-girisi": "calisma", "ortaokul-calisma": "calisma",
  "konu-hakimiyeti": "konular", "yapay-zeka": "konular", "ortaokul-yeterlilik": "konular",
  analiz: "analiz", "sinif-analizi": "analiz", "kurum-performansi": "analiz", kapsamim: "analiz", "ogrenci-takibi": "analiz", "takip-bildirimleri": "analiz",
  denemeler: "denemeler", "tg-denemeleri": "pano",
  duyurular: "duyurular", talepler: "duyurular",
  rehberlik: "rehberlik", "ortaokul-yardim": "rehberlik", "mezun-takip": "rehberlik",
  dersler: "dersler", "ortaokul-dersler": "dersler", takvim: "dersler", yarismalar: "dersler",
  yoklama: "yurt", nobetlerim: "yurt", "yurt-ogrencileri": "yurt",
  "yurt-nobet-listesi": "yurt", "yurt-takas-talepleri": "yurt", "belletmen-basvurulari": "yurt",
  "ilkokul-gelisim": "gelisim", ogretmenler: "yonetim", ogrenciler: "yonetim",
  sms: "sms",
};

export function kurumModuluAcikMi(yetkiler: KurumModulYetkileri | null | undefined, modul: KurumModulu): boolean {
  const deger = yetkiler?.[modul];
  return VARSAYILAN_KAPALI_MODULLER.includes(modul) ? deger === true : deger !== false;
}

export function kurumBolumuAcikMi(yetkiler: KurumModulYetkileri | null | undefined, bolum: DashboardBolumu): boolean {
  const modul = BOLUM_MODULU[bolum];
  return !modul || kurumModuluAcikMi(yetkiler, modul);
}

export function moderatorBolumuAcikMi(yetkiler: KurumModulYetkileri | null | undefined, bolum: string): boolean {
  if (bolum === "profil") return true;
  if (bolum === "deneme-yukle" || bolum === "pdf-eslesme") return kurumModuluAcikMi(yetkiler, "denemeler");
  if (bolum === "konu-haritasi" || bolum === "kurum-konulari") return kurumModuluAcikMi(yetkiler, "konular");
  if (bolum === "sms") return kurumModuluAcikMi(yetkiler, "sms");
  return kurumModuluAcikMi(yetkiler, "yonetim");
}

export function kurumErisimiKapaliMi(kurum: {
  grupMu?: boolean; aktif?: boolean; manuelAktif?: boolean; kullanimBitisTarihi?: string | null;
} | null | undefined, bugun = bugununTarihiTR()): boolean {
  if (!kurum || kurum.grupMu) return false;
  return kurum.aktif === false || kurum.manuelAktif === false ||
    (!!kurum.kullanimBitisTarihi && kurum.kullanimBitisTarihi < bugun);
}

export const KURUM_BAGLANTI_HATASI = "Kurumla bağlantı sağlanamadı";
