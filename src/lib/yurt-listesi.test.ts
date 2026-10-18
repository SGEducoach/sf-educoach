import { describe, expect, test } from "vitest";
import { adBaslik, ogretmeninGrubu, tumOgrencileriBirlestir, yurtBilgiSatirlari, yurtKartImzasi, yurtOgrencileriniBirlestir, yurtSayfalari, yurtSutunSatiri } from "./yurt-listesi";

describe("yurt öğrencileri", () => {
  const resmi = [
    { id: "r1", ad_soyad: "AHMET YILMAZ", okul_no: "101", yurt_ogrencisi: true, cinsiyet: "erkek" },
    { id: "r2", ad_soyad: "ZEYNEP ÇELİK", okul_no: "102", yurt_ogrencisi: true, cinsiyet: null },
    { id: "r3", ad_soyad: "İREM ŞAHİN", okul_no: "103", yurt_ogrencisi: true },
    { id: "r4", ad_soyad: "ALİ KAYA", okul_no: "104", yurt_ogrencisi: false },
  ];
  const kayitli = [
    { id: "s2", ad: "Zeynep Çelik", okul_no: "102", yurt_ogrencisi: true, sinif: "10-A", seviye: "10", sube: "A", cinsiyet: "kiz" },
    { id: "s3", ad: "İrem Şahin", okul_no: "103", yurt_ogrencisi: false, sinif: "9-B", seviye: "9", sube: "B" },
    { id: "s5", ad: "Mert Öz", okul_no: "999", yurt_ogrencisi: true, sinif: "11-C", seviye: "11", sube: "C" },
  ];
  const liste = yurtOgrencileriniBirlestir(resmi, kayitli);

  test("ön kayıttaki (sisteme girmemiş) yurt öğrencisi listede, adı düzgün", () => {
    const ahmet = liste.find((o) => o.okulNo === "101")!;
    expect(ahmet).toMatchObject({ ad: "Ahmet Yılmaz", kayitli: false, sinif: null, cinsiyet: "erkek", anahtar: "r:r1" });
  });

  test("kayıtlı öğrencinin sınıfı ve cinsiyeti kayıttan, yurt durumu kayıttan", () => {
    expect(liste.find((o) => o.okulNo === "102")).toMatchObject({ sinif: "10-A", cinsiyet: "kiz", kayitli: true, anahtar: "r:r2" });
    expect(liste.some((o) => o.okulNo === "103")).toBe(false); // kayıtta yurt değil
    expect(liste.some((o) => o.okulNo === "104")).toBe(false);
  });

  test("resmî listede olmayan kayıtlı yurt öğrencisi de eklenir, ada göre sıralı", () => {
    expect(liste.find((o) => o.okulNo === "999")?.anahtar).toBe("s:s5");
    expect(liste.map((o) => o.ad)).toEqual(["Ahmet Yılmaz", "Mert Öz", "Zeynep Çelik"]);
    expect(liste[0]).not.toHaveProperty("yurt");
  });

  test("işaretleme listesi ön kayıt dahil herkesi yurt durumuyla verir", () => {
    const tum = tumOgrencileriBirlestir(resmi, kayitli);
    expect(tum).toHaveLength(5);
    expect(tum.find((o) => o.okulNo === "103")).toMatchObject({ yurt: false, kayitli: true, anahtar: "r:r3" });
    expect(tum.find((o) => o.okulNo === "104")).toMatchObject({ yurt: false, kayitli: false, anahtar: "r:r4" });
    expect(tum.filter((o) => o.yurt).map((o) => o.anahtar)).toEqual(liste.map((o) => o.anahtar));
  });
});

describe("yardımcılar", () => {
  test("ad başlığı Türkçe", () => {
    expect(adBaslik("  İREM   ŞAHİN ")).toBe("İrem Şahin");
    expect(adBaslik("ışıl ılgaz")).toBe("Işıl Ilgaz");
  });
  test("öğretmenin grubu", () => {
    expect(ogretmeninGrubu("kadin")).toBe("kiz");
    expect(ogretmeninGrubu("erkek")).toBe("erkek");
    expect(ogretmeninGrubu(null)).toBeNull();
  });
  test("bilgi satırları", () => {
    expect(yurtBilgiSatirlari("aksam-yoklamasi", { tarih: "2026-10-18", saat: "21:30" })).toEqual(["18 Ekim 2026 Pazar", "Yoklama saati 21:30"]);
    expect(yurtBilgiSatirlari("evci-izni", { cikisTarihi: "2026-10-23", cikisSaati: "16:00", donusTarihi: "2026-10-25", donusSaati: "" }))
      .toEqual(["Çıkış: 23 Ekim 2026 Cuma · 16:00", "Dönüş: 25 Ekim 2026 Pazar"]);
    expect(yurtBilgiSatirlari("carsi-izni", { tarih: "", cikisSaati: "13:00", donusSaati: "17:00" })).toEqual(["Çıkış-dönüş 13:00 – 17:00"]);
  });
  test("akşam yoklamasında gönderen ve isteğe bağlı diğer nöbetçi kartta görünür", () => {
    expect(yurtKartImzasi("aksam-yoklamasi", " Ayşe  Yılmaz ", " Mehmet  Demir "))
      .toBe("Nöbetçiler: Ayşe Yılmaz, Mehmet Demir");
    expect(yurtKartImzasi("aksam-yoklamasi", "Ayşe Yılmaz", ""))
      .toBe("Nöbetçiler: Ayşe Yılmaz");
    expect(yurtKartImzasi("evci-izni", "Ayşe Yılmaz", "Mehmet Demir"))
      .toBe("Hazırlayan: Ayşe Yılmaz");
  });
  test("boş liste tek boş sayfa", () => {
    expect(yurtSayfalari([])).toEqual([[]]);
    expect(yurtSayfalari(Array.from({ length: 80 }, (_, i) => i)).map((s) => s.length)).toEqual([80]);
    expect(yurtSayfalari(Array.from({ length: 100 }, (_, i) => i)).map((s) => s.length)).toEqual([90, 10]);
  });
  test("sütun başına satır: 36'ya kadar 12, sonra eşit dağılım", () => {
    expect([1, 20, 36, 37, 45, 80].map(yurtSutunSatiri)).toEqual([12, 12, 12, 13, 15, 27]);
  });
});
