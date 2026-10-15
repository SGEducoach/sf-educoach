import { describe, expect, test } from "vitest";
import {
  GELISIM_KALEMLERI, ayAnahtari, ayEtiketi, gelisimOzeti, kalemiYazabilirMi, notuYazabilirMi, oncekiAy, veliTelefonuTemizle,
} from "./ilkokul-gelisim";

describe("gelişim kalemleri", () => {
  test("kullanıcının verdiği on kalem, migration ile aynı anahtarlar", () => {
    expect(GELISIM_KALEMLERI.map((k) => k.anahtar)).toEqual([
      "matematik", "turkce", "hayat_bilgisi", "ingilizce", "degerler", "resim", "muzik", "beden_egitimi", "sosyal_etkinlik", "rehberlik",
    ]);
  });
});

describe("kim neyi işaretler", () => {
  test("rehberlik kalemi yalnız rehberlik servisinde, diğerleri sınıf öğretmeninde", () => {
    expect(kalemiYazabilirMi(["sinif_ogretmeni"], "matematik")).toBe(true);
    expect(kalemiYazabilirMi(["sinif_ogretmeni"], "rehberlik")).toBe(false);
    expect(kalemiYazabilirMi(["rehberlik"], "rehberlik")).toBe(true);
    expect(kalemiYazabilirMi(["rehberlik"], "turkce")).toBe(false);
    expect(kalemiYazabilirMi(["yonetim"], "rehberlik")).toBe(true);
    expect(kalemiYazabilirMi([], "muzik")).toBe(false);
  });
  test("notlar da aynı ayrımla", () => {
    expect(notuYazabilirMi(["sinif_ogretmeni"], "ogretmen")).toBe(true);
    expect(notuYazabilirMi(["sinif_ogretmeni"], "rehberlik")).toBe(false);
    expect(notuYazabilirMi(["rehberlik"], "rehberlik")).toBe(true);
    expect(notuYazabilirMi(["yonetim"], "ogretmen")).toBe(true);
  });
});

describe("ay", () => {
  test("ay anahtarı ayın 1'i, önceki ay yıl atlar", () => {
    expect(ayAnahtari("2026-10-16")).toBe("2026-10-01");
    expect(ayAnahtari("2026-13")).toBeNull();
    expect(oncekiAy("2026-10-01")).toBe("2026-09-01");
    expect(oncekiAy("2027-01-01")).toBe("2026-12-01");
    expect(ayEtiketi("2026-10-01")).toBe("Ekim 2026");
  });
});

describe("gelişim özeti", () => {
  test("son ay ve bir önceki işaretli ayla değişim", () => {
    const o = gelisimOzeti([
      { ay: "2026-10-01", kalem: "matematik", duzey: "basarili" },
      { ay: "2026-10-01", kalem: "turkce", duzey: "gelistirilmeli" },
      { ay: "2026-09-01", kalem: "matematik", duzey: "gelisiyor" },
      { ay: "2026-09-01", kalem: "turkce", duzey: "gelisiyor" },
      { ay: "2026-09-01", kalem: "muzik", duzey: "basarili" },
    ]);
    expect(o.sonAy).toBe("2026-10-01");
    expect(o.oncekiAy).toBe("2026-09-01");
    const satir = (k: string) => o.satirlar.find((s) => s.kalem === k)!;
    expect(satir("matematik")).toMatchObject({ duzey: "basarili", degisim: "yukseldi" });
    expect(satir("turkce")).toMatchObject({ duzey: "gelistirilmeli", degisim: "dustu" });
    // Bu ay işaretlenmemiş kalem boş kalır, geçen aydan taşınmaz.
    expect(satir("muzik")).toMatchObject({ duzey: null, onceki: "basarili", degisim: null });
  });
  test("kayıt yoksa boş", () => {
    const o = gelisimOzeti([]);
    expect(o.sonAy).toBeNull();
    expect(o.satirlar.every((s) => s.duzey === null)).toBe(true);
  });
});

describe("veli telefonu", () => {
  test("cep numarası başına 0 eklenir, geçersiz olan boş kalır", () => {
    expect(veliTelefonuTemizle("532 123 45 67")).toBe("05321234567");
    expect(veliTelefonuTemizle("0532-123-4567")).toBe("05321234567");
    expect(veliTelefonuTemizle("123")).toBeNull();
    expect(veliTelefonuTemizle(undefined)).toBeNull();
  });
});
