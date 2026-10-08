// Ortaokul konu yeterliliği — SAF mantık (tasarım belgesi §7.2, migration 0132).
//
// EN ÖNEMLİ KURAL (kullanıcı kararı 01.10.2026): kararı YALNIZ öğretmen verir.
// Lisede öğrencinin kendi beyanı hâkimiyete dönüşüyordu; ortaokulda o yol
// kapalı. Burada bu kural bir "kim yazabilir" fonksiyonu olarak duruyor ki
// ekranlar aynı kaynaktan okusun — yetki kararı ayrıca veritabanında (RLS).

import type { OrtaokulBolum } from "@/lib/ortaokul-bolum";

export type YeterlilikDurumu =
  | "baslamadi"
  | "ogreniyor"
  | "biraz_pratik"
  | "saglamlastirdi"
  | "tekrar_zamani";

// Sıra ilerleme yönünde; ekranda düğmeler bu sırayla çizilir.
export const YETERLILIK_DURUMLARI = [
  "baslamadi", "ogreniyor", "biraz_pratik", "saglamlastirdi", "tekrar_zamani",
] as const satisfies readonly YeterlilikDurumu[];

// §2.1: süreç dili, kimlik etiketi yok. "Başarısız" diye bir durum YOK.
export const YETERLILIK_ETIKET: Record<YeterlilikDurumu, string> = {
  baslamadi: "Henüz başlamadı",
  ogreniyor: "Öğreniyor",
  biraz_pratik: "Biraz daha pratik",
  saglamlastirdi: "Sağlamlaştırdı",
  tekrar_zamani: "Tekrar zamanı",
};

// Öğrencinin kendi ekranında aynı durumlar BİRİNCİ TEKİL anlatılır.
export const YETERLILIK_ETIKET_OGRENCI: Record<YeterlilikDurumu, string> = {
  baslamadi: "Henüz başlamadın",
  ogreniyor: "Öğreniyorsun",
  biraz_pratik: "Biraz daha pratik",
  saglamlastirdi: "Sağlamlaştırdın",
  tekrar_zamani: "Tekrar zamanı",
};

export function yeterlilikDurumuCoz(ham: string | null | undefined): YeterlilikDurumu | null {
  return (YETERLILIK_DURUMLARI as readonly string[]).includes(String(ham))
    ? (ham as YeterlilikDurumu)
    : null;
}

// Yeterliliğe kim karar verebilir. Öğrenci HİÇBİR koşulda veremez.
export function yeterlilikKararVerebilir(rol: string | null | undefined): boolean {
  return rol === "ogretmen" || rol === "mudur" || rol === "admin";
}

export interface YeterlilikKarari {
  temaId: string;
  bolum: OrtaokulBolum;
  durum: YeterlilikDurumu;
  kararVerenAdi: string | null;
  aciklama: string | null;
  guncellenmeTarihi: string;
}

export interface TemaYeterliligi {
  temaId: string;
  temaAdi: string;
  // Karar verilmemiş tema "baslamadi" SAYILMAZ: öğretmen henüz bakmadı
  // demektir, bu iki şey farklı. null = karar yok.
  durum: YeterlilikDurumu | null;
  kararVerenAdi: string | null;
  aciklama: string | null;
}

// Temalar + kararlar → ekranın okuduğu tek liste. Kararsız temalar da
// listede kalır (öğretmenin yapacağı iş onlar).
export function temaYeterlilikleri(
  temalar: { id: string; ad: string | null; kod: string }[],
  kararlar: YeterlilikKarari[],
  bolum: OrtaokulBolum,
): TemaYeterliligi[] {
  const harita = new Map<string, YeterlilikKarari>();
  for (const k of kararlar) {
    if (k.bolum === bolum) harita.set(k.temaId, k);
  }
  return temalar.map((t) => {
    const karar = harita.get(t.id);
    return {
      temaId: t.id,
      temaAdi: t.ad?.trim() ? t.ad : t.kod,
      durum: karar?.durum ?? null,
      kararVerenAdi: karar?.kararVerenAdi ?? null,
      aciklama: karar?.aciklama ?? null,
    };
  });
}

// Öğretmen ekranının üst satırı: kaç temada karar var, kaçı bekliyor.
export interface YeterlilikOzeti {
  toplam: number;
  kararli: number;
  bekleyen: number;
  dagilim: Record<YeterlilikDurumu, number>;
}

export function yeterlilikOzeti(satirlar: TemaYeterliligi[]): YeterlilikOzeti {
  const dagilim = Object.fromEntries(
    YETERLILIK_DURUMLARI.map((d) => [d, 0]),
  ) as Record<YeterlilikDurumu, number>;
  let kararli = 0;
  for (const s of satirlar) {
    if (s.durum) {
      dagilim[s.durum] += 1;
      kararli += 1;
    }
  }
  return { toplam: satirlar.length, kararli, bekleyen: satirlar.length - kararli, dagilim };
}

// Destek gereken temalar: öğretmenin müdahale listesi (§10.2 "müdahale
// önerisi listesi"). Sıra önemli — en çok destek gerekeni başa al.
// Sınıf haritası da AYNI tanımı kullanıyor (bkz. ortaokul-sinif-haritasi.ts);
// "destek gereken" iki yerde ayrı tanımlanırsa ekranlar birbirini yalanlar.
export const DESTEK_SIRASI: YeterlilikDurumu[] = ["tekrar_zamani", "biraz_pratik", "ogreniyor"];

export function destekGerekenler(satirlar: TemaYeterliligi[]): TemaYeterliligi[] {
  return satirlar
    .filter((s) => s.durum !== null && DESTEK_SIRASI.includes(s.durum))
    .sort((a, b) => DESTEK_SIRASI.indexOf(a.durum!) - DESTEK_SIRASI.indexOf(b.durum!));
}
