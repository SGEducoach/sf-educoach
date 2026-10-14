import { describe, expect, it } from "vitest";
import { beyanOlcumOnerisi, konuHedefiniBul, konuOlcumuYeterliMi } from "./konu-ad-eslesmesi";

const hedefler = [
  { ders: "Türkçe", konu: "Sözcükte Anlam", ustKonu: "Sözcükte Anlam" },
  { ders: "Türkçe", konu: "Paragrafta Anlam", ustKonu: "Paragraf" },
  { ders: "Türkçe", konu: "Paragrafta Yapı", ustKonu: "Paragraf" },
];

describe("serbest konu adı eşleştirme", () => {
  it("Türkçe büyük/küçük harf ve boşluk farkını doğrudan eşler", () => {
    expect(konuHedefiniBul("Türkçe", "  SÖZCÜKTE   ANLAM ", hedefler, [])).toEqual({
      hedef: hedefler[0], yol: "dogrudan",
    });
  });

  it("belirsiz üst konuyu kendi kendine alt konuya bağlamaz", () => {
    expect(konuHedefiniBul("Türkçe", "Paragraf", hedefler, [])).toEqual({ hedef: null, yol: "yok" });
  });

  it("yalnız adminin açık eşleştirmesini uygular", () => {
    expect(konuHedefiniBul("Türkçe", "Paragraf", hedefler, [{
      ders: "Türkçe", kaynak_konu: "Paragraf", hedef_konu: "Paragrafta Anlam",
    }])).toEqual({ hedef: hedefler[1], yol: "yonetici" });
  });

  it("farklı dersin eşleştirmesini kullanmaz", () => {
    expect(konuHedefiniBul("Matematik", "Paragraf", hedefler, [{
      ders: "Türkçe", kaynak_konu: "Paragraf", hedef_konu: "Paragrafta Anlam",
    }]).hedef).toBeNull();
  });
});

describe("ölçüm kanıtı ve beyan önerisi", () => {
  it("tek kayıttaki yüksek doğruluğu yeterli kanıt saymaz", () => {
    expect(konuOlcumuYeterliMi(20, 0, 1)).toBe(false);
    expect(beyanOlcumOnerisi("uzak", 20, 0, 1)).toBeNull();
  });

  it("az soruya kesin yargı üretmez", () => {
    expect(konuOlcumuYeterliMi(9, 0, 3)).toBe(false);
  });

  it("yeterli ölçüm ile çelişen beyana yalnız öneri döndürür", () => {
    expect(beyanOlcumOnerisi("yakin", 4, 6, 2)).toBe("gozden_gecir");
    expect(beyanOlcumOnerisi("uzak", 8, 2, 2)).toBe("ilerleme");
    expect(beyanOlcumOnerisi("belirsiz", 8, 2, 2)).toBeNull();
  });
});
