import { describe, expect, test } from "vitest";
import { ogretmenKalemleri, sinifimOzeti } from "./ilkokul-sinifim";
import { GELISIM_KALEMLERI } from "./ilkokul-gelisim";
import type { IlkokulSinifKaydi } from "./ilkokul-gelisim-sorgu";

const ay = "2026-10-01";
const tumKalemler = (studentId: string): IlkokulSinifKaydi[] =>
  GELISIM_KALEMLERI.map((k) => ({ studentId, ay, kalem: k.anahtar, duzey: "iyi" }) as IlkokulSinifKaydi);

describe("sinifimOzeti", () => {
  test("rapor tamamı Rehberlik hariç sınıf düzeyinin kalemleri; okul numarası sırası; veli bağı", () => {
    expect(ogretmenKalemleri("4")).toHaveLength(9);
    expect(ogretmenKalemleri("1")).toHaveLength(8); // 1. sınıfta İngilizce yok (MEB)
    const rehberliksiz = tumKalemler("b").filter((k) => k.kalem !== "rehberlik");
    const o = sinifimOzeti({
      rapor: {
        ogrenciler: [{ id: "a", ad: "Zeynep", okulNo: "10" }, { id: "b", ad: "Ali", okulNo: "2" }, { id: "c", ad: "Can", okulNo: "3" }],
        kayitlar: [...rehberliksiz, { studentId: "c", ay, kalem: "rehberlik", duzey: "iyi" } as IlkokulSinifKaydi,
          { studentId: "a", ay, kalem: "matematik", duzey: "yeterli" } as IlkokulSinifKaydi],
        oncekiAyKayitlari: [], notlar: [],
      },
      etkinlikler: [],
      veliBagliIdler: new Set(["a"]),
      bugun: "2026-10-18",
      seviye: "4",
    });
    expect(o.kalemSayisi).toBe(9);
    expect(o.ogrenciler.map((x) => [x.okulNo, x.yazilanKalem, x.veliBagli])).toEqual([["2", 9, false], ["3", 0, false], ["10", 1, true]]);
    expect(o.raporuTamam).toBe(1);
    expect(o.raporaBaslanmamis).toBe(1); // yalnız Rehberlik'i olan öğrenci öğretmen için "başlanmadı"
    expect(o.veliBagli).toBe(1);
  });

  test("1. sınıfta İngilizce sayılmaz, rapor 8 kalemle tamam", () => {
    const o = sinifimOzeti({
      rapor: { ogrenciler: [{ id: "b", ad: "Ali", okulNo: "2" }], kayitlar: tumKalemler("b"), oncekiAyKayitlari: [], notlar: [] },
      etkinlikler: [], veliBagliIdler: new Set(), bugun: "2026-10-18", seviye: "1",
    });
    expect(o.ogrenciler[0].yazilanKalem).toBe(8);
    expect(o.raporuTamam).toBe(1);
  });

  test("öne çıkan etkinlikler: önce yaklaşanlar, sonra son geçenler, en fazla 3", () => {
    const e = (ad: string, tarih: string, n = 0) => ({ id: ad, ad, tarih, aciklama: null, katilimcilar: Array.from({ length: n }, (_, i) => String(i)) });
    const o = sinifimOzeti({
      rapor: { ogrenciler: [], kayitlar: [], oncekiAyKayitlari: [], notlar: [] },
      etkinlikler: [e("Gezi", "2026-10-05", 12), e("Tiyatro", "2026-10-25"), e("Resim", "2026-10-15", 8), e("Şenlik", "2026-10-20")],
      veliBagliIdler: new Set(), bugun: "2026-10-18", seviye: "2",
    });
    expect(o.oneCikanEtkinlikler.map((x) => x.ad)).toEqual(["Şenlik", "Tiyatro", "Resim"]);
    expect(o.oneCikanEtkinlikler[2]).toMatchObject({ gecti: true, katilim: 8 });
    expect(o.etkinlikSayisi).toBe(4);
  });
});
