// Çalışma/soru girişindeki serbest konu adları ile Konu Hakimiyeti'nin
// kanonik yaprak konuları arasındaki tek eşleme noktası.
export interface KonuHedefi {
  ders: string;
  konu: string;
  ustKonu: string;
}

export interface KonuAdEslesmesi {
  ders: string;
  kaynak_konu: string;
  hedef_konu: string;
}

export function konuAdiniNormalizeEt(ad: string): string {
  return ad.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("tr-TR");
}

export function konuAdAnahtari(ders: string, konu: string): string {
  return `${konuAdiniNormalizeEt(ders)}|${konuAdiniNormalizeEt(konu)}`;
}

export function konuHedefiniBul(
  ders: string,
  kaynakKonu: string,
  hedefler: readonly KonuHedefi[],
  eslesmeler: readonly KonuAdEslesmesi[],
): { hedef: KonuHedefi | null; yol: "dogrudan" | "yonetici" | "belirsiz" | "yok" } {
  const anahtar = konuAdAnahtari(ders, kaynakKonu);
  const adaylar = hedefler.filter((h) => konuAdAnahtari(h.ders, h.konu) === anahtar);
  // Birden fazla sınıfta aynı isimli yapraklar aynı ders+konu anahtarına
  // yazılır; yalnız farklı HEDEF adları varsa belirsiz kabul edilir.
  if (adaylar.length > 0) return { hedef: adaylar[0], yol: "dogrudan" };

  const eslesme = eslesmeler.find((e) => konuAdAnahtari(e.ders, e.kaynak_konu) === anahtar);
  if (!eslesme) return { hedef: null, yol: "yok" };
  const yoneticiHedefleri = hedefler.filter((h) => konuAdAnahtari(h.ders, h.konu) === konuAdAnahtari(ders, eslesme.hedef_konu));
  if (yoneticiHedefleri.length === 0) return { hedef: null, yol: "belirsiz" };
  return { hedef: yoneticiHedefleri[0], yol: "yonetici" };
}

export const MIN_OLCUM_SORUSU = 10;
export const MIN_OLCUM_KAYDI = 2;

export function konuOlcumuYeterliMi(dogru: number, yanlis: number, kayitSayisi: number): boolean {
  return dogru + yanlis >= MIN_OLCUM_SORUSU && kayitSayisi >= MIN_OLCUM_KAYDI;
}

export function beyanOlcumOnerisi(
  beyan: "uzak" | "belirsiz" | "yakin" | null,
  dogru: number,
  yanlis: number,
  kayitSayisi: number,
): "gozden_gecir" | "ilerleme" | null {
  if (!konuOlcumuYeterliMi(dogru, yanlis, kayitSayisi)) return null;
  const oran = dogru / (dogru + yanlis);
  if (beyan === "yakin" && oran <= 0.5) return "gozden_gecir";
  if (beyan === "uzak" && oran >= 0.8) return "ilerleme";
  return null;
}
