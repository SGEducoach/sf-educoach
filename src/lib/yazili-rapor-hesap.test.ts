import { describe, expect, test } from "vitest";
import { dersGorunenAd, donemNo, notSonucu, ogretimYili, raporuOlustur, yuzlugeCevir, type HamRaporVerisi } from "./yazili-rapor-hesap";

describe("notSonucu — lise aralıkları", () => {
  test.each([
    [0, "GEÇMEZ"], [49.99, "GEÇMEZ"], [50, "GEÇER"], [59.99, "GEÇER"], [60, "ORTA"],
    [69.99, "ORTA"], [70, "İYİ"], [84.99, "İYİ"], [85, "PEKİYİ"], [100, "PEKİYİ"],
  ])("%s → %s", (puan, beklenen) => expect(notSonucu(puan)).toBe(beklenen));

  test("ortaokul aralığı DEĞİL: 45 ve 55 lisede sırasıyla geçmez ve geçer", () => {
    expect(notSonucu(45)).toBe("GEÇMEZ");
    expect(notSonucu(55)).toBe("GEÇER");
  });
});

describe("yardımcılar", () => {
  test("100 olmayan toplam 100'lüğe çevrilir", () => expect(yuzlugeCevir(40, 50)).toBe(80));
  test("öğretim yılı ve dönem", () => {
    expect(ogretimYili("2026-09-07")).toBe("2026-2027");
    expect(ogretimYili("2027-01-15")).toBe("2026-2027");
    expect(ogretimYili("2027-04-10")).toBe("2026-2027");
    expect(donemNo("2026-09-07")).toBe(1);
    expect(donemNo("2027-01-15")).toBe(1);
    expect(donemNo("2027-02-20")).toBe(2);
  });
  test("lisede Türkçe dersi Türk Dili ve Edebiyatı olarak görünür", () => {
    expect(dersGorunenAd("Türkçe")).toBe("Türk Dili ve Edebiyatı");
    expect(dersGorunenAd("Matematik")).toBe("Matematik");
  });
});

const temel: HamRaporVerisi = {
  sinav: { id: "s", ad: "1. dönem 1. yazılı", tarih: "2026-09-07", ders: "Türkçe" },
  sinifAdi: "11-C", okulAdi: "Okul", ogretmenAdi: "Öğretmen", ogretmenBransi: "Türk Dili ve Edebiyatı", mudurAdi: null,
  sorular: [
    { id: "q2", sira: 2, maxPuan: 60, kazanim: "K2" },
    { id: "q1", sira: 1, maxPuan: 40, kazanim: "K1" },
  ],
  ogrenciler: [
    { id: "a", ad: "Ali", okulNo: "12", toplam: 90 },
    { id: "b", ad: "Buse", okulNo: "3", toplam: 50 },
    { id: "c", ad: "Can", okulNo: "7", toplam: 49 },
    { id: "d", ad: "Deniz", okulNo: "25", toplam: 65 },
  ],
  soruSonuclari: [
    { ogrenciId: "a", soruId: "q1", puan: 40, kaynak: "actual", surum: null },
    { ogrenciId: "a", soruId: "q2", puan: 50, kaynak: "actual", surum: null },
    { ogrenciId: "b", soruId: "q1", puan: 20, kaynak: "actual", surum: null },
    { ogrenciId: "b", soruId: "q2", puan: 30, kaynak: "actual", surum: null },
    { ogrenciId: "c", soruId: "q1", puan: 10, kaynak: "estimated", surum: "v1" },
    { ogrenciId: "c", soruId: "q2", puan: 39, kaynak: "estimated", surum: "v1" },
    { ogrenciId: "d", soruId: "q1", puan: 5, kaynak: "estimated", surum: "v1" },
    { ogrenciId: "d", soruId: "q2", puan: 60, kaynak: "estimated", surum: "v1" },
  ],
};

describe("raporuOlustur", () => {
  const rapor = raporuOlustur(temel);

  test("sorular sıraya, öğrenciler okul numarasına göre", () => {
    expect(rapor.sorular.map((s) => s.kazanim)).toEqual(["K1", "K2"]);
    expect(rapor.ogrenciler.map((o) => o.okulNo)).toEqual(["3", "7", "12", "25"]);
    expect(rapor.ogrenciler.map((o) => o.sira)).toEqual([1, 2, 3, 4]);
    expect(rapor.maxToplam).toBe(100);
  });

  test("not dağılımı, ortalama ve başarı yüzdesi", () => {
    expect(rapor.ogrenciler.map((o) => o.sonuc)).toEqual(["GEÇER", "GEÇMEZ", "PEKİYİ", "ORTA"]);
    expect(rapor.dagilim).toEqual({ GEÇMEZ: 1, GEÇER: 1, ORTA: 1, İYİ: 0, PEKİYİ: 1 });
    expect(rapor.ortalama).toBe(63.5);
    expect(rapor.basariYuzdesi).toBe(75);
  });

  test("soru başarısı şablondaki formülle; %50 altı düşük konulara girer", () => {
    expect(rapor.sorular[0].basari).toBeCloseTo(46.875, 6); // (40+20+10+5)/4 ÷ 40 × 100
    expect(rapor.sorular[1].basari).toBeCloseTo(74.5833, 3); // (50+30+39+60)/4 ÷ 60 × 100
    expect(rapor.dusukKonular).toEqual([{ sira: 1, kazanim: "K1", basari: 46.875 }]);
  });

  test("tahmini puanlar işaretlenir, yöntem ve başlık doğru", () => {
    expect(rapor.yontem).toBe("temsili");
    expect(rapor.tahminiOgrenciSayisi).toBe(2);
    expect(rapor.ogrenciler.find((o) => o.id === "c")?.tahmini).toEqual([true, true]);
    expect(rapor.ogrenciler.find((o) => o.id === "a")?.tahmini).toEqual([false, false]);
    expect(rapor.baslik.ogretimYili).toBe("2026-2027");
    expect(rapor.baslik.donem).toBe(1);
  });

  test("oransal dağıtım 'otomatik', tahminsiz kayıt 'tek-tek' sayılır", () => {
    const otomatik = raporuOlustur({ ...temel, soruSonuclari: temel.soruSonuclari.map((r) => ({ ...r, kaynak: "estimated", surum: "oransal-v1" })) });
    expect(otomatik.yontem).toBe("otomatik");
    const tekTek = raporuOlustur({ ...temel, soruSonuclari: temel.soruSonuclari.map((r) => ({ ...r, kaynak: "actual", surum: null })) });
    expect(tekTek.yontem).toBe("tek-tek");
    expect(tekTek.tahminiOgrenciSayisi).toBe(0);
  });

  test("toplamı 50 olan sınavda not 100'lüğe göre verilir", () => {
    const elli = raporuOlustur({
      ...temel,
      sorular: [{ id: "q1", sira: 1, maxPuan: 50, kazanim: "K1" }],
      ogrenciler: [{ id: "x", ad: "X", okulNo: "1", toplam: 25 }, { id: "y", ad: "Y", okulNo: "2", toplam: 24 }],
      soruSonuclari: [],
    });
    expect(elli.ogrenciler.map((o) => o.sonuc)).toEqual(["GEÇER", "GEÇMEZ"]);
    expect(elli.basariYuzdesi).toBe(50);
    expect(elli.sorular[0].basari).toBeNull(); // soru puanı yoksa başarı hesaplanmaz
  });

  test("öğrencisiz sınav sıfıra bölmez", () => {
    const bos = raporuOlustur({ ...temel, ogrenciler: [], soruSonuclari: [] });
    expect(bos.ortalama).toBe(0);
    expect(bos.basariYuzdesi).toBe(0);
    expect(bos.dusukKonular).toEqual([]);
  });
});
