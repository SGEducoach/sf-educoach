// PDF deneme eşleştirme kuyruğundaki bir satırın yöneticiye gösterilen
// DURUM ETİKETİ — saf mantık.
//
// Kullanıcı isteği (01.10.2026): yönetici ekranı artık yalnız eşleşmeyen
// satırları değil, yüklenen PDF'teki BÜTÜN adları durumlarıyla gösteriyor.
// Etiket seçimi sunucu eyleminin içinde iç içe üçlü koşul olarak duruyordu;
// buraya alındı çünkü karar sırası önemli ve sınanabilir olması gerekiyor:
// yanlış sıra, yöneticinin "sonucu okunamamış" bir satırı eşleştirmeye
// çalışmasına yol açar.

export type PdfEslesmeDurumu = "bekliyor" | "atandi" | "reddedildi";

export type PdfEslesmeDurumEtiketi =
  | "Eşleştirildi"
  | "Reddedildi"
  | "İsmi/sonucu anlaşılmadı"
  | "Ön kayıtta adı var"
  | "Aynı adlı öğrenci var"
  | "Eşleştirme bekliyor";

export interface DurumGirdisi {
  durum: PdfEslesmeDurumu;
  // PDF satırında kaç ders sonucu okunabildi. 0 ise satır eşleştirilemez.
  dersSonucSayisi: number;
  // Kurumun ön kayıt (hesabı açılmamış öğrenci) listesinde bu ad var mı.
  onKayittaVarMi: boolean;
  // Kurumda bu ada BENZEYEN kaç öğrenci var. 0 → kurumun öğrencisi değil
  // gibi görünüyor; 1 → net; >1 → adaş, elle seçim şart.
  benzeyenOgrenciSayisi: number;
}

export function pdfEslesmeDurumEtiketi(g: DurumGirdisi): PdfEslesmeDurumEtiketi {
  // Karar verilmiş satırlar her şeyin önünde: yönetici zaten işlemiş.
  if (g.durum === "atandi") return "Eşleştirildi";
  if (g.durum === "reddedildi") return "Reddedildi";

  // Sonuç okunamadıysa ad kurumda bulunsa bile eşleştirilecek bir şey yok.
  // Bu kontrol ön kayıttan ÖNCE gelmeli; aksi hâlde yönetici "ön kayıtta adı
  // var" etiketine güvenip boş sonuçlu satırı atamaya çalışır.
  if (g.dersSonucSayisi === 0) return "İsmi/sonucu anlaşılmadı";

  if (g.onKayittaVarMi) return "Ön kayıtta adı var";

  // Adaş: canlı veride tek yüklemede iki ayrı "MEHMET ŞAHİN" satırı tek
  // hesaba yazılmıştı. Bu durum artık ayrı etiketle görünüyor, otomatik
  // atama da yapılmıyor (bkz. deneme-pdf-actions.ts adaş koruması).
  if (g.benzeyenOgrenciSayisi > 1) return "Aynı adlı öğrenci var";

  if (g.benzeyenOgrenciSayisi === 0) return "İsmi/sonucu anlaşılmadı";

  return "Eşleştirme bekliyor";
}

// Yöneticinin bu satırda yapabileceği bir iş var mı: listede eylem
// düğmelerinin çizilip çizilmeyeceğini belirler.
export function eslestirilebilirMi(g: DurumGirdisi): boolean {
  return g.durum === "bekliyor" && g.dersSonucSayisi > 0;
}
