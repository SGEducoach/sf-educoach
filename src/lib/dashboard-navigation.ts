import type { UserRole } from "@/lib/types";

export type DashboardBolumu =
  | "ozet"
  | "gorevler"
  | "veri-girisi"
  | "analiz"
  | "yapay-zeka"
  | "rozetler"
  | "tg-denemeleri"
  | "duyurular"
  | "talepler"
  | "onaylar"
  | "dersler";

export type DashboardIkonu = "ana-sayfa" | "gorev" | "veri" | "analiz" | "ai" | "rozet" | "takvim" | "duyuru" | "talep" | "onay" | "ders";

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
  { bolum: "veri-girisi", href: "/dashboard/veri-girisi", etiket: "Veri girişi", ikon: "veri" },
  { bolum: "analiz", href: "/dashboard/analiz", etiket: "Analiz / Rapor", ikon: "analiz" },
  { bolum: "yapay-zeka", href: "/dashboard/yapay-zeka", etiket: "Yapay Zekâ Analizi", ikon: "ai" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeleri", ikon: "takvim" },
];

const VELI_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Çocuklarım", ikon: "ana-sayfa" },
  { bolum: "analiz", href: "/dashboard/analiz", etiket: "Analiz / Rapor", ikon: "analiz" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeleri", ikon: "takvim" },
];

const OGRETMEN_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Sınıflarım", ikon: "ana-sayfa" },
  { bolum: "gorevler", href: "/dashboard/gorevler", etiket: "Görev ver", ikon: "gorev" },
  { bolum: "onaylar", href: "/dashboard/onaylar", etiket: "Bekleyen onaylar", ikon: "onay" },
  { bolum: "dersler", href: "/dashboard/dersler", etiket: "Derslerim", ikon: "ders" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Duyurular", ikon: "duyuru" },
  { bolum: "talepler", href: "/dashboard/talepler", etiket: "Veli talepleri", ikon: "talep" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeleri", ikon: "takvim" },
];

const MUDUR_MENUSU: DashboardMenuOgesi[] = [
  { bolum: "ozet", href: "/dashboard", etiket: "Sınıflar", ikon: "ana-sayfa" },
  { bolum: "duyurular", href: "/dashboard/duyurular", etiket: "Duyurular", ikon: "duyuru" },
  { bolum: "talepler", href: "/dashboard/talepler", etiket: "Veli talepleri", ikon: "talep" },
  { bolum: "tg-denemeleri", href: "/dashboard/tg-denemeleri", etiket: "TG Denemeleri", ikon: "takvim" },
];

export function dashboardMenusu(role: UserRole): DashboardMenuOgesi[] {
  if (role === "ogrenci") return OGRENCI_MENUSU;
  if (role === "veli") return VELI_MENUSU;
  if (role === "ogretmen") return OGRETMEN_MENUSU;
  if (role === "mudur") return MUDUR_MENUSU;
  return [];
}

export const DASHBOARD_ROUTE_BOLUMLERI = new Set<DashboardBolumu>([
  "gorevler", "veri-girisi", "analiz", "yapay-zeka", "rozetler", "tg-denemeleri",
  "duyurular", "talepler", "onaylar", "dersler",
]);
