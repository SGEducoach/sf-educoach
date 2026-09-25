import { describe, expect, test } from "vitest";
import { karneBirinciSayfaCoz, type KonumluSatir } from "./karne-birinci-sayfa";

// Konumlar gerçek "DUBLÖR TYT DENEME-4" karnesinden (sayfa 6) kısaltılarak
// alındı: soru numaraları x=100'den 12 birim arayla; cevap anahtarının
// başındaki "B" (x=88) kitapçık türü; boş soruda harf yok.
function satir(y: number, parcalar: [string, number][]): KonumluSatir {
  return { y, parcalar: parcalar.map(([str, x]) => ({ str, x })) };
}
const NO = (n: number) => Array.from({ length: n }, (_, i): [string, number] => [String(i + 1), 100 + i * 12]);

const SAYFA: KonumluSatir[] = [
  satir(700, [["Öğrenci", 26], ["AHMET KILINÇ", 80], ["Sınıf", 300], ["12-A", 330], ["Öğr.No", 400], ["250", 440]]),
  satir(640, [["Sıralamalar", 26]]),
  satir(630, [["Puan Türü", 26], ["Puan", 120], ["Genel Ortalama", 170]]),
  satir(620, [["Sınıf", 260], ["Kurum", 300], ["İlçe", 340], ["İl", 380], ["Genel", 420]]),
  satir(610, [["TYT", 26], ["393,233", 120], ["309,520", 170], ["10", 260], ["41", 300], ["41", 340], ["41", 380], ["80", 420]]),
  satir(600, [["Katılımlar", 26], ["27", 260], ["110", 300], ["110", 340], ["110", 380], ["535", 420]]),
  satir(590, [["Ortalamalar", 26]]),
  satir(580, [["Ders / Test", 26], ["Soru", 145], ["Doğru", 201], ["Yanlış", 258], ["Net", 308], ["Başarı %", 366], ["Sınıf", 422], ["Kurum", 479], ["Genel", 535]]),
  satir(570, [["Türkçe", 26], ["5", 145], ["3", 201], ["1", 258], ["2,75", 308], ["60", 366], ["3,10", 422], ["3,00", 479], ["2,50", 535]]),
  satir(560, [["Din Kül. ve Ahl. Bil.", 26], ["5", 145], ["4", 201], ["1", 258], ["3,75", 308], ["75", 366], ["3,81", 422], ["3,84", 479], ["3,02", 535]]),
  satir(540, NO(5)),
  // 1: C doğru, 2: a yanlış, 3: boş (harf yok), 4: D doğru, 5: e yanlış
  satir(530, [["TYT Türkçe", 26], ["C", 100], ["a", 112], ["D", 136], ["e", 148]]),
  satir(520, [["Cevap Anahtarı", 26], ["B", 88], ["C", 100], ["B", 112], ["E", 124], ["D", 136], ["A", 148]]),
];

describe("karneBirinciSayfaCoz", () => {
  const sonuc = karneBirinciSayfaCoz(SAYFA);

  test("puan, sıralama ve katılım", () => {
    expect(sonuc.puanlar).toEqual([{
      tur: "TYT", puan: 393.233, genelOrtalama: 309.52,
      sira: { sinif: 10, kurum: 41, ilce: 41, il: 41, genel: 80 },
      katilim: { sinif: 27, kurum: 110, ilce: 110, il: 110, genel: 535 },
    }]);
  });

  test("ders ortalamaları (çok kelimeli ders adı dahil)", () => {
    expect(sonuc.dersler).toHaveLength(2);
    expect(sonuc.dersler[1]).toEqual({ ders: "Din Kül. ve Ahl. Bil.", soru: 5, dogru: 4, yanlis: 1, net: 3.75, basari: 75, sinifOrt: 3.81, kurumOrt: 3.84, genelOrt: 3.02 });
  });

  test("cevaplar konuma göre hizalanır: büyük harf doğru, küçük yanlış, harf yoksa boş", () => {
    expect(sonuc.testler).toHaveLength(1);
    const t = sonuc.testler[0];
    expect(t.test).toBe("TYT Türkçe");
    expect(t.kitapcik).toBe("B");
    expect(t.sorular).toEqual([
      { no: 1, cevap: "C", anahtar: "C", durum: "dogru" },
      { no: 2, cevap: "A", anahtar: "B", durum: "yanlis" },
      { no: 3, cevap: null, anahtar: "E", durum: "bos" },
      { no: 4, cevap: "D", anahtar: "D", durum: "dogru" },
      { no: 5, cevap: "E", anahtar: "A", durum: "yanlis" },
    ]);
  });
});
