import { describe, expect, test } from "vitest";
import { adlarBenzerMi, numaraVeAdIleBul } from "./ad-benzerligi";

describe("numaraVeAdIleBul", () => {
  const ogrenciler = [
    { id: "a", ad: "Nur Efşan Sude Albay", okulNo: "236" },
    { id: "b", ad: "Mehmet Şahin", okulNo: "341" },
    { id: "c", ad: "Ayşe Kaya", okulNo: "kullanici_adi" },
    { id: "d", ad: "Zeynep Er", okulNo: null },
  ];

  test("numara aynı ve ikinci adı eksik → otomatik bulunur", () => {
    expect(numaraVeAdIleBul({ ad: "NUR EFŞAN ALBAY", ogrenciNo: 236 }, ogrenciler)?.id).toBe("a");
  });
  test("numara aynı ama ad bambaşka → bulunmaz (kuyruğa kalır)", () => {
    expect(numaraVeAdIleBul({ ad: "DENİZ ŞAHİN", ogrenciNo: 341 }, ogrenciler)).toBeNull();
  });
  test("ad benzer ama numara farklı → bulunmaz", () => {
    expect(numaraVeAdIleBul({ ad: "NUR EFŞAN ALBAY", ogrenciNo: 999 }, ogrenciler)).toBeNull();
  });
  test("PDF'te numara 0 ya da yok → bulunmaz", () => {
    expect(numaraVeAdIleBul({ ad: "NUR EFŞAN ALBAY", ogrenciNo: 0 }, ogrenciler)).toBeNull();
    expect(numaraVeAdIleBul({ ad: "NUR EFŞAN ALBAY" }, ogrenciler)).toBeNull();
  });
  test("aynı numaralı iki öğrenci varsa → bulunmaz", () => {
    const cift = [...ogrenciler, { id: "e", ad: "Nur Albay", okulNo: "0236" }];
    expect(numaraVeAdIleBul({ ad: "NUR EFŞAN ALBAY", ogrenciNo: 236 }, cift)).toBeNull();
  });
});

// Örnekler gerçek "fen lisesi dublör" PDF'indeki yazım biçimlerinden; kayıtlı
// adlar uydurma.
describe("adlarBenzerMi", () => {
  test.each([
    ["GAMZENUR", "Gamzenur Kaya"],
    ["ALPEREN Y", "Alperen Yılmaz"],
    ["BEREN CR", "Beren Cirit"],
    ["MUHAMMED AĞKÇ", "Muhammed Ağkoç"],
    ["EYLÜL AZRA", "Eylül Azra Demir"],
    ["MERYEM NUR MIHÇI", "Meryem Nur Mihçi"],
    ["NUR EFŞAN ALBAY", "Nur Efşan Albay"],
    ["AHMET ARDA YILDIZ", "Ahmet Yıldız"],
    ["ZEYNEP TAŞKIN", "Zeynep Taşkın Öz"],
    ["MUSTAFA ALAF", "Mustafa Alaf"],
    ["KEVSER DAŞ", "Kevser Daş"],
    ["ÜMMET ERDOĞAN", "Ümmet Erdoğn"],
    // PDF'ler uzun soyadı kesebiliyor — kuyruğa düşmesi (otomatik değil) doğru.
    ["EMRE ASLAN", "Emre Aslantürk"],
  ])("%s ~ %s", (pdf, kayitli) => {
    expect(adlarBenzerMi(pdf, kayitli)).toBe(true);
  });

  test.each([
    ["AHMET EFE ÖZCAN", "Ahmet Yılmaz"],
    ["HALİT", "Mehmet Halit Demir"],
    ["DENİZ ŞAHİN", "Mehmet Şahin"],
    ["CEREN PER", "Şevval Per"],
    ["DURU DAL", "Gülizar Dal"],
    ["MEHMET ŞAHİN", "Mehmet Akif Polat"],
    ["A", "Ahmet Kaya"],
  ])("%s ≁ %s", (pdf, kayitli) => {
    expect(adlarBenzerMi(pdf, kayitli)).toBe(false);
  });
});
