import { describe, expect, it } from "vitest";
import { bransGosterimDersi, maarifEdebiyatKazanimiMi } from "./maarif-edebiyat";

// Canlı veride (24.10.2026) 9-10. sınıf branş denemesinden gelen gerçek kazanım metinleri.
const EDEBIYAT = [
  "Destan Dönemi Türk şiirini tanır ve türlerini açıklar.",
  "Destan Dönemi Türk şiirini ve koşuk türünün genel özelliklerini açıklar.",
  "Hikâye, şiir gibi türlerin içerik ve anlam özellikleri yapı unsurlarıyla birleştirilerek çözümleme ve değerlendirme yapar.",
  "Okuduğu metinleri belirlenen ölçütlere (içerik, tür, şekil, dönem, zihniyet, üslup, ileti) göre sınıflandırır.",
  "Okuduğu metni oluşturan şekil ve anlama dair birimler arasındaki ilişkileri belirler.",
  "Türkü türünün genel özelliklerini belirler.",
  "Deneme türünü tanır, genel özelliklerini ve tarihi gelişimini inceler.",
  "Edebiyatın güzel sanatlarla ve bilimle ilişkisini belirler.",
  "Güzel sanatları sınıflandırır.",
  "Metinde geçen söz sanatlarını belirler.",
  "Metinleri sınıflandırır.",
  "Şiirin içeriği (tema,konu) ile ilgili çalışma yapar.",
];
const KLASIK_TYT = [
  "Metinde açıkça sunulan bilgileri belirler.",
  "Metinde yer alan bilgilerin sunuluş şeklini inceler.",
  "Metindeki söz varlığının anlamını bağlamdan hareketle belirler.",
  "İsim Tamlamaları",
  "Sıfat Tamlamaları",
  "Tamlamalar - Karma",
  "Metinde açıkça ifade edilen neden-sonuç, koşul, tanım,karşılaştırma,varsayım bilgilerini belirler.",
  "Metinlerden hareketle çıkarımlar yapar.",
  "Yazısında noktalama kurallarını etkili bir şekilde kullanır.",
  "Yazısında yazım kurallarını etkili bir şekilde kullanır.",
  "Metindeki karakterlerin davranışlarından duygu ve düşüncelerine yönelik çıkarımlar yapar.",
  "Metindeki öznel ve nesnel ifadeleri ayırt eder.",
  "Noktalama kurallarını uygular.",
  "Yazım kurallarını uygular.",
];

describe("maarifEdebiyatKazanimiMi", () => {
  it.each(EDEBIYAT)("edebiyat: %s", (m) => expect(maarifEdebiyatKazanimiMi(m)).toBe(true));
  it.each(KLASIK_TYT)("klasik TYT: %s", (m) => expect(maarifEdebiyatKazanimiMi(m)).toBe(false));
});

describe("bransGosterimDersi", () => {
  it("yalnız Türkçe/Edebiyat edebiyat kazanımında Maarif Edebiyat olur", () => {
    expect(bransGosterimDersi("Türkçe", "Türkü türünün genel özelliklerini belirler.")).toBe("Maarif Edebiyat");
    expect(bransGosterimDersi("Türkçe", "İsim Tamlamaları")).toBe("Türkçe");
  });
  it("diğer derslerin kazanımına dokunmaz", () => {
    expect(bransGosterimDersi("Tarih", "Destan Dönemi Türk şiirini tanır.")).toBe("Tarih");
  });
});
