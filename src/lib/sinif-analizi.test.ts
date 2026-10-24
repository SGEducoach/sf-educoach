import { describe, expect, test } from "vitest";
import {
  aktifKullanicilar, denemeToplamNeti, gorevAdamlari, kayipNesilOzeti,
  gorevAkibeti, katilimDagilimi, netOrtalamasi, netSiralamasi, sayfala, sessizler,
  sinifAktiflikSiralamasi, uzaklasanlar,
  anahtardanTur, yayineviAnahtari, denemeTurleri, turNetleri, varsayilanDeneme, varsayilanTur,
  type AnalizOgrencisi,
} from "./sinif-analizi";

function ogrenci(ad: string, ek: Partial<AnalizOgrencisi> = {}): AnalizOgrencisi {
  return {
    ogrenciId: ad, ad, okulNo: null, sinifId: "s1", sinifAdi: "12-A", kademe: "lise",
    secilenDenemeNeti: null, denemeSayisi: 0, aktiflik: 0, gorevToplam: 0, gorevTamamlanan: 0,
    gorevBekleyen: 0, gorevTamamlanmayan: 0,
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

describe("netOrtalamasi", () => {
  test("tüm denemelerin ortalamasını iki ondalığa yuvarlar", () => {
    expect(netOrtalamasi({ a: 60, b: 70, c: 80 })).toBe(70);
    expect(netOrtalamasi({ a: 61.5, b: 70.25 })).toBe(65.88);
  });

  // Sıfır DÖNMEMELİ: denemeye hiç girmemiş öğrenci "0 net almış" gibi
  // listenin dibinde görünürse yanlış okunur.
  test("hiç denemesi yoksa null döner", () => {
    expect(netOrtalamasi({})).toBeNull();
  });

  test("tek denemede o denemenin neti çıkar", () => {
    expect(netOrtalamasi({ a: 42.75 })).toBe(42.75);
  });

  test("negatif net ortalamayı düşürür", () => {
    expect(netOrtalamasi({ a: 10, b: -4 })).toBe(3);
  });
});

describe("ortalamaya göre sıralama", () => {
  // Sıralama netSiralamasi ile AYNI yoldan geçer: çağıran taraf
  // secilenDenemeNeti'ne ortalamayı koyar.
  test("denemesi olmayan listeye girmez, ortalama sırası doğru", () => {
    const s = netSiralamasi([
      ogrenci("Az", { secilenDenemeNeti: netOrtalamasi({ a: 30 }), denemeSayisi: 1 }),
      ogrenci("Çok", { secilenDenemeNeti: netOrtalamasi({ a: 50, b: 60 }), denemeSayisi: 2 }),
      ogrenci("Yok", { secilenDenemeNeti: netOrtalamasi({}), denemeSayisi: 0 }),
    ]);
    expect(s.map((x) => x.ogrenci.ad)).toEqual(["Çok", "Az"]);
    expect(s[0].deger).toBe(55);
  });
});


describe("ölçüm panelleri", () => {
  const kapsam = [
    ogrenci("a", { sinifAdi: "11-C", aktiflik: 4, verisiVarMi: true }),
    ogrenci("b", { sinifAdi: "11-C", aktiflik: 2, verisiVarMi: true }),
    ogrenci("c", { sinifAdi: "10-A", aktiflik: 1, verisiVarMi: true }),
    // Verisi var ama son 30 günde yok.
    ogrenci("d", { sinifAdi: "10-A", aktiflik: 0, verisiVarMi: true }),
    // Hiç verisi yok.
    ogrenci("e", { sinifAdi: "10-A", aktiflik: 0, verisiVarMi: false }),
  ];

  test("sınıf aktifliği: aktif sayısına göre sıralanır, mevcut da taşınır", () => {
    expect(sinifAktiflikSiralamasi(kapsam)).toEqual([
      { sinifAdi: "11-C", mevcut: 2, aktif: 2, kayit: 6 },
      { sinifAdi: "10-A", mevcut: 3, aktif: 1, kayit: 1 },
    ]);
  });

  test("sınıf aktifliği: aktif sayısı eşitse çok kayıt girilen sınıf öne geçer (alfabetik değil)", () => {
    const esitAktif = [
      ogrenci("a1", { sinifAdi: "11-A", aktiflik: 1 }), ogrenci("a2", { sinifAdi: "11-A", aktiflik: 2 }),
      ogrenci("c1", { sinifAdi: "11-C", aktiflik: 40 }), ogrenci("c2", { sinifAdi: "11-C", aktiflik: 30 }),
    ];
    expect(sinifAktiflikSiralamasi(esitAktif).map((s) => s.sinifAdi)).toEqual(["11-C", "11-A"]);
  });

  test("sınıf aktifliği: eşitlikte alfabetik, kaç taneyle sınırlanır", () => {
    const esit = [ogrenci("x", { sinifAdi: "12-B" }), ogrenci("y", { sinifAdi: "12-A" })];
    expect(sinifAktiflikSiralamasi(esit).map((s) => s.sinifAdi)).toEqual(["12-A", "12-B"]);
    expect(sinifAktiflikSiralamasi(kapsam, 1)).toHaveLength(1);
  });

  // Üç kovanın toplamı öğrenci sayısına EŞİT olmalı; biri sessizce düşerse
  // halka eksik dolar ve yüzde yanlış okunur.
  test("katılım dağılımı öğrencilerin tamamını kapsar", () => {
    const d = katilimDagilimi(kapsam);
    expect(d.map((x) => x.sayi)).toEqual([3, 1, 1]);
    expect(d.reduce((t, x) => t + x.sayi, 0)).toBe(kapsam.length);
  });

  test("görev akıbeti üç durumu toplar ve oranı hesaplar", () => {
    const g = gorevAkibeti([
      ogrenci("p", { gorevTamamlanan: 2, gorevBekleyen: 3, gorevTamamlanmayan: 5 }),
      ogrenci("q", { gorevTamamlanan: 0, gorevBekleyen: 1, gorevTamamlanmayan: 9 }),
    ]);
    expect(g).toEqual({ tamamlandi: 2, bekliyor: 4, tamamlanmadi: 14, toplam: 20, oran: 0.1 });
  });

  // Görev yokken 0 göstermek "hiç tamamlamamış" gibi okunur; null doğru.
  test("hiç görev yoksa oran null", () => {
    expect(gorevAkibeti([ogrenci("z")]).oran).toBeNull();
  });
});

describe("deneme türü seçimi (denetim 20.10.2026)", () => {
  const sec = (anahtar: string, tarih: string, tur: string, katilan: number) => ({ anahtar, tarih, tur, katilan });
  const secenekler = [
    sec("A|2026-10-10|TYT", "2026-10-10", "TYT", 30),
    sec("B|2026-10-17|TYT", "2026-10-17", "TYT", 2),
    sec("C|2026-10-15|AYT", "2026-10-15", "AYT", 20),
    sec("D|2026-10-18|LGS", "2026-10-18", "LGS", 10),
  ];

  test("türü anahtarın son parçasından okur", () => {
    expect(anahtardanTur("Yayın|Evi|2026-10-10|TYT")).toBe("TYT");
  });

  test("türleri sabit sırada listeler", () => {
    expect(denemeTurleri(secenekler)).toEqual(["TYT", "AYT", "LGS"]);
  });

  test("varsayılan deneme: tek kişinin girdiği yeni deneme ortak denemenin önüne geçmez", () => {
    expect(varsayilanDeneme(secenekler, "TYT")?.anahtar).toBe("A|2026-10-10|TYT");
    expect(varsayilanDeneme(secenekler, "YOK")).toBeNull();
  });

  test("varsayılan tür en yeni ortak denemesi olan türdür", () => {
    expect(varsayilanTur(secenekler)).toBe("LGS");
    expect(varsayilanTur([])).toBeNull();
  });

  test("net haritası yalnız seçili türü içerir; karışmaz", () => {
    const harita = { "A|2026-10-10|TYT": 80, "C|2026-10-15|AYT": 40 };
    expect(turNetleri(harita, "TYT")).toEqual({ "A|2026-10-10|TYT": 80 });
    expect(netOrtalamasi(turNetleri(harita, "AYT"))).toBe(40);
    expect(netOrtalamasi(turNetleri(harita, "BRANS"))).toBeNull();
  });
});

describe("yayineviAnahtari", () => {
  test("büyük/küçük harf ve boşluk farkı aynı denemeyi bölmez (Türkçe i/İ dahil)", () => {
    expect(yayineviAnahtari("Paraf")).toBe(yayineviAnahtari(" PARAF "));
    expect(yayineviAnahtari("limit")).toBe(yayineviAnahtari("Limit"));
    expect(yayineviAnahtari("mikrorijinal")).toBe(yayineviAnahtari("MİKRORİJİNAL"));
  });
  test("boş yayınevi tire olur", () => {
    expect(yayineviAnahtari(null)).toBe("—");
    expect(yayineviAnahtari("  ")).toBe("—");
  });
});
