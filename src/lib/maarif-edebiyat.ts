// 9-10. sınıf branş denemesi Türkçe kazanımlarının tasnifi (kullanıcı isteği,
// 24.10.2026): klasik ÖSYM TYT Türkçe konularına uymayan edebiyat kazanımları
// (destan/koşuk/türkü, tür-dönem ölçütleri, güzel sanatlar, söz sanatları…)
// "Maarif Edebiyat" başlığında toplanır; dil bilgisi, yazım-noktalama ve
// paragraf/metin anlama kazanımları "Türkçe (Branş)" olarak kalır.
//
// Yalnızca GÖSTERİM tasnifidir: veri tabanına yazılan başlık hâlâ
// "<Ders>_Branş_Deneme" (17.10.2026 kararı — kazanımlar müfredata eşleştirilmez),
// geçmiş denemeler de yeniden yüklemeden doğru görünür. Tasnif işaret
// kelimeleriyle yapılır; işaret yoksa kazanım eskisi gibi Türkçe'de kalır.

export const MAARIF_EDEBIYAT = "Maarif Edebiyat";

const EDEBIYAT_ISARETLERI = [
  /şiir/, /hik[âa]ye/, /roman/, /tiyatro/, /destan/, /koşuk/, /türkü/, /deneme türü/,
  /edebiyat/, /edebi\b/, /güzel sanat/, /söz sanat/, /nazım/, /zihniyet/,
  /\btür(ü|ler|leri|lerin|ün|ünü)?\b/, /sınıflandır/, /şekil ve anlama dair birim/,
];

export function maarifEdebiyatKazanimiMi(kazanimMetni: string): boolean {
  const metin = kazanimMetni.normalize("NFC").toLocaleLowerCase("tr-TR");
  return EDEBIYAT_ISARETLERI.some((i) => i.test(metin));
}

// Taban ders ("Türkçe" ya da "Edebiyat") ve kazanım metninden branş denemesi
// gösterim dersi: edebiyat kazanımı → "Maarif Edebiyat", diğerleri taban ders.
export function bransGosterimDersi(tabanDers: string, kazanimMetni: string): string {
  return (tabanDers === "Türkçe" || tabanDers === "Edebiyat") && maarifEdebiyatKazanimiMi(kazanimMetni)
    ? MAARIF_EDEBIYAT
    : tabanDers;
}
