import { describe, expect, test } from "vitest";
import {
  YARDIM_DURUM_ACIKLAMA,
  YARDIM_DURUM_ETIKET,
  YARDIM_MESAJ_EN_FAZLA,
  dersIcinAcikIstekVarMi,
  geriAlinabilirMi,
  yardimGirdisiDogrula,
  yardimMesaji,
} from "./ortaokul-yardim";
import type { YardimDurumu } from "./ortaokul-yardim";

describe("yardimGirdisiDogrula", () => {
  // En önemli ürün kararı: mesaj ZORUNLU DEĞİL. Bu test bozulursa öğrenci
  // yazı yazmadan yardım isteyemez hâle gelir.
  test("mesaj olmadan da geçerli", () => {
    const s = yardimGirdisiDogrula({ dersAdi: "Matematik" });
    expect(s.gecerli).toBe(true);
    expect(s.temiz).toEqual({ dersAdi: "Matematik", kazanimId: null, mesaj: null });
  });

  test("yalnız boşluktan oluşan mesaj NULL'a çevriliyor", () => {
    // Veritabanı kısıtı boş metni reddediyor; boşluk göndermek ham hata verirdi.
    expect(yardimGirdisiDogrula({ dersAdi: "Fen Bilimleri", mesaj: "   " }).temiz?.mesaj).toBeNull();
  });

  test("ders seçilmemişse yaşa uygun bir hata", () => {
    const s = yardimGirdisiDogrula({ dersAdi: "" });
    expect(s.gecerli).toBe(false);
    expect(s.hata).toBe("Hangi ders için yardım istediğini seç.");
  });

  test("ders adı baştaki/sondaki boşluklardan arınıyor", () => {
    expect(yardimGirdisiDogrula({ dersAdi: "  Türkçe  " }).temiz?.dersAdi).toBe("Türkçe");
  });

  test("sınırdaki mesaj kabul, bir fazlası ret", () => {
    expect(yardimGirdisiDogrula({ dersAdi: "Matematik", mesaj: "a".repeat(YARDIM_MESAJ_EN_FAZLA) }).gecerli).toBe(true);
    const fazla = yardimGirdisiDogrula({ dersAdi: "Matematik", mesaj: "a".repeat(YARDIM_MESAJ_EN_FAZLA + 1) });
    expect(fazla.gecerli).toBe(false);
    expect(fazla.hata).toContain(String(YARDIM_MESAJ_EN_FAZLA));
  });

  test("kazanım boş metinse null", () => {
    expect(yardimGirdisiDogrula({ dersAdi: "Matematik", kazanimId: "  " }).temiz?.kazanimId).toBeNull();
    expect(yardimGirdisiDogrula({ dersAdi: "Matematik", kazanimId: "abc" }).temiz?.kazanimId).toBe("abc");
  });

  test("çok uzun ders adı reddedilir", () => {
    expect(yardimGirdisiDogrula({ dersAdi: "M".repeat(81) }).gecerli).toBe(false);
  });
});

describe("geriAlinabilirMi", () => {
  // Veritabanı delete politikasıyla aynı kural (migration 0129): görüldükten
  // sonra silinemez, öğretmen için beliren iş sessizce kaybolmasın.
  test("yalnız yeni istek geri alınabilir", () => {
    expect(geriAlinabilirMi("yeni")).toBe(true);
    expect(geriAlinabilirMi("goruldu")).toBe(false);
    expect(geriAlinabilirMi("cozuldu")).toBe(false);
  });
});

describe("dersIcinAcikIstekVarMi", () => {
  const istekler = [
    { dersAdi: "Matematik", durum: "goruldu" as YardimDurumu },
    { dersAdi: "Türkçe", durum: "cozuldu" as YardimDurumu },
  ];

  test("açık istek varsa düğme kapatılır", () => {
    expect(dersIcinAcikIstekVarMi("Matematik", istekler)).toBe(true);
  });

  test("çözülmüş istek engel değil", () => {
    expect(dersIcinAcikIstekVarMi("Türkçe", istekler)).toBe(false);
  });

  test("hiç istenmemiş ders serbest", () => {
    expect(dersIcinAcikIstekVarMi("Fen Bilimleri", istekler)).toBe(false);
  });

  // Türkçe büyük/küçük harf: "İNGİLİZCE".toLowerCase() İngilizce kurallarıyla
  // "i̇ngilizce" üretir; tr yerelliği olmadan eşleşme kaçar.
  test("büyük/küçük harf Türkçe kuralıyla eşleşiyor", () => {
    const tr = [{ dersAdi: "İngilizce", durum: "yeni" as YardimDurumu }];
    expect(dersIcinAcikIstekVarMi("İNGİLİZCE", tr)).toBe(true);
    expect(dersIcinAcikIstekVarMi("  ingilizce  ", tr)).toBe(true);
  });
});

describe("yardimMesaji", () => {
  test("hiç istek yokken ne yapılacağını anlatır", () => {
    expect(yardimMesaji([])).toContain("takıldıysan");
  });

  test("hepsi çözülmüşse kapı açık bırakılır", () => {
    expect(yardimMesaji([{ durum: "cozuldu" }])).toContain("tekrar isteyebilirsin");
  });

  test("açık istek sayısı söyleniyor", () => {
    expect(yardimMesaji([{ durum: "yeni" }])).toBe("Bir isteğin öğretmeninde.");
    expect(yardimMesaji([{ durum: "yeni" }, { durum: "goruldu" }])).toBe("2 isteğin öğretmeninde.");
  });
});

describe("durum metinleri", () => {
  test("her durumun etiketi ve açıklaması var", () => {
    for (const d of ["yeni", "goruldu", "cozuldu"] as YardimDurumu[]) {
      expect(YARDIM_DURUM_ETIKET[d], d).toBeTruthy();
      expect(YARDIM_DURUM_ACIKLAMA[d], d).toBeTruthy();
    }
  });

  // §21.2: akademik eksikte alarm dili yok — yardım istemek bir hata değil.
  test("durum metinlerinde başarısızlık/alarm dili yok", () => {
    const hepsi = [...Object.values(YARDIM_DURUM_ETIKET), ...Object.values(YARDIM_DURUM_ACIKLAMA)]
      .join(" ").toLocaleLowerCase("tr");
    for (const yasak of ["başarısız", "hata", "eksik", "yetersiz", "uyarı", "dikkat", "acil"]) {
      expect(hepsi, yasak).not.toContain(yasak);
    }
  });
});
