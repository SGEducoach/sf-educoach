import { describe, expect, it } from "vitest";
import {
  SEO_ANAHTAR_KELIME_ADET_SINIRI,
  kayitliSeoAnahtarKelimeleriniOku,
  seoAnahtarKelimeleriniAyristir,
} from "./seo-ayarlari";

describe("SEO anahtar kelime ayarları", () => {
  it("boşlukları temizler ve Türkçe büyük/küçük harf tekrarlarını kaldırır", () => {
    expect(seoAnahtarKelimeleriniAyristir(" YKS   hazırlık, öğrenci takip\nYKS HAZIRLIK ")).toEqual({
      error: null,
      kelimeler: ["YKS hazırlık", "öğrenci takip"],
    });
  });

  it("izin verilen kelime sayısını aşan girişi reddeder", () => {
    const ham = Array.from({ length: SEO_ANAHTAR_KELIME_ADET_SINIRI + 1 }, (_, i) => `ifade ${i}`).join(",");
    expect(seoAnahtarKelimeleriniAyristir(ham).error).toContain("En fazla");
  });

  it("kayıt yoksa güvenli varsayılanları, kayıt boşsa boş listeyi döndürür", () => {
    expect(kayitliSeoAnahtarKelimeleriniOku(null).length).toBeGreaterThan(0);
    expect(kayitliSeoAnahtarKelimeleriniOku("[]")).toEqual([]);
  });
});
