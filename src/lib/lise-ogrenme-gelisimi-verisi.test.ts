import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { konuDurumuGetir, liseGelisimiGorevleriniGetir } from "./konu-durumu-verisi";

// Filtrelerin gerçekten sorguya yazıldığını ve sayfalamanın kayıp üretmediğini
// denetleyen küçük PostgREST taklidi. Hiçbir canlı veri bağlantısı açılmaz.
function istemci(tablolar: Record<string, unknown[]>, hatali = false) {
  const cagrilar: { tablo: string; islemler: [string, unknown[]][] }[] = [];
  const admin = { from(tablo: string) {
    const kayit = { tablo, islemler: [] as [string, unknown[]][] }; cagrilar.push(kayit);
    let bas = 0, son = 999;
    const sorgu = new Proxy({}, { get(_t, ad: string) {
      if (ad === "then") return (resolve: (v: unknown) => void) => resolve({ data: (tablolar[tablo] ?? []).slice(bas, son + 1), error: hatali ? { message: "bağlantı hatası" } : null });
      return (...args: unknown[]) => { kayit.islemler.push([ad, args]); if (ad === "range") [bas, son] = args as number[]; return sorgu; };
    } });
    return sorgu;
  } } as unknown as SupabaseClient;
  return { admin, cagrilar };
}
const gorevSatiri = { id: "g1", student_id: "a", durum: "bekliyor", created_at: "2026-10-26T22:30:00Z",
  gorevler: { ders: "Matematik", konu: "Oranlar", tur: "soru", tarih: "2026-10-25", son_tarih: "2026-10-28", hedef_soru_sayisi: 20, hedef_dakika: null } };

describe("lise gelişimi toplu veri okuma", () => {
  test("öğrenci kapsamı, görev sahibi ve Türkiye saatine göre 30 gün sorguda zorunlu", async () => {
    const { admin, cagrilar } = istemci({ gorev_atamalari: [gorevSatiri] });
    const r = await liseGelisimiGorevleriniGetir(admin, ["a"], "ogretmen", "2026-10-27");
    expect(cagrilar[0].islemler).toEqual(expect.arrayContaining([
      ["in", ["student_id", ["a"]]], ["eq", ["gorevler.olusturan_ogretmen_id", "ogretmen"]],
      ["gte", ["created_at", "2026-09-28T00:00:00+03:00"]], ["lt", ["created_at", "2026-10-28T00:00:00+03:00"]],
      ["in", ["gorevler.tur", ["konu", "soru"]]],
    ]));
    expect(r.gorevler[0].atamaTarihi).toBe("2026-10-27"); expect(r.hata).toBe(false);
  });
  test("1000 satır sınırından sonraki atamalar kaybolmaz", async () => {
    const { admin, cagrilar } = istemci({ gorev_atamalari: Array.from({ length: 1001 }, (_, i) => ({ ...gorevSatiri, id: `g${i}` })) });
    expect((await liseGelisimiGorevleriniGetir(admin, ["a"], "ogretmen", "2026-10-27")).gorevler).toHaveLength(1001);
    expect(cagrilar).toHaveLength(2);
  });
  test("öğrenci listesi boşsa sorgu yok; hata boş başarı gibi bildirilmez", async () => {
    const { admin, cagrilar } = istemci({}, true);
    expect(await liseGelisimiGorevleriniGetir(admin, [], "t", "2026-10-27")).toEqual({ gorevler: [], hata: false });
    expect(cagrilar).toHaveLength(0);
    expect(await liseGelisimiGorevleriniGetir(admin, ["a"], "t", "2026-10-27")).toEqual({ gorevler: [], hata: true });
  });
  test("mevcut çağıranlar yeni görev sorgusunu çalıştırmaz", async () => {
    const { admin, cagrilar } = istemci({ students: [{ id: "a", class_id: "c1", profiles: { ad: "Örnek" }, classes: { seviye: "11", sube: "A" } }] });
    const r = await konuDurumuGetir(admin, "okul", { anahtar: "c1", etiket: "11-A", classIds: ["c1"], seviyeler: null, dersler: ["Matematik"] });
    expect(r.error).toBeNull(); expect(r.veri?.ogrenmeGelisimi).toBeUndefined();
    expect(cagrilar.some((c) => c.tablo === "gorev_atamalari")).toBe(false);
  });
  test("karma kurumda ek görev sorgusu yalnız yetkili lise öğrencileri için yapılır", async () => {
    const { admin, cagrilar } = istemci({ students: [
      { id: "a", class_id: "c1", profiles: { ad: "Örnek" }, classes: { seviye: "11", sube: "A" } },
      { id: "b", class_id: "c2", profiles: { ad: "Dışarıda" }, classes: { seviye: "11", sube: "B" } },
      { id: "orta", class_id: "c1", profiles: { ad: "Ortaokul" }, classes: { seviye: "8", sube: "A" } },
    ] });
    const r = await konuDurumuGetir(admin, "okul", { anahtar: "c1", etiket: "11-A", classIds: ["c1"], seviyeler: null, dersler: ["Matematik"] }, "t");
    expect(r.veri?.ogrenmeGelisimi?.ogrenciler.map((o) => o.id)).toEqual(["a"]);
    const gorevCagrisi = cagrilar.find((c) => c.tablo === "gorev_atamalari")!;
    expect(gorevCagrisi.islemler).toContainEqual(["in", ["student_id", ["a"]]]);
    expect(cagrilar[0].islemler).toContainEqual(["eq", ["school_id", "okul"]]);
  });
});
