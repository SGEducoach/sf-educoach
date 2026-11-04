// "Ödev Ver" konu seçimi (öğretmen geri bildirimi 04.11.2026: "konu
// listelemeleri eksik ve çok karmaşık"). Ana konular ve alt başlıkları tek
// düz listede karışık duruyordu. Burada iki adıma ayrılır: önce sınıfa göre
// gruplanmış ana konu, sonra (varsa) o konunun alt başlığı. Ödeve yazılan
// konu adı değişmez: alt başlık seçilirse alt başlık, seçilmezse ana konu.

import { konuSinifi } from "@/lib/mufredat-konulari";

export interface OdevKonuAdayi {
  ders: string;
  konu: string;
  seviye?: string | null;
  /** Alt başlıksa bağlı olduğu ana konu. */
  ustKonu?: string;
}

export interface OdevAnaKonu {
  konu: string;
  altBasliklar: string[];
}

export interface OdevKonuGrubu {
  baslik: string;
  konular: OdevAnaKonu[];
}

function grupAnahtari(seviye: string | null | undefined): string {
  return seviye ?? "";
}

// enUstSinif: ödevin verildiği en üst sınıf (10-A ve 9-B'ye birlikte
// veriliyorsa 10). Alt sınıfların konuları "tekrar" olarak ayrı grupta durur.
export function odevKonuGruplari(adaylar: readonly OdevKonuAdayi[], enUstSinif: number): OdevKonuGrubu[] {
  const anaAdlar = new Set(adaylar.filter((a) => !a.ustKonu).map((a) => a.konu));
  const gruplar = new Map<string, OdevAnaKonu[]>();
  const anaKonuBul = new Map<string, OdevAnaKonu>();
  const ekle = (seviye: string | null | undefined, konu: string) => {
    const anahtar = grupAnahtari(seviye);
    const ana = { konu, altBasliklar: [] as string[] };
    (gruplar.get(anahtar) ?? gruplar.set(anahtar, []).get(anahtar)!).push(ana);
    anaKonuBul.set(konu, ana);
    return ana;
  };
  for (const a of adaylar) {
    // Ana konusu listede olmayan alt başlık (kuruma özel üst konu) kendi başına seçilebilir.
    if (!a.ustKonu || !anaAdlar.has(a.ustKonu)) {
      if (!anaKonuBul.has(a.konu)) ekle(a.seviye, a.konu);
    }
  }
  for (const a of adaylar) {
    if (!a.ustKonu || !anaAdlar.has(a.ustKonu)) continue;
    const ana = anaKonuBul.get(a.ustKonu);
    if (ana && !ana.altBasliklar.includes(a.konu) && a.konu !== ana.konu) ana.altBasliklar.push(a.konu);
  }

  const sinifOf = (anahtar: string) => (anahtar ? konuSinifi(anahtar) : null);
  const sira = (anahtar: string): number => {
    const s = sinifOf(anahtar);
    if (s !== null) return 100 - s; // büyük sınıf önce
    if (anahtar === "TYT") return 200;
    if (anahtar === "AYT") return 201;
    return 300;
  };
  return [...gruplar.entries()]
    .sort((a, b) => sira(a[0]) - sira(b[0]))
    .map(([anahtar, konular]) => {
      const s = sinifOf(anahtar);
      const baslik = s !== null
        ? (s < enUstSinif ? `${anahtar} Konuları (Tekrar)` : `${anahtar} Konuları`)
        : anahtar === "TYT" || anahtar === "AYT" ? `${anahtar} Konuları` : "Kurum Konuları";
      return { baslik, konular };
    });
}
