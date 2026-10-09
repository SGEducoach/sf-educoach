import { describe, expect, test } from "vitest";
import {
  aktifKullanicilar, denemeToplamNeti, gorevAdamlari, kayipNesilOzeti,
  netSiralamasi, sayfala, sessizler, uzaklasanlar,
  type AnalizOgrencisi,
} from "./sinif-analizi";

function ogrenci(ad: string, ek: Partial<AnalizOgrencisi> = {}): AnalizOgrencisi {
  return {
    ogrenciId: ad, ad, okulNo: null, sinifId: "s1", sinifAdi: "12-A", kademe: "lise",
    secilenDenemeNeti: null, aktiflik: 0, gorevToplam: 0, gorevTamamlanan: 0,
    sonDonem: 0, oncekiDonem: 0, girisYapmisMi: true, verisiVarMi: true, ...ek,
  };
}

describe("netSiralamasi", () => {
  test("denemeye girmeyen listede YER ALMAZ", () => {
    const s = netSiralamasi([
      ogrenci("Ali", { secilenDenemeNeti: 40 }),
      ogrenci("Veli"), // girmemiş
      ogrenci("Ayşe", { secilenDenemeNeti: 70 }),
    ]);
    expect(s.map((x) => x.ogrenci.ad)).toEqual(["Ayşe", "Ali"]);
    expect(s.map((x) => x.sira)).toEqual([1, 2]);
  });

  test("eşit net alfabetik sıralanır (her açılışta aynı sıra)", () => {
    const s = netSiralamasi([
      ogrenci("Zeynep", { secilenDenemeNeti: 50 }),
      ogrenci("Ahmet", { secilenDenemeNeti: 50 }),
    ]);
    expect(s.map((x) => x.ogrenci.ad)).toEqual(["Ahmet", "Zeynep"]);
  });

  test("negatif net sıralamayı bozmaz", () => {
    const s = netSiralamasi([
      ogrenci("Ali", { secilenDenemeNeti: -3 }),
      ogrenci("Ayşe", { secilenDenemeNeti: 0 }),
    ]);
    expect(s.map((x) => x.ogrenci.ad)).toEqual(["Ayşe", "Ali"]);
  });
});

describe("aktifKullanicilar", () => {
  test("hiç kaydı olmayan listeye girmez", () => {
    const s = aktifKullanicilar([ogrenci("Ali", { aktiflik: 12 }), ogrenci("Boş")]);
    expect(s).toHaveLength(1);
    expect(s[0].deger).toBe(12);
  });
});

describe("gorevAdamlari", () => {
  // Taban olmadan tek görevini yapan herkes %100 görünür — yanıltıcı.
  test("üç görevden azı olan listeye girmez", () => {
    const s = gorevAdamlari([
      ogrenci("Tek", { gorevToplam: 1, gorevTamamlanan: 1 }),
      ogrenci("Üçlü", { gorevToplam: 3, gorevTamamlanan: 3 }),
    ]);
    expect(s.map((x) => x.ogrenci.ad)).toEqual(["Üçlü"]);
  });

  test("oran eşitse çok görevi olan önde", () => {
    const s = gorevAdamlari([
      ogrenci("Az", { gorevToplam: 3, gorevTamamlanan: 3 }),
      ogrenci("Çok", { gorevToplam: 10, gorevTamamlanan: 10 }),
    ]);
    expect(s.map((x) => x.ogrenci.ad)).toEqual(["Çok", "Az"]);
  });

  test("hiç tamamlamayan 'görev adamı' sayılmaz", () => {
    expect(gorevAdamlari([ogrenci("Sıfır", { gorevToplam: 8, gorevTamamlanan: 0 })])).toEqual([]);
  });
});

describe("uzaklasanlar", () => {
  test("tabanı tutmayan gürültü elenir", () => {
    // 1 kayıttan 0'a düşmek uzaklaşma değil.
    expect(uzaklasanlar([ogrenci("Gürültü", { oncekiDonem: 1, sonDonem: 0 })])).toEqual([]);
  });

  test("tamamen bırakan, azalandan önce gelir", () => {
    const s = uzaklasanlar([
      ogrenci("Azaldı", { oncekiDonem: 20, sonDonem: 4 }),   // düşüş 16
      ogrenci("Bıraktı", { oncekiDonem: 5, sonDonem: 0 }),   // düşüş 5 ama sıfırlandı
    ]);
    expect(s.map((x) => x.ogrenci.ad)).toEqual(["Bıraktı", "Azaldı"]);
  });

  test("artan ya da sabit kalan listeye girmez", () => {
    const s = uzaklasanlar([
      ogrenci("Arttı", { oncekiDonem: 5, sonDonem: 9 }),
      ogrenci("Sabit", { oncekiDonem: 5, sonDonem: 5 }),
    ]);
    expect(s).toEqual([]);
  });
});

describe("sessizler", () => {
  test("hesabını açmamış olan, açıp veri girmeyenden önce gelir", () => {
    const s = sessizler([
      ogrenci("VeriYok", { girisYapmisMi: true, verisiVarMi: false }),
      ogrenci("HiçGirmedi", { girisYapmisMi: false, verisiVarMi: false }),
    ]);
    expect(s.map((x) => x.ogrenci.ad)).toEqual(["HiçGirmedi", "VeriYok"]);
    expect(s.map((x) => x.deger)).toEqual(["hesap-acilmamis", "hic-veri-yok"]);
  });

  test("girişi ve verisi olan sessiz değildir", () => {
    expect(sessizler([ogrenci("Aktif")])).toEqual([]);
  });

  // Verisi OLAN ama hesabını hiç açmamış öğrenci gerçek bir durum: veri
  // öğretmen girişinden ve deneme PDF eşleştirmesinden geliyor.
  test("verisi var ama hesabını açmamış olan yakalanır", () => {
    const s = sessizler([ogrenci("PdfTen", { girisYapmisMi: false, verisiVarMi: true })]);
    expect(s[0].deger).toBe("hesap-acilmamis");
  });
});

describe("kayipNesilOzeti", () => {
  test("sınıf kırılımlı sayar, eksiği olmayan sınıfı listelemez", () => {
    const s = kayipNesilOzeti([
      { sinifAdi: "12-A", hesabiVarMi: false },
      { sinifAdi: "12-A", hesabiVarMi: false },
      { sinifAdi: "12-A", hesabiVarMi: true },
      { sinifAdi: "12-B", hesabiVarMi: true },
      { sinifAdi: "12-C", hesabiVarMi: false },
    ]);
    expect(s).toEqual([
      { sinifAdi: "12-A", eksik: 2, toplam: 3 },
      { sinifAdi: "12-C", eksik: 1, toplam: 1 },
    ]);
  });
});

describe("sayfala", () => {
  const liste = Array.from({ length: 23 }, (_, i) => i + 1);

  test("sayfa boyu kadar böler", () => {
    expect(sayfala(liste, 1).satirlar).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(sayfala(liste, 3).satirlar).toEqual([21, 22, 23]);
    expect(sayfala(liste, 1).sayfaSayisi).toBe(3);
  });

  test("aralık dışı sayfa güvenli sınıra çekilir", () => {
    expect(sayfala(liste, 99).sayfa).toBe(3);
    expect(sayfala(liste, 0).sayfa).toBe(1);
    expect(sayfala(liste, -5).sayfa).toBe(1);
  });

  test("boş liste tek sayfa sayılır", () => {
    expect(sayfala([], 1)).toEqual({ satirlar: [], sayfaSayisi: 1, sayfa: 1 });
  });
});

describe("denemeToplamNeti", () => {
  // Ortaokul kapsama alındı (kullanıcı kararı 09.10.2026): yanlış katsayısı
  // lisede 4, ortaokulda 3. Kademe geçilmezse ortaokul neti YANLIŞ çıkar.
  test("kademeye göre yanlış katsayısı değişir", () => {
    const dersler = [{ dogru: 10, yanlis: 6 }, { dogru: 8, yanlis: 3 }];
    expect(denemeToplamNeti(dersler, "lise")).toBe(15.75);   // 8.5 + 7.25
    expect(denemeToplamNeti(dersler, "ortaokul")).toBe(15);  // 8 + 7
  });

  test("ders yoksa net sıfır", () => {
    expect(denemeToplamNeti([], "lise")).toBe(0);
  });
});
