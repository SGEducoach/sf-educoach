import { describe, expect, it } from "vitest";
import { takipOlaylariniBul, type TakipDenemesi, type TakipGirdisi } from "./rehber-takip";

const BUGUN = "2026-10-20";
const deneme = (id: string, tarih: string, dersler: Record<string, number>, tur = "TYT"): TakipDenemesi =>
  ({ id, tarih, tur, dersler: Object.entries(dersler).map(([ders, net]) => ({ ders, net })) });
const girdi = (g: Partial<TakipGirdisi>): TakipGirdisi => ({ bugun: BUGUN, denemeler: [], sonHareket: BUGUN, acikGorev: 0, gorevToplam: 0, ...g });
const turler = (g: Partial<TakipGirdisi>) => takipOlaylariniBul(girdi(g)).map((o) => o.tur);

describe("rehber takip olayları", () => {
  it("toplam net önceki iki denemenin ortalamasına göre 5+ düşünce net düşüşü; düşen dersler ayrıntıda", () => {
    const olaylar = takipOlaylariniBul(girdi({ denemeler: [
      deneme("a", "2026-09-20", { Türkçe: 30, Matematik: 20 }),
      deneme("b", "2026-10-01", { Türkçe: 30, Matematik: 22 }),
      deneme("c", "2026-10-15", { Türkçe: 29, Matematik: 14 }),
    ] }));
    expect(olaylar).toHaveLength(1);
    expect(olaylar[0]).toMatchObject({ tur: "net_dususu", anahtar: "net:c", olayTarihi: "2026-10-15" });
    expect(olaylar[0].baslik).toBe("TYT neti 8 düştü (51 → 43)");
    expect((olaylar[0].ayrinti.dersler as { ders: string }[]).map((d) => d.ders)).toEqual(["Matematik"]);
  });

  it("5+ yükseliş net yükselişi olur; küçük dalgalanma olay üretmez", () => {
    expect(turler({ denemeler: [deneme("a", "2026-10-01", { Türkçe: 30 }), deneme("b", "2026-10-10", { Türkçe: 36 })] })).toEqual(["net_yukselisi"]);
    expect(turler({ denemeler: [deneme("a", "2026-10-01", { Türkçe: 30 }), deneme("b", "2026-10-10", { Türkçe: 27 })] })).toEqual([]);
  });

  it("toplam sabitken tek derste sert düşüş ders bazında düşüş olur", () => {
    const olaylar = takipOlaylariniBul(girdi({ denemeler: [
      deneme("a", "2026-10-01", { Türkçe: 25, Matematik: 20 }),
      deneme("b", "2026-10-12", { Türkçe: 29, Matematik: 14 }),
    ] }));
    expect(olaylar.map((o) => [o.tur, o.anahtar])).toEqual([["ders_dususu", "ders:b"]]);
  });

  it("küçük netli dersteki düşüş oran eşiğine takılır; tek deneme ve eski deneme olay üretmez", () => {
    // 20 → 17: 3 net ama %15, eşiğin altında.
    expect(turler({ denemeler: [deneme("a", "2026-10-01", { Fen: 20 }, "BRANS"), deneme("b", "2026-10-10", { Fen: 17 }, "BRANS")] })).toEqual([]);
    expect(turler({ denemeler: [deneme("a", "2026-10-10", { Türkçe: 30 })] })).toEqual([]);
    expect(turler({ denemeler: [deneme("a", "2026-08-01", { Türkçe: 30 }), deneme("b", "2026-08-20", { Türkçe: 10 })] })).toEqual([]);
  });

  it("farklı türler birbiriyle kıyaslanmaz; branş denemesinde toplam net bakılmaz", () => {
    expect(turler({ denemeler: [deneme("a", "2026-10-01", { Türkçe: 30, Matematik: 30 }), deneme("b", "2026-10-10", { Fizik: 8 }, "AYT")] })).toEqual([]);
    expect(turler({ denemeler: [deneme("a", "2026-10-01", { Matematik: 30 }, "BRANS"), deneme("b", "2026-10-10", { Türkçe: 10 }, "BRANS")] })).toEqual([]);
  });

  it("14+ gün sessizlik son hareket tarihiyle anahtarlanır; hiç verisi olmayan sayılmaz", () => {
    const [o] = takipOlaylariniBul(girdi({ sonHareket: "2026-10-01" }));
    expect(o).toMatchObject({ tur: "sessizlik", anahtar: "sessiz:2026-10-01", olayTarihi: "2026-10-15", baslik: "19 gündür hiç veri girmedi" });
    expect(turler({ sonHareket: "2026-10-10" })).toEqual([]);
    expect(turler({ sonHareket: null })).toEqual([]);
  });

  it("biriken görev ayda bir anahtarlanır; en az 3 görev ve %70 açık", () => {
    const [o] = takipOlaylariniBul(girdi({ acikGorev: 3, gorevToplam: 4 }));
    expect(o).toMatchObject({ tur: "gorev_birikmesi", anahtar: "gorev:2026-10" });
    expect(turler({ acikGorev: 2, gorevToplam: 2 })).toEqual([]);
    expect(turler({ acikGorev: 2, gorevToplam: 4 })).toEqual([]);
  });
});
