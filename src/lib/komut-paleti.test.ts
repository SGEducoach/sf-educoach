import { describe, expect, test } from "vitest";
import { paletKalemleriniSuz, type PaletKalemi } from "@/components/dashboard/KomutPaleti";

const K = (etiket: string): PaletKalemi => ({ bolum: "ozet", etiket, href: `/x/${etiket}` });

const MENU = [
  K("Ana Sayfa"), K("Öğrenciler"), K("Sınıf Analizi"), K("Öğretmenler"),
  K("Konu Haritası"), K("Duyurular"), K("Bekleyen onaylar"), K("Pano"),
];

describe("paletKalemleriniSuz", () => {
  test("boş sorgu her şeyi döndürür", () => {
    expect(paletKalemleriniSuz(MENU, "   ")).toHaveLength(MENU.length);
  });

  // Türkçe büyük/küçük harf tuzağı: "ı/İ" ve "i/I" çiftleri İngilizce
  // toLowerCase ile yanlış eşleşir.
  test("Türkçe harfler ve aksanlar eşleşmeyi bozmaz", () => {
    expect(paletKalemleriniSuz(MENU, "SINIF").map((k) => k.etiket)).toEqual(["Sınıf Analizi"]);
    expect(paletKalemleriniSuz(MENU, "sinif").map((k) => k.etiket)).toEqual(["Sınıf Analizi"]);
    expect(paletKalemleriniSuz(MENU, "ogrenci").map((k) => k.etiket)).toEqual(["Öğrenciler"]);
    expect(paletKalemleriniSuz(MENU, "ÖĞRETMEN").map((k) => k.etiket)).toEqual(["Öğretmenler"]);
  });

  // GERÇEK TUZAK: "on" yazınca aranan kelime etiketin İKİNCİ kelimesi
  // ("Bekleyen onaylar"). Yalnızca dizgi başına bakan bir sıralama bunun
  // yerine "Konu Haritası"nı öne alıyor (K-on-u) ve Enter yanlış bölüme
  // götürüyor. Kelime başlangıcı, dizgi içinde geçmekten önce gelmeli.
  test("kelime başlangıcı, dizgi içinde geçmekten önce gelir", () => {
    const s = paletKalemleriniSuz(MENU, "on");
    expect(s.map((k) => k.etiket)).toEqual(["Bekleyen onaylar", "Konu Haritası"]);
  });

  test("dizgi başı, kelime başından da önce gelir", () => {
    const s = paletKalemleriniSuz([K("Bekleyen onaylar"), K("Onaylar")], "on");
    expect(s[0].etiket).toBe("Onaylar");
  });

  test("aynı kademedekiler menü sırasını korur", () => {
    const s = paletKalemleriniSuz(MENU, "a");
    expect(s.map((k) => k.etiket)).toEqual([
      // "Ana Sayfa" dizgi başı, "Analizi" kelime başı, kalanlar içinde geçen.
      // ("Öğretmenler"de hiç "a" yok, listeye girmiyor.)
      "Ana Sayfa", "Sınıf Analizi", "Konu Haritası", "Duyurular", "Bekleyen onaylar", "Pano",
    ]);
  });

  test("eşleşme yoksa boş döner", () => {
    expect(paletKalemleriniSuz(MENU, "zzz")).toEqual([]);
  });
});
