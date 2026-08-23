export function saatiDakikayaCevir(saat: string | null | undefined): number | null {
  if (!saat) return null;

  const eslesme = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(saat.trim());
  if (!eslesme) return null;

  const saatDegeri = Number(eslesme[1]);
  const dakikaDegeri = Number(eslesme[2]);
  if (saatDegeri < 0 || saatDegeri > 23 || dakikaDegeri < 0 || dakikaDegeri > 59) return null;

  return saatDegeri * 60 + dakikaDegeri;
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

  // Bitiş ve başlangıç aynı dakikadaysa aralıklar yalnızca birbirine değer;
  // kesişmez. Örn. 16.00–17.00 bittikten sonra 17.00–18.00 başlayabilir.
  return ilkBaslangicDakika < ikinciBitisDakika && ilkBitisDakika > ikinciBaslangicDakika;
}
