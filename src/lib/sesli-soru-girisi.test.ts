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
    expect(sesliSoruCozumunuCoz("Din kültürü doğru 12 yanlış 3 boş 0 süre 20", dersler)).toEqual({
      veri: { ders: "Din Kültürü", dogru: 12, yanlis: 3, bos: 0, sureDakika: 20 }, hata: null,
    });
  });

  it("karışık sıralamada her sayıyı yalnızca kendi alanına verir", () => {
    expect(sesliSoruCozumunuCoz("Matematik doğru 20 5 yanlış boş 2 süre 40", dersler)).toEqual({
      veri: { ders: "Matematik", dogru: 20, yanlis: 5, bos: 2, sureDakika: 40 }, hata: null,
    });
  });

  it("aynı cevap etiketi iki kez geçerse reddeder", () => {
    expect(sesliSoruCozumunuCoz("Matematik 20 doğru 30 doğru 5 yanlış 2 boş 40 dakika", dersler).veri).toBeNull();
  });

  it("ondalıklı süreyi son basamağı süre sanmadan reddeder", () => {
    const sonuc = sesliSoruCozumunuCoz("Matematik 20 doğru 5 yanlış 2 boş 40,5 dakika", dersler);
    expect(sonuc.veri).toBeNull();
    expect(sonuc.hata).toContain("Ondalıklı");
  });

  it("ondalıklı soru sayısını da reddeder", () => {
    expect(sesliSoruCozumunuCoz("Matematik 20.5 doğru 5 yanlış 2 boş 40 dakika", dersler).veri).toBeNull();
  });

  it("söylenen AYT dersini gerçek ders adına eşler", () => {
    expect(sesliSoruCozumunuCoz("Tarih bir 10 doğru 2 yanlış 1 boş 20 dakika", dersler)).toEqual({
      veri: { ders: "Tarih-1", dogru: 10, yanlis: 2, bos: 1, sureDakika: 20 }, hata: null,
    });
  });

  it("AYT dersi listede yoksa düz Tarih'e düşmez", () => {
    const sonuc = sesliSoruCozumunuCoz("Tarih bir 10 doğru 2 yanlış 1 boş 20 dakika", ["Tarih"]);
    expect(sonuc.veri).toBeNull();
    expect(sonuc.hata).toContain("listende yok");
  });

  it("boş söylenmezse görünür sıfır değeri üretir", () => {
    expect(sesliSoruCozumunuCoz("Matematik 20 doğru 5 yanlış 40 dakika", dersler)).toEqual({
      veri: { ders: "Matematik", dogru: 20, yanlis: 5, bos: 0, sureDakika: 40 }, hata: null,
    });
  });

  it("yazıyla sayıları okur", () => {
    expect(sesliSoruCozumunuCoz("Matematik yirmi doğru beş yanlış iki boş kırk dakika", dersler)).toEqual({
      veri: { ders: "Matematik", dogru: 20, yanlis: 5, bos: 2, sureDakika: 40 }, hata: null,
    });
  });

  it("birleşik sayı ve yüz sınırını okur", () => {
    expect(sesliSoruCozumunuCoz("Matematik yirmi beş doğru on yanlış sıfır boş otuz dakika", dersler)).toEqual({
      veri: { ders: "Matematik", dogru: 25, yanlis: 10, bos: 0, sureDakika: 30 }, hata: null,
    });
    expect(sesliSoruCozumunuCoz("Matematik yüz doğru sıfır yanlış sıfır boş yüz dakika", dersler)).toEqual({
      veri: { ders: "Matematik", dogru: 100, yanlis: 0, bos: 0, sureDakika: 100 }, hata: null,
    });
  });

  it("doğal Türkçe eklerini ve dakikada kalıbını okur", () => {
    expect(sesliSoruCozumunuCoz("matematikten 20 doğru 5 yanlış 2 boş yaptım 40 dakikada", dersler)).toEqual({
      veri: { ders: "Matematik", dogru: 20, yanlis: 5, bos: 2, sureDakika: 40 }, hata: null,
    });
  });

  it("ders adını kelime ortasında kabul etmez", () => {
    expect(sesliSoruCozumunuCoz("gramatematik 20 doğru 5 yanlış 2 boş 40 dakika", dersler).veri).toBeNull();
  });

  it("eksik alanla otomatik doldurmaz", () => {
    expect(sesliSoruCozumunuCoz("Biyoloji 8 boş", dersler).veri).toBeNull();
  });

  it("süre sınırını aşan girişi reddeder", () => {
    expect(sesliSoruCozumunuCoz("Türkçe 1 doğru 0 yanlış 0 boş 10 dakika", dersler).veri).toBeNull();
  });
});
