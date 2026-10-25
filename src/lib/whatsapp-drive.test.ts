import { describe, expect, it } from "vitest";
import { DRIVE_EK_BOYUTU, driveDosyasiDogrula, driveDosyaAdresi, drivePaylasimMetni, driveYuklemeAdresi } from "./whatsapp-drive";

describe("WhatsApp Drive ek sınırları", () => {
  it("Türkçe PDF adı ve 25 MB üst sınırını kabul eder", () => {
    expect(driveDosyasiDogrula({ ad: "Sözcükte Anlam.PDF", boyut: DRIVE_EK_BOYUTU })).toEqual({ ad: "Sözcükte Anlam.PDF", boyut: DRIVE_EK_BOYUTU, tur: "application/pdf" });
  });
  it.each([0, -1, 1.5, NaN, Infinity, "100", DRIVE_EK_BOYUTU + 1])("boş, geçersiz veya çok büyük dosyayı reddeder: %s", (boyut) => {
    expect(() => driveDosyasiDogrula({ ad: "föy.pdf", boyut })).toThrow();
  });
  it.each(["../test.pdf", "dir/test.pdf", "test\u0000.pdf", "script.html", "program.exe", "x".repeat(181) + ".pdf"]) ("istenmeyen adı/türü reddeder: %s", (ad) => {
    expect(() => driveDosyasiDogrula({ ad, boyut: 10 })).toThrow();
  });
  it("yalnız Google'ın tek dosyalık upload oturumunu kabul eder", () => {
    expect(driveYuklemeAdresi("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=abc")).toBe(true);
    for (const u of ["https://evil.example/upload/drive/v3/files?upload_id=x", "https://www.googleapis.com.evil.example/upload/drive/v3/files?upload_id=x", "http://www.googleapis.com/upload/drive/v3/files?upload_id=x", "https://www.googleapis.com:444/upload/drive/v3/files?upload_id=x", "https://user:pass@www.googleapis.com/upload/drive/v3/files?upload_id=x", "https://www.googleapis.com/drive/v3/files?upload_id=x"]) expect(driveYuklemeAdresi(u)).toBe(false);
  });
  it("paylaşım bağlantısını dosya kimliğinden üretir, dış adresi kopyalamaz", () => {
    const id = "1abcdefghijklmno";
    expect(drivePaylasimMetni("Duyuru", [{ id, ad: "föy.pdf", adres: "https://evil.example" }])).toContain(driveDosyaAdresi(id));
    expect(drivePaylasimMetni("Duyuru", [])).toBe("");
    expect(() => driveDosyaAdresi("../x")).toThrow();
  });
});
