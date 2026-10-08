import { describe, expect, test } from "vitest";
import { sinifTemaSatirlari, type HaritaGirdisi } from "./ortaokul-sinif-haritasi";

// Ortaokul sınıf tema haritası (Faz 2). Korunması gereken ilkeler:
//   1. "karar verilmemiş" AYRI sayılır — "başlamadı" DEĞİLDİR
//   2. "destek gereken" tanımı ortaokul-yeterlilik.ts ile AYNI olmalı
//   3. çalışma sayımı KAYIT değil ÖĞRENCİ sayısıdır (tekilleştirme)
//   4. sıralama öğretmenin müdahale listesi: en çok destek gereken başta

const temalar = [
  { id: "t1", ad: "Kesirler", kod: "M1" },
  { id: "t2", ad: "Geometri", kod: "M2" },
  { id: "t3", ad: null, kod: "M3" },
];

const girdi = (o: Partial<HaritaGirdisi> = {}): HaritaGirdisi => ({
  temalar, ogrenciSayisi: 4, kararlar: [], calismalar: [], ...o,
});

describe("karar verilmemiş ≠ başlamadı", () => {
  test("hiç karar yoksa tamamı karar verilmemiş, başlamadı SIFIR", () => {
    const [s] = sinifTemaSatirlari(girdi());
    expect(s.kararVerilmemis).toBe(4);
    expect(s.durumSayilari.baslamadi).toBe(0);
    expect(s.destekGereken).toBe(0);
  });

  test("başlamadı kararı VERİLDİYSE karar verilmemiş azalır", () => {
    const satirlar = sinifTemaSatirlari(girdi({
      kararlar: [{ temaId: "t1", studentId: "o1", durum: "baslamadi" }],
    }));
    const t1 = satirlar.find((s) => s.temaId === "t1")!;
    expect(t1.durumSayilari.baslamadi).toBe(1);
    expect(t1.kararVerilmemis).toBe(3);
    // "başlamadı" destek gerektiren bir durum DEĞİL (öğretmen bakmış ve
    // henüz başlanmadığını söylemiş; müdahale listesi değil).
    expect(t1.destekGereken).toBe(0);
  });
});

describe("destek gereken sayımı", () => {
  test("tekrar_zamani, biraz_pratik ve ogreniyor sayılır", () => {
    const satirlar = sinifTemaSatirlari(girdi({
      kararlar: [
        { temaId: "t1", studentId: "o1", durum: "tekrar_zamani" },
        { temaId: "t1", studentId: "o2", durum: "biraz_pratik" },
        { temaId: "t1", studentId: "o3", durum: "ogreniyor" },
        { temaId: "t1", studentId: "o4", durum: "saglamlastirdi" },
      ],
    }));
    const t1 = satirlar.find((s) => s.temaId === "t1")!;
    expect(t1.destekGereken).toBe(3);
    expect(t1.durumSayilari.saglamlastirdi).toBe(1);
    expect(t1.kararVerilmemis).toBe(0);
  });

  test("geçersiz durum yok sayılır, karar verilmemiş sayılır", () => {
    const satirlar = sinifTemaSatirlari(girdi({
      kararlar: [{ temaId: "t1", studentId: "o1", durum: "uydurma" }],
    }));
    const t1 = satirlar.find((s) => s.temaId === "t1")!;
    expect(t1.kararVerilmemis).toBe(4);
    expect(t1.destekGereken).toBe(0);
  });
});

describe("çalışma sayımı ÖĞRENCİ bazlı", () => {
  test("aynı öğrencinin birden fazla kaydı bir kez sayılır", () => {
    const satirlar = sinifTemaSatirlari(girdi({
      calismalar: [
        { temaId: "t1", studentId: "o1" },
        { temaId: "t1", studentId: "o1" },
        { temaId: "t1", studentId: "o2" },
      ],
    }));
    expect(satirlar.find((s) => s.temaId === "t1")!.calisanOgrenci).toBe(2);
  });
});

describe("sıralama — öğretmenin müdahale listesi", () => {
  test("en çok destek gereken tema başta", () => {
    const satirlar = sinifTemaSatirlari(girdi({
      kararlar: [
        { temaId: "t2", studentId: "o1", durum: "tekrar_zamani" },
        { temaId: "t2", studentId: "o2", durum: "tekrar_zamani" },
        { temaId: "t1", studentId: "o1", durum: "ogreniyor" },
      ],
    }));
    expect(satirlar.map((s) => s.temaId)).toEqual(["t2", "t1", "t3"]);
  });

  test("eşitlikte alfabetik — sıra kararlı", () => {
    const satirlar = sinifTemaSatirlari(girdi());
    // Hiç karar yok: hepsi 0 destek. Kesirler < Geometri değil, Türkçe
    // sıralamasına göre "Geometri" < "Kesirler" < "M3".
    expect(satirlar.map((s) => s.temaAdi)).toEqual(["Geometri", "Kesirler", "M3"]);
  });
});

describe("tema adı", () => {
  test("ad boşsa kod gösterilir", () => {
    const satirlar = sinifTemaSatirlari(girdi());
    expect(satirlar.find((s) => s.temaId === "t3")!.temaAdi).toBe("M3");
  });
});

describe("sınıftan ayrılan öğrenci", () => {
  // Kararı duran ama artık sınıfta olmayan öğrenci yüzünden sayı negatife
  // düşmemeli.
  test("karar sayısı mevcudu aşarsa karar verilmemiş sıfırda kalır", () => {
    const satirlar = sinifTemaSatirlari(girdi({
      ogrenciSayisi: 1,
      kararlar: [
        { temaId: "t1", studentId: "o1", durum: "ogreniyor" },
        { temaId: "t1", studentId: "ayrilmis", durum: "ogreniyor" },
      ],
    }));
    expect(satirlar.find((s) => s.temaId === "t1")!.kararVerilmemis).toBe(0);
  });
});
