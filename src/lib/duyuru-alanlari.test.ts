import { describe, expect, test } from "vitest";
import { duyuruAdresi, duyuruSecenekleri, seciliDuyuruAlani, seciliDuyuruTuru } from "./duyuru-alanlari";

const temel = { mudur: false, rehber: false, sinifOgretmeni: false, yurtlu: false };

describe("duyuru bölümleri", () => {
  test("yurtlu kurumda müdür dört bölümü de görür", () => {
    expect(duyuruSecenekleri({ ...temel, mudur: true, yurtlu: true })).toEqual({ site: ["genel", "yurt"], whatsapp: ["genel", "yurt"] });
  });

  test("yurtsuz kurumda yurt bölümü yok", () => {
    expect(duyuruSecenekleri({ ...temel, mudur: true })).toEqual({ site: ["genel"], whatsapp: ["genel"] });
  });

  test("yalnız yurt sorumlusu müdür yardımcısı yalnız yurt bölümlerini görür", () => {
    expect(duyuruSecenekleri({ ...temel, rehber: true, yurtlu: true, idareYurt: "yalniz" })).toEqual({ site: ["yurt"], whatsapp: ["yurt"] });
  });

  test("sınıf öğretmeni site içi genel, yurtlu kurumda WhatsApp yurt kartları", () => {
    expect(duyuruSecenekleri({ ...temel, sinifOgretmeni: true, yurtlu: true })).toEqual({ site: ["genel"], whatsapp: ["yurt"] });
    // Sınıfı olmayan öğretmen doğrudan WhatsApp yurt kartlarına düşer.
    const s = duyuruSecenekleri({ ...temel, yurtlu: true });
    expect(seciliDuyuruTuru(s, undefined)).toBe("whatsapp");
  });

  test("geçersiz alan ilk uygun bölüme düşer; adres yalnız gerekeni taşır", () => {
    expect(seciliDuyuruAlani(["yurt"], "genel")).toBe("yurt");
    expect(seciliDuyuruAlani(["genel", "yurt"], undefined)).toBe("genel");
    expect(seciliDuyuruAlani([], "yurt")).toBeNull();
    expect(duyuruAdresi("site", "genel")).toBe("/dashboard/duyurular");
    expect(duyuruAdresi("whatsapp", "yurt")).toBe("/dashboard/duyurular?tur=whatsapp&alan=yurt");
  });
});
