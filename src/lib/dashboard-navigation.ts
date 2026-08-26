import type { KurumTuru, UserRole } from "@/lib/types";
import { REHBER_BRANSI } from "@/lib/rehberlik";

export type DashboardBolumu =
  | "ozet"
  | "gorevler"
  | "planlar"
  | "veri-girisi"
  | "konu-hakimiyeti"
  | "analiz"
  | "yapay-zeka"
  | "rozetler"
  | "tg-denemeleri"
  | "duyurular"
  | "talepler"
  | "onaylar"
  | "dersler"
  | "kurum-performansi"
  | "ogretmenler"
  | "ogrenciler"
  | "denemeler"
  // YÖNETİCİ (admin) paneline özel — bkz. ADMIN_MENUSU
  | "kullanicilar"
  | "pdf-eslesme"
  | "okullar"
  | "moderatorler"
  | "icerik"
  | "kurallar"
  | "profil"
  // Faz G (2026-08-25) — hata bildirimleri, admin panelinde ayrı bölüm.
  | "hata-bildirimleri"
  // Faz 3 (2026-08-26) — okul admin rolü genişletmesi.
  | "site-ayarlari"
  | "adminler"
  | "islem-gecmisi"
  // 2026-08-26 kullanıcı isteği — Rehber Öğretmen branşına özel bölüm.
  | "rehberlik";

export type DashboardIkonu =
  | "ana-sayfa" | "gorev" | "plan" | "veri" | "hakimiyet" | "analiz" | "ai" | "rozet" | "takvim" | "duyuru" | "talep" | "onay" | "ders"
  | "ogretmen" | "ogrenci" | "deneme"
  | "kullanici" | "eslestir" | "okul" | "moderator" | "icerik" | "kural" | "profil" | "hata"
  | "ayarlar" | "admin" | "gecmis" | "rehberlik";

export interface DashboardMenuOgesi {
  bolum: DashboardBolumu;
  href: string;
  etiket: string;
  ikon: DashboardIkonu;
}

const OGRENCI_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Ana sayfa", ikon: "ana-sayfa" },
  { bolum: "rozetler", href: "/dashboard/rozetler", etiket: "Rozetlerim", ikon: "rozet" },
  { bolum: "gorevler", href: "/dashboard/gorevler", etiket: "Görevlerim", ikon: "gorev" },
  { bolum: "planlar", href: "/dashboard/planlar", etiket: "Program yap", ikon: "plan" },
  { bolum: "veri-girisi", href: "/dashboard/veri-girisi", etiket: "Veri girişi", ikon: "veri" },
  { bolum: "konu-hakimiyeti", href: "/dashboard/konu-hakimiyeti", etiket: "Konu Hakimiyeti", ikon: "hakimiyet" },
  { bolum: "analiz", href: "/dashboard/analiz", etiket: "Analiz / Rapor", ikon: "analiz" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Konu Haritası", ikon: "ai" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeler", ikon: "takvim" },
];

const VELI_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Çocuklarım", ikon: "ana-sayfa" },
  { bolum: "rozetler", href: "/dashboard/rozetler", etiket: "Rozetler", ikon: "rozet" },
  { bolum: "analiz", href: "/dashboard/analiz", etiket: "Analiz / Rapor", ikon: "analiz" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeler", ikon: "takvim" },
];

const OGRETMEN_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Sınıflarım", ikon: "ana-sayfa" },
  { bolum: "rozetler", href: "/dashboard/rozetler", etiket: "Rozetler", ikon: "rozet" },
  { bolum: "gorevler", href: "/dashboard/gorevler", etiket: "Ödev ver", ikon: "gorev" },
  { bolum: "onaylar", href: "/dashboard/onaylar", etiket: "Bekleyen onaylar", ikon: "onay" },
  { bolum: "dersler", href: "/dashboard/dersler", etiket: "Derslerim", ikon: "ders" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Konu Haritası", ikon: "ai" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Duyurular", ikon: "duyuru" },
  { bolum: "talepler", href: "/dashboard/talepler", etiket: "Veli talepleri", ikon: "talep" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeler", ikon: "takvim" },
];

const MUDUR_MENUSU: DashboardMenuOgesi[] = [
  // 2026-08-25 kullanıcı isteği: "dershane müdürünün ana sayfası okul
  // müdürlerinde de olsun" — dershaneAnaSayfaVerisiGetir/DershaneAnaSayfa
  // aslında kurum türünden bağımsız (sadece school_id alıyor), okul
  // müdürü için de olduğu gibi yeniden kullanıldı (bkz. dashboard/page.tsx
  // OgretmenIcerik). Varsayılan bölüm (dashboard/page.tsx varsayilanBolum)
  // okul müdürü için de buraya çekildi — dershane müdürüyle aynı ilk
  // deneyim.
  { bolum: "kurum-performansi", href: "/dashboard/kurum-performansi", etiket: "Ana Sayfa", ikon: "ana-sayfa" },
  // Bug düzeltmesi (26.08.2026 kullanıcı bulgusu): href bare "/dashboard"
  // idi — dashboard/page.tsx'teki varsayilanBolum mantığı (satır ~105) bu
  // rol/kurum kombinasyonu için varsayılanı zaten "kurum-performansi" (Ana
  // Sayfa ile AYNI) yaptığından, bölüm parametresi olmadan "Sınıflar"a
  // tıklamak "Ana Sayfa"yı tekrar açıyor, hiçbir şey olmuyormuş gibi
  // görünüyordu. Ayrıca müdürün "Öğrenciler (salt-okunur liste/profil/
  // performans)" isteğini de bu bölüm zaten karşılıyor (OgretmenPanel'in
  // "ozet" görünümü — sınıf seç, öğrenciye tıkla, profil+performansı gör;
  // ban/sil/rozet gibi müdahale butonu yok) — bu yüzden ayrı bir ekran
  // açmak yerine etiket buna göre güncellendi.
  { bolum: "ozet", href: "/dashboard?bolum=ozet", etiket: "Öğrenciler", ikon: "ogrenci" },
  // 2026-08-25 kullanıcı isteği: "dershane ve okul müdürü öğretmenlerin
  // programlarını görsün" — okul müdürü salt-okunur (bkz. dashboard/page.tsx
  // OgretmenIcerik yorumu; dershane müdürü zaten kendi ayrı panelinde
  // düzenleyebiliyordu).
  { bolum: "ogretmenler", href: "/dashboard/ogretmenler", etiket: "Öğretmenler", ikon: "ogretmen" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Konu Haritası", ikon: "ai" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Duyurular", ikon: "duyuru" },
  { bolum: "talepler", href: "/dashboard/talepler", etiket: "Veli talepleri", ikon: "talep" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeler", ikon: "takvim" },
];

// DERSHANE MODU (Faz D3) — dershane müdürü okul müdüründen tamamen farklı
// bir menü görüyor: gözlemci değil, kendi kurumunda öğretmen/öğrenci
// CRUD'u yapabilen bir yönetici (bkz. src/app/dashboard/actions.ts
// requireDershaneMudur). "duyurular"/"tg-denemeleri"/"yapay-zeka" mevcut,
// paylaşılan bölümler — yeniden tanımlanmadı. "ozet" (Ana Sayfa — kademe
// bazlı performans) başlangıçta yoktu, sonradan eklendi ve varsayılan
// (giriş sonrası ilk açılan) sekme yapıldı — bkz. dashboard/page.tsx
// varsayilanBolum.
const DERSHANE_MUDUR_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Ana Sayfa", ikon: "ana-sayfa" },
  { bolum: "ogretmenler", href: "/dashboard/ogretmenler", etiket: "Öğretmenler", ikon: "ogretmen" },
  { bolum: "ogrenciler", href: "/dashboard/ogrenciler", etiket: "Öğrenciler", ikon: "ogrenci" },
  { bolum: "denemeler", href: "/dashboard/denemeler", etiket: "Denemeler", ikon: "deneme" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Konu Haritası", ikon: "ai" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Duyurular", ikon: "duyuru" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeler", ikon: "takvim" },
];

// Admin (yönetici) paneli de artık diğer roller gibi tek bir sol menü +
// aktif bölüm mantığıyla çalışıyor (bkz. src/app/yonetici/page.tsx) —
// önceden tek bir sayfada üst üste dizilmiş bölümlerdi. "talepler" ve
// "rozetler" diğer rollerle aynı bölüm adını (ve ikonunu) kasıtlı olarak
// paylaşıyor, aynı kavram (veli talebi / rozet görüntüleme) sadece kapsamı
// platform genelinde.
const ADMIN_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/yonetici", etiket: "Genel bakış", ikon: "ana-sayfa" },
  { bolum: "kullanicilar", href: "/yonetici/kullanicilar", etiket: "Kullanıcılar", ikon: "kullanici" },
  { bolum: "talepler", href: "/yonetici/talepler", etiket: "Veli talepleri", ikon: "talep" },
  { bolum: "pdf-eslesme", href: "/yonetici/pdf-eslesme", etiket: "PDF Eşleştirme", ikon: "eslestir" },
  { bolum: "okullar", href: "/yonetici/okullar", etiket: "Okullar & Duyuru", ikon: "okul" },
  { bolum: "moderatorler", href: "/yonetici/moderatorler", etiket: "Moderatörler", ikon: "moderator" },
  { bolum: "kurallar", href: "/yonetici/kurallar", etiket: "Kurallar", ikon: "kural" },
  { bolum: "hata-bildirimleri", href: "/yonetici/hata-bildirimleri", etiket: "Hata Bildirimleri", ikon: "hata" },
  { bolum: "rozetler", href: "/yonetici/rozetler", etiket: "Rozetler", ikon: "rozet" },
  // 2026-08-26 kullanıcı isteği: "Konu anlatımları" -> "Konu özetleri"
  // olarak yeniden adlandırıldı ve Konu Haritası'nın hemen üstüne taşındı
  // (önceden Moderatörler'in altındaydı, ikisi arasında 3 öge vardı).
  { bolum: "icerik", href: "/yonetici/icerik", etiket: "Konu özetleri", ikon: "icerik" },
  { bolum: "yapay-zeka", href: "/yonetici/yapay-zeka", etiket: "Konu Haritası", ikon: "ai" },
  // Faz 3 (2026-08-26) — İşlem Geçmişi ("Son işlemler"in taşındığı yer),
  // Site ayarları (bakım modu) ve Adminler (admin hesapları SADECE burada
  // görünür) — hepsi menünün sonunda, Profilim'den önce.
  { bolum: "islem-gecmisi", href: "/yonetici/islem-gecmisi", etiket: "İşlem Geçmişi", ikon: "gecmis" },
  { bolum: "site-ayarlari", href: "/yonetici/site-ayarlari", etiket: "Site ayarları", ikon: "ayarlar" },
  { bolum: "adminler", href: "/yonetici/adminler", etiket: "Adminler", ikon: "admin" },
  { bolum: "profil", href: "/yonetici/profil", etiket: "Profilim", ikon: "profil" },
];

// 2026-08-26 kullanıcı isteği — Rehber Öğretmen branşındaki bir öğretmene
// ek bir menü ögesi (bkz. REHBER_BRANSI, src/lib/rehberlik.ts). brans
// parametresi opsiyonel — sadece "ogretmen" rolünde ve o branşta anlamlı,
// diğer tüm çağrılarda (admin, öğrenci, veli, müdür) yok sayılır.
const REHBERLIK_MENU_OGESI: DashboardMenuOgesi =
  { bolum: "rehberlik", href: "/dashboard/rehberlik", etiket: "Rehberlik", ikon: "rehberlik" };

export function dashboardMenusu(role: UserRole, kurumTuru?: KurumTuru, brans?: string): DashboardMenuOgesi[] {
  if (role === "ogrenci") return OGRENCI_MENUSU;
  if (role === "veli") return VELI_MENUSU;
  if (role === "ogretmen") return brans === REHBER_BRANSI ? [...OGRETMEN_MENUSU, REHBERLIK_MENU_OGESI] : OGRETMEN_MENUSU;
  if (role === "mudur") return kurumTuru === "dershane" ? DERSHANE_MUDUR_MENUSU : MUDUR_MENUSU;
  if (role === "admin") return ADMIN_MENUSU;
  return [];
}

export const DASHBOARD_ROUTE_BOLUMLERI = new Set<DashboardBolumu>([
  "gorevler", "planlar", "veri-girisi", "konu-hakimiyeti", "analiz", "yapay-zeka", "rozetler", "tg-denemeleri",
  "duyurular", "talepler", "onaylar", "dersler", "kurum-performansi", "ogretmenler", "ogrenciler", "denemeler", "rehberlik",
]);

// /yonetici/[bolum] catch-all için — "rozetler" burada YOK, çünkü admin'in
// kendi çok-okullu rozet sayfası (/yonetici/rozetler) zaten ayrı, kendi
// mantığı olan bir route (bkz. o dosyadaki okul seçici) — literal route
// dinamik [bolum]'dan her zaman önceliklidir, çakışma olmaz.
export const YONETICI_ROUTE_BOLUMLERI = new Set<DashboardBolumu>([
  "kullanicilar", "talepler", "pdf-eslesme", "okullar", "moderatorler", "icerik", "kurallar", "profil", "hata-bildirimleri",
  "islem-gecmisi", "site-ayarlari", "adminler",
]);
