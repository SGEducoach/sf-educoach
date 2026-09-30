import { describe, expect, test } from "vitest";
import { dersleriOzetle, temalariDuzenle, temaTuruEtiketi } from "./ortaokul-mufredat";

describe("temaTuruEtiketi", () => {
  test("ders kendi terimiyle anılır", () => {
    expect(temaTuruEtiketi("tema")).toBe("Tema");
    expect(temaTuruEtiketi("unite")).toBe("Ünite");
    expect(temaTuruEtiketi("beceri")).toBe("Beceri");
  });
  test("çoğul biçimler", () => {
    expect(temaTuruEtiketi("tema", true)).toBe("Temalar");
    expect(temaTuruEtiketi("unite", true)).toBe("Üniteler");
    expect(temaTuruEtiketi("beceri", true)).toBe("Beceriler");
  });
  test("bilinmeyen tür Tema'ya düşer", () => {
    expect(temaTuruEtiketi("saçma")).toBe("Tema");
  });
});

describe("temalariDuzenle", () => {
  const satirlar = [
    {
      id: "t2", kod: "MAT.8.2", ad: "Cebirsel Düşünme", tur: "tema", ders_saati: 42, sira: 2,
      ortaokul_mufredat_kazanimlari: [
        { id: "k2", kod: "MAT.8.2.2", metin: "İkinci", sira: 2 },
        { id: "k1", kod: "MAT.8.2.1", metin: "Birinci", sira: 1 },
      ],
    },
    {
      id: "t1", kod: "MAT.8.1", ad: "Sayılar", tur: "tema", ders_saati: 38, sira: 1,
      ortaokul_mufredat_kazanimlari: [{ id: "k3", kod: "MAT.8.1.1", metin: "Üslü", sira: 1 }],
    },
  ];

  test("temalar ve kazanımlar sıraya göre gelir", () => {
    const d = temalariDuzenle(satirlar);
    expect(d.map((t) => t.kod)).toEqual(["MAT.8.1", "MAT.8.2"]);
    expect(d[1].kazanimlar.map((k) => k.kod)).toEqual(["MAT.8.2.1", "MAT.8.2.2"]);
  });

  test("kazanımı olmayan tema geçerli — İngilizce ünite temelli", () => {
    const d = temalariDuzenle([{
      id: "u1", kod: "ENG.8.1", ad: "Friendship", tur: "unite", ders_saati: null, sira: 1,
      ortaokul_mufredat_kazanimlari: null,
    }]);
    expect(d[0].kazanimlar).toEqual([]);
    expect(d[0].tur).toBe("unite");
  });

  test("adı boş tema düşürülmez — kaynak tablodan çıkmayan başlık olabilir", () => {
    const d = temalariDuzenle([{
      id: "t9", kod: "DKAB.8.1", ad: null, tur: "tema", ders_saati: 16, sira: 1,
      ortaokul_mufredat_kazanimlari: [],
    }]);
    expect(d).toHaveLength(1);
    expect(d[0].ad).toBeNull();
  });

  test("bilinmeyen tür güvenli değere iner", () => {
    const d = temalariDuzenle([{
      id: "t1", kod: "X.1", ad: "X", tur: "bilinmiyor", ders_saati: null, sira: 1,
      ortaokul_mufredat_kazanimlari: [],
    }]);
    expect(d[0].tur).toBe("tema");
  });
});

describe("dersleriOzetle", () => {
  const dersler = [
    { id: "d2", ders_kodu: "MAT", ad: "Matematik", sira: 2 },
    { id: "d1", ders_kodu: "T", ad: "Türkçe", sira: 1 },
  ];
  const temalar = [
    { id: "t1", ders_id: "d1" },
    { id: "t2", ders_id: "d1" },
    { id: "t3", ders_id: "d2" },
  ];
  const kazanimSayilari = new Map([["t1", 80], ["t2", 16], ["t3", 23]]);

  test("sıraya göre dizilir, tema ve kazanım sayıları toplanır", () => {
    const o = dersleriOzetle(dersler, temalar, kazanimSayilari);
    expect(o.map((d) => d.ad)).toEqual(["Türkçe", "Matematik"]);
    expect(o[0]).toMatchObject({ temaSayisi: 2, kazanimSayisi: 96 });
    expect(o[1]).toMatchObject({ temaSayisi: 1, kazanimSayisi: 23 });
  });

  test("teması olmayan ders sıfırla listelenir, listeden düşmez", () => {
    const o = dersleriOzetle([{ id: "d3", ders_kodu: "ENG", ad: "İngilizce", sira: 3 }], [], new Map());
    expect(o).toHaveLength(1);
    expect(o[0]).toMatchObject({ temaSayisi: 0, kazanimSayisi: 0 });
  });

  test("aynı sırada iki ders alfabetik çözülür", () => {
    const o = dersleriOzetle([
      { id: "a", ders_kodu: "FB", ad: "Fen Bilimleri", sira: 0 },
      { id: "b", ders_kodu: "DKAB", ad: "Din Kültürü ve Ahlak Bilgisi", sira: 0 },
    ], [], new Map());
    expect(o.map((d) => d.dersKodu)).toEqual(["DKAB", "FB"]);
  });
});
