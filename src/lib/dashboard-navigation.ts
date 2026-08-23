import type { KurumTuru, UserRole } from "@/lib/types";

export type DashboardBolumu =
  | "ozet"
  | "gorevler"
  | "planlar"
  | "veri-girisi"
  | "analiz"
  | "yapay-zeka"
  | "rozetler"
  | "tg-denemeleri"
  | "duyurular"
  | "talepler"
  | "onaylar"
  | "dersler"
  | "ogretmenler"
  | "ogrenciler"
  | "denemeler"
  // YÖNETİCİ (admin) paneline özel — bkz. ADMIN_MENUSU
  | "kullanicilar"
  | "pdf-eslesme"
  | "okullar"
  | "moderatorler"
  | "icerik"
  | "kurallar";

export type DashboardIkonu =
  | "ana-sayfa" | "gorev" | "plan" | "veri" | "analiz" | "ai" | "rozet" | "takvim" | "duyuru" | "talep" | "onay" | "ders"
  | "ogretmen" | "ogrenci" | "deneme"
  | "kullanici" | "eslestir" | "okul" | "moderator" | "icerik" | "kural";

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
  { bolum: "planlar", href: "/dashboard/planlar", etiket: "Plan yap", ikon: "plan" },
  { bolum: "veri-girisi", href: "/dashboard/veri-girisi", etiket: "Veri girişi", ikon: "veri" },
  { bolum: "analiz", href: "/dashboard/analiz", etiket: "Analiz / Rapor", ikon: "analiz" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Yapay Zekâ Analizi", ikon: "ai" },
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
  { bolum: "gorevler", href: "/dashboard/gorevler", etiket: "Görev ver", ikon: "gorev" },
  { bolum: "onaylar", href: "/dashboard/onaylar", etiket: "Bekleyen onaylar", ikon: "onay" },
  { bolum: "dersler", href: "/dashboard/dersler", etiket: "Derslerim", ikon: "ders" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Duyurular", ikon: "duyuru" },
  { bolum: "talepler", href: "/dashboard/talepler", etiket: "Veli talepleri", ikon: "talep" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeler", ikon: "takvim" },
];

const MUDUR_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Sınıflar", ikon: "ana-sayfa" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Duyurular", ikon: "duyuru" },
  { bolum: "talepler", href: "/dashboard/talepler", etiket: "Veli talepleri", ikon: "talep" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeler", ikon: "takvim" },
];

// DERSHANE MODU (Faz D3) — dershane müdürü okul müdüründen tamamen farklı
// bir menü görüyor: gözlemci değil, kendi kurumunda öğretmen/öğrenci
// CRUD'u yapabilen bir yönetici (bkz. src/app/dashboard/actions.ts
// requireDershaneMudur). "duyurular"/"tg-denemeleri"/"yapay-zeka" mevcut,
// paylaşılan bölümler — yeniden tanımlanmadı.
const DERSHANE_MUDUR_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ogretmenler", href: "/dashboard/ogretmenler", etiket: "Öğretmenler", ikon: "ogretmen" },
  { bolum: "ogrenciler", href: "/dashboard/ogrenciler", etiket: "Öğrenciler", ikon: "ogrenci" },
  { bolum: "denemeler", href: "/dashboard/denemeler", etiket: "Denemeler", ikon: "deneme" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Yapay Zekâ Analizi", ikon: "ai" },
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
  { bolum: "icerik", href: "/yonetici/icerik", etiket: "Konu anlatımları", ikon: "icerik" },
  { bolum: "kurallar", href: "/yonetici/kurallar", etiket: "Kurallar", ikon: "kural" },
  { bolum: "rozetler", href: "/yonetici/rozetler", etiket: "Rozetler", ikon: "rozet" },
];

export function dashboardMenusu(role: UserRole, kurumTuru?: KurumTuru): DashboardMenuOgesi[] {
  if (role === "ogrenci") return OGRENCI_MENUSU;
  if (role === "veli") return VELI_MENUSU;
  if (role === "ogretmen") return OGRETMEN_MENUSU;
  if (role === "mudur") return kurumTuru === "dershane" ? DERSHANE_MUDUR_MENUSU : MUDUR_MENUSU;
  if (role === "admin") return ADMIN_MENUSU;
  return [];
}

export const DASHBOARD_ROUTE_BOLUMLERI = new Set<DashboardBolumu>([
  "gorevler", "planlar", "veri-girisi", "analiz", "yapay-zeka", "rozetler", "tg-denemeleri",
  "duyurular", "talepler", "onaylar", "dersler", "ogretmenler", "ogrenciler", "denemeler",
]);

// /yonetici/[bolum] catch-all için — "rozetler" burada YOK, çünkü admin'in
// kendi çok-okullu rozet sayfası (/yonetici/rozetler) zaten ayrı, kendi
// mantığı olan bir route (bkz. o dosyadaki okul seçici) — literal route
// dinamik [bolum]'dan her zaman önceliklidir, çakışma olmaz.
export const YONETICI_ROUTE_BOLUMLERI = new Set<DashboardBolumu>([
  "kullanicilar", "talepler", "pdf-eslesme", "okullar", "moderatorler", "icerik", "kurallar",
]);
