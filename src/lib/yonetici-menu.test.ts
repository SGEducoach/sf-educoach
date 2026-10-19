import { describe, expect, it } from "vitest";
import { dashboardMenuYapisi, menuGrubuMu } from "@/lib/dashboard-navigation";

describe("admin menüsü", () => {
  it("kullanıcı yönetimini tek öğe yapar ve belletmen başvurusunu kurumlara yerleştirir", () => {
    const menu = dashboardMenuYapisi("admin");
    const kullanici = menu.find((kalem) => !menuGrubuMu(kalem) && kalem.bolum === "kullanici-yonetimi");
    const kurumlar = menu.find((kalem) => menuGrubuMu(kalem) && kalem.baslik === "Kurumlar");

    expect(kullanici).toMatchObject({ etiket: "Kullanıcı Yönetimi" });
    expect(kurumlar && menuGrubuMu(kurumlar) && kurumlar.ogeler.map((oge) => oge.bolum))
      .toContain("belletmen-basvurulari");
    expect(menu.some((kalem) => menuGrubuMu(kalem) && kalem.baslik.includes("Kullanıcı"))).toBe(false);
  });
});
