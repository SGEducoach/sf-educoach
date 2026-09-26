// Konu (kazanım) → soru numarası çıkarımı (kullanıcı isteği, 25.09.2026:
// "elle konu eşleştirmede kaçıncı soru olduğu da öneride yer alsın").
// Karnenin konu sayfası soru numarası VERMİYOR, yalnızca konu başına S/D/Y.
// Ama 1. sayfada her öğrencinin soru soru cevabı var: bir konunun D/Y
// sayıları TÜM öğrencilerde hangi soru kümesinin D/Y sayılarıyla tutuyorsa
// konu o sorulardır. Tek çözüm yoksa (ör. herkesin doğru yaptığı sorular
// birbirinden ayırt edilemez) adaylar "belirsiz" olarak döner. Saf modül.

import type { KarneDersOrtalamasi, KarneTestCevaplari, SoruDurumu } from "@/lib/karne-birinci-sayfa";

export interface OgrenciKarneVerisi {
  ogrenciId: string;
  dersler: KarneDersOrtalamasi[];
  testler: KarneTestCevaplari[];
  kazanimlar: { ders: string; kazanimMetni: string; soru: number; dogru: number; yanlis: number }[];
}

export interface KazanimSorulari {
  ders: string;
  kazanimMetni: string;
  test: string;
  soruSayisi: number;
  // A/B kitapçıklarında soru sırası farklı — çıkarım kitapçık başına ayrı.
  kitapcik: string | null;
  // Kesin çözüm varsa sorular; birden çok çözüm varsa tüm adayların birleşimi.
  sorular: number[];
  kesin: boolean;
}

const ALT_TOPLAM = /^(TYT|AYT)\s/;
const SECMELI = /\(Se[çc]meli\)$/;
const EN_FAZLA_KOMBINASYON = 60_000;
// Tek bir konu için tutulacak en fazla aday küme (ortak çözümde kullanılır).
const COZUM_SINIRI = 200;

// Karnenin ders tablosundan her dersin hangi testte, hangi soru aralığında
// olduğunu çıkarır. Sıra: dersler, sonra o testin alt toplamı ("TYT Sosyal");
// tek dersli testte alt toplam yok ("Türkçe" ↔ "TYT Türkçe"). Seçmeli ders bir
// önceki dersle AYNI aralığı paylaşır (öğrenci ikisinden birini çözer).
export function dersAraliklari(dersler: KarneDersOrtalamasi[], testler: KarneTestCevaplari[]): Map<string, { test: string; sorular: number[] }> {
  const sonuc = new Map<string, { test: string; sorular: number[] }>();
  const testAdlari = testler.map((t) => t.test);
  let bekleyen: KarneDersOrtalamasi[] = [];
  const yerlestir = (test: string, grup: KarneDersOrtalamasi[]) => {
    let no = 1;
    let onceki: number[] = [];
    for (const d of grup) {
      if (SECMELI.test(d.ders)) { sonuc.set(d.ders, { test, sorular: onceki }); continue; }
      onceki = Array.from({ length: d.soru }, (_, i) => no + i);
      sonuc.set(d.ders, { test, sorular: onceki });
      no += d.soru;
    }
  };
  for (const d of dersler) {
    if (ALT_TOPLAM.test(d.ders)) {
      if (testAdlari.includes(d.ders)) yerlestir(d.ders, bekleyen);
      bekleyen = [];
      continue;
    }
    const tekTest = testAdlari.find((t) => t.replace(ALT_TOPLAM, "") === d.ders);
    if (tekTest && bekleyen.length === 0) { yerlestir(tekTest, [d]); continue; }
    bekleyen.push(d);
  }
  return sonuc;
}

function* kombinasyonlar(dizi: number[], k: number, bas = 0, secili: number[] = []): Generator<number[]> {
  if (secili.length === k) { yield secili; return; }
  for (let i = bas; i <= dizi.length - (k - secili.length); i++) yield* kombinasyonlar(dizi, k, i + 1, [...secili, dizi[i]]);
}

function kombinasyonSayisi(n: number, k: number): number {
  let s = 1;
  for (let i = 0; i < k; i++) s = (s * (n - i)) / (i + 1);
  return s;
}

// Öğrenciler kitapçık türüne (A/B…) göre ayrılıp her grup için ayrı çıkarım
// yapılır — gerçek veride tek grupta bakınca 61 konudan yalnızca 11'i
// çözülüyordu, çünkü aynı konu kitapçıklarda farklı numaradaydı.
export function kazanimSorulariniCikar(ogrenciler: OgrenciKarneVerisi[]): KazanimSorulari[] {
  const gruplar = new Map<string, OgrenciKarneVerisi[]>();
  for (const o of ogrenciler) {
    const kitapcik = o.testler.find((t) => t.kitapcik)?.kitapcik ?? "";
    gruplar.set(kitapcik, [...(gruplar.get(kitapcik) ?? []), o]);
  }
  return [...gruplar.entries()].flatMap(([kitapcik, grup]) =>
    kitapcikIcinCikar(grup).map((s) => ({ ...s, kitapcik: kitapcik || null })));
}

function kitapcikIcinCikar(ogrenciler: OgrenciKarneVerisi[]): Omit<KazanimSorulari, "kitapcik">[] {
  const ornek = ogrenciler.find((o) => o.dersler.length > 0 && o.testler.length > 0);
  if (!ornek) return [];
  const araliklar = dersAraliklari(ornek.dersler, ornek.testler);

  // durum[öğrenci][test][soru]
  const durum = ogrenciler.map((o) => new Map(o.testler.map((t) => [t.test, new Map(t.sorular.map((s) => [s.no, s.durum]))])));
  const sonuclar: Omit<KazanimSorulari, "kitapcik">[] = [];

  for (const [ders, aralik] of araliklar) {
    // Bu dersin kazanımları (tüm öğrencilerde aynı liste beklenir).
    const kazanimAdlari = [...new Set(ogrenciler.flatMap((o) => o.kazanimlar.filter((k) => k.ders === ders).map((k) => k.kazanimMetni)))];
    // Bu dersi hiç çözmemiş öğrenci (ör. Din yerine Felsefe (Seçmeli) çözen —
    // ikisi aynı soruları paylaşıyor) karşılaştırmaya katılmaz.
    const dersiCozdu = ogrenciler.map((o) => o.kazanimlar.some((k) => k.ders === ders && k.dogru + k.yanlis > 0));
    const hedefler = kazanimAdlari.map((ad) => {
      const ilk = ogrenciler.flatMap((o) => o.kazanimlar).find((k) => k.ders === ders && k.kazanimMetni === ad)!;
      return {
        ad, soru: ilk.soru,
        beklenen: ogrenciler.map((o, i) => {
          const k = o.kazanimlar.find((x) => x.ders === ders && x.kazanimMetni === ad);
          return k && dersiCozdu[i] ? { d: k.dogru, y: k.yanlis } : null;
        }),
      };
    });

    const tutuyorMu = (sorular: number[], beklenen: ({ d: number; y: number } | null)[]) =>
      beklenen.every((b, i) => {
        if (!b) return true;
        const test = durum[i].get(aralik.test);
        if (!test) return true;
        let d = 0;
        let y = 0;
        for (const no of sorular) {
          const s: SoruDurumu | undefined = test.get(no);
          if (s === "dogru") d++;
          else if (s === "yanlis") y++;
        }
        return d === b.d && y === b.y;
      });

    let kalan = [...aralik.sorular];
    let cozulmemis = [...hedefler].sort((a, b) => a.soru - b.soru);
    const belirsizler = new Map<string, Set<number>>();
    const cozumListeleri = new Map<string, number[][]>();
    let ilerleme = true;
    while (ilerleme && cozulmemis.length > 0) {
      ilerleme = false;
      for (const h of [...cozulmemis]) {
        if (h.soru > kalan.length) continue;
        // Kalan tek konu kalan tüm soruları kapsıyorsa doğrudan ona aittir.
        if (cozulmemis.length === 1 && h.soru === kalan.length && tutuyorMu(kalan, h.beklenen)) {
          sonuclar.push({ ders, kazanimMetni: h.ad, test: aralik.test, soruSayisi: h.soru, sorular: [...kalan], kesin: true });
          kalan = [];
          cozulmemis = [];
          ilerleme = true;
          break;
        }
        if (kombinasyonSayisi(kalan.length, h.soru) > EN_FAZLA_KOMBINASYON) continue;
        const cozumler: number[][] = [];
        for (const k of kombinasyonlar(kalan, h.soru)) {
          if (tutuyorMu(k, h.beklenen)) cozumler.push(k);
          if (cozumler.length > COZUM_SINIRI) break;
        }
        if (cozumler.length <= COZUM_SINIRI) cozumListeleri.set(h.ad, cozumler);
        if (cozumler.length === 1) {
          sonuclar.push({ ders, kazanimMetni: h.ad, test: aralik.test, soruSayisi: h.soru, sorular: cozumler[0], kesin: true });
          kalan = kalan.filter((n) => !cozumler[0].includes(n));
          cozulmemis = cozulmemis.filter((x) => x !== h);
          belirsizler.delete(h.ad);
          ilerleme = true;
        } else if (cozumler.length > 1) {
          belirsizler.set(h.ad, new Set(cozumler.flat()));
        }
      }
    }
    // Ortak çözüm: birden çok konu tek başına belirsiz kaldıysa (ör. Türkçe'de
    // birbirine benzeyen paragraf soruları), en büyük konu dışındakilerin aday
    // kümeleri birlikte denenir; kümeler çakışmamalı ve geriye kalan sorular
    // en büyük konuyla tutmalı. Tek geçerli bileşim varsa hepsi kesinleşir.
    if (cozulmemis.length > 1 && cozulmemis.reduce((t, h) => t + h.soru, 0) === kalan.length) {
      const enBuyuk = cozulmemis.reduce((a, b) => (b.soru > a.soru ? b : a));
      const digerleri = cozulmemis.filter((h) => h !== enBuyuk);
      const listeler = digerleri.map((h) => cozumListeleri.get(h.ad));
      if (listeler.every((l): l is number[][] => !!l && l.length > 0)
        && listeler.reduce((t, l) => t * l.length, 1) <= EN_FAZLA_KOMBINASYON) {
        const gecerliler: { secim: number[][]; geriKalan: number[] }[] = [];
        const dene = (i: number, secim: number[][], kullanilan: Set<number>) => {
          if (gecerliler.length > 1) return;
          if (i === listeler.length) {
            const geriKalan = kalan.filter((n) => !kullanilan.has(n));
            if (tutuyorMu(geriKalan, enBuyuk.beklenen)) gecerliler.push({ secim, geriKalan });
            return;
          }
          for (const aday of listeler[i]) {
            if (aday.some((n) => kullanilan.has(n))) continue;
            dene(i + 1, [...secim, aday], new Set([...kullanilan, ...aday]));
          }
        };
        dene(0, [], new Set());
        if (gecerliler.length === 1) {
          const { secim, geriKalan } = gecerliler[0];
          digerleri.forEach((h, i) => sonuclar.push({ ders, kazanimMetni: h.ad, test: aralik.test, soruSayisi: h.soru, sorular: secim[i], kesin: true }));
          sonuclar.push({ ders, kazanimMetni: enBuyuk.ad, test: aralik.test, soruSayisi: enBuyuk.soru, sorular: geriKalan, kesin: true });
          cozulmemis = [];
        }
      }
    }
    for (const h of cozulmemis) {
      // Aday küme bulunamadıysa (çok büyük konu) derste kalan sorular gösterilir.
      const adaylar = belirsizler.get(h.ad) ?? new Set(kalan);
      if (adaylar.size > 0) sonuclar.push({ ders, kazanimMetni: h.ad, test: aralik.test, soruSayisi: h.soru, sorular: [...adaylar].sort((a, b) => a - b), kesin: false });
    }
  }
  return sonuclar;
}
