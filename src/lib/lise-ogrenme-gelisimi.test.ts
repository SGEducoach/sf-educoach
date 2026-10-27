import { describe, expect, test } from "vitest";
import { gelisimTakipOzeti, gorevOlcumunuBul, liseOgrenmeGelisimiHesapla } from "./lise-ogrenme-gelisimi";
import type { GelisimGorevi, GelisimOlcumu } from "./lise-ogrenme-gelisimi";
import type { KdAdlandirma, KdDenemeSatiri, KdOgrenci } from "./konu-durumu";

const ad: KdAdlandirma = {
  hedefler: [{ ders: "Matematik", konu: "Oranlar", ustKonu: "Trigonometri" }],
  kazanimKonusu: new Map([["Matematik|Trigonometrik oranlar", "Oranlar"]]),
  adEslesmeleri: [{ ders: "Matematik", kaynak_konu: "Trig. oran", hedef_konu: "Oranlar" }],
};
const ogrenci: KdOgrenci = { id: "a", ad: "Örnek Öğrenci", sinif: "11-A", classId: "c1", dersler: ["Matematik"] };
const gorev: GelisimGorevi = { id: "atama1", studentId: "a", ders: "Matematik", konu: "Oranlar", tur: "soru", durum: "tamamlandi",
  tarih: "2026-10-15", sonTarih: "2026-10-20", atamaTarihi: "2026-10-14", hedefSoru: 20, hedefDakika: null };
const bos = { ogrenciler: [ogrenci], denemeler: [], sorular: [], beyanlar: [], oturumlar: [], adlandirma: ad, gorevler: [], bugun: "2026-10-27" };
function deneme(tarih: string, ek: Partial<KdDenemeSatiri> = {}): KdDenemeSatiri {
  return { studentId: "a", tarih, denemeAnahtari: `${tarih}|TYT|YAYIN`, denemeEtiketi: `${tarih} · TYT`,
    ders: "Matematik", kazanimMetni: "Trigonometrik oranlar", soru: 6, dogru: 3, yanlis: 2, ...ek };
}
function olcum(tarih: string, tur = "TYT", dogru = 3): GelisimOlcumu {
  return { tarih, tur, etiket: `${tarih}-${tur}`, dogru, yanlis: 6 - dogru, bos: 2 };
}

describe("lise öğrenme gelişimi — kaynak ve kapsam", () => {
  test("yönetici eşlemeleri bütün kaynakları aynı konuya bağlar; kaynaklar birbirini ezmez", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos,
      denemeler: [deneme("2026-10-10")],
      sorular: [{ studentId: "a", ders: "Matematik", konu: "Trig. oran", dogru: 8, yanlis: 2 }],
      beyanlar: [{ studentId: "a", ders: "Matematik", konu: "Oranlar", seviye: "yakin", guncellenme: "2026-10-10" }],
      oturumlar: [{ studentId: "a", ders: "Matematik", konu: "Oranlar", seviye: "uzak" }],
    });
    expect(v.ogrenciler[0].konular).toEqual([{ ders: "Matematik", konu: "Oranlar", ustKonu: "Trigonometri",
      deneme: { dogru: 3, yanlis: 2, bos: 1, kayit: 1 }, soru: { dogru: 8, yanlis: 2 },
      beyan: { seviye: "yakin", tarih: "2026-10-10" }, oturum: 1 }]);
  });
  test("kapsam dışı öğrenci ve ders yeni rapora ya da takibe sızmaz", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos,
      denemeler: [deneme("2026-10-10", { studentId: "disarida" }), deneme("2026-10-10", { ders: "Fizik", kazanimMetni: "Kuvvet" })],
      gorevler: [{ ...gorev, studentId: "disarida" }, { ...gorev, id: "b", ders: "Fizik" }],
    });
    expect(v.ogrenciler[0].konular).toEqual([]); expect(v.takipler).toEqual([]);
  });
  test("karma kurumda 5-8 ve ilkokul öğrencileri lise raporuna katılmaz", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos, ogrenciler: [ogrenci, { ...ogrenci, id: "orta", sinif: "8-A" }, { ...ogrenci, id: "ilk", sinif: "4-A" }] });
    expect(v.ogrenciler.map((o) => o.id)).toEqual(["a"]);
  });
  test("verisiz öğrenci boş konu listesiyle kalır; yetersizlik ya da sıfır puan atanmaz", () => {
    expect(liseOgrenmeGelisimiHesapla(bos).ogrenciler[0].konular).toEqual([]);
  });
  test("branş kazanımları müfredat konusuna veya genel ödev ölçümüne karışmaz", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos, gorevler: [gorev],
      denemeler: [deneme("2026-10-21", { ders: "Matematik_Branş_Deneme", kazanimMetni: "Oranlar", denemeAnahtari: "2026-10-21|BRANS|X" })] });
    expect(v.ogrenciler[0].konular[0].ders).toBe("Matematik (Branş)");
    expect(v.ogrenciler[0].konular[0].ustKonu).toBeNull(); expect(v.takipler[0].olcum).toBeNull();
  });
  test("aynı denemenin aynı konuya bağlanan iki kazanımı tek ölçüm olarak sayılır", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos, denemeler: [deneme("2026-10-10"), deneme("2026-10-10")] });
    expect(v.ogrenciler[0].konular[0].deneme).toEqual({ dogru: 6, yanlis: 4, bos: 2, kayit: 1 });
  });
  test("aynı gün ve yayınevindeki farklı gerçek deneme kayıtları birleştirilmez", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos, denemeler: [deneme("2026-10-10", { denemeId: "d1" }), deneme("2026-10-10", { denemeId: "d2" })] });
    expect(v.ogrenciler[0].konular[0].deneme?.kayit).toBe(2);
  });
  test("güncel beyan seçilir; gelecekteki deneme ve çözülmemiş seçmeli test ölçüm sayılmaz", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos,
      denemeler: [deneme("2026-10-28"), deneme("2026-10-10", { ders: "Matematik (Seçmeli)", dogru: 0, yanlis: 0 })],
      beyanlar: [
        { studentId: "a", ders: "Matematik", konu: "Oranlar", seviye: "yakin", guncellenme: "2026-10-20" },
        { studentId: "a", ders: "Matematik", konu: "Oranlar", seviye: "uzak", guncellenme: "2026-10-10" },
      ] });
    expect(v.ogrenciler[0].konular[0].deneme).toBeNull();
    expect(v.ogrenciler[0].konular[0].beyan?.seviye).toBe("yakin");
  });
});

describe("görev sonrası ölçüm — yanlış gelişim çıkarımı yok", () => {
  test("görevle aynı günkü ve başka öğrencinin ölçümleri sonraki ölçüm sayılmaz", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos, gorevler: [gorev], denemeler: [deneme("2026-10-15"), deneme("2026-10-21", { studentId: "b" })] });
    expect(v.takipler[0].olcum).toBeNull();
  });
  test("sonradan atanan geçmiş tarihli görevde atama günü referans alınır", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos, gorevler: [{ ...gorev, atamaTarihi: "2026-10-23" }], denemeler: [deneme("2026-10-21")] });
    expect(v.takipler[0].referansTarihi).toBe("2026-10-23"); expect(v.takipler[0].olcum).toBeNull();
  });
  test("TYT ile AYT karşılaştırılmaz; en yeni sonraki ölçümün türü kullanılır", () => {
    const v = gorevOlcumunuBul([olcum("2026-10-10", "TYT"), olcum("2026-10-22", "AYT")], "2026-10-15")!;
    expect(v.tur).toBe("AYT"); expect(v.once).toBeNull(); expect(v.fark).toBeNull();
  });
  test("az ölçümde artış veya azalış kararı üretilmez", () => {
    expect(gorevOlcumunuBul([olcum("2026-10-10", "TYT", 0), olcum("2026-10-22", "TYT", 6)], "2026-10-15")?.fark).toBeNull();
  });
  test("her dönemin son iki aynı tür denemesinde yeterli cevap varsa doğruluk farkı hesaplanır", () => {
    const v = gorevOlcumunuBul([olcum("2026-10-01", "TYT", 6), olcum("2026-10-10", "TYT", 3), olcum("2026-10-11", "TYT", 3),
      olcum("2026-10-20", "TYT", 5), olcum("2026-10-22", "TYT", 5)], "2026-10-15")!;
    expect(v.once).toEqual({ dogru: 6, yanlis: 6, bos: 4, kayit: 2 });
    expect(v.sonra).toEqual({ dogru: 10, yanlis: 2, bos: 4, kayit: 2 }); expect(v.fark).toBe(33);
  });
  test("yalnız boşlardan oluşan iki deneme yüzde/gelişim üretmez", () => {
    const liste = [olcum("2026-10-10"), olcum("2026-10-11"), olcum("2026-10-20"), olcum("2026-10-22")].map((o) => ({ ...o, dogru: 0, yanlis: 0, bos: 6 }));
    expect(gorevOlcumunuBul(liste, "2026-10-15")?.fark).toBeNull();
  });
  test("tamamlanma ve sonraki ölçüm bağımsızdır; aynı atama iki kez sayılmaz", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos, gorevler: [gorev, gorev, { ...gorev, id: "b", durum: "bekliyor" }], denemeler: [deneme("2026-10-22")] });
    expect(gelisimTakipOzeti(v.takipler)).toEqual({ toplam: 2, tamamlanan: 1, geciken: 1, olcumGelen: 2 });
  });
  test("konusuz görev bir konunun bütün sonuçlarını sahiplenmez; sorgu hatası ayrı tutulur", () => {
    const v = liseOgrenmeGelisimiHesapla({ ...bos, gorevler: [{ ...gorev, konu: null }], denemeler: [deneme("2026-10-22")], takipHatasi: true });
    expect(v.takipler[0].olcum).toBeNull(); expect(v.takipHatasi).toBe(true);
  });
});
