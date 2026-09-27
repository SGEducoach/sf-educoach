import { describe, expect, test } from "vitest";
import { gruplaraBolerekOku, YanitSigmadiHatasi } from "./gruplu-okuma";

const adlar = (n: number) => Array.from({ length: n }, (_, i) => `Öğrenci ${i + 1}`);
const secenek = { grupBoyutu: 20, esZamanli: 3, tekKisiSigmadi: () => new Error("tek kişi sığmadı") };

describe("gruplaraBolerekOku", () => {
  test("hedefler gruplara bölünür, sonuçlar birleşir", async () => {
    const istenenler: number[] = [];
    const s = await gruplaraBolerekOku(adlar(45), async (g) => {
      istenenler.push(g.length);
      return { sonuclar: g, okunamayanAdlar: [] };
    }, secenek);
    expect(istenenler).toEqual([20, 20, 5]);
    expect(s.sonuclar).toHaveLength(45);
    expect(s.grupSayisi).toBe(3);
  });

  test("sığmayan grup ikiye bölünüp tekrar denenir", async () => {
    const istenenler: number[] = [];
    // 10'dan büyük gruplar "sığmıyor".
    const s = await gruplaraBolerekOku(adlar(20), async (g) => {
      istenenler.push(g.length);
      if (g.length > 10) throw new YanitSigmadiHatasi();
      return { sonuclar: g, okunamayanAdlar: [g[0]] };
    }, secenek);
    expect(istenenler).toEqual([20, 10, 10]);
    expect(s.sonuclar).toHaveLength(20);
    expect(s.okunamayanAdlar).toEqual(["Öğrenci 1", "Öğrenci 11"]);
  });

  test("tek öğrenci bile sığmıyorsa hata verilir", async () => {
    await expect(gruplaraBolerekOku(adlar(2), async () => { throw new YanitSigmadiHatasi(); }, secenek))
      .rejects.toThrow("tek kişi sığmadı");
  });

  test("başka hatalar bölmeden doğrudan yükselir", async () => {
    await expect(gruplaraBolerekOku(adlar(5), async () => { throw new Error("ağ hatası"); }, secenek))
      .rejects.toThrow("ağ hatası");
  });
});
