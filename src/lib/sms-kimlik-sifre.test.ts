import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { smsKimlikCoz, smsKimlikSifrele } from "@/lib/sms-kimlik-sifre";

const eskiAnahtar = process.env.SMS_KIMLIK_ANAHTARI;
beforeEach(() => { process.env.SMS_KIMLIK_ANAHTARI = "a".repeat(64); });
afterEach(() => {
  if (eskiAnahtar === undefined) delete process.env.SMS_KIMLIK_ANAHTARI; else process.env.SMS_KIMLIK_ANAHTARI = eskiAnahtar;
});

describe("SMS kimlik şifreleme", () => {
  it("gidiş dönüşte aynı kimliği verir ve düz metni içermez", () => {
    const kimlik = { kullanici: "908501234567", sifre: "gizli-sifre" };
    const sifreli = smsKimlikSifrele(kimlik);
    expect(sifreli).not.toContain("gizli-sifre");
    expect(sifreli).not.toContain("908501234567");
    expect(smsKimlikCoz(sifreli)).toEqual(kimlik);
  });

  it("her şifreleme farklı çıktı üretir", () => {
    expect(smsKimlikSifrele({ a: "b" })).not.toBe(smsKimlikSifrele({ a: "b" }));
  });

  it("kurcalanmış ya da başka anahtarla şifrelenmiş veriyi reddeder", () => {
    const sifreli = smsKimlikSifrele({ a: "b" });
    const [iv, tag, data] = sifreli.split(".");
    expect(() => smsKimlikCoz([iv, tag, `${data.slice(0, -2)}AA`].join("."))).toThrow();
    process.env.SMS_KIMLIK_ANAHTARI = "b".repeat(64);
    expect(() => smsKimlikCoz(sifreli)).toThrow();
  });

  it("anahtar tanımsızsa şifrelemez", () => {
    delete process.env.SMS_KIMLIK_ANAHTARI;
    expect(() => smsKimlikSifrele({ a: "b" })).toThrow(/anahtar/);
  });
});
