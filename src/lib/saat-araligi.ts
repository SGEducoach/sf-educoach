export function saatiDakikayaCevir(saat: string | null | undefined): number | null {
  if (!saat) return null;

  const eslesme = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(saat.trim());
  if (!eslesme) return null;

  const saatDegeri = Number(eslesme[1]);
  const dakikaDegeri = Number(eslesme[2]);
  if (saatDegeri < 0 || saatDegeri > 23 || dakikaDegeri < 0 || dakikaDegeri > 59) return null;

  return saatDegeri * 60 + dakikaDegeri;
}

// Bitiş başlangıçtan küçükse çalışma gece yarısını aşar. Eşit saatler sıfır
// süre kabul edilir; 24 saatlik belirsiz bir çalışma oluşturulmaz.
export function saatAraligiSuresi(baslangicSaat: string, bitisSaat: string): number | null {
  const baslangic = saatiDakikayaCevir(baslangicSaat);
  const bitis = saatiDakikayaCevir(bitisSaat);
  if (baslangic === null || bitis === null) return null;
  if (baslangic === bitis) return 0;
  return bitis > baslangic ? bitis - baslangic : bitis + 24 * 60 - baslangic;
}

export function tarihliSaatAraligi(tarih: string, baslangicSaat: string, bitisSaat: string): [number, number] | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih)) return null;
  const baslangic = saatiDakikayaCevir(baslangicSaat);
  const sure = saatAraligiSuresi(baslangicSaat, bitisSaat);
  const gun = Date.parse(`${tarih}T00:00:00Z`) / 60000;
  if (baslangic === null || sure === null || sure <= 0 || !Number.isFinite(gun)) return null;
  return [gun + baslangic, gun + baslangic + sure];
}

export function tarihliSaatAraliklariCakisiyor(
  ilkTarih: string, ilkBaslangic: string, ilkBitis: string,
  ikinciTarih: string, ikinciBaslangic: string, ikinciBitis: string,
) {
  const ilk = tarihliSaatAraligi(ilkTarih, ilkBaslangic, ilkBitis);
  const ikinci = tarihliSaatAraligi(ikinciTarih, ikinciBaslangic, ikinciBitis);
  return !!ilk && !!ikinci && ilk[0] < ikinci[1] && ilk[1] > ikinci[0];
}

export function saatAraliklariCakisiyor(
  ilkBaslangic: string,
  ilkBitis: string,
  ikinciBaslangic: string,
  ikinciBitis: string,
) {
  const ilkBaslangicDakika = saatiDakikayaCevir(ilkBaslangic);
  const ilkBitisDakika = saatiDakikayaCevir(ilkBitis);
  const ikinciBaslangicDakika = saatiDakikayaCevir(ikinciBaslangic);
  const ikinciBitisDakika = saatiDakikayaCevir(ikinciBitis);

  if (
    ilkBaslangicDakika === null ||
    ilkBitisDakika === null ||
    ikinciBaslangicDakika === null ||
    ikinciBitisDakika === null
  ) return false;

  const ilkSure = saatAraligiSuresi(ilkBaslangic, ilkBitis);
  const ikinciSure = saatAraligiSuresi(ikinciBaslangic, ikinciBitis);
  if (!ilkSure || !ikinciSure) return false;
  return ilkBaslangicDakika < ikinciBaslangicDakika + ikinciSure
    && ilkBaslangicDakika + ilkSure > ikinciBaslangicDakika;
}
