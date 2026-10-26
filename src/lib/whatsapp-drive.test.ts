import { describe, expect, it } from "vitest";
import { DRIVE_EK_BOYUTU, driveBaglantiKopmaMi, driveDosyasiDogrula, driveDosyaAdresi, driveIcerikUygunMu, drivePaylasimMetni, driveYuklemeAdresi } from "./whatsapp-drive";

const bayt = (...v: number[]) => Uint8Array.from(v);
const yazi = (metin: string) => Uint8Array.from(Buffer.from(metin, "utf8"));
describe("Drive içerik imzası (uzantı yalan söylemesin)", () => {
  it("doğru imzalı dosyaları kabul eder", () => {
    expect(driveIcerikUygunMu("föy.PDF", yazi("%PDF-1.7"))).toBe(true);
    expect(driveIcerikUygunMu("a.png", bayt(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe(true);
    expect(driveIcerikUygunMu("a.jpeg", bayt(0xff, 0xd8, 0xff, 0xe0))).toBe(true);
    expect(driveIcerikUygunMu("a.webp", bayt(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50, 0x56))).toBe(true);
    expect(driveIcerikUygunMu("a.docx", bayt(0x50, 0x4b, 0x03, 0x04, 0x14))).toBe(true);
    expect(driveIcerikUygunMu("a.xls", bayt(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1))).toBe(true);
    expect(driveIcerikUygunMu("not.txt", yazi("Merhaba Dünya"))).toBe(true);
  });
  it("uzantıyla uyuşmayan içeriği reddeder", () => {
    expect(driveIcerikUygunMu("x.pdf", bayt(0x4d, 0x5a, 0x90, 0x00))).toBe(false);
    expect(driveIcerikUygunMu("x.png", yazi("%PDF-1.7"))).toBe(false);
    expect(driveIcerikUygunMu("x.docx", yazi("<html>"))).toBe(false);
    expect(driveIcerikUygunMu("x.txt", bayt(0x4d, 0x5a, 0x00, 0x03))).toBe(false);
    expect(driveIcerikUygunMu("x.pdf", new Uint8Array())).toBe(false);
    expect(driveIcerikUygunMu("x.exe", bayt(0x4d, 0x5a))).toBe(false);
  });
});

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

describe("Drive bağlantı kopması", () => {
  it("Google'ın reddettiği yenileme anahtarını kopma sayar", () => {
    expect(driveBaglantiKopmaMi({ response: { data: { error: "invalid_grant" } }, message: "x" })).toBe(true);
    expect(driveBaglantiKopmaMi(new Error("invalid_grant"))).toBe(true);
    expect(driveBaglantiKopmaMi({ response: { data: { error: "deleted_client" } } })).toBe(true);
  });
  it("ağ ve geçici hatalarda yanlış alarm vermez", () => {
    expect(driveBaglantiKopmaMi(new Error("getaddrinfo ENOTFOUND oauth2.googleapis.com"))).toBe(false);
    expect(driveBaglantiKopmaMi({ response: { data: { error: "temporarily_unavailable" } } })).toBe(false);
    expect(driveBaglantiKopmaMi(null)).toBe(false);
    expect(driveBaglantiKopmaMi(undefined)).toBe(false);
  });
});
