import { describe, expect, test } from "vitest";
import { adlarBenzerMi } from "./ad-benzerligi";

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
