// Ortaokul öğrencisinin çalışma kaydı — SAF doğrulama ve özet
// (migration 0132). Yazma: ortaokul-calisma-actions.ts
//
// Bu kayıt YETERLİLİK KARARI İÇERMEZ. Lisede öğrenci "konuyu biliyorum"
// diyordu ve bu hâkimiyete dönüşüyordu; ortaokulda karar öğretmenin
// (kullanıcı kararı 01.10.2026). Burada bilerek bir öz değerlendirme alanı
// yok — eklenmesi o kararı dolaylı olarak öğrenciye geri verirdi.

import type { OrtaokulBolum } from "@/lib/ortaokul-bolum";

export type CalismaTuru = "konu" | "soru";

export const CALISMA_TURU_ETIKET: Record<CalismaTuru, string> = {
  konu: "Konu çalışması",
  soru: "Soru çözümü",
};

// Veritabanı kısıtlarıyla AYNI sınırlar (migration 0132). İkisi ayrışırsa
// öğrenci ham veritabanı hatası görür.
export const EN_FAZLA_DAKIKA = 600;
export const SORU_BASINA_DAKIKA = 2;

export interface CalismaGirdisi {
  bolum: OrtaokulBolum;
  tur: CalismaTuru;
  dersId: string;
  temaId?: string | null;
  tarih: string;
  sureDakika?: number | null;
  dogru?: number | null;
  yanlis?: number | null;
  bos?: number | null;
}

export interface CalismaDogrulama {
  gecerli: boolean;
  hata: string | null;
  temiz: {
    bolum: OrtaokulBolum; tur: CalismaTuru; dersId: string; temaId: string | null;
    tarih: string; sureDakika: number | null;
    dogru: number | null; yanlis: number | null; bos: number | null;
  } | null;
}

function sayi(v: number | null | undefined): number {
  return Number.isFinite(v) && (v as number) > 0 ? Math.floor(v as number) : 0;
}

export function calismaGirdisiDogrula(g: CalismaGirdisi): CalismaDogrulama {
  const ders = String(g.dersId ?? "").trim();
  if (!ders) return { gecerli: false, hata: "Hangi dersi çalıştığını seç.", temiz: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(g.tarih ?? ""))) {
    return { gecerli: false, hata: "Tarih geçerli değil.", temiz: null };
  }

  const sure = sayi(g.sureDakika);
  const tema = String(g.temaId ?? "").trim() || null;

  if (g.tur === "konu") {
    if (sure <= 0) return { gecerli: false, hata: "Ne kadar çalıştığını yaz.", temiz: null };
    if (sure > EN_FAZLA_DAKIKA) {
      return { gecerli: false, hata: `Süre en fazla ${EN_FAZLA_DAKIKA} dakika olabilir.`, temiz: null };
    }
    return {
      gecerli: true, hata: null,
      temiz: { bolum: g.bolum, tur: "konu", dersId: ders, temaId: tema, tarih: g.tarih, sureDakika: sure, dogru: null, yanlis: null, bos: null },
    };
  }

  const dogru = sayi(g.dogru);
  const yanlis = sayi(g.yanlis);
  const bos = sayi(g.bos);
  const toplam = dogru + yanlis + bos;
  if (toplam === 0) return { gecerli: false, hata: "Kaç soru çözdüğünü yaz.", temiz: null };
  if (sure > EN_FAZLA_DAKIKA) {
    return { gecerli: false, hata: `Süre en fazla ${EN_FAZLA_DAKIKA} dakika olabilir.`, temiz: null };
  }
  // BOŞ sorular da sayılır (lise tarafındaki aynı ilke, bkz. migration 0125).
  if (sure > 0 && sure > SORU_BASINA_DAKIKA * toplam) {
    return {
      gecerli: false,
      hata: `${toplam} soru için en fazla ${SORU_BASINA_DAKIKA * toplam} dakika girilebilir.`,
      temiz: null,
    };
  }
  return {
    gecerli: true, hata: null,
    temiz: { bolum: g.bolum, tur: "soru", dersId: ders, temaId: tema, tarih: g.tarih, sureDakika: sure || null, dogru, yanlis, bos },
  };
}

export interface CalismaKaydi {
  id: string;
  bolum: OrtaokulBolum;
  tur: CalismaTuru;
  dersAdi: string;
  temaAdi: string | null;
  tarih: string;
  sureDakika: number | null;
  dogru: number | null;
  yanlis: number | null;
  bos: number | null;
}

export interface CalismaOzeti {
  kayit: number;
  toplamDakika: number;
  toplamSoru: number;
  // Doğruluk YALNIZ soru çözümü varsa anlamlı; yoksa null (yüzde uydurma yok).
  dogrulukYuzde: number | null;
}

export function calismaOzeti(kayitlar: CalismaKaydi[]): CalismaOzeti {
  let toplamDakika = 0;
  let dogru = 0;
  let cevaplanan = 0;
  let toplamSoru = 0;
  for (const k of kayitlar) {
    toplamDakika += k.sureDakika ?? 0;
    const d = k.dogru ?? 0;
    const y = k.yanlis ?? 0;
    const b = k.bos ?? 0;
    toplamSoru += d + y + b;
    dogru += d;
    cevaplanan += d + y;
  }
  return {
    kayit: kayitlar.length,
    toplamDakika,
    toplamSoru,
    dogrulukYuzde: cevaplanan > 0 ? Math.round((dogru / cevaplanan) * 100) : null,
  };
}

// Ekranın üst satırı. Sayı verir, hüküm vermez (§2.1).
export function calismaMesaji(ozet: CalismaOzeti): string {
  if (ozet.kayit === 0) return "Bu bölümde henüz çalışma kaydın yok.";
  const parcalar: string[] = [];
  if (ozet.toplamDakika > 0) parcalar.push(`${ozet.toplamDakika} dakika`);
  if (ozet.toplamSoru > 0) parcalar.push(`${ozet.toplamSoru} soru`);
  if (parcalar.length === 0) return `${ozet.kayit} kayıt girdin.`;
  return `Bu hafta ${parcalar.join(", ")} çalıştın.`;
}
