// Ortaokul "Yardım İste" — SAF doğrulama ve metinler (tasarım belgesi §5.1
// madde 7, §22.1). Sorgular/yazma: ortaokul-yardim-sorgu.ts, migration 0129.
//
// Ürün kararı: mesaj ZORUNLU DEĞİL. Yazı yazmak zorunda kalan öğrenci yardım
// istemekten vazgeçiyor; dersi seçip göndermek yetmeli (§2.2). Yazarsa da
// üst sınır var — çocuktan uzun serbest metin toplamak veri
// minimizasyonuna aykırı (§17.1).

export const YARDIM_MESAJ_EN_FAZLA = 500;
export const YARDIM_DERS_EN_FAZLA = 80;

export type YardimDurumu = "yeni" | "goruldu" | "cozuldu";

export interface YardimIstegi {
  id: string;
  dersAdi: string;
  kazanimKodu: string | null;
  kazanimMetni: string | null;
  mesaj: string | null;
  durum: YardimDurumu;
  ilgilenenAdi: string | null;
  yanit: string | null;
  olusturmaTarihi: string;
}

// §21.2: akademik eksikte kırmızı yok. "Destek gerekli" turuncu/sıcak tonla,
// dil ise "Birlikte bakalım" kalıbında.
export const YARDIM_DURUM_ETIKET: Record<YardimDurumu, string> = {
  yeni: "İsteğin iletildi",
  goruldu: "Öğretmenin gördü",
  cozuldu: "Birlikte baktınız",
};

export const YARDIM_DURUM_ACIKLAMA: Record<YardimDurumu, string> = {
  // "Bildirim gitti" diyoruz çünkü Faz 1'de teslim yolu bildirim: öğretmenin
  // ayrı bir "yardım isteyenler" ekranı henüz yok (Faz 2).
  yeni: "Öğretmenine bildirim gitti. İstersen geri alabilirsin.",
  goruldu: "Öğretmenin isteğini üstlendi.",
  cozuldu: "Bu konu kapandı. Yine takılırsan tekrar isteyebilirsin.",
};

export interface YardimGirdisi {
  dersAdi: string;
  kazanimId?: string | null;
  mesaj?: string | null;
}

export interface YardimDogrulama {
  gecerli: boolean;
  hata: string | null;
  // Veritabanına yazılacak temizlenmiş biçim.
  temiz: { dersAdi: string; kazanimId: string | null; mesaj: string | null } | null;
}

export function yardimGirdisiDogrula(girdi: YardimGirdisi): YardimDogrulama {
  const ders = String(girdi.dersAdi ?? "").trim();
  if (ders.length < 2) {
    return { gecerli: false, hata: "Hangi ders için yardım istediğini seç.", temiz: null };
  }
  if (ders.length > YARDIM_DERS_EN_FAZLA) {
    return { gecerli: false, hata: "Ders adı çok uzun.", temiz: null };
  }

  // Boş/yalnız boşluk mesaj = mesaj yok. Veritabanındaki kısıt da boş metni
  // reddediyor, bu yüzden NULL'a çevirmek şart.
  const hamMesaj = String(girdi.mesaj ?? "").trim();
  if (hamMesaj.length > YARDIM_MESAJ_EN_FAZLA) {
    return {
      gecerli: false,
      hata: `Mesajın çok uzun. En fazla ${YARDIM_MESAJ_EN_FAZLA} karakter yazabilirsin.`,
      temiz: null,
    };
  }

  const kazanim = String(girdi.kazanimId ?? "").trim();
  return {
    gecerli: true,
    hata: null,
    temiz: { dersAdi: ders, kazanimId: kazanim || null, mesaj: hamMesaj || null },
  };
}

// Öğrenci yalnız "yeni" isteğini geri alabilir (migration 0129 delete
// politikası). Ekranda düğmeyi gizlemek için aynı kural burada da duruyor;
// yetki kararı sunucuda/veritabanında, bu yalnız görünürlük.
export function geriAlinabilirMi(durum: YardimDurumu): boolean {
  return durum === "yeni";
}

// Aynı ders için açık istek varsa ikinci kez gönderilmesin: veritabanı da
// reddediyor (tek açık istek indeksi) ama öğrenciye ham hata göstermek yerine
// düğmeyi baştan kapatıyoruz.
export function acikIstekDersleri(istekler: Pick<YardimIstegi, "dersAdi" | "durum">[]): Set<string> {
  const set = new Set<string>();
  for (const i of istekler) {
    if (i.durum !== "cozuldu") set.add(i.dersAdi.toLocaleLowerCase("tr"));
  }
  return set;
}

export function dersIcinAcikIstekVarMi(
  dersAdi: string,
  istekler: Pick<YardimIstegi, "dersAdi" | "durum">[],
): boolean {
  return acikIstekDersleri(istekler).has(dersAdi.trim().toLocaleLowerCase("tr"));
}

// Müfredattaki ders adı ile öğretmen branşı aynı yazılmıyor: müfredatta
// "Din Kültürü ve Ahlak Bilgisi", branş listesinde "Din Kültürü". İsteğin
// doğru öğretmene bildirilmesi bu eşlemeye bağlı — eşleşmeyen ders sessizce
// kimseye gitmesin diye burada açıkça yazıldı (ORTAOKUL_BRANSLARI, kademe.ts).
const DERS_BRANS_ESLEMESI: Record<string, string> = {
  "din kültürü ve ahlak bilgisi": "Din Kültürü",
};

export function dersinBransi(dersAdi: string): string {
  const ham = dersAdi.trim();
  return DERS_BRANS_ESLEMESI[ham.toLocaleLowerCase("tr")] ?? ham;
}

// Ekranın üstündeki tek cümle. Sayı verir, öğrenciyi etiketlemez.
export function yardimMesaji(istekler: Pick<YardimIstegi, "durum">[]): string {
  const acik = istekler.filter((i) => i.durum !== "cozuldu").length;
  if (istekler.length === 0) return "Bir konuda takıldıysan öğretmenine buradan haber verebilirsin.";
  if (acik === 0) return "Açık isteğin yok. Yine takılırsan tekrar isteyebilirsin.";
  return acik === 1 ? "Bir isteğin öğretmeninde." : `${acik} isteğin öğretmeninde.`;
}
