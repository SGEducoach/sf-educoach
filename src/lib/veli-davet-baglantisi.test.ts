import { describe, expect, test } from "vitest";
import { davetteOgrenciAdi, davetTokenOzeti, davetTokeniBicimliMi, davetTokeniUret } from "./veli-davet-baglantisi";

describe("veli davet anahtarı", () => {
  test("her anahtar 43 karakter, URL'de güvenli ve birbirinden farklı", () => {
    const a = davetTokeniUret(), b = davetTokeniUret();
    expect(davetTokeniBicimliMi(a)).toBe(true);
    expect(a).not.toBe(b);
  });
  test("özet 64 haneli onaltılık; aynı anahtar aynı özet", () => {
    const t = davetTokeniUret();
    expect(davetTokenOzeti(t)).toMatch(/^[0-9a-f]{64}$/);
    expect(davetTokenOzeti(t)).toBe(davetTokenOzeti(t));
  });
  test("biçimsiz anahtar reddedilir", () => {
    for (const t of ["", "kisa", "a".repeat(44), "../../etc/passwd".padEnd(43, "x"), 123, null]) {
      expect(davetTokeniBicimliMi(t)).toBe(false);
    }
  });
});

describe("davetteOgrenciAdi", () => {
  test("ilk ad(lar) tam, soyad baş harf", () => {
    expect(davetteOgrenciAdi("Ayşe Nur Kaya")).toBe("Ayşe Nur K.");
    expect(davetteOgrenciAdi("  Ali   İnce ")).toBe("Ali İ.");
    expect(davetteOgrenciAdi("Deniz")).toBe("Deniz");
  });
});
