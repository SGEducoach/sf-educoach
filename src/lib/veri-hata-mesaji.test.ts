import { describe, expect, test } from "vitest";
import { veriHatasiCevir } from "./veri-hata-mesaji";

describe("veriHatasiCevir", () => {
  test("öğrencinin gördüğü süre kısıtı mesajı çevrilir", () => {
    const ham = 'new row for relation "soru_cozumleri" violates check constraint "soru_cozumleri_sure_ust_sinir"';
    expect(veriHatasiCevir(ham)).toMatch(/toplam soru sayısının/i);
  });
  test("konu çalışması süre kısıtı", () => {
    expect(veriHatasiCevir('violates check constraint "konu_calismalar_sure_ust_sinir"')).toMatch(/tek bir çalışma oturumu/i);
  });
  test("negatif soru sayısı", () => {
    expect(veriHatasiCevir('violates check constraint "soru_cozumleri_dogru_check"')).toMatch(/eksi olamaz/i);
  });
  test("RLS hatası", () => {
    expect(veriHatasiCevir('new row violates row-level security policy for table "soru_cozumleri"')).toMatch(/yetkin yok/i);
  });
  test("tanınmayan ham veritabanı metni gizlenir", () => {
    const ham = 'null value in column "ders" of relation "soru_cozumleri" violates not-null constraint';
    expect(veriHatasiCevir(ham)).toMatch(/kontrol edip tekrar dene/i);
  });
  test("Türkçe yazılmış tetikleyici/uygulama mesajı korunur", () => {
    expect(veriHatasiCevir("Lütfen tüm alanları doldurun.")).toBe("Lütfen tüm alanları doldurun.");
  });
  test("boş mesaj", () => {
    expect(veriHatasiCevir(null)).toMatch(/tekrar dene/i);
  });
});
