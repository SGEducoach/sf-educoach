import { describe, expect, test } from "vitest";
import {
  GELISIM_DUZEYLERI, GELISIM_KALEMLERI, SDO_BASLIKLARI, SDO_GOSTERGELERI, SDO_GOSTERGE_SAYISI, ayAnahtari, ayEtiketi,
  donemAylari, donemBilgisi, donemDersDuzeyleri, donemGecerliMi, duzeyOku, gelisimOzeti, kalemiYazabilirMi, komsuDonem,
  notuYazabilirMi, oncekiAy, sdoGostergesiMi, sdoYazabilirMi, sinifKalemleri, veliTelefonuTemizle,
} from "./ilkokul-gelisim";

describe("gelişim kalemleri", () => {
  test("on kalem, migration 0157 kısıtıyla aynı anahtarlar", () => {
    expect([...GELISIM_KALEMLERI.map((k) => k.anahtar)].sort()).toEqual([
      "beden_egitimi", "degerler", "hayat_bilgisi", "ingilizce", "matematik", "muzik", "rehberlik", "resim", "sosyal_etkinlik", "turkce",
    ]);
  });
  test("1. sınıf MEB dersleri; İngilizce 2. sınıftan; kurum değerlendirmesi ayrı", () => {
    const bir = sinifKalemleri("1");
    expect(bir.filter((k) => k.bolum === "ders").map((k) => k.ad)).toEqual([
      "Türkçe", "Matematik", "Hayat Bilgisi", "Görsel Sanatlar", "Müzik", "Beden Eğitimi ve Oyun",
    ]);
    expect(bir.filter((k) => k.bolum === "kurum").map((k) => k.anahtar)).toEqual(["degerler", "sosyal_etkinlik", "rehberlik"]);
    expect(sinifKalemleri("2").map((k) => k.anahtar)).toContain("ingilizce");
    expect(sinifKalemleri(null)).toHaveLength(GELISIM_KALEMLERI.length);
  });
});

describe("düzeyler", () => {
  test("MEB'in dört düzeyi; eski üç düzeyli ölçek okunurken çevrilir", () => {
    expect(GELISIM_DUZEYLERI.map((d) => d.ad)).toEqual(["Geliştirilmeli", "Yeterli", "İyi", "Çok İyi"]);
    expect(duzeyOku("gelisiyor")).toBe("yeterli");
    expect(duzeyOku("basarili")).toBe("iyi");
    expect(duzeyOku("cok_iyi")).toBe("cok_iyi");
    expect(duzeyOku("x")).toBeNull();
  });
});

describe("dönem", () => {
  test("Eylül–Ocak 1. dönem, Şubat sonrası 2. dönem", () => {
    expect(donemBilgisi("2026-10-01")).toEqual({ egitimYili: "2026-2027", donem: 1 });
    expect(donemBilgisi("2027-01-01")).toEqual({ egitimYili: "2026-2027", donem: 1 });
    expect(donemBilgisi("2027-02-01")).toEqual({ egitimYili: "2026-2027", donem: 2 });
    expect(donemBilgisi("2027-06-01")).toEqual({ egitimYili: "2026-2027", donem: 2 });
    expect(donemAylari({ egitimYili: "2026-2027", donem: 1 })).toEqual(["2026-09-01", "2026-10-01", "2026-11-01", "2026-12-01", "2027-01-01"]);
    expect(komsuDonem({ egitimYili: "2026-2027", donem: 1 }, -1)).toEqual({ egitimYili: "2025-2026", donem: 2 });
    expect(komsuDonem({ egitimYili: "2026-2027", donem: 2 }, 1)).toEqual({ egitimYili: "2027-2028", donem: 1 });
    expect(donemGecerliMi("2026-2027", 1)).toBe(true);
    expect(donemGecerliMi("2026-2028", 1)).toBe(false);
    expect(donemGecerliMi("2026-2027", 3)).toBe(false);
  });
  test("dönem sonu: her kalemde dönemdeki son işaret, dönem dışı sayılmaz", () => {
    const d = donemDersDuzeyleri([
      { ay: "2026-10-01", kalem: "matematik", duzey: "yeterli" },
      { ay: "2026-12-01", kalem: "matematik", duzey: "cok_iyi" },
      { ay: "2026-11-01", kalem: "turkce", duzey: "iyi" },
      { ay: "2027-02-01", kalem: "turkce", duzey: "gelistirilmeli" },
    ], { egitimYili: "2026-2027", donem: 1 });
    expect(d.get("matematik")).toBe("cok_iyi");
    expect(d.get("turkce")).toBe("iyi");
    expect(d.has("muzik")).toBe(false);
  });
});

describe("sosyal duygusal beceriler", () => {
  test("MEB kılavuzundaki 5 başlık, 26 gösterge; anahtarlar migration kısıtına uyar", () => {
    expect(SDO_BASLIKLARI).toHaveLength(5);
    expect(SDO_GOSTERGE_SAYISI).toBe(26);
    expect(SDO_GOSTERGELERI.every((g) => /^(kt|kd|ib|kv|sf)[1-6]$/.test(g.anahtar))).toBe(true);
    expect(new Set(SDO_GOSTERGELERI.map((g) => g.anahtar)).size).toBe(26);
    expect(sdoGostergesiMi("kd6")).toBe(true);
    expect(sdoGostergesiMi("kt6")).toBe(false);
  });
  test("yalnız sınıf öğretmeni ve yönetim yazar", () => {
    expect(sdoYazabilirMi(["sinif_ogretmeni"])).toBe(true);
    expect(sdoYazabilirMi(["yonetim"])).toBe(true);
    expect(sdoYazabilirMi(["rehberlik"])).toBe(false);
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
      { ay: "2026-10-01", kalem: "matematik", duzey: "cok_iyi" },
      { ay: "2026-10-01", kalem: "turkce", duzey: "gelistirilmeli" },
      { ay: "2026-09-01", kalem: "matematik", duzey: "yeterli" },
      { ay: "2026-09-01", kalem: "turkce", duzey: "yeterli" },
      { ay: "2026-09-01", kalem: "muzik", duzey: "iyi" },
    ], "2");
    expect(o.sonAy).toBe("2026-10-01");
    expect(o.oncekiAy).toBe("2026-09-01");
    const satir = (k: string) => o.satirlar.find((s) => s.kalem === k)!;
    expect(satir("matematik")).toMatchObject({ duzey: "cok_iyi", degisim: "yukseldi", bolum: "ders" });
    expect(satir("turkce")).toMatchObject({ duzey: "gelistirilmeli", degisim: "dustu" });
    // Bu ay işaretlenmemiş kalem boş kalır, geçen aydan taşınmaz.
    expect(satir("muzik")).toMatchObject({ duzey: null, onceki: "iyi", degisim: null });
    // 1. sınıfta İngilizce satırı yok.
    expect(gelisimOzeti([], "1").satirlar.some((s) => s.kalem === "ingilizce")).toBe(false);
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
