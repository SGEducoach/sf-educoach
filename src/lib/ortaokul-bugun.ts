// Ortaokul "Bugün" ekranının SAF önceliklendirme mantığı (tasarım belgesi §6).
//
// Ürün hedefi: öğrenci her girişte "şimdi ne yapmalıyım?" sorusuna on saniye
// içinde yanıt bulsun. Bunun için ekranda AYNI ANDA EN FAZLA ÜÇ iş gösterilir
// (§2.2 bilişsel yük sınırı) ve her kartta TEK eylem olur.
//
// Sunucuya bağlı değil; sıralama kuralı veritabanı olmadan test edilebilsin
// diye ayrı tutuldu. Sorgular: ortaokul-bugun-sorgu.ts

export const EN_FAZLA_KART = 3;

export type BugunKartTuru = "bugun-teslim" | "gecikmis" | "yarin" | "yaklasan";

export interface BugunGorevi {
  atamaId: string;
  tur: string;
  ders: string;
  konu: string | null;
  // Öğretmenin konu altına yazdığı alt başlık/not (gorevler.aciklama).
  // Öğrencinin işi tam olarak anlaması buna bağlı olabiliyor ("sayfa 42-48").
  aciklama: string | null;
  tarih: string;          // görevin günü (YYYY-MM-DD)
  sonTarih: string | null;
  hedefSoruSayisi: number | null;
  hedefDakika: number | null;
  ogretmenAdi: string | null;
  tamamlandi: boolean;
}

export interface BugunKarti {
  atamaId: string;
  tur: BugunKartTuru;
  baslik: string;
  ders: string;
  konu: string | null;
  // "Bugün" / "Yarın" / "2 gün gecikti" — yaşa uygun ifade; ham tarih değil.
  zamanEtiketi: string;
  sureEtiketi: string | null;
  ogretmenAdi: string | null;
  aciklama: string | null;
  eylem: string;
}

// Tahmini süre aralığı: "10-15 dk". Öğretmen dakika yazmadıysa soru
// sayısından kabaca türetilir (soru başına ~2 dk, veri girişi üst sınırıyla
// aynı ilke).
export function sureEtiketi(hedefDakika: number | null, hedefSoru: number | null): string | null {
  const dakika = hedefDakika ?? (hedefSoru ? hedefSoru * 2 : null);
  if (!dakika || dakika <= 0) return null;
  const alt = Math.max(5, Math.round((dakika * 0.8) / 5) * 5);
  const ust = Math.max(alt + 5, Math.round((dakika * 1.2) / 5) * 5);
  return `${alt}-${ust} dk`;
}

function gunFarki(tarih: string, bugun: string): number {
  const a = Date.parse(`${tarih}T00:00:00Z`);
  const b = Date.parse(`${bugun}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((a - b) / 86400000);
}

export function zamanEtiketi(fark: number): string {
  if (fark === 0) return "Bugün";
  if (fark === 1) return "Yarın";
  if (fark > 1) return `${fark} gün sonra`;
  const gecikme = Math.abs(fark);
  return gecikme === 1 ? "Dün kalmış" : `${gecikme} gün gecikti`;
}

function kartTuru(fark: number): BugunKartTuru {
  if (fark < 0) return "gecikmis";
  if (fark === 0) return "bugun-teslim";
  if (fark === 1) return "yarin";
  return "yaklasan";
}

// Sıralama (§6.2): önce bugün teslim edilecek, sonra gecikmiş, sonra yarın,
// sonra ileri tarihli. Gecikmiş iş bugünkünün ÖNÜNE geçmez — öğrenciyi
// borç hissiyle karşılamamak için; ama ikinci sırada durur, kaybolmaz.
const SIRA: Record<BugunKartTuru, number> = {
  "bugun-teslim": 0,
  "gecikmis": 1,
  "yarin": 2,
  "yaklasan": 3,
};

const EYLEM: Record<BugunKartTuru, string> = {
  "bugun-teslim": "Başla",
  "gecikmis": "Şimdi yap",
  "yarin": "Hazırlan",
  "yaklasan": "Göz at",
};

export function bugunKartlari(gorevler: BugunGorevi[], bugun: string): BugunKarti[] {
  // Gün farkı sıralama için gerekli ama karta yazılmıyor; kartla yan yana
  // taşınıp sıralamadan sonra bırakılıyor.
  const adaylar: { fark: number; kart: BugunKarti }[] = [];
  for (const g of gorevler) {
    if (g.tamamlandi) continue;
    // Son tarih varsa asıl ölçüt odur; yoksa görevin günü.
    const fark = gunFarki(g.sonTarih ?? g.tarih, bugun);
    // İleri tarihli işler bugünü kalabalıklaştırmasın: en fazla bir hafta.
    if (fark > 7) continue;
    const tur = kartTuru(fark);
    adaylar.push({
      fark,
      kart: {
        atamaId: g.atamaId,
        tur,
        baslik: g.konu?.trim() ? g.konu : g.tur,
        ders: g.ders,
        konu: g.konu,
        zamanEtiketi: zamanEtiketi(fark),
        sureEtiketi: sureEtiketi(g.hedefDakika, g.hedefSoruSayisi),
        ogretmenAdi: g.ogretmenAdi,
        aciklama: g.aciklama?.trim() ? g.aciklama.trim() : null,
        eylem: EYLEM[tur],
      },
    });
  }

  return adaylar
    .sort((a, b) => (SIRA[a.kart.tur] - SIRA[b.kart.tur]) || (a.fark - b.fark))
    .slice(0, EN_FAZLA_KART)
    .map((a) => a.kart);
}

// Günün kısa mesajı: sonuç değil SÜREÇ övülür (§2.1). Kimlik etiketi
// ("tembel", "geride") kullanılmaz.
export function gunMesaji(bekleyen: number, tamamlanan: number): string {
  if (bekleyen === 0 && tamamlanan > 0) return "Bugünün işlerini bitirdin. İstersen tekrar yapabilirsin.";
  if (bekleyen === 0) return "Bugün için bekleyen bir işin yok.";
  if (tamamlanan > 0) return `${tamamlanan} işi bitirdin, ${bekleyen} tane kaldı.`;
  return bekleyen === 1 ? "Bugün tek bir işin var. Küçük bir başlangıç yeter." : `Bugün ${bekleyen} işin var. Birinden başla.`;
}
