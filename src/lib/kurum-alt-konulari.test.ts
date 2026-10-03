import { describe, expect, test } from "vitest";
import { kurumHiyerarsiKonulari, kurumKonuOnerileri } from "./kurum-alt-konulari";

describe("kurum alt konuları", () => {
  test("farklı branşların alt konuları kendi dersinde ve üst başlığın sınıfında önerilir", () => {
    const konular = [
      { id: "1", ders: "Matematik", ust_konu: "Üslü-Köklü Sayılar, Sayı Kümeleri, Özdeşlikler", alt_baslik: "Rasyonel Sayılar" },
      { id: "2", ders: "Fizik", ust_konu: "Fizik Bilimi ve Kariyer Keşfi", alt_baslik: "Fiziğin alt dalları" },
    ];
    expect(kurumKonuOnerileri(konular)).toEqual([{
      ders: "Matematik", konu: "Rasyonel Sayılar", seviye: "9. Sınıf",
      ustKonu: "Üslü-Köklü Sayılar, Sayı Kümeleri, Özdeşlikler",
    }, {
      ders: "Fizik", konu: "Fiziğin alt dalları", seviye: "9. Sınıf",
      ustKonu: "Fizik Bilimi ve Kariyer Keşfi",
    }]);
    expect(kurumHiyerarsiKonulari(konular)).toEqual([{
      ders: "Matematik", ustKonu: "Üslü-Köklü Sayılar, Sayı Kümeleri, Özdeşlikler", altBaslik: "Rasyonel Sayılar",
    }, {
      ders: "Fizik", ustKonu: "Fizik Bilimi ve Kariyer Keşfi", altBaslik: "Fiziğin alt dalları",
    }]);
  });
});
