import { describe, expect, it } from "vitest";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import { kurumBolumuAcikMi, kurumErisimiKapaliMi, kurumModuluAcikMi, moderatorBolumuAcikMi } from "@/lib/kurum-yetkileri";

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

describe("SMS modülü", () => {
  it("varsayılan kapalıdır; yalnız açıkça true olunca açılır", () => {
    expect(kurumModuluAcikMi({}, "sms")).toBe(false);
    expect(kurumModuluAcikMi(null, "sms")).toBe(false);
    expect(kurumModuluAcikMi({ sms: false }, "sms")).toBe(false);
    expect(kurumModuluAcikMi({ sms: true }, "sms")).toBe(true);
    // Diğer modüllerin "eksik = açık" davranışı değişmedi.
    expect(kurumModuluAcikMi({}, "gorevler")).toBe(true);
  });

  it("menüde yalnız müdür, müdür yardımcısı ve okul rehberinde, modül açıkken görünür", () => {
    const acik = { sms: true };
    const var_ = (r: Parameters<typeof dashboardMenusu>) => dashboardMenusu(...r).some((m) => m.bolum === "sms");
    expect(var_(["mudur", "okul", undefined, false, "lise", false, null, acik])).toBe(true);
    expect(var_(["mudur", "dershane", undefined, false, null, false, null, acik])).toBe(true);
    expect(var_(["ogretmen", "okul", "Matematik", false, "lise", false, { yurt: false }, acik])).toBe(true);
    expect(var_(["ogretmen", "okul", "Matematik", false, "lise", true, null, acik])).toBe(true);
    expect(var_(["ogretmen", "dershane", "Rehber Öğretmen", false, null, false, null, acik])).toBe(true);
    // Modül kapalı ya da rol uygun değil.
    expect(var_(["mudur", "okul", undefined, false, "lise", false, null, {}])).toBe(false);
    expect(var_(["ogretmen", "okul", "Matematik", false, "lise", false, null, acik])).toBe(false);
    expect(var_(["ogrenci", "okul", undefined, false, "lise", false, null, acik])).toBe(false);
    expect(var_(["veli", "okul", undefined, false, null, false, null, acik])).toBe(false);
    expect(var_(["ogretmen", "okul", "Matematik", false, "lise", false, { yurt: true, yalnizYurt: true }, acik])).toBe(false);
  });

  it("bölüm ve moderatör yolu aynı yetkiyle kapanır", () => {
    expect(kurumBolumuAcikMi({}, "sms")).toBe(false);
    expect(kurumBolumuAcikMi({ sms: true }, "sms")).toBe(true);
    expect(moderatorBolumuAcikMi({ yonetim: true }, "sms")).toBe(false);
    expect(moderatorBolumuAcikMi({ sms: true, yonetim: false }, "sms")).toBe(true);
  });
});
