import { describe, expect, it } from "vitest";
import { sesliSoruCozumunuCoz } from "./sesli-soru-girisi";

const dersler = ["Türkçe", "Matematik", "Biyoloji", "Din Kültürü", "Tarih", "Tarih-1"];

describe("sesli soru girişi", () => {
  it("Türkçe komutu form verisine çevirir", () => {
    expect(sesliSoruCozumunuCoz("Matematik 20 doğru 5 yanlış 2 boş 40 dakika", dersler)).toEqual({
      veri: { ders: "Matematik", dogru: 20, yanlis: 5, bos: 2, sureDakika: 40 }, hata: null,
    });
  });

  it("etiket önce söylenince de okur", () => {
    expect(sesliSoruCozumunuCoz("Din kültürü doğru 12 yanlış 3 boş 0 süre 20", dersler).veri?.ders).toBe("Din Kültürü");
  });

  it("eksik alanla otomatik doldurmaz", () => {
    expect(sesliSoruCozumunuCoz("Biyoloji 8 boş", dersler).veri).toBeNull();
  });

  it("süre sınırını aşan girişi reddeder", () => {
    expect(sesliSoruCozumunuCoz("Türkçe 1 doğru 0 yanlış 0 boş 10 dakika", dersler).veri).toBeNull();
  });
});
