export interface EslestirmeAdayi {
  id: string;
  ad: string;
  okulNo: string;
}

export type EslestirmeSonucu =
  | { durum: "birebir" | "ortak_nokta"; ogrenci: EslestirmeAdayi; gerekce: string }
  | { durum: "belirsiz"; ogrenci?: undefined; gerekce: string };

function normalize(value: string): string {
  return value
    .toLocaleUpperCase("tr-TR")
    .replaceAll("Ç", "C").replaceAll("Ğ", "G").replaceAll("İ", "I")
    .replaceAll("Ö", "O").replaceAll("Ş", "S").replaceAll("Ü", "U")
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenBenzerligi(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length >= 3 && b.length >= 3 && (a.startsWith(b) || b.startsWith(a))) return 0.9;
  const ortak = [...a].filter((harf, i) => b[i] === harf).length;
  return ortak / Math.max(a.length, b.length);
}

function ortakTokenler(girilen: string, aday: string): string[] {
  const adayTokenleri = aday.split(" ");
  return girilen.split(" ").filter((token) => adayTokenleri.some((a) => tokenBenzerligi(token, a) >= 0.72));
}

export function ogrenciKaydiEslestir(
  girilen: { okulNo: string; ad: string },
  adaylar: EslestirmeAdayi[],
): EslestirmeSonucu {
  const ad = normalize(girilen.ad);
  const okulNo = girilen.okulNo.trim();
  if (!ad) return { durum: "belirsiz", gerekce: "Öğrenci adı boş." };

  const numaraAdayi = okulNo && okulNo !== "0" ? adaylar.find((o) => o.okulNo === okulNo) : undefined;
  if (numaraAdayi) {
    const adayAdi = normalize(numaraAdayi.ad);
    if (adayAdi === ad) return { durum: "birebir", ogrenci: numaraAdayi, gerekce: "Okul numarası ve ad birebir aynı." };
    const ortak = ortakTokenler(ad, adayAdi);
    if (ortak.length > 0) {
      return { durum: "ortak_nokta", ogrenci: numaraAdayi, gerekce: `Okul numarası aynı; ortak ad parçası: ${ortak.join(", ")}.` };
    }
  }

  const adBirebir = adaylar.filter((o) => normalize(o.ad) === ad);
  if (adBirebir.length === 1) {
    return { durum: "ortak_nokta", ogrenci: adBirebir[0], gerekce: `Ad birebir aynı; okul numarası ${okulNo || "yok"} -> ${adBirebir[0].okulNo}.` };
  }

  const girilenTokenSayisi = ad.split(" ").length;
  const puanli = adaylar.map((ogrenci) => {
    const ortak = ortakTokenler(ad, normalize(ogrenci.ad));
    return { ogrenci, ortak, puan: ortak.length / Math.max(girilenTokenSayisi, normalize(ogrenci.ad).split(" ").length) };
  }).sort((a, b) => b.puan - a.puan);
  const enIyi = puanli[0];
  const ikinci = puanli[1];
  if (enIyi && enIyi.ortak.length >= 2 && enIyi.puan >= 0.5 && (!ikinci || enIyi.puan - ikinci.puan >= 0.15)) {
    return { durum: "ortak_nokta", ogrenci: enIyi.ogrenci, gerekce: `Okul numarası farklı; ortak ad parçaları: ${enIyi.ortak.join(", ")}.` };
  }

  const numaraUyarisi = numaraAdayi ? ` Girilen ${okulNo} numarası ${numaraAdayi.ad} adına ait ancak adlar uyuşmuyor.` : "";
  return { durum: "belirsiz", gerekce: `Güvenilir ve tekil bir eşleşme bulunamadı.${numaraUyarisi}` };
}
