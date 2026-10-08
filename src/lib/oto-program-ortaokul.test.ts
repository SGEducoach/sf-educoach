import { describe, expect, test } from "vitest";
import { kademeBul } from "./kademe";
import { TYT_DERSLERI } from "./types";

// Oto Program ORTAOKULDA KULLANILAMAZ (08.10.2026 lise izleri taraması).
//
// Neden kritik: oto-program-veri.ts'teki ders listesi TYT/AYT
// taksonomisinden geliyor ve `dokuzOnSinifMi("5")` FALSE döndüğü için
// 5-8. sınıf öğrencisi TYT_DERSLERI alıyordu. Rehberin kapsamı migration
// 0144 ile 5-12'ye genişlediğinden bir rehber 5. sınıf öğrencisine
// Fizik/Kimya/Biyoloji içeren program kurabiliyordu.
//
// Engel oto-program-veri.ts içinde (her iki yolu — öğrencinin kendisi ve
// rehber — birlikte kapatan tek nokta). Bu testler engelin dayandığı
// varsayımları kilitliyor.

describe("ortaokul seviyeleri kademeBul ile ortaokul döner", () => {
  test("5-8 ortaokul, 9-12 lise", () => {
    for (const s of ["5", "6", "7", "8"]) expect(kademeBul(s), s).toBe("ortaokul");
    for (const s of ["9", "10", "11", "12"]) expect(kademeBul(s), s).not.toBe("ortaokul");
  });

  // Engel `kademeBul(seviye) === "ortaokul"` ile kuruldu; seviye bilinmiyorsa
  // engel DEVREYE GİRMEZ ve lise akışı korunur (mevcut davranış bozulmasın).
  test("seviye bilinmiyorsa ortaokul sayılmaz", () => {
    expect(kademeBul(null)).not.toBe("ortaokul");
    expect(kademeBul(undefined)).not.toBe("ortaokul");
  });
});

describe("TYT ders listesi ortaokula ait DEĞİL", () => {
  // Engelin varlık sebebi: bu listede ortaokulda hiç olmayan dersler var.
  test("lise dersleri içeriyor", () => {
    const liseyeOzgu = ["Fizik", "Kimya", "Biyoloji"].filter((d) =>
      (TYT_DERSLERI as readonly string[]).includes(d));
    expect(liseyeOzgu.length).toBeGreaterThan(0);
  });
});
