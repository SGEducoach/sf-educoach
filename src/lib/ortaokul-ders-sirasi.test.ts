import { describe, expect, test } from "vitest";
import { ortaokulDersKarsilastir, ortaokulDerslerineGoreSirala, ortaokulDersSirasi } from "./ortaokul-ders-sirasi";

// Kullanıcı kararı 08.10.2026: ders butonları HER YERDE
// Türkçe, Matematik, Fen, Sosyal, İngilizce, Din sırasında olacak.
//
// Eskiden mufredat tablosundaki `sira` değerleri eşit olduğu için alfabetik
// sıralanıyordu: "Din Kültürü, Fen Bilimleri, İngilizce, Matematik,
// Sosyal Bilgiler, Türkçe" — istenenin neredeyse tam tersi.

const BESINCI = [
  "Din Kültürü ve Ahlak Bilgisi", "Fen Bilimleri", "İngilizce",
  "Matematik", "Sosyal Bilgiler", "Türkçe",
];

const SEKIZINCI = [
  "Din Kültürü ve Ahlak Bilgisi", "Fen Bilimleri", "İngilizce",
  "Matematik", "T.C. İnkılap Tarihi ve Atatürkçülük", "Türkçe",
];

describe("istenen sıra", () => {
  test("5-7. sınıf dersleri doğru sıralanır", () => {
    expect([...BESINCI].sort(ortaokulDersKarsilastir)).toEqual([
      "Türkçe", "Matematik", "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce",
      "Din Kültürü ve Ahlak Bilgisi",
    ]);
  });

  // 8. sınıfta "Sosyal Bilgiler" yerine İnkılap Tarihi geliyor; AYNI SLOTU
  // paylaşmalı, yoksa sıra 8. sınıfta bozulur.
  test("8. sınıfta İnkılap Tarihi sosyal slotunda kalır", () => {
    expect([...SEKIZINCI].sort(ortaokulDersKarsilastir)).toEqual([
      "Türkçe", "Matematik", "Fen Bilimleri", "T.C. İnkılap Tarihi ve Atatürkçülük",
      "İngilizce", "Din Kültürü ve Ahlak Bilgisi",
    ]);
  });

  test("giriş sırası sonucu etkilemez", () => {
    const tersten = [...BESINCI].reverse().sort(ortaokulDersKarsilastir);
    const karisik = [BESINCI[3], BESINCI[0], BESINCI[5], BESINCI[1], BESINCI[4], BESINCI[2]].sort(ortaokulDersKarsilastir);
    expect(tersten).toEqual(karisik);
  });
});

describe("ortaokulDersSirasi", () => {
  test("altı ders bilinen sıraya oturur", () => {
    expect(ortaokulDersSirasi("Türkçe")).toBe(0);
    expect(ortaokulDersSirasi("Matematik")).toBe(1);
    expect(ortaokulDersSirasi("Fen Bilimleri")).toBe(2);
    expect(ortaokulDersSirasi("Sosyal Bilgiler")).toBe(3);
    expect(ortaokulDersSirasi("T.C. İnkılap Tarihi ve Atatürkçülük")).toBe(3);
    expect(ortaokulDersSirasi("İngilizce")).toBe(4);
    expect(ortaokulDersSirasi("Din Kültürü ve Ahlak Bilgisi")).toBe(5);
  });

  // Ad varyasyonları (müfredat sürümü değişirse) yine doğru yere düşmeli.
  test("kısa ve farklı yazımlar da tanınır", () => {
    expect(ortaokulDersSirasi("Din Kültürü")).toBe(5);
    expect(ortaokulDersSirasi("türkçe")).toBe(0);
    expect(ortaokulDersSirasi("  Matematik  ")).toBe(1);
    expect(ortaokulDersSirasi("İnkılap Tarihi")).toBe(3);
  });

  test("bilinmeyen ders sona atılır", () => {
    expect(ortaokulDersSirasi("Görsel Sanatlar")).toBe(6);
    expect(ortaokulDersSirasi("Teknoloji ve Tasarım")).toBe(6);
  });

  test("bilinmeyen dersler kendi arasında alfabetik", () => {
    const liste = ["Teknoloji ve Tasarım", "Görsel Sanatlar", "Türkçe"];
    expect(liste.sort(ortaokulDersKarsilastir)).toEqual([
      "Türkçe", "Görsel Sanatlar", "Teknoloji ve Tasarım",
    ]);
  });
});

describe("ortaokulDerslerineGoreSirala", () => {
  test("nesne listesini ad alanına göre sıralar, girdiyi bozmaz", () => {
    const girdi = [{ ad: "Din Kültürü ve Ahlak Bilgisi" }, { ad: "Türkçe" }];
    const sonuc = ortaokulDerslerineGoreSirala(girdi, (d) => d.ad);
    expect(sonuc.map((d) => d.ad)).toEqual(["Türkçe", "Din Kültürü ve Ahlak Bilgisi"]);
    expect(girdi[0].ad).toBe("Din Kültürü ve Ahlak Bilgisi");
  });
});
