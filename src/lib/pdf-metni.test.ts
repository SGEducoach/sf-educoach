import { describe, expect, test } from "vitest";
import { adAnahtari, enYakinSutun, parcalariBirlestir, satirMetni, satirlariOlustur } from "./pdf-metni";
import type { PdfOgesi } from "./pdf-metni";

function oge(metin: string, x: number, y: number, genislik = metin.length * 4.5, sayfa = 1): PdfOgesi {
  return { sayfa, metin, x, y, genislik };
}

describe("satirlariOlustur", () => {
  test("aynı yükseklikteki parçalar bir satır, satırlar yukarıdan aşağıya", () => {
    const satirlar = satirlariOlustur([oge("b", 50, 700), oge("a", 10, 701), oge("c", 10, 650)]);
    expect(satirlar.map((s) => s.ogeler.map((o) => o.metin).join(""))).toEqual(["ab", "c"]);
  });
  test("sayfalar karışmaz", () => {
    const satirlar = satirlariOlustur([oge("x", 10, 700, 5, 1), oge("y", 10, 700, 5, 2)]);
    expect(satirlar).toHaveLength(2);
  });
});

describe("parcalariBirlestir", () => {
  test("bitişik harfler birleşir, kelime aralığında boşluk konur", () => {
    const parcalar = parcalariBirlestir([oge("AL", 8, 368, 137.9), oge("İ", 146, 368, 2.4), oge("YILMAZ", 149.6, 368, 26)]);
    expect(parcalar.map((p) => p.metin)).toEqual(["ALİ YILMAZ"]);
  });
  test("uzak parçalar ayrı kalır", () => {
    const parcalar = parcalariBirlestir([oge("DKAB1", 79, 713, 20), oge("DKAB1", 130, 713, 20)]);
    expect(parcalar).toHaveLength(2);
  });
});

describe("satirMetni ve enYakinSutun", () => {
  test("satır metni tek boşlukla birleşir", () => {
    expect(satirMetni(satirlariOlustur([oge("Adı Soyadı :", 26, 766, 40), oge("ALİ YILMAZ", 90, 766)])[0])).toBe("Adı Soyadı : ALİ YILMAZ");
  });
  test("en yakın sütun toleransla bulunur", () => {
    const merkezler = [87, 137.5, 188, 238.5];
    expect(enYakinSutun(83.6, merkezler)).toBe(0);
    expect(enYakinSutun(134.1, merkezler)).toBe(1);
    expect(enYakinSutun(500, merkezler)).toBe(-1);
  });
});

// public.ad_esleme_anahtari (Postgres) ile birebir aynı sonuçlar —
// öğretmen eşleştirmesi bu anahtara dayanıyor.
describe("adAnahtari", () => {
  test("Türkçe harfler ve I/İ/ı aynı harfe iner", () => {
    expect(adAnahtari("ALİ YILMAZ")).toBe("ali yilmaz");
    expect(adAnahtari("IŞIK KARA")).toBe("işik kara");
    expect(adAnahtari("Işık Kara")).toBe("işik kara");
    expect(adAnahtari("MELEK BENGİSU ALTUNCİOĞLU")).toBe("melek bengisu altuncioğlu");
    expect(adAnahtari("NİLÜFER KOLERİ DEDELER")).toBe("nilüfer koleri dedeler");
  });
  test("fazla boşluklar temizlenir", () => {
    expect(adAnahtari("  Uğur   ÖKSÜZ ")).toBe("uğur öksüz");
  });
});
