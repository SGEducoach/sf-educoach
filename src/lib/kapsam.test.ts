import { describe, expect, test } from "vitest";
import { KAPSAM_ESIGI, kapsamEtiketi, kapsamKarari, kapsamOrani, kapsamUyarisi, kapsamYeterliMi } from "./kapsam";

// Kapsam dürüstlüğü (Rehber Radarı Adım 1, 07.10.2026). Eşik kullanıcı
// onayıyla 0.25; testler Elbistan'ın GERÇEK dağılımını kullanıyor, çünkü
// bu işin sebebi tam olarak o sayılar.
describe("kapsamOrani", () => {
  test("toplam sıfır veya geçersizse null döner (0 ile karışmasın)", () => {
    expect(kapsamOrani(0, 0)).toBeNull();
    expect(kapsamOrani(5, -1)).toBeNull();
    expect(kapsamOrani(Number.NaN, 10)).toBeNull();
  });

  test("oran hesaplar", () => {
    expect(kapsamOrani(2, 20)).toBeCloseTo(0.1);
    expect(kapsamOrani(9, 35)).toBeCloseTo(0.257, 3);
  });

  // Veri tutarsızlığına karşı: kapsam toplamı aşarsa oran 1'i geçmemeli.
  test("kapsam toplamı aşarsa 1'de sınırlanır, negatifse 0", () => {
    expect(kapsamOrani(30, 20)).toBe(1);
    expect(kapsamOrani(-3, 20)).toBe(0);
  });
});

describe("kapsamYeterliMi — Elbistan gerçek dağılımı", () => {
  test("9. sınıf (2/20 = %10) yetersiz", () => {
    expect(kapsamYeterliMi(2, 20)).toBe(false);
  });

  // 07.10.2026'da eşik 0.25'ten 0.30'a çekildi: 35 öğrencinin 9'undan gelen
  // bir ortalama kesin sayı gibi gösterilmeye değmez. Bu test o kararı kayda
  // geçiriyor — eşik 0.25'e dönerse burası kırılır.
  test("10. sınıf (9/35 = %25,7) artık YETERSİZ sayılır", () => {
    expect(kapsamYeterliMi(9, 35)).toBe(false);
  });

  test("11 ve 12. sınıf (%93 ve %98) yeterli", () => {
    expect(kapsamYeterliMi(86, 92)).toBe(true);
    expect(kapsamYeterliMi(42, 43)).toBe(true);
  });

  test("eşiğe tam oturan oran yeterli sayılır", () => {
    expect(kapsamYeterliMi(6, 20)).toBe(true); // tam 0.30
    expect(kapsamYeterliMi(5, 20)).toBe(false); // 0.25 artık yetmiyor
    expect(KAPSAM_ESIGI).toBe(0.3);
  });

  test("öğrencisi olmayan kapsam yeterli DEĞİL", () => {
    expect(kapsamYeterliMi(0, 0)).toBe(false);
  });
});

describe("kapsamEtiketi", () => {
  test("kaç öğrenciden geldiğini ve yüzdeyi yazar", () => {
    expect(kapsamEtiketi(2, 20)).toBe("2/20 öğrenciden (%10)");
    expect(kapsamEtiketi(86, 92)).toBe("86/92 öğrenciden (%93)");
  });

  test("öğrenci yoksa sayı uydurmaz", () => {
    expect(kapsamEtiketi(0, 0)).toBe("öğrenci yok");
  });
});

describe("kapsamUyarisi — sayı VERMEZ, yanılgıyı düzeltir", () => {
  test("hiç veri yoksa bunu açıkça söyler", () => {
    expect(kapsamUyarisi(0, 20)).toBe("Yetersiz veri — 20 öğrenciden hiçbiri bu dönemde deneme girmemiş.");
  });

  test("az veri varsa kaç kişiden geldiğini söyler", () => {
    expect(kapsamUyarisi(2, 20)).toBe("Yetersiz veri — 20 öğrenciden yalnızca 2 tanesi deneme girmiş.");
  });

  test("kayıtlı öğrenci yoksa ayrı mesaj", () => {
    expect(kapsamUyarisi(0, 0)).toBe("Bu kapsamda kayıtlı öğrenci yok.");
  });
});

describe("kapsamKarari", () => {
  // Panelin tek bakacağı karar: yetersizse ortalama GÖSTERİLMEZ.
  test("yetersiz kapsamda uyarı taşır", () => {
    const karar = kapsamKarari(2, 20);
    expect(karar.yeterli).toBe(false);
    expect(karar.uyari).toContain("Yetersiz veri");
    expect(karar.etiket).toBe("2/20 öğrenciden (%10)");
  });

  test("yeterli kapsamda uyarı yok", () => {
    const karar = kapsamKarari(86, 92);
    expect(karar.yeterli).toBe(true);
    expect(karar.uyari).toBeNull();
  });
});
