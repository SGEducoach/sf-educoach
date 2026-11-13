import { describe, expect, test } from "vitest";
import { kimlikParcaliCek } from "./sayfali-sorgu";

// Sahte PostgREST: tek sorguda en fazla 1000 satır döner (max_rows).
function sahteTablo(ogrenciBasinaSatir: number, ogrenciSayisi: number) {
  const satirlar = Array.from({ length: ogrenciSayisi }, (_, o) =>
    Array.from({ length: ogrenciBasinaSatir }, (_, k) => ({ id: `${o}-${k}`, student_id: `o${o}` }))).flat();
  const cagrilar: { idSayisi: number; bas: number; son: number }[] = [];
  const sorgu = (idler: string[], bas: number, son: number) => {
    cagrilar.push({ idSayisi: idler.length, bas, son });
    const eslesen = satirlar.filter((s) => idler.includes(s.student_id));
    return Promise.resolve({ data: eslesen.slice(bas, Math.min(son + 1, bas + 1000)), error: null });
  };
  return { satirlar, sorgu, cagrilar };
}

describe("kimlikParcaliCek", () => {
  test("1000 satır sınırını aşan sonuç eksiksiz gelir", async () => {
    const { satirlar, sorgu } = sahteTablo(9, 250); // 2250 satır
    const gelen = await kimlikParcaliCek<{ id: string }>(satirlar.map((s) => s.student_id).filter((v, i, a) => a.indexOf(v) === i), sorgu);
    expect(gelen).toHaveLength(2250);
    expect(new Set(gelen.map((g) => g.id)).size).toBe(2250);
  });

  test("kimlikler 150'lik parçalara bölünür; parça 1000'i aşınca sonraki sayfa okunur", async () => {
    const { sorgu, cagrilar } = sahteTablo(8, 160);
    const idler = Array.from({ length: 160 }, (_, i) => `o${i}`);
    const gelen = await kimlikParcaliCek(idler, sorgu);
    expect(gelen).toHaveLength(1280);
    expect(Math.max(...cagrilar.map((c) => c.idSayisi))).toBe(150);
    expect(cagrilar.some((c) => c.bas === 1000)).toBe(true);
  });

  test("hata sessizce yutulmaz", async () => {
    await expect(kimlikParcaliCek(["o1"], () => Promise.resolve({ data: null, error: { message: "bozuk" } }))).rejects.toThrow("bozuk");
  });
});
