import { describe, expect, test } from "vitest";
import { ortaokulCalismaOnayYetkisi, ortaokulDuzeltmeDogrula } from "./ortaokul-calisma-onay";

describe("ortaokulCalismaOnayYetkisi", () => {
  const temel = {
    teacherId: "ogretmen-1", kendiSinifId: "sinif-1", ogrenciSinifId: "sinif-1",
    dersAdi: "Matematik", atamalar: [] as { teacher_id: string; class_id: string; ders: string }[],
  };
  test("atanmış branş öğretmeni varsa yalnız o onaylar", () => {
    const atamalar = [{ teacher_id: "ogretmen-2", class_id: "sinif-1", ders: "matematik" }];
    expect(ortaokulCalismaOnayYetkisi({ ...temel, atamalar })).toBe(false);
    expect(ortaokulCalismaOnayYetkisi({ ...temel, teacherId: "ogretmen-2", kendiSinifId: null, atamalar })).toBe(true);
  });
  test("branş ataması yoksa yalnız sınıf öğretmeni onaylar", () => {
    expect(ortaokulCalismaOnayYetkisi(temel)).toBe(true);
    expect(ortaokulCalismaOnayYetkisi({ ...temel, kendiSinifId: "sinif-2" })).toBe(false);
  });
  test("başka sınıfın ders ataması erişim vermez", () => {
    const atamalar = [{ teacher_id: "ogretmen-1", class_id: "sinif-2", ders: "Matematik" }];
    expect(ortaokulCalismaOnayYetkisi({ ...temel, kendiSinifId: null, atamalar })).toBe(false);
  });
});

describe("ortaokulDuzeltmeDogrula", () => {
  const bugun = "2026-10-13";
  test("soru sayılarını düzelterek onaylamaya izin verir", () => {
    const sonuc = ortaokulDuzeltmeDogrula("soru", {
      tarih: bugun, sureDakika: 20, dogru: 8, yanlis: 2, bos: 0,
    }, bugun);
    expect(sonuc.temiz).toMatchObject({ dogru: 8, yanlis: 2, bos: 0 });
  });
  test("eksi, ondalık ve sıfır toplam reddedilir", () => {
    for (const sayilar of [{ dogru: -1, yanlis: 2, bos: 0 }, { dogru: 1.5, yanlis: 0, bos: 0 }, { dogru: 0, yanlis: 0, bos: 0 }]) {
      expect(ortaokulDuzeltmeDogrula("soru", { tarih: bugun, sureDakika: null, ...sayilar }, bugun).temiz).toBeNull();
    }
  });
  test("süre soru sayısına göre sınırlandırılır", () => {
    expect(ortaokulDuzeltmeDogrula("soru", {
      tarih: bugun, sureDakika: 21, dogru: 10, yanlis: 0, bos: 0,
    }, bugun).temiz).toBeNull();
  });
  test("konu çalışması süresiz olamaz ve gelecekte tarih kullanamaz", () => {
    expect(ortaokulDuzeltmeDogrula("konu", {
      tarih: bugun, sureDakika: null, dogru: null, yanlis: null, bos: null,
    }, bugun).temiz).toBeNull();
    expect(ortaokulDuzeltmeDogrula("konu", {
      tarih: "2026-10-14", sureDakika: 30, dogru: null, yanlis: null, bos: null,
    }, bugun).temiz).toBeNull();
  });
});
