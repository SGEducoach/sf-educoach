import { describe, expect, test } from "vitest";
import { bransinMufredatDersleri, konuDurumuHesapla, oncelikliKonular, type KdAdlandirma, type KdDenemeSatiri, type KdOgrenci } from "./konu-durumu";
import { konuDurumuKapsamlari } from "./konu-durumu-verisi";

const AD: KdAdlandirma = {
  kazanimKonusu: new Map([["Türkçe|Paragrafta ana düşünce", "Paragraf"]]),
  hedefler: [
    { ders: "Türkçe", konu: "Paragraf", ustKonu: "Paragraf" },
    { ders: "Matematik", konu: "Fonksiyonlar", ustKonu: "Fonksiyonlar" },
  ],
  adEslesmeleri: [],
};

function ogr(id: string, dersler: string[] | null = null): KdOgrenci {
  return { id, ad: `Öğrenci ${id}`, sinif: "10-A", classId: "c1", dersler };
}

function deneme(studentId: string, p: Partial<KdDenemeSatiri>): KdDenemeSatiri {
  return {
    studentId, denemeAnahtari: "2026-10-10|TYT|X", denemeEtiketi: "10.10.2026 · TYT · X", tarih: "2026-10-10",
    ders: "Türkçe", kazanimMetni: "Paragrafta ana düşünce", soru: 4, dogru: 1, yanlis: 3, ...p,
  };
}

const bos = { sorular: [], beyanlar: [], oturumlar: [] };

describe("konuDurumuHesapla", () => {
  test("eşlenmiş kazanım müfredat konusuna, eşlenmemiş yayınevi adıyla kendi satırına düşer", () => {
    const v = konuDurumuHesapla({
      ...bos, ogrenciler: [ogr("a")], adlandirma: AD,
      denemeler: [deneme("a", {}), deneme("a", { kazanimMetni: "SÖZCÜKTE ANLAM", dogru: 4, yanlis: 0 })],
    });
    expect(v.konular.map((k) => k.konu).sort()).toEqual(["Paragraf", "Sözcükte Anlam"]);
  });

  test("deneme ve soru çözümü aynı konuda birleşir; puan öğrencinin Konu Hakimiyeti formülüyle", () => {
    const v = konuDurumuHesapla({
      ...bos, ogrenciler: [ogr("a")], adlandirma: AD,
      denemeler: [deneme("a", { dogru: 1, yanlis: 3 })],
      sorular: [{ studentId: "a", ders: "Türkçe", konu: "Paragraf", dogru: 3, yanlis: 1 }],
    });
    expect(v.konular).toHaveLength(1);
    expect(v.konular[0].ortalama).toBe(50); // 4 D / 8 cevap, yalnız ölçüm
    expect(v.konular[0].deneme?.basari).toBe(25);
    expect(v.konular[0].soruCozumu?.basari).toBe(75);
  });

  test("zorlananlar 50'nin altı, en düşük önce; öncelikli en az iki zorlanan ister (>5 öğrencide)", () => {
    const ogrenciler = ["a", "b", "c", "d", "e", "f"].map((id) => ogr(id));
    const denemeler = [
      deneme("a", { dogru: 0, yanlis: 4 }), deneme("b", { dogru: 1, yanlis: 3 }), deneme("c", { dogru: 4, yanlis: 0 }),
      deneme("d", { ders: "Matematik-1", kazanimMetni: "Fonksiyonlar", dogru: 0, yanlis: 4 }),
      deneme("e", { dogru: 4, yanlis: 0 }), deneme("f", { dogru: 4, yanlis: 0 }),
    ];
    const v = konuDurumuHesapla({ ...bos, ogrenciler, denemeler, adlandirma: AD });
    const paragraf = v.konular.find((k) => k.konu === "Paragraf")!;
    expect(paragraf.zorlananlar.map((z) => z.id)).toEqual(["a", "b"]);
    expect(v.oncelikliler.map((k) => k.konu)).toEqual(["Paragraf"]); // Fonksiyonlar'da tek öğrenci
    expect(v.veriliOgrenciSayisi).toBe(6);
  });

  test("ders yetkisi: branş öğretmeni yalnız kendi dersini görür (Branş başlığı dahil)", () => {
    const v = konuDurumuHesapla({
      ...bos, ogrenciler: [ogr("a", ["Türkçe"])], adlandirma: AD,
      denemeler: [
        deneme("a", {}),
        deneme("a", { ders: "Matematik-1", kazanimMetni: "Fonksiyonlar" }),
        deneme("a", { ders: "Türkçe_Branş_Deneme", kazanimMetni: "Metindeki öznel ifadeler" }),
      ],
    });
    expect(v.konular.map((k) => k.ders).sort()).toEqual(["Türkçe", "Türkçe (Branş)"]);
  });

  test("gidişat: iki denemede başarı 5 puandan fazla değişirse", () => {
    const v = konuDurumuHesapla({
      ...bos, ogrenciler: [ogr("a")], adlandirma: AD,
      denemeler: [
        deneme("a", { dogru: 1, yanlis: 3 }),
        deneme("a", { denemeAnahtari: "2026-10-16|TYT|Y", tarih: "2026-10-16", dogru: 3, yanlis: 1 }),
      ],
    });
    expect(v.konular[0].gidisat).toMatchObject({ ilk: 25, son: 75 });
    expect(v.sonDeneme?.tarih).toBe("2026-10-16");
  });

  test("yalnız beyan da puan üretir: 'uzak' beyanı zorlanıyor sayılır", () => {
    const v = konuDurumuHesapla({
      ...bos, ogrenciler: [ogr("a")], adlandirma: AD, denemeler: [],
      beyanlar: [{ studentId: "a", ders: "Matematik", konu: "Fonksiyonlar", seviye: "uzak", guncellenme: "2026-10-01" }],
      simdi: new Date("2026-10-17").getTime(),
    });
    expect(v.konular[0].zorlananlar).toHaveLength(1);
    expect(v.konular[0].beyan).toEqual({ uzak: 1, belirsiz: 0, yakin: 0 });
  });

  test("soru numaraları konuya bağlanır; aynı konuya eşlenen kazanımlar aynı testte birleşir", () => {
    const etiket = "10.10.2026 · TYT · X";
    const v = konuDurumuHesapla({
      ...bos, ogrenciler: [ogr("a")], adlandirma: AD,
      denemeler: [deneme("a", {})],
      soruBilgileri: [
        { denemeEtiketi: etiket, tarih: "2026-10-10", ders: "Türkçe", kazanimMetni: "Paragrafta ana düşünce", test: "TYT Türkçe", kitapcik: "A", sorular: [12, 13], kesin: true },
        { denemeEtiketi: etiket, tarih: "2026-10-10", ders: "Türkçe", kazanimMetni: "Paragrafta ana düşünce", test: "TYT Türkçe", kitapcik: "A", sorular: [14], kesin: true },
        { denemeEtiketi: etiket, tarih: "2026-10-10", ders: "Türkçe", kazanimMetni: "Kapsamda olmayan konu", test: "TYT Türkçe", kitapcik: "A", sorular: [1], kesin: true },
      ],
    });
    expect(v.konular[0].sorular).toEqual([{ denemeEtiketi: etiket, tarih: "2026-10-10", test: "TYT Türkçe", kitapcik: "A", sorular: [12, 13, 14], kesin: true }]);
  });

  test("sınıflar arası karşılaştırma: tek sınıfta yok, iki sınıfta sınıf sırasıyla hücreler", () => {
    const tekSinif = konuDurumuHesapla({ ...bos, ogrenciler: [ogr("a")], adlandirma: AD, denemeler: [deneme("a", {})] });
    expect(tekSinif.karsilastirma).toBeNull();

    const ogrenciler: KdOgrenci[] = [
      { ...ogr("a"), classId: "c2", sinif: "10-B" }, { ...ogr("b"), classId: "c2", sinif: "10-B" },
      { ...ogr("c"), classId: "c1", sinif: "9-A" },
    ];
    const v = konuDurumuHesapla({
      ...bos, ogrenciler, adlandirma: AD,
      denemeler: [deneme("a", { dogru: 0, yanlis: 4 }), deneme("b", { dogru: 2, yanlis: 2 }), deneme("c", { dogru: 4, yanlis: 0 })],
    });
    const k = v.karsilastirma!;
    expect(k.siniflar.map((s) => s.sinif)).toEqual(["9-A", "10-B"]); // 9 < 10, sayısal sıra
    expect(k.satirlar[0].hucreler).toEqual([
      { ortalama: 100, ogrenciSayisi: 1, zorlanan: 0 },
      { ortalama: 25, ogrenciSayisi: 2, zorlanan: 1 },
    ]);
    expect(k.genel[""]).toEqual([{ ortalama: 100, ogrenciSayisi: 1 }, { ortalama: 25, ogrenciSayisi: 2 }]);
    expect(k.genel["Türkçe"]).toEqual(k.genel[""]);
  });

  test("oncelikliKonular küçük kapsamda tek zorlananı da alır", () => {
    const v = konuDurumuHesapla({ ...bos, ogrenciler: [ogr("a")], adlandirma: AD, denemeler: [deneme("a", { dogru: 0, yanlis: 4 })] });
    expect(oncelikliKonular(v.konular, 1)).toHaveLength(1);
  });
});

describe("kapsam ve branş", () => {
  const siniflar = [{ id: "c1", seviye: "10", sube: "A" }, { id: "c2", seviye: "11", sube: "B" }];

  test("öğretmen: sınıfı bütün dersler, ders verdiği sınıf yalnız o ders", () => {
    const k = konuDurumuKapsamlari({ tur: "ogretmen", siniflar, sinifId: "c1", dersAtamalari: [{ classId: "c2", ders: "Matematik" }, { classId: "c2", ders: "Beden Eğitimi" }] });
    expect(k.map((x) => [x.etiket, x.dersler])).toEqual([["10-A (sınıfım)", null], ["11-B · Matematik", ["Matematik"]]]);
  });

  test("sınıfı ve ataması olmayan branş öğretmeni kendi dersini tüm okulda görür", () => {
    const k = konuDurumuKapsamlari({ tur: "ogretmen", siniflar, brans: "Türk Dili ve Edebiyatı" });
    expect(k[0]).toMatchObject({ anahtar: "okul", classIds: null, dersler: ["Türkçe", "Edebiyat"] });
    expect(konuDurumuKapsamlari({ tur: "ogretmen", siniflar, brans: "Beden Eğitimi" })).toEqual([]);
  });

  test("okul rehberi atandığı seviyelerle; ataması yoksa boş", () => {
    expect(konuDurumuKapsamlari({ tur: "okul-rehberi", siniflar, rehberSeviyeleri: ["11"] }).map((x) => x.anahtar)).toEqual(["okul", "c2"]);
    expect(konuDurumuKapsamlari({ tur: "okul-rehberi", siniflar, rehberSeviyeleri: [] })).toEqual([]);
  });

  test("branş eşlemesi", () => {
    expect(bransinMufredatDersleri("Geometri")).toEqual(["Matematik"]);
    expect(bransinMufredatDersleri(null)).toEqual([]);
  });
});
