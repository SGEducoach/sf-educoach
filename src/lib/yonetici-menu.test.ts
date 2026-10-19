import { describe, expect, it } from "vitest";
import { YONETICI_ROUTE_BOLUMLERI, dashboardMenuYapisi, dashboardMenusu, menuGrubuMu } from "@/lib/dashboard-navigation";
import { yanitBekleyenKonusmaSayisi } from "@/lib/yonetici-bekleyen-isler";

const grup = (baslik: string) => {
  const k = dashboardMenuYapisi("admin").find((kalem) => menuGrubuMu(kalem) && kalem.baslik === baslik);
  return k && menuGrubuMu(k) ? k.ogeler.map((o) => o.bolum) : [];
};

describe("admin menüsü (20.10.2026 düzeni)", () => {
  it("iletişim tek öğe; mesaj, WhatsApp ve duyuru geçmişi menüde ayrı durmaz", () => {
    const menu = dashboardMenuYapisi("admin");
    expect(menu.slice(0, 2).map((k) => (menuGrubuMu(k) ? k.baslik : k.bolum))).toEqual(["ozet", "iletisim"]);
    const duz = dashboardMenusu("admin").map((o) => o.bolum);
    for (const eski of ["mesajlar", "whatsapp-yonetimi", "duyuru-gecmisi"] as const) {
      expect(duz).not.toContain(eski);
      // Eski adres açılır ve İletişim sekmesine yönlenir.
      expect(YONETICI_ROUTE_BOLUMLERI.has(eski)).toBe(true);
    }
  });

  it("onay bekleyen işler ve yetkiler Kullanıcılar grubunda; site içeriği Site grubunda", () => {
    expect(grup("Kullanıcılar")).toEqual(["kullanici-yonetimi", "talepler", "belletmen-basvurulari", "moderatorler", "adminler"]);
    expect(grup("Kurumlar")).toEqual(["okullar", "grup-kocluk"]);
    expect(grup("Site")).toEqual(["site-ayarlari", "blog", "kurallar"]);
    expect(grup("Deneme ve İçerik")).not.toContain("blog");
  });

  it("menüdeki her admin bölümünün adresi açılır", () => {
    for (const o of dashboardMenusu("admin")) {
      if (o.bolum === "ozet" || o.bolum === "google-analytics" || o.bolum === "yapay-zeka") continue; // kendi sayfaları var
      expect(YONETICI_ROUTE_BOLUMLERI.has(o.bolum)).toBe(true);
    }
  });
});

describe("yanıt bekleyen yazışma", () => {
  it("son mesajı kurum yetkilisinden gelen konuşma sayılır", () => {
    const mesajlar = [
      { kurum_yetkilisi_id: "a", gonderen_id: "a" },     // a: son mesaj yetkiliden → bekliyor
      { kurum_yetkilisi_id: "b", gonderen_id: "admin" }, // b: son mesaj adminden → yanıtlandı
      { kurum_yetkilisi_id: "a", gonderen_id: "admin" },
      { kurum_yetkilisi_id: "b", gonderen_id: "b" },
    ];
    expect(yanitBekleyenKonusmaSayisi(mesajlar)).toBe(1);
  });
});
