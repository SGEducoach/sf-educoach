import { describe, expect, test } from "vitest";
import { grupHatasiCevir } from "./grup-hata-mesaji";

describe("grupHatasiCevir", () => {
  test("kapasite hatası kullanıcı diline çevrilir", () => {
    expect(grupHatasiCevir('new row violates check "GRUP_KAPASITESI_DOLU: 5"')).toMatch(/kapasitesi dolu/i);
  });
  test("salt okunur", () => {
    expect(grupHatasiCevir("P0001 GRUP_SALT_OKUNUR")).toMatch(/salt okunur/i);
  });
  test("RLS hatası anlaşılır olur", () => {
    expect(grupHatasiCevir("new row violates row-level security policy for table \"students\"")).toMatch(/yetkiniz yok/i);
  });
  test("tanınmayan mesaj korunur", () => {
    expect(grupHatasiCevir("Sınıf oluşturulamadı, tekrar deneyin.")).toBe("Sınıf oluşturulamadı, tekrar deneyin.");
  });
  test("boş mesaj", () => {
    expect(grupHatasiCevir(null)).toMatch(/beklenmeyen/i);
  });
});
