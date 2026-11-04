import { describe, expect, it } from "vitest";
import { odevKonuGruplari } from "./odev-konu-secimi";

describe("Ödev Ver konu seçimi", () => {
  const adaylar = [
    { ders: "Matematik", konu: "Sayılar", seviye: "9. Sınıf" },
    { ders: "Matematik", konu: "Trigonometri", seviye: "10. Sınıf" },
    { ders: "Matematik", konu: "Dik Üçgende Oranlar", seviye: "10. Sınıf", ustKonu: "Trigonometri" },
    { ders: "Matematik", konu: "Sinüs Teoremi", seviye: "10. Sınıf", ustKonu: "Trigonometri" },
    { ders: "Matematik", konu: "Doğal Sayılar", seviye: "9. Sınıf", ustKonu: "Sayılar" },
    { ders: "Matematik", konu: "Problemler", seviye: "TYT" },
    { ders: "Matematik", konu: "Okulun Özel Başlığı", seviye: null, ustKonu: "Okul Üst Konusu" },
  ];

  it("hedef sınıf önce, alt sınıf tekrar olarak, sonra TYT ve kurum konuları", () => {
    expect(odevKonuGruplari(adaylar, 10).map((g) => g.baslik)).toEqual([
      "10. Sınıf Konuları", "9. Sınıf Konuları (Tekrar)", "TYT Konuları", "Kurum Konuları",
    ]);
  });
  it("alt başlıklar ana konunun altına toplanır, ana listede ayrıca görünmez", () => {
    const gruplar = odevKonuGruplari(adaylar, 10);
    expect(gruplar[0].konular).toEqual([{ konu: "Trigonometri", altBasliklar: ["Dik Üçgende Oranlar", "Sinüs Teoremi"] }]);
    expect(gruplar[1].konular).toEqual([{ konu: "Sayılar", altBasliklar: ["Doğal Sayılar"] }]);
  });
  it("ana konusu listede olmayan alt başlık kendi başına seçilebilir", () => {
    expect(odevKonuGruplari(adaylar, 10)[3].konular).toEqual([{ konu: "Okulun Özel Başlığı", altBasliklar: [] }]);
  });
  it("hedef 9. sınıfsa 9 tekrar sayılmaz", () => {
    expect(odevKonuGruplari(adaylar.filter((a) => a.seviye !== "10. Sınıf"), 9)[0].baslik).toBe("9. Sınıf Konuları");
  });
});
