import { describe, expect, it } from "vitest";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { kurumBolumuAcikMi, kurumErisimiKapaliMi, moderatorBolumuAcikMi } from "@/lib/kurum-yetkileri";

describe("kurum süresi ve etkinliği", () => {
  it("bitiş gününde açık, ertesi gün kapalıdır", () => {
    const kurum = { aktif: true, manuelAktif: true, kullanimBitisTarihi: "2026-10-19" };
    expect(kurumErisimiKapaliMi(kurum, "2026-10-19")).toBe(false);
    expect(kurumErisimiKapaliMi(kurum, "2026-10-20")).toBe(true);
  });

  it("elle pasifleştirilen kurumu süresiz olsa da kapatır; eski kurumu açık tutar", () => {
    expect(kurumErisimiKapaliMi({ aktif: false, kullanimBitisTarihi: null })).toBe(true);
    expect(kurumErisimiKapaliMi({ aktif: true, kullanimBitisTarihi: null })).toBe(false);
  });
});

describe("paket modülleri", () => {
  it("kapalı modülü menüden ve doğrudan bölüm kontrolünden çıkarır", () => {
    const yetkiler = { program: false, konular: false };
    const bolumler = dashboardMenusu("ogrenci", "okul", undefined, false, "lise", false, null, yetkiler).map((m) => m.bolum);
    expect(bolumler).not.toContain("planlar");
    expect(bolumler).not.toContain("konu-hakimiyeti");
    expect(bolumler).toContain("gorevler");
    expect(kurumBolumuAcikMi(yetkiler, "planlar")).toBe(false);
    expect(kurumBolumuAcikMi(yetkiler, "profil")).toBe(true);
  });

  it("moderatörün deneme ve konu yollarını aynı yetkiyle kapatır", () => {
    const yetkiler = { denemeler: false, konular: false, yonetim: true };
    expect(moderatorBolumuAcikMi(yetkiler, "deneme-yukle")).toBe(false);
    expect(moderatorBolumuAcikMi(yetkiler, "pdf-eslesme")).toBe(false);
    expect(moderatorBolumuAcikMi(yetkiler, "konu-haritasi")).toBe(false);
    expect(moderatorBolumuAcikMi(yetkiler, "ogrenciler")).toBe(true);
    expect(moderatorBolumuAcikMi(yetkiler, "profil")).toBe(true);
  });
});
