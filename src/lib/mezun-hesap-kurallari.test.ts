import { describe, expect, test } from "vitest";
import { gercekEposta, mezuniyetYiliBelirle } from "./mezun-hesap-kurallari";

describe("mezuniyetYiliBelirle", () => {
  test("Haziran–Aralık o yıl, Ocak–Mayıs bir önceki yıl", () => {
    expect(mezuniyetYiliBelirle("2026-06-20")).toBe(2026);
    expect(mezuniyetYiliBelirle("2026-11-13")).toBe(2026);
    expect(mezuniyetYiliBelirle("2027-02-01")).toBe(2026);
    expect(mezuniyetYiliBelirle("2027-05-31")).toBe(2026);
  });
  test("bozuk tarih hata verir", () => {
    expect(() => mezuniyetYiliBelirle("13.11.2026")).toThrow();
  });
});

describe("gercekEposta", () => {
  test("sistem adresleri alınmaz, gerçek adres küçük harfe iner", () => {
    expect(gercekEposta("12345@ogrenci.sgeducoach.internal")).toBeNull();
    expect(gercekEposta("veli+abc@sgeducoach.internal")).toBeNull();
    expect(gercekEposta("ogrenci@sefukoc.com")).toBeNull();
    expect(gercekEposta(" Ali.Veli@Ornek.com ")).toBe("ali.veli@ornek.com");
    expect(gercekEposta(null)).toBeNull();
  });
});
