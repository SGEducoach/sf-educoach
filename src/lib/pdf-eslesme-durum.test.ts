import { describe, expect, test } from "vitest";
import { eslestirilebilirMi, pdfEslesmeDurumEtiketi, yanlisEslesmeSuphesi } from "./pdf-eslesme-durum";
import type { DurumGirdisi } from "./pdf-eslesme-durum";

function girdi(p: Partial<DurumGirdisi> = {}): DurumGirdisi {
  return { durum: "bekliyor", dersSonucSayisi: 9, onKayittaVarMi: false, benzeyenOgrenciSayisi: 1, ...p };
}

describe("pdfEslesmeDurumEtiketi", () => {
  test("karar verilmiş satırlar her şeyin önünde", () => {
    expect(pdfEslesmeDurumEtiketi(girdi({ durum: "atandi" }))).toBe("Eşleştirildi");
    expect(pdfEslesmeDurumEtiketi(girdi({ durum: "reddedildi" }))).toBe("Reddedildi");
    // Atanmış satır, sonucu okunamamış görünse bile "Eşleştirildi" kalır.
    expect(pdfEslesmeDurumEtiketi(girdi({ durum: "atandi", dersSonucSayisi: 0 }))).toBe("Eşleştirildi");
  });

  // Sıra önemli: boş sonuç kontrolü ön kayıttan ÖNCE. Ters sırada yönetici
  // "Ön kayıtta adı var" etiketine güvenip atanamaz bir satırı atamaya
  // çalışır.
  test("sonucu okunamayan satır, adı ön kayıtta olsa bile eşleştirilemez diye işaretlenir", () => {
    expect(pdfEslesmeDurumEtiketi(girdi({ dersSonucSayisi: 0, onKayittaVarMi: true })))
      .toBe("İsmi/sonucu anlaşılmadı");
  });

  test("ön kayıtta adı varsa öyle söylenir", () => {
    expect(pdfEslesmeDurumEtiketi(girdi({ onKayittaVarMi: true }))).toBe("Ön kayıtta adı var");
  });

  // Canlı veride görülen olay: tek yüklemede iki ayrı "MEHMET ŞAHİN" satırı
  // tek hesaba yazılmıştı. Adaş artık ayrı etiketle görünür.
  test("kurumda aynı ada benzeyen birden fazla öğrenci varsa adaş uyarısı", () => {
    expect(pdfEslesmeDurumEtiketi(girdi({ benzeyenOgrenciSayisi: 2 }))).toBe("Aynı adlı öğrenci var");
    expect(pdfEslesmeDurumEtiketi(girdi({ benzeyenOgrenciSayisi: 5 }))).toBe("Aynı adlı öğrenci var");
  });

  test("kurumda benzeyen ad yoksa satır anlaşılmadı sayılır", () => {
    expect(pdfEslesmeDurumEtiketi(girdi({ benzeyenOgrenciSayisi: 0 }))).toBe("İsmi/sonucu anlaşılmadı");
  });

  test("tek benzeyen öğrenci + okunmuş sonuç = eşleştirmeye hazır", () => {
    expect(pdfEslesmeDurumEtiketi(girdi())).toBe("Eşleştirme bekliyor");
  });

  test("ön kayıt, adaş kontrolünün önünde gelir", () => {
    // Hem ön kayıtta adı var hem kurumda iki benzer öğrenci: ön kayıt daha
    // belirgin bir ipucu (hesabı henüz açılmamış öğrenci).
    expect(pdfEslesmeDurumEtiketi(girdi({ onKayittaVarMi: true, benzeyenOgrenciSayisi: 2 })))
      .toBe("Ön kayıtta adı var");
  });
});

describe("eslestirilebilirMi", () => {
  test("yalnız bekleyen ve sonucu okunmuş satır eşleştirilebilir", () => {
    expect(eslestirilebilirMi(girdi())).toBe(true);
    expect(eslestirilebilirMi(girdi({ dersSonucSayisi: 0 }))).toBe(false);
    expect(eslestirilebilirMi(girdi({ durum: "atandi" }))).toBe(false);
    expect(eslestirilebilirMi(girdi({ durum: "reddedildi" }))).toBe(false);
  });

  test("adaş satırı eşleştirilebilir — yönetici elle seçecek", () => {
    // Otomatik atama yapılmıyor ama yöneticinin elle seçmesi tam olarak
    // beklenen çözüm; düğmeler kapatılmamalı.
    expect(eslestirilebilirMi(girdi({ benzeyenOgrenciSayisi: 3 }))).toBe(true);
  });
});

// Vakalar 08.10.2026 tarihli GERÇEK 4K yüklemesinden (108 satır, 43 eşleşme).
describe("yanlisEslesmeSuphesi", () => {
  test("adaşın netleri yazılmaz: numara da sınıf da tutmuyor", () => {
    // PDF'te iki MEHMET ŞAHİN: 341/12-C ve 325/12-D. Kurumdaki öğrenci
    // 325/12-D; 341 satırı ona yazılmıştı.
    expect(yanlisEslesmeSuphesi({ ogrenciNo: 341, sinif: "12-C" }, { okulNo: "325", sinif: "12-D" })).toBe(true);
    // Doğru satır engellenmemeli.
    expect(yanlisEslesmeSuphesi({ ogrenciNo: 325, sinif: "12-D" }, { okulNo: "325", sinif: "12-D" })).toBe(false);
  });

  test("12-D'li satır 11-B'li adaşa yazılmaz", () => {
    expect(yanlisEslesmeSuphesi({ ogrenciNo: 253, sinif: "12-D" }, { okulNo: "225", sinif: "11-B" })).toBe(true);
  });

  test("numara tutuyorsa sınıf farkı engel değil (yayınevinin 12-XX kovası)", () => {
    // Kevser Daş: PDF 265/12-XX, hesap 265/12-D — eşleşme DOĞRU.
    expect(yanlisEslesmeSuphesi({ ogrenciNo: 265, sinif: "12-XX" }, { okulNo: "265", sinif: "12-D" })).toBe(false);
  });

  test("sınıf tutuyorsa numara farkı engel değil", () => {
    // İki sistemin numaraları her zaman örtüşmüyor; 43 eşleşmenin 4'ünde
    // tutmuyordu ve üçü doğru eşleşmeydi.
    expect(yanlisEslesmeSuphesi({ ogrenciNo: 238, sinif: "12-D" }, { okulNo: "234", sinif: "12-D" })).toBe(false);
    expect(yanlisEslesmeSuphesi({ ogrenciNo: 2269, sinif: "12-D" }, { okulNo: "269", sinif: "12-D" })).toBe(false);
  });

  test("bilgi eksikse karar verilmez, eskisi gibi yazılır", () => {
    expect(yanlisEslesmeSuphesi({ ogrenciNo: 0, sinif: "12-A" }, { okulNo: "325", sinif: "12-D" })).toBe(false);
    expect(yanlisEslesmeSuphesi({ ogrenciNo: 341, sinif: undefined }, { okulNo: "325", sinif: "12-D" })).toBe(false);
    expect(yanlisEslesmeSuphesi({ ogrenciNo: 341, sinif: "12-C" }, { okulNo: null, sinif: "12-D" })).toBe(false);
    expect(yanlisEslesmeSuphesi({ ogrenciNo: 341, sinif: "12-C" }, { okulNo: "325", sinif: null })).toBe(false);
  });
});
