import { describe, expect, test } from "vitest";
import { dersGosterimAdi, konuAnaliziOzetle, konuGosterimAdi, type KazanimSatiriGirdi } from "./deneme-konu-analizi";

function satir(p: Partial<KazanimSatiriGirdi>): KazanimSatiriGirdi {
  return {
    denemeId: "d1", studentId: "s1", tarih: "2026-09-24", tur: "TYT", yayinevi: "LİMİT(DUBLÖR)",
    ders: "Türkçe", kazanimMetni: "PARAGRAF YORUMU", soru: 22, dogru: 19, yanlis: 3, ...p,
  };
}

describe("gösterim adları", () => {
  test("ders ekini atar", () => {
    expect(dersGosterimAdi("Tarih-1")).toBe("Tarih");
    expect(dersGosterimAdi("Geometri")).toBe("Geometri");
  });
  test("konu adını Türkçe başlık biçimine çevirir", () => {
    expect(konuGosterimAdi("PARAGRAF YORUMU")).toBe("Paragraf Yorumu");
    expect(konuGosterimAdi("İLK VE ORTA ÇAĞLARDA TÜRK DÜNYASI")).toBe("İlk ve Orta Çağlarda Türk Dünyası");
    expect(konuGosterimAdi("VE BAĞLACI İLE İLGİLİ")).toBe("Ve Bağlacı ile İlgili");
    expect(konuGosterimAdi("İslam'da İbadetler")).toBe("İslam'da İbadetler");
    expect(konuGosterimAdi("ULUSLARARASI İLİŞKİLERDE DENGE STRATEJİSİ (1774-1914)")).toBe("Uluslararası İlişkilerde Denge Stratejisi (1774-1914)");
  });
});

describe("konuAnaliziOzetle", () => {
  test("başarı, boş ve kayıp net hesaplanır", () => {
    const o = konuAnaliziOzetle([satir({ soru: 4, dogru: 2, yanlis: 1 })]);
    expect(o.tumu[0]).toMatchObject({ ders: "Türkçe", konu: "Paragraf Yorumu", soru: 4, dogru: 2, yanlis: 1, bos: 1, basari: 50, kayipNet: 2.25 });
  });

  test("en çok net kaybedilen konu en üstte", () => {
    const o = konuAnaliziOzetle([
      satir({ kazanimMetni: "YAZIM KURALLARI", soru: 2, dogru: 1, yanlis: 1 }),
      satir({ ders: "Matematik-1", kazanimMetni: "DENKLEM VE EŞİTSİZLİKLER", soru: 21, dogru: 10, yanlis: 8 }),
    ]);
    expect(o.tumu.map((k) => k.konu)).toEqual(["Denklem ve Eşitsizlikler", "Yazım Kuralları"]);
    expect(o.tumu[0].ders).toBe("Matematik");
  });

  test("hiç çözülmemiş seçmeli test sayılmaz, çözülmüşse sayılır", () => {
    const bos = konuAnaliziOzetle([satir({ ders: "Felsefe (Seçmeli)", kazanimMetni: "FELSEFEYİ TANIMA", soru: 3, dogru: 0, yanlis: 0 })]);
    expect(bos.tumu).toHaveLength(0);
    const dolu = konuAnaliziOzetle([satir({ ders: "Felsefe (Seçmeli)", kazanimMetni: "FELSEFEYİ TANIMA", soru: 3, dogru: 1, yanlis: 0 })]);
    expect(dolu.tumu).toHaveLength(1);
  });

  test("denemeler ayrılır, aynı konu birleşir ve geçmiş eskiden yeniye sıralanır", () => {
    const o = konuAnaliziOzetle([
      satir({ denemeId: "a", tarih: "2026-09-18", yayinevi: "orbital", soru: 20, dogru: 10, yanlis: 0 }),
      satir({ denemeId: "b", tarih: "2026-09-24", soru: 20, dogru: 18, yanlis: 0 }),
      satir({ denemeId: "c", studentId: "s2", tarih: "2026-09-24", soru: 20, dogru: 16, yanlis: 0 }),
    ]);
    expect(o.denemeler.map((d) => [d.tarih, d.ogrenciSayisi])).toEqual([["2026-09-24", 2], ["2026-09-18", 1]]);
    expect(o.tumu[0]).toMatchObject({ soru: 60, dogru: 44, ogrenciSayisi: 2 });
    expect(o.tumu[0].gecmis.map((g) => [g.tarih, g.basari])).toEqual([["2026-09-18", 50], ["2026-09-24", 85]]);
    expect(o.denemeBazli[o.denemeler[0].anahtar][0]).toMatchObject({ soru: 40, dogru: 34 });
  });

  test("yayınevi büyük/küçük harf farkı aynı deneme sayılır", () => {
    const o = konuAnaliziOzetle([
      satir({ denemeId: "a", yayinevi: "orbital" }),
      satir({ denemeId: "b", studentId: "s2", yayinevi: "ORBİTAL" }),
    ]);
    expect(o.denemeler).toHaveLength(1);
  });
});
