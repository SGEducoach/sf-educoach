// Rehber Radarı Adım 3 — gerekçeli bayraklar (kullanıcı kararı 07.10.2026:
// "en efektif ve rasyonel olan seçeneklerle").
//
// İLKE: bayrak bir SEBEP söyler, puan vermez. Adım 1 ve 2 boyunca kural
// şuydu — sayıyı gerekçesiyle göster, yeterli veri yoksa uydurma. Tek bir
// "risk puanı" nedeni gizlediği için bilinçli olarak YAPILMADI. Sıralama
// ağırlığa göre yapılır (kolaylık), ekranda yalnız gerekçeler durur.
//
// EŞİKLER NEDEN BUNLAR (Elbistan, 190 öğrenci, 07.10.2026 ölçümü):
//   sessizlik 14 gün  -> 51 kişi (%27): rehberin elle tutabileceği sayı.
//                        7 gün 100+ üretir ve eyleme dönmez, 21 gün bir ayı
//                        kaçırır. Ayrıca iki haftalık giriş döngüsüne denk.
//   net düşüşü 5 net  -> yön oku zaten ±%2 bantla YÖNÜ söylüyor; bayrak
//                        EYLEM talep ettiği için büyüklük tabanı şart.
//                        Tabansız bırakılırsa normal dalgalanma düzinelerce
//                        bayrak yakar.
//   görev %70 + min 3 -> okul genelinde açık oran %32 (394/1241), %70 gerçek
//                        aykırıyı yakalar. Min 3 olmadan tek görevi olup
//                        yapmayan herkes %100 görünür (yanıltıcı).
//
// ELENEN ADAYLAR (ölçüldü, ayırt etmedikleri için önerilmedi):
//   manipülasyon kaydı -> Elbistan'da 0 kayıt; bayrak hep boş yanar.
//   veli bağlı değil   -> 186/190 (%98); herkese yanan şey bayrak değil,
//                         gürültüdür.

export const SESSIZ_GUN = 14;
export const NET_DUSUS_ESIGI = 5;
export const GOREV_ORAN_ESIGI = 0.7;
export const GOREV_MIN_SAYI = 3;
export const BAYRAK_SINIRI = 3;

export type BayrakKodu =
  | "hesap-acilmamis"
  | "hic-veri-yok"
  | "sessiz"
  | "net-dususu"
  | "gorev-birikmis";

export interface Bayrak {
  kod: BayrakKodu;
  metin: string;
  // Sıralama ağırlığı — EKRANDA GÖSTERİLMEZ. Büyük olan daha acil.
  agirlik: number;
  // Rehberin yapacağı iş farklı olduğu için ton da farklı.
  seviye: "kritik" | "uyari";
}

// Bayrak hesabı için gereken asgari alanlar. KapsamSatiri'nin tamamına
// bağlanmıyor ki bu modül saf ve test edilebilir kalsın.
export interface BayrakGirdisi {
  girisYapmisMi: boolean;
  sonHareketGun: number | null; // null = hiç iz yok
  denemeSayisi: number;
  netDegisimi: number | null; // son net - öncekilerin ortalaması; eksi = düşüş
  acikGorev: number;
  gorevToplam: number;
}

export function bayraklariBelirle(g: BayrakGirdisi): Bayrak[] {
  const bayraklar: Bayrak[] = [];

  // En ağır ikisi: "hesabını hiç açmamış" ile "hiç veri yok" AYRI sinyaller.
  // 88 kişi hiç giriş yapmamış ama veri yoklar 46 — yani ~58 öğrencinin
  // verisi var, kendisi sisteme hiç girmemiş (veri öğretmen girişinden ve
  // deneme PDF eşleştirmesinden geliyor). Rehber için kritik ayrım:
  // "sayıları var ama çocuk sistemde yok".
  if (!g.girisYapmisMi) {
    bayraklar.push({ kod: "hesap-acilmamis", metin: "Hesabını hiç açmamış", agirlik: 100, seviye: "kritik" });
  }

  if (g.sonHareketGun === null) {
    bayraklar.push({ kod: "hic-veri-yok", metin: "Hiç veri girmemiş", agirlik: 90, seviye: "kritik" });
  } else if (g.sonHareketGun >= SESSIZ_GUN) {
    // Girişi varsa "açtı ama bırakmış" demektir; müdahalesi erişimden farklı.
    bayraklar.push({
      kod: "sessiz",
      metin: `${g.sonHareketGun} gündür veri girmiyor`,
      agirlik: 70 + Math.min(g.sonHareketGun, 60) / 10,
      seviye: "uyari",
    });
  }

  // Yön için 2 deneme yeterliydi; BAYRAK için büyüklük de gerekiyor.
  if (g.denemeSayisi >= 2 && g.netDegisimi !== null && g.netDegisimi <= -NET_DUSUS_ESIGI) {
    bayraklar.push({
      kod: "net-dususu",
      metin: `Net ${Math.abs(Math.round(g.netDegisimi * 10) / 10)} puan düştü`,
      agirlik: 60,
      seviye: "uyari",
    });
  }

  if (g.gorevToplam >= GOREV_MIN_SAYI && g.acikGorev / g.gorevToplam >= GOREV_ORAN_ESIGI) {
    const yuzde = Math.round((g.acikGorev / g.gorevToplam) * 100);
    bayraklar.push({
      kod: "gorev-birikmis",
      metin: `Görevlerinin %${yuzde}'i açık`,
      agirlik: 50,
      seviye: "uyari",
    });
  }

  return bayraklar.sort((a, b) => b.agirlik - a.agirlik);
}

// Satırın sıralama ağırlığı: en ağır bayrak baskın, kalanlar küçük katkı.
// Böylece "tek kritik bayrak" , "üç hafif bayrak"tan önce gelir — rehber
// önce gerçekten kopmuş öğrenciyi görür.
export function satirAgirligi(bayraklar: Bayrak[]): number {
  if (bayraklar.length === 0) return 0;
  const [en, ...kalan] = bayraklar;
  return en.agirlik * 1000 + kalan.reduce((t, b) => t + b.agirlik, 0);
}

export interface RadarOzeti {
  toplam: number;
  bayrakli: number;
  hesapAcilmamis: number;
  hicVeriYok: number;
  sessiz: number;
  netDususu: number;
  gorevBirikmis: number;
}

export function ozetHesapla(bayrakListeleri: Bayrak[][]): RadarOzeti {
  const say = (kod: BayrakKodu) => bayrakListeleri.filter((b) => b.some((x) => x.kod === kod)).length;
  return {
    toplam: bayrakListeleri.length,
    bayrakli: bayrakListeleri.filter((b) => b.length > 0).length,
    hesapAcilmamis: say("hesap-acilmamis"),
    hicVeriYok: say("hic-veri-yok"),
    sessiz: say("sessiz"),
    netDususu: say("net-dususu"),
    gorevBirikmis: say("gorev-birikmis"),
  };
}
