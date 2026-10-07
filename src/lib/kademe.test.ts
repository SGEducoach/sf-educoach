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

  // 07.10.2026 (migration 0144): okulda rehberlik bir BRANŞ DEĞİL, ayrı bir
  // birim — kimliği rehberlik_servisi üyeliğinden geliyor. Ortaokul
  // listesinden tamamen kalktı; BRANS_LISTESI'nde yalnız DERSHANE için
  // duruyor (dershane rehberi kendi kaydını o seçenekle yapıyor).
  test("rehberlik ortaokul branş listesinde YOK", () => {
    expect(ORTAOKUL_BRANSLARI).not.toContain(REHBER_BRANSI);
  });

  test("rehberlik ham listede dershane için duruyor", () => {
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

  // Okul formlarında rehberlik hiçbir kademede branş olarak SUNULMAZ
  // (migration 0144) — rehber yapmanın tek yolu Rehberlik Servisi'ne üye
  // eklemek. Dershane listesi etkilenmiyor.
  test("rehberlik okul branş listelerinde hiçbir kademede yok", () => {
    for (const kademe of ["ortaokul", "lise", "ikisi"] as const) {
      expect(panelBransListesi("okul", kademe), kademe).not.toContain(REHBER_BRANSI);
    }
  });

  test("dershane branş listesinde rehberlik duruyor", () => {
    for (const kademe of ["lise", "ikisi"] as const) {
      expect(panelBransListesi("dershane", kademe), kademe).toContain(REHBER_BRANSI);
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

// Ortaokul panelinin rol menüleri (kullanıcı isteği 02.10.2026).
describe("ortaokul kurumunda rol menüleri", () => {
  const ogretmenOrtaokul = dashboardMenusu("ogretmen", "okul", "Matematik", false, "ortaokul");
  const ogretmenLise = dashboardMenusu("ogretmen", "okul", "Matematik", false, "lise");

  test("YKS Konu Haritası ortaokul öğretmeninde YOK, lisede var", () => {
    expect(ogretmenOrtaokul.map((o) => o.bolum)).not.toContain("yapay-zeka");
    expect(ogretmenLise.map((o) => o.bolum)).toContain("yapay-zeka");
  });

  test("ortaokul öğretmeninde Konu Yeterliliği var", () => {
    expect(ogretmenOrtaokul.map((o) => o.bolum)).toContain("ortaokul-yeterlilik");
  });

  // GERİLEME TESTİ: 01.10.2026'da eklediğim ortaokul dalı erken dönüyordu ve
  // okul dalını atlıyordu; ortaokul öğretmeni "Ajandam"ı kaybetmişti.
  test("ortaokul öğretmeni Ajandam'ı kaybetmiyor", () => {
    expect(ogretmenOrtaokul.map((o) => o.bolum)).toContain("takvim");
    expect(ogretmenLise.map((o) => o.bolum)).toContain("takvim");
  });

  test("ortaokul öğretmeninin kalan kalemleri duruyor", () => {
    for (const b of ["ozet", "gorevler", "duyurular", "talepler", "tg-denemeleri"]) {
      expect(ogretmenOrtaokul.map((o) => o.bolum), b).toContain(b);
    }
  });

  test("müdürde de YKS Konu Haritası yalnız lisede", () => {
    expect(dashboardMenusu("mudur", "okul", undefined, false, "ortaokul").map((o) => o.bolum)).not.toContain("yapay-zeka");
    expect(dashboardMenusu("mudur", "okul", undefined, false, "lise").map((o) => o.bolum)).toContain("yapay-zeka");
    // Ajanda müdürde de kalmalı.
    expect(dashboardMenusu("mudur", "okul", undefined, false, "ortaokul").map((o) => o.bolum)).toContain("takvim");
  });

  test("dershane müdürü kademeden etkilenmiyor", () => {
    const a = dashboardMenusu("mudur", "dershane", undefined, false, "ortaokul").map((o) => o.bolum);
    const b = dashboardMenusu("mudur", "dershane", undefined, false, "lise").map((o) => o.bolum);
    expect(a).toEqual(b);
  });

  test("rehber öğretmen menüsü kademeden etkilenmiyor", () => {
    const a = dashboardMenusu("ogretmen", "okul", REHBER_BRANSI, false, "ortaokul").map((o) => o.bolum);
    const b = dashboardMenusu("ogretmen", "okul", REHBER_BRANSI, false, "lise").map((o) => o.bolum);
    expect(a).toEqual(b);
  });

  // ---- Rehberlik Servisi birimi (migration 0144) ----
  // Kimlik artık BRANŞ DEĞİL, servis üyeliği. Bu testler o geçişi koruyor.
  test("okul rehberi branşı ne olursa olsun rehber menüsünü alır", () => {
    const servisUyesi = dashboardMenusu("ogretmen", "okul", "Matematik", false, "lise", true).map((o) => o.bolum);
    const eskiBransli = dashboardMenusu("ogretmen", "okul", REHBER_BRANSI, false, "lise").map((o) => o.bolum);
    // Kimlik branştan gelmiyor: servis üyesinin branşı "Matematik" olsa da
    // rehber menüsünü alıyor. Tek fark servise ÖZEL kalemler — "Kapsamım"
    // (Adım 2) ve "Görüşme Kayıtları" (Faz 4); ikisi de rehberin atandığı
    // sinif_duzeyleri'ne dayanıyor, eski branş kimliğinde böyle bir kapsam yok.
    const servisEOzel: string[] = ["kapsamim", "gorusmeler", "program-destegi"];
    expect(servisUyesi.filter((b) => !servisEOzel.includes(b))).toEqual(eskiBransli);
    expect(servisUyesi).toContain("rehberlik");
    for (const b of servisEOzel) expect(eskiBransli).not.toContain(b);
  });

  test("servis üyesi olmayan öğretmen rehber menüsü ALMAZ", () => {
    const menu = dashboardMenusu("ogretmen", "okul", "Matematik", false, "lise", false).map((o) => o.bolum);
    expect(menu).not.toContain("rehberlik");
  });

  // Ortaokulda rehber, branş öğretmeninin "Konu Yeterliliği" kalemini ALMAZ —
  // yeterlilik kararı branş işi, rehberin işi değil.
  test("ortaokul rehberi branş öğretmeni kalemlerini almaz", () => {
    const rehber = dashboardMenusu("ogretmen", "okul", "", false, "ortaokul", true).map((o) => o.bolum);
    expect(rehber).toContain("rehberlik");
    expect(rehber).not.toContain("ortaokul-yeterlilik");
  });

  // Dershane rehberi ve grup koçu kimliğini BİLİNÇLİ olarak hâlâ branştan
  // alıyor (kapsam kararı: farklı bir iş) — bozulmadığı doğrulanıyor.
  // ---- Rehber Radarı Adım 2: "Kapsamım" (07.10.2026) ----
  test("okul rehberi Kapsamım kalemini alır, Kurum Performansı'nın hemen ardından", () => {
    const menu = dashboardMenusu("ogretmen", "okul", "", false, "lise", true).map((o) => o.bolum);
    expect(menu).toContain("kapsamim");
    expect(menu.indexOf("kapsamim")).toBe(menu.indexOf("kurum-performansi") + 1);
    // Mevcut kalemler korunmalı — "Öğrenciler" sınıf bazlı işler için yerinde.
    expect(menu).toContain("ozet");
    expect(menu).toContain("rehberlik");
  });

  // Faz 4 (migration 0145) — görüşme kayıtları GİZLİ. Menüde gizlemek tek
  // başına yeterli bir kontrol değil (gizlilik RLS'te), ama sızmaması gerek.
  test("okul rehberi Görüşme Kayıtları kalemini alır", () => {
    const menu = dashboardMenusu("ogretmen", "okul", "", false, "lise", true).map((o) => o.bolum);
    expect(menu).toContain("gorusmeler");
  });

  test("Görüşme Kayıtları servis üyesi olmayana, müdüre ve dershaneye gösterilmez", () => {
    expect(dashboardMenusu("ogretmen", "okul", "Matematik", false, "lise", false).map((o) => o.bolum)).not.toContain("gorusmeler");
    expect(dashboardMenusu("mudur", "okul", undefined, false, "lise").map((o) => o.bolum)).not.toContain("gorusmeler");
    expect(dashboardMenusu("ogretmen", "dershane", REHBER_BRANSI, false, null, false).map((o) => o.bolum)).not.toContain("gorusmeler");
    expect(dashboardMenusu("ogrenci", "okul", undefined, false, "lise").map((o) => o.bolum)).not.toContain("gorusmeler");
    expect(dashboardMenusu("veli").map((o) => o.bolum)).not.toContain("gorusmeler");
  });

  // Program Desteği (migration 0146): rehber öğrenciyle Oto Program
  // sihirbazını birlikte geçer. Program ÖĞRENCİNİN kalıyor (rehber_yerlestirdi
  // set edilmiyor), rehberin etkinliği akıbet geri bildirimiyle korunuyor.
  test("okul rehberi Program Desteği kalemini alır", () => {
    const menu = dashboardMenusu("ogretmen", "okul", "", false, "lise", true).map((o) => o.bolum);
    expect(menu).toContain("program-destegi");
  });

  test("Program Desteği servis üyesi olmayana, müdüre, dershaneye ve öğrenciye gösterilmez", () => {
    expect(dashboardMenusu("ogretmen", "okul", "Matematik", false, "lise", false).map((o) => o.bolum)).not.toContain("program-destegi");
    expect(dashboardMenusu("mudur", "okul", undefined, false, "lise").map((o) => o.bolum)).not.toContain("program-destegi");
    expect(dashboardMenusu("ogretmen", "dershane", REHBER_BRANSI, false, null, false).map((o) => o.bolum)).not.toContain("program-destegi");
    expect(dashboardMenusu("ogrenci", "okul", undefined, false, "lise").map((o) => o.bolum)).not.toContain("program-destegi");
  });

  test("Kapsamım servis üyesi OLMAYANA gösterilmez", () => {
    // Branş öğretmeni
    expect(dashboardMenusu("ogretmen", "okul", "Matematik", false, "lise", false).map((o) => o.bolum)).not.toContain("kapsamim");
    // Müdür
    expect(dashboardMenusu("mudur", "okul", undefined, false, "lise").map((o) => o.bolum)).not.toContain("kapsamim");
  });

  // Dershane rehberi ve grup koçunda kapsam (sinif_duzeyleri) kavramı YOK —
  // DERSHANE_REHBER_MENUSU, REHBER_OGRETMEN_MENUSU'nden dilimlendiği için
  // bu test sızmayı yakalar.
  test("dershane rehberi ve grup koçu Kapsamım ALMAZ", () => {
    expect(dashboardMenusu("ogretmen", "dershane", REHBER_BRANSI, false, null, false).map((o) => o.bolum)).not.toContain("kapsamim");
    expect(dashboardMenusu("ogretmen", "dershane", REHBER_BRANSI, true, null, false).map((o) => o.bolum)).not.toContain("kapsamim");
  });

  test("dershane rehberi branş kimliğiyle çalışmaya devam eder", () => {
    const menu = dashboardMenusu("ogretmen", "dershane", REHBER_BRANSI, false, null, false).map((o) => o.bolum);
    expect(menu).toContain("ogrenci-takibi");
    expect(menu).toContain("rehberlik");
  });
});
