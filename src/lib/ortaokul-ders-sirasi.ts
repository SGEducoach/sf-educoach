// Ortaokul ders sıralaması — kullanıcı kararı 08.10.2026:
// "ders buton sıralamasını HER YERDE: Türkçe, Matematik, Fen, Sosyal,
// İngilizce ve Din yapalım."
//
// NEDEN GEREKTİ: `ortaokul_mufredat_dersleri.sira` değerleri birbirine eşit
// olduğu için yedek sıralama olan ALFABETİK devreye giriyordu ve ekranlarda
// "Din Kültürü, Fen Bilimleri, İngilizce, Matematik, Sosyal Bilgiler,
// Türkçe" çıkıyordu — istenenin neredeyse tam tersi.
//
// Sıralama DB'deki `sira` kolonunu düzeltmek yerine burada tutuluyor:
// müfredat verisi yeniden yüklenirse (sürümleme var) sıra yine bozulmaz ve
// karar kodda görünür kalır.

// 8. sınıfta "Sosyal Bilgiler" yerine "T.C. İnkılap Tarihi ve Atatürkçülük"
// geliyor — ikisi AYNI SLOTU paylaşır (bkz. ORTAOKUL_BRANSLARI kararı:
// İnkılap'ı da Sosyal Bilgiler öğretmeni okutuyor).
const SIRA_DESENLERI: readonly string[][] = [
  ["türkçe"],
  ["matematik"],
  ["fen"],
  ["sosyal", "inkılap", "inkilap", "t.c. inkılap"],
  ["ingilizce", "i̇ngilizce"],
  ["din"],
];

function anahtar(ad: string): string {
  return ad.trim().toLocaleLowerCase("tr-TR");
}

// Listede olmayan ders en sona, kendi arasında alfabetik.
const SONA = SIRA_DESENLERI.length;

export function ortaokulDersSirasi(dersAdi: string): number {
  const a = anahtar(dersAdi);
  for (let i = 0; i < SIRA_DESENLERI.length; i += 1) {
    if (SIRA_DESENLERI[i].some((desen) => a.includes(desen))) return i;
  }
  return SONA;
}

// Tek karşılaştırıcı — hem ders seçenekleri hem "Ödev ver" havuzu bunu
// kullanır, iki ekran farklı sırada göstermesin.
export function ortaokulDersKarsilastir(a: string, b: string): number {
  return ortaokulDersSirasi(a) - ortaokulDersSirasi(b) || a.localeCompare(b, "tr");
}

export function ortaokulDerslerineGoreSirala<T>(
  liste: readonly T[],
  adSec: (oge: T) => string,
): T[] {
  return [...liste].sort((x, y) => ortaokulDersKarsilastir(adSec(x), adSec(y)));
}
