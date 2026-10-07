import { describe, expect, test } from "vitest";
import {
  GORUSME_TURLERI, GORUSME_TURU_ETIKET, ICERIK_MAKS, ICERIK_MIN,
  gorusmeDogrula, gorusmeTuruMu,
} from "./gorusme";

const bugun = () => new Date().toISOString().slice(0, 10);
const gun = (fark: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + fark);
  return d.toISOString().slice(0, 10);
};

describe("tür listesi", () => {
  test("her türün etiketi var", () => {
    for (const t of GORUSME_TURLERI) expect(GORUSME_TURU_ETIKET[t]).toBeTruthy();
  });

  test("gorusmeTuruMu yalnız listedekileri kabul eder", () => {
    expect(gorusmeTuruMu("bireysel")).toBe(true);
    expect(gorusmeTuruMu("veli")).toBe(true);
    expect(gorusmeTuruMu("uydurma")).toBe(false);
    expect(gorusmeTuruMu("")).toBe(false);
  });
});

describe("gorusmeDogrula — içerik", () => {
  // Sınırlar DB kısıtıyla BİREBİR aynı olmalı (0145: between 3 and 4000),
  // aksi hâlde kullanıcı ham Postgres hatası görür.
  test("DB kısıtıyla aynı sınırlar", () => {
    expect(ICERIK_MIN).toBe(3);
    expect(ICERIK_MAKS).toBe(4000);
  });

  test("çok kısa not reddedilir", () => {
    expect(gorusmeDogrula({ icerik: "ab", tur: "bireysel" })).toContain("en az 3");
    expect(gorusmeDogrula({ icerik: "", tur: "bireysel" })).toContain("en az 3");
  });

  // Yalnız boşluktan oluşan not "dolu" sayılmamalı.
  test("sadece boşluk reddedilir", () => {
    expect(gorusmeDogrula({ icerik: "      ", tur: "bireysel" })).toContain("en az 3");
  });

  test("tam sınırda kabul edilir", () => {
    expect(gorusmeDogrula({ icerik: "abc", tur: "bireysel" })).toBeNull();
    expect(gorusmeDogrula({ icerik: "a".repeat(ICERIK_MAKS), tur: "bireysel" })).toBeNull();
  });

  test("sınırı aşan not reddedilir", () => {
    expect(gorusmeDogrula({ icerik: "a".repeat(ICERIK_MAKS + 1), tur: "bireysel" })).toContain("en fazla");
  });
});

describe("gorusmeDogrula — tür ve tarih", () => {
  test("geçersiz tür reddedilir", () => {
    expect(gorusmeDogrula({ icerik: "görüşme yapıldı", tur: "uydurma" })).toBe("Görüşme türü geçersiz.");
  });

  test("bugün ve geçmiş tarih kabul edilir", () => {
    expect(gorusmeDogrula({ icerik: "görüşme yapıldı", tur: "veli", tarih: bugun() })).toBeNull();
    expect(gorusmeDogrula({ icerik: "görüşme yapıldı", tur: "veli", tarih: gun(-30) })).toBeNull();
  });

  // Henüz yapılmamış bir görüşmenin kaydı anlamsız.
  test("gelecek tarih reddedilir", () => {
    expect(gorusmeDogrula({ icerik: "görüşme yapıldı", tur: "veli", tarih: gun(1) })).toContain("Gelecek");
  });

  test("bozuk tarih biçimi reddedilir", () => {
    expect(gorusmeDogrula({ icerik: "görüşme yapıldı", tur: "veli", tarih: "07.10.2026" })).toBe("Tarih geçersiz.");
    expect(gorusmeDogrula({ icerik: "görüşme yapıldı", tur: "veli", tarih: "2026-13" })).toBe("Tarih geçersiz.");
  });

  test("tarih verilmezse sorun değil", () => {
    expect(gorusmeDogrula({ icerik: "görüşme yapıldı", tur: "bireysel" })).toBeNull();
  });
});
