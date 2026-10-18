// Başlıklarda her sözcüğün baş harfi büyük (kullanıcı kuralı 18.10.2026:
// "Rehberlik Servisi", "Şiirde Söz Sanatları"). Bağlaçlar ve ekler (ve,
// ile, veya, ya da, de/da, ki) başta değilse küçük kalır. İçinde zaten
// büyük harf olan sözcüğe dokunulmaz (pH, TYT, mRNA), kesme işaretinden
// sonrası ek sayılır (Osmanlı Devleti'nin).
// "vb./vs." kısaltma, "der" Van der Waals gibi özel adlarda.
const KUCUK_KALANLAR = new Set(["ve", "ile", "veya", "ya", "da", "de", "ki", "yahut", "hem", "ne", "vb.", "vs.", "der"]);

function sozcukBuyut(sozcuk: string, ilk: boolean): string {
  if (!sozcuk) return sozcuk;
  // Tire ve eğik çizgiyle bağlı parçalar ayrı sözcük sayılır (Din-Bilim).
  if (/[-/]/.test(sozcuk)) {
    // Tek harfli Farsça tamlama eki küçük kalır (Kur'an-ı, Servet-i Fünun).
    return sozcuk.split(/([-/])/).map((p) => (p === "-" || p === "/" || /^[ıiuü]$/.test(p) ? p : sozcukBuyut(p, true))).join("");
  }
  const bas = sozcuk.match(/^[("'“‘«]*/)?.[0] ?? "";
  const govde = sozcuk.slice(bas.length);
  if (!govde) return sozcuk;
  const kok = govde.split(/['’]/)[0];
  if (/[A-ZÇĞİÖŞÜ]/.test(kok.slice(1)) || /[A-ZÇĞİÖŞÜ]/.test(kok[0])) return sozcuk;
  if (!/^[a-zçğıöşü]/.test(govde)) return sozcuk;
  const yalin = govde.toLocaleLowerCase("tr-TR").replace(/[,;:!?)]+$/, "");
  if (!ilk && bas === "" && (KUCUK_KALANLAR.has(yalin) || KUCUK_KALANLAR.has(yalin.replace(/\.$/, "")))) return sozcuk;
  return bas + govde[0].toLocaleUpperCase("tr-TR") + govde.slice(1);
}

export function baslikBicimi(metin: string): string {
  let ilk = true;
  return metin.split(/(\s+)/).map((p) => {
    if (/^\s+$/.test(p) || p === "") return p;
    const s = sozcukBuyut(p, ilk);
    // İki noktadan sonra yeni başlık gibi; nokta çoğu kez kısaltmadır (Hz., I.).
    ilk = /:$/.test(p);
    return s;
  }).join("");
}
