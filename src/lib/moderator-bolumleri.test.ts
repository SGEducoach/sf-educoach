import { describe, expect, test } from "vitest";
import { moderatorBolumuCoz } from "./moderator-bolumleri";

describe("moderatorBolumuCoz", () => {
  test("parametre yoksa ya da bilinmiyorsa Öğrenciler açılır", () => {
    expect(moderatorBolumuCoz(undefined, true)).toBe("ogrenciler");
    expect(moderatorBolumuCoz("yok-boyle", true)).toBe("ogrenciler");
  });
  test("bilinen bölümler olduğu gibi döner", () => {
    expect(moderatorBolumuCoz("siniflar", false)).toBe("siniflar");
    expect(moderatorBolumuCoz("kurum", false)).toBe("kurum");
  });
  test("deneme bölümleri yalnızca dershanede açılır", () => {
    expect(moderatorBolumuCoz("deneme-yukle", true)).toBe("deneme-yukle");
    expect(moderatorBolumuCoz("pdf-eslesme", true)).toBe("pdf-eslesme");
    expect(moderatorBolumuCoz("deneme-yukle", false)).toBe("ogrenciler");
    expect(moderatorBolumuCoz("pdf-eslesme", false)).toBe("ogrenciler");
  });
  test("SMS ayarları yalnız modül açıkken açılır", () => {
    expect(moderatorBolumuCoz("sms", true, true)).toBe("sms");
    expect(moderatorBolumuCoz("sms", true)).toBe("ogrenciler");
    expect(moderatorBolumuCoz("sms", true, false)).toBe("ogrenciler");
  });
});
