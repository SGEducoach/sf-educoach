import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ogretmenDenemeSonucuKaydet, yayineviAyniMi } from "./deneme-sonucu-kaydet";

describe("yayineviAyniMi", () => {
  test.each([
    ["LİMİT(DUBLÖR)", "LİMİT(DUBLÖR)"], ["LİMİT(DUBLÖR)", "Limit Dublör"], ["LİMİT(DUBLÖR)", "Dublör"],
    ["orbital", "ORBİTAL"], ["LİMİT(ORBİTAL)", "orbital"],
  ])("%s = %s", (a, b) => expect(yayineviAyniMi(a, b)).toBe(true));
  test.each([
    ["LİMİT(DUBLÖR)", "LİMİT(ORBİTAL)"], ["LİMİT(DUBLÖR)", "Orbital"], ["3D", "3D Yayınları Karekök"],
  ])("%s ≠ %s", (a, b) => expect(yayineviAyniMi(a, b)).toBe(false));
});

// Yalnızca bu modülün kullandığı sorgu zincirlerini taklit eden bellek içi
// sahte istemci — gerçek veritabanına hiç gidilmiyor.
type Satir = Record<string, unknown>;
function sahteIstemci(tablolar: Record<string, Satir[]>) {
  let sayac = 0;
  function sorgu(tablo: string) {
    const kosullar: ((s: Satir) => boolean)[] = [];
    let islem: { tur: "select" | "update" | "delete" | "insert"; veri?: Satir } = { tur: "select" };
    const eslesen = () => tablolar[tablo].filter((s) => kosullar.every((k) => k(s)));
    const calistir = () => {
      if (islem.tur === "update") eslesen().forEach((s) => Object.assign(s, islem.veri));
      if (islem.tur === "delete") tablolar[tablo] = tablolar[tablo].filter((s) => !kosullar.every((k) => k(s)));
      return { data: eslesen(), error: null };
    };
    const zincir = {
      select: () => zincir,
      eq: (alan: string, deger: unknown) => { kosullar.push((s) => s[alan] === deger); return zincir; },
      in: (alan: string, degerler: unknown[]) => { kosullar.push((s) => degerler.includes(s[alan])); return zincir; },
      order: () => zincir,
      limit: () => zincir,
      maybeSingle: async () => ({ data: [...eslesen()].reverse()[0] ?? null, error: null }),
      single: async () => ({ data: islem.veri, error: null }),
      update: (veri: Satir) => { islem = { tur: "update", veri }; return zincir; },
      delete: () => { islem = { tur: "delete" }; return zincir; },
      insert: (veri: Satir) => {
        const satir = { id: `yeni-${++sayac}`, ...veri };
        tablolar[tablo].push(satir);
        islem = { tur: "insert", veri: satir };
        return zincir;
      },
      upsert: async (satirlar: Satir[]) => {
        for (const y of satirlar) {
          const eski = tablolar[tablo].find((s) => s.deneme_id === y.deneme_id && s.ders === y.ders);
          if (eski) Object.assign(eski, y); else tablolar[tablo].push({ ...y });
        }
        return { error: null };
      },
      then: (coz: (v: unknown) => unknown) => Promise.resolve(calistir()).then(coz),
    };
    return zincir;
  }
  return { from: sorgu } as unknown as SupabaseClient;
}

const GIRDI = {
  studentId: "ogr-1", tarih: "2026-09-20", tur: "TYT" as const, yayinevi: "Dublör",
  dersSonuclari: [{ ders: "Türkçe", dogru: 36, yanlis: 3 }, { ders: "Matematik", dogru: 38, yanlis: 0 }],
};

describe("ogretmenDenemeSonucuKaydet — öğrenci kaydıyla çakışma", () => {
  test("öğrenci aynı denemeyi girdiyse ikinci kayıt açılmaz, onun kaydı okul kaydına döner", async () => {
    const tablolar: Record<string, Satir[]> = {
      denemeler: [{ id: "d-ogr", student_id: "ogr-1", tarih: "2026-09-20", tur: "TYT", kaynak: "ogrenci", yayinevi: "bilmiyorum" }],
      deneme_ders_sonuclari: [
        { deneme_id: "d-ogr", ders: "Türkçe", dogru: 30, yanlis: 5 },
        { deneme_id: "d-ogr", ders: "Fizik", dogru: 2, yanlis: 1 },
      ],
    };
    const sonuc = await ogretmenDenemeSonucuKaydet(sahteIstemci(tablolar), GIRDI);

    expect(sonuc).toEqual({ error: null, denemeId: "d-ogr" });
    expect(tablolar.denemeler).toHaveLength(1);
    expect(tablolar.denemeler[0]).toMatchObject({ kaynak: "ogretmen", yayinevi: "Dublör" });
    // Okulun değerleri geçerli; okul sonucunda olmayan "Fizik" satırı kalmadı.
    expect(tablolar.deneme_ders_sonuclari.map((d) => [d.ders, d.dogru, d.yanlis]).sort()).toEqual([
      ["Matematik", 38, 0], ["Türkçe", 36, 3],
    ]);
  });

  test("okul kaydı zaten varsa o güncellenir, öğrencinin başka tarihli kaydına dokunulmaz", async () => {
    const tablolar: Record<string, Satir[]> = {
      denemeler: [
        { id: "d-okul", student_id: "ogr-1", tarih: "2026-09-20", tur: "TYT", kaynak: "ogretmen", yayinevi: "Dublör" },
        { id: "d-baska", student_id: "ogr-1", tarih: "2026-09-13", tur: "TYT", kaynak: "ogrenci", yayinevi: "X" },
      ],
      deneme_ders_sonuclari: [],
    };
    const sonuc = await ogretmenDenemeSonucuKaydet(sahteIstemci(tablolar), GIRDI);

    expect(sonuc.denemeId).toBe("d-okul");
    expect(tablolar.denemeler).toHaveLength(2);
    expect(tablolar.denemeler[1]).toMatchObject({ id: "d-baska", kaynak: "ogrenci" });
  });

  test("yayınevi farklı yazılsa da aynı okul kaydı güncellenir, ikinci kayıt açılmaz", async () => {
    const tablolar: Record<string, Satir[]> = {
      denemeler: [{ id: "d-okul", student_id: "ogr-1", tarih: "2026-09-20", tur: "TYT", kaynak: "ogretmen", yayinevi: "LİMİT(DUBLÖR)" }],
      deneme_ders_sonuclari: [{ deneme_id: "d-okul", ders: "Türkçe", dogru: 30, yanlis: 5 }],
    };
    const sonuc = await ogretmenDenemeSonucuKaydet(sahteIstemci(tablolar), { ...GIRDI, yayinevi: "Limit Dublör" });

    expect(sonuc.denemeId).toBe("d-okul");
    expect(tablolar.denemeler).toHaveLength(1);
    expect(tablolar.deneme_ders_sonuclari.find((d) => d.ders === "Türkçe")).toMatchObject({ dogru: 36, yanlis: 3 });
  });

  test("hiç kayıt yoksa yeni okul kaydı açılır", async () => {
    const tablolar: Record<string, Satir[]> = { denemeler: [], deneme_ders_sonuclari: [] };
    const sonuc = await ogretmenDenemeSonucuKaydet(sahteIstemci(tablolar), GIRDI);

    expect(sonuc.error).toBeNull();
    expect(tablolar.denemeler).toHaveLength(1);
    expect(tablolar.denemeler[0]).toMatchObject({ student_id: "ogr-1", kaynak: "ogretmen", yayinevi: "Dublör" });
    expect(tablolar.deneme_ders_sonuclari).toHaveLength(2);
  });
});
