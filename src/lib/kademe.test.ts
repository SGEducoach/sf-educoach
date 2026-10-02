import { describe, expect, test } from "vitest";
import { KURUM_SECIMI_ACIKLAMA, KURUM_SECIMI_ETIKET, KURUM_SECIMI_SIRASI, ORTAOKUL_BRANSLARI, ORTAOKUL_SEVIYELERI, alanSorulurMu, seviyeEtiketi, hedefEtiketi, hedefYerTutucusu, panelBransListesi, bransListesi, kademeBul, kurumSecimi, kurumSeciminiCoz, kurumSeviyeleri, lgsSinifiMi, ortaokulMu, seviyeNormalize } from "./kademe";
import { BRANS_LISTESI } from "./types";
import { REHBER_BRANSI } from "./rehberlik";
import { DASHBOARD_ROUTE_BOLUMLERI, dashboardMenusu } from "./dashboard-navigation";

describe("seviyeNormalize", () => {
  test("farklı yazımlar tek biçime iner", () => {
    expect(seviyeNormalize("8")).toBe("8");
    expect(seviyeNormalize(" 8 ")).toBe("8");
    expect(seviyeNormalize("8. Sınıf")).toBe("8");
    expect(seviyeNormalize("12.sınıf")).toBe("12");
  });
  test("sayısal olmayan ve sınır dışı değerler null", () => {
    expect(seviyeNormalize("Mezun")).toBeNull();
    expect(seviyeNormalize("Hazırlık")).toBeNull();
    expect(seviyeNormalize("")).toBeNull();
    expect(seviyeNormalize(null)).toBeNull();
    expect(seviyeNormalize("13")).toBeNull();
    expect(seviyeNormalize("0")).toBeNull();
  });
});

describe("kademeBul", () => {
  test("5-8 ortaokul, 9-12 lise", () => {
    for (const s of ["5", "6", "7", "8"]) expect(kademeBul(s), s).toBe("ortaokul");
    for (const s of ["9", "10", "11", "12"]) expect(kademeBul(s), s).toBe("lise");
  });
  test("ilkokul ve tanımsız seviyeler kademesiz", () => {
    for (const s of ["1", "2", "3", "4"]) expect(kademeBul(s), s).toBeNull();
    expect(kademeBul("Mezun")).toBeNull();
    expect(kademeBul(null)).toBeNull();
  });
  test("sınıfı olmayan öğrenci kademesiz sayılır — panel varsayılana düşmeli", () => {
    expect(ortaokulMu(null)).toBe(false);
    expect(ortaokulMu(undefined)).toBe(false);
  });
});

describe("lgsSinifiMi", () => {
  test("yalnız 8. sınıf", () => {
    expect(lgsSinifiMi("8")).toBe(true);
    expect(lgsSinifiMi("8. Sınıf")).toBe(true);
    expect(lgsSinifiMi("7")).toBe(false);
    expect(lgsSinifiMi("12")).toBe(false);
  });
});

describe("bransListesi", () => {
  test("ortaokulda ortaokul branşları, diğer hâllerde lise listesi", () => {
    expect(bransListesi("ortaokul")).toContain("Fen Bilimleri");
    expect(bransListesi("ortaokul")).toContain("Sosyal Bilgiler");
    expect(bransListesi("ortaokul")).toContain("Türkçe");
    expect(bransListesi("lise")).toContain("Türk Dili ve Edebiyatı");
    expect(bransListesi("lise")).not.toContain("Fen Bilimleri");
    expect(bransListesi(null)).toEqual(BRANS_LISTESI);
  });

  test("iki kademede de ders veren branşların metni birebir aynı", () => {
    // Aksi hâlde aynı öğretmen iki ayrı branş gibi görünür.
    for (const ortak of ["Matematik", "İngilizce", "Din Kültürü", "Beden Eğitimi", "Müzik", "Diğer"]) {
      expect(ORTAOKUL_BRANSLARI, ortak).toContain(ortak);
      expect(BRANS_LISTESI, ortak).toContain(ortak);
    }
  });

  test("rehber branşı iki listede de aynı sabitten gelir", () => {
    expect(ORTAOKUL_BRANSLARI).toContain(REHBER_BRANSI);
    expect(BRANS_LISTESI).toContain(REHBER_BRANSI);
  });
});

// Ortaokul menüsü YALNIZ kademe "ortaokul" geçilince devreye girer; bayrak
// kapalıyken çağıran taraf null geçer ve lise menüsü aynen kalır.
describe("ortaokul öğrenci menüsü", () => {
  test("kademe verilmezse lise menüsü değişmez", () => {
    const lise = dashboardMenusu("ogrenci", "okul");
    expect(lise.map((o) => o.bolum)).toContain("veri-girisi");
    expect(lise.map((o) => o.bolum)).not.toContain("ortaokul-dersler");
  });

  test("ortaokulda YKS'ye özgü bölümler yok, Derslerim var", () => {
    const orta = dashboardMenusu("ogrenci", "okul", undefined, false, "ortaokul");
    const bolumler = orta.map((o) => o.bolum);
    expect(bolumler).toContain("ortaokul-dersler");
    for (const yks of ["veri-girisi", "analiz", "tg-denemeleri", "konu-hakimiyeti"]) {
      expect(bolumler, yks).not.toContain(yks);
    }
  });

  test("ortaokul menüsünde dil yaşa uygun", () => {
    const orta = dashboardMenusu("ogrenci", "okul", undefined, false, "ortaokul");
    expect(orta.find((o) => o.bolum === "ozet")?.etiket).toBe("Bugün");
    expect(orta.find((o) => o.bolum === "gorevler")?.etiket).toBe("Görevlerim");
    expect(orta.find((o) => o.bolum === "planlar")?.etiket).toBe("Planım");
  });

  test("Yardım İste yalnız ortaokul menüsünde", () => {
    const orta = dashboardMenusu("ogrenci", "okul", undefined, false, "ortaokul");
    expect(orta.find((o) => o.bolum === "ortaokul-yardim")?.etiket).toBe("Yardım İste");
    const lise = dashboardMenusu("ogrenci", "okul");
    expect(lise.map((o) => o.bolum)).not.toContain("ortaokul-yardim");
  });

  test("ortaokul menüsünün her bölümü yönlendirilebilir", () => {
    // Menüde olup DASHBOARD_ROUTE_BOLUMLERI'nde olmayan bölüm 404 verir.
    const orta = dashboardMenusu("ogrenci", "okul", undefined, false, "ortaokul");
    for (const o of orta) {
      if (o.bolum === "ozet") continue; // "/dashboard" kökü, alt yol değil
      expect(DASHBOARD_ROUTE_BOLUMLERI.has(o.bolum), o.bolum).toBe(true);
    }
  });

  test("kademe lise ise lise menüsü gelir", () => {
    const lise = dashboardMenusu("ogrenci", "okul", undefined, false, "lise");
    expect(lise.map((o) => o.bolum)).toContain("veri-girisi");
  });

  test("öğretmen/veli kademeden etkilenmez", () => {
    const ogretmen = dashboardMenusu("ogretmen", "okul", "Matematik", false, "ortaokul");
    expect(ogretmen.map((o) => o.bolum)).not.toContain("ortaokul-dersler");
  });
});

// Kurum ekleme: tek seçim (Ortaokul / Lise / Dershane) iki alana çözülüyor.
describe("kurum seçimi ve sınıf seviyeleri", () => {
  test("seçim tur + kademeye çözülür", () => {
    expect(kurumSeciminiCoz("ortaokul")).toEqual({ tur: "okul", kademe: "ortaokul" });
    expect(kurumSeciminiCoz("lise")).toEqual({ tur: "okul", kademe: "lise" });
    expect(kurumSeciminiCoz("ikisi")).toEqual({ tur: "okul", kademe: "ikisi" });
    expect(kurumSeciminiCoz("dershane")).toEqual({ tur: "dershane", kademe: "lise" });
  });

  test("kayıtlı kurumdan seçime geri dönüş", () => {
    expect(kurumSecimi("okul", "ortaokul")).toBe("ortaokul");
    expect(kurumSecimi("okul", "lise")).toBe("lise");
    expect(kurumSecimi("okul", "ikisi")).toBe("ikisi");
    expect(kurumSecimi("dershane", "lise")).toBe("dershane");
    // Kademe hiç yazılmamış eski kayıt lise sayılır.
    expect(kurumSecimi("okul", null)).toBe("lise");
  });

  // Düzenleme formu kayıtlı kurumu seçime çevirip geri yazıyor: bu gidiş-dönüş
  // bozuksa yönetici hiçbir şeye dokunmadan "Kaydet"e bastığında kurumun
  // kademesi değişir.
  test("çöz → geri dön gidiş dönüşü her seçenekte aynı seçimi verir", () => {
    for (const s of KURUM_SECIMI_SIRASI) {
      const { tur, kademe } = kurumSeciminiCoz(s);
      expect(kurumSecimi(tur, kademe), s).toBe(s);
    }
  });

  test("her seçeneğin etiketi ve açıklaması var", () => {
    for (const s of KURUM_SECIMI_SIRASI) {
      expect(KURUM_SECIMI_ETIKET[s], s).toBeTruthy();
      expect(KURUM_SECIMI_ACIKLAMA[s], s).toBeTruthy();
    }
  });

  test("ortaokulda 9-12 hiç görünmez", () => {
    expect(kurumSeviyeleri("ortaokul")).toEqual(["5", "6", "7", "8"]);
    for (const s of ["9", "10", "11", "12"]) {
      expect(kurumSeviyeleri("ortaokul"), s).not.toContain(s);
    }
  });

  test("lisede 5-8 görünmez", () => {
    expect(kurumSeviyeleri("lise")).toEqual(["9", "10", "11", "12"]);
  });

  test("kademe bilinmiyorsa lise seviyeleri gelir — eski kurumlar bozulmaz", () => {
    expect(kurumSeviyeleri(null)).toEqual(["9", "10", "11", "12"]);
    expect(kurumSeviyeleri(undefined)).toEqual(["9", "10", "11", "12"]);
  });

  test("ikisi seçilirse 5-12 birlikte", () => {
    expect(kurumSeviyeleri("ikisi")).toEqual(["5", "6", "7", "8", "9", "10", "11", "12"]);
  });
});

// Öğretmen branşı: kullanıcı kararı 01.10.2026.
describe("ortaokul öğretmen branşları", () => {
  test("lise adı \"Türk Dili ve Edebiyatı\" ortaokulda YOK, yerine Türkçe var", () => {
    expect(ORTAOKUL_BRANSLARI).not.toContain("Türk Dili ve Edebiyatı");
    expect(ORTAOKUL_BRANSLARI).toContain("Türkçe");
    // Lise listesi değişmedi.
    expect(BRANS_LISTESI).toContain("Türk Dili ve Edebiyatı");
  });

  test("İnkılap Tarihi ayrı branş değil — Sosyal Bilgiler var", () => {
    expect(ORTAOKUL_BRANSLARI).not.toContain("T.C. İnkılap Tarihi ve Atatürkçülük");
    expect(ORTAOKUL_BRANSLARI).toContain("Sosyal Bilgiler");
  });
});

describe("panelBransListesi", () => {
  test("ortaokul kurumunda yalnız ortaokul branşları", () => {
    const liste = panelBransListesi("okul", "ortaokul");
    expect(liste).toEqual([...ORTAOKUL_BRANSLARI]);
    expect(liste).not.toContain("Türk Dili ve Edebiyatı");
    expect(liste).not.toContain("Fizik");
  });

  test("lise kurumunda liste değişmedi — okula özel branşlar dahil", () => {
    const liste = panelBransListesi("okul", "lise");
    expect(liste).toContain("Türk Dili ve Edebiyatı");
    expect(liste).toContain("Bilişim Teknolojileri");
    expect(liste).not.toContain("Fen Bilimleri");
  });

  test("dershanede lise listesi, okula özel branşlar yok", () => {
    const liste = panelBransListesi("dershane", "lise");
    expect(liste).toContain("Türk Dili ve Edebiyatı");
    expect(liste).not.toContain("Bilişim Teknolojileri");
  });

  test("kademe bilinmiyorsa eski davranış (lise)", () => {
    expect(panelBransListesi("okul", null)).toEqual([...panelBransListesi("okul", "lise")]);
    expect(panelBransListesi("okul", undefined)).toEqual([...panelBransListesi("okul", "lise")]);
  });

  test("ikisi: her iki kademenin branşları, tekrar YOK", () => {
    const liste = panelBransListesi("okul", "ikisi");
    expect(liste).toContain("Fen Bilimleri");
    expect(liste).toContain("Türk Dili ve Edebiyatı");
    expect(liste).toContain("Türkçe");
    // Matematik iki listede de var; bir kez görünmeli.
    expect(liste.filter((b) => b === "Matematik")).toHaveLength(1);
    expect(new Set(liste).size).toBe(liste.length);
  });

  test("rehber branşı her kademede aynı metinle duruyor", () => {
    for (const kademe of ["ortaokul", "lise", "ikisi"] as const) {
      expect(panelBransListesi("okul", kademe), kademe).toContain(REHBER_BRANSI);
    }
  });
});

// Öğrenci alanları (kullanıcı kararı 01.10.2026): ortaokulda YKS "alan"
// seçimi hiç sorulmaz, hedef bölüm değil meslektir.
describe("öğrenci alanları kademeye göre", () => {
  test("alan yalnız ortaokul DIŞINDA sorulur", () => {
    expect(alanSorulurMu("ortaokul")).toBe(false);
    expect(alanSorulurMu("lise")).toBe(true);
    // Kademe bilinmiyorsa eski davranış: sorulur.
    expect(alanSorulurMu(null)).toBe(true);
    expect(alanSorulurMu(undefined)).toBe(true);
  });

  test("hedef etiketi ortaokulda meslek, lisede bölüm", () => {
    expect(hedefEtiketi("ortaokul")).toBe("Hedef meslek");
    expect(hedefEtiketi("lise")).toBe("Hedef bölüm");
    expect(hedefEtiketi(null)).toBe("Hedef bölüm");
    expect(hedefYerTutucusu("ortaokul")).toBe("Hedef meslek (ops.)");
  });

  // Formlar kademeyi SINIF seviyesinden türetiyor; "ikisi" kurumunda aynı
  // formda hem 5-A hem 11-B açılabildiği için kurum kademesi yetmez.
  test("sınıf seviyesinden türetme: 5-8 alan sormaz, 9-12 sorar", () => {
    for (const s of ["5", "6", "7", "8"]) expect(alanSorulurMu(kademeBul(s)), s).toBe(false);
    for (const s of ["9", "10", "11", "12"]) expect(alanSorulurMu(kademeBul(s)), s).toBe(true);
  });
});

// Ödev formunun konu süzgeci ile konu havuzu AYNI seviye etiketini üretmeli.
// Biçim ayrışırsa süzgeç sessizce hiçbir konu bulamaz — 02.10.2026'da
// yaşanan "konular açık değil" hatası tam buydu.
describe("seviyeEtiketi", () => {
  test("havuz ve süzgeç tek kaynaktan aynı metni üretir", () => {
    expect(seviyeEtiketi("5")).toBe("5. Sınıf");
    expect(seviyeEtiketi("8")).toBe("8. Sınıf");
    expect(seviyeEtiketi("11")).toBe("11. Sınıf");
  });

  test("ortaokul seviyelerinin hepsi etiketlenebiliyor", () => {
    for (const s of ORTAOKUL_SEVIYELERI) {
      expect(seviyeEtiketi(s), s).toBe(`${s}. Sınıf`);
    }
  });
});

// Bilişim / Bilgisayar birleşmesi (kullanıcı kararı 02.10.2026).
// "Bilişim Teknolojileri" OKULA ÖZEL bir branş (dershanede yok), bu yüzden
// taban BRANS_LISTESI'nde değil — birleşme panelBransListesi düzeyinde
// doğrulanıyor.
describe("Bilişim Teknolojileri tek branş", () => {
  test("eski adlar hiçbir listede yok", () => {
    for (const kademe of ["ortaokul", "lise", "ikisi", null] as const) {
      for (const eski of ["Bilişim", "Bilgisayar"]) {
        expect(panelBransListesi("okul", kademe), `${kademe}/${eski}`).not.toContain(eski);
      }
    }
  });

  test("okul kurumunda her kademede AYNI metinle var", () => {
    for (const kademe of ["ortaokul", "lise", "ikisi"] as const) {
      expect(panelBransListesi("okul", kademe), String(kademe)).toContain("Bilişim Teknolojileri");
    }
  });

  test("ikisi kademesinde tek kez görünür — iki listede de var", () => {
    const liste = panelBransListesi("okul", "ikisi");
    expect(liste.filter((b) => b === "Bilişim Teknolojileri")).toHaveLength(1);
  });

  test("dershanede sunulmuyor", () => {
    expect(panelBransListesi("dershane", "lise")).not.toContain("Bilişim Teknolojileri");
  });
});
