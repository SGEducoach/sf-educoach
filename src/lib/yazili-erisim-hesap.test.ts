import { describe, expect, test } from "vitest";
import {
  donemBaslangici, erisimKarari, gunEkle, istanbulBugun, olcumDonemiMi, yaziliOlcumMesaji, yediGunPenceresiBaslangici,
  YAZILI_KILIT_MESAJI,
} from "./yazili-erisim-hesap";

describe("erisimKarari — üç şartın hepsi gerekli", () => {
  const tam = { aktifGun7: 3, gorevDonem: 10, profilDonem: 10 };
  test("eşiklerin tamamı sağlanınca izin var", () => expect(erisimKarari(tam)).toBe(true));
  test("haftada 2 gün giriş yetmez", () => expect(erisimKarari({ ...tam, aktifGun7: 2 })).toBe(false));
  test("9 görev yetmez", () => expect(erisimKarari({ ...tam, gorevDonem: 9 })).toBe(false));
  test("9 öğrenci profili yetmez", () => expect(erisimKarari({ ...tam, profilDonem: 9 })).toBe(false));
  test("hiç kullanım yoksa izin yok", () => expect(erisimKarari({ aktifGun7: 0, gorevDonem: 0, profilDonem: 0 })).toBe(false));
});

describe("tarih pencereleri", () => {
  test("dönem başlangıcı", () => {
    expect(donemBaslangici("2026-09-11")).toBe("2026-09-01");
    expect(donemBaslangici("2026-12-31")).toBe("2026-09-01");
    expect(donemBaslangici("2027-01-15")).toBe("2026-09-01");
    expect(donemBaslangici("2027-02-01")).toBe("2027-02-01");
    expect(donemBaslangici("2027-06-20")).toBe("2027-02-01");
  });
  test("son 7 gün bugün dahil", () => {
    expect(yediGunPenceresiBaslangici("2026-09-11")).toBe("2026-09-05");
    expect(yediGunPenceresiBaslangici("2026-03-03")).toBe("2026-02-25");
    expect(gunEkle("2026-12-31", 1)).toBe("2027-01-01");
  });
  test("ölçüm süresi 25 Eylül'de biter", () => {
    expect(olcumDonemiMi("2026-09-11")).toBe(true);
    expect(olcumDonemiMi("2026-09-24")).toBe(true);
    expect(olcumDonemiMi("2026-09-25")).toBe(false);
  });
  test("İstanbul günü: UTC gece yarısından önce Türkiye'de ertesi gün", () => {
    expect(istanbulBugun(new Date("2026-09-10T22:30:00Z"))).toBe("2026-09-11");
  });
});

describe("mesajlar", () => {
  test("kilit mesajı kullanıcının ifadesi", () =>
    expect(YAZILI_KILIT_MESAJI).toBe("Sistemi kullanma yetkiniz yoktur. SeFu Koç yazılı analizi, öğrencisinin takibini düzenli yapan öğretmenler içindir."));
  test("ölçüm mesajı tarihi gün.ay.yıl yazar", () => expect(yaziliOlcumMesaji("2026-09-25")).toMatch(/^25\.09\.2026 tarihinden itibaren/));
});
