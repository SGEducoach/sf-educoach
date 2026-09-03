// Serbest tarih etiketini korur. Yalnızca açık, geçerli gün/ay/yıl
// biçimlerinden bitiş çıkarılır; eğitim yılı gibi belirsiz metinler silinmez.
export function tgDenemeBitisTarihi(metin: string): string | null {
  const aylar = ['ocak','şubat','mart','nisan','mayıs','haziran','temmuz','ağustos','eylül','ekim','kasım','aralık'];
  const text = metin.toLocaleLowerCase('tr-TR').trim();
  const tarihler: string[] = [];
  function ekle(y: number, m: number, d: number) {
    const date = new Date(Date.UTC(y, m - 1, d));
    if (y >= 2000 && y <= 2100 && date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d) {
      tarihler.push(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    }
  }
  // Aralıklarda son tam tarih kullanılır (29-31 Ağustos 2026 dahil).
  for (const m of text.matchAll(/\b(\d{4})-(\d{2})-(\d{2})\b/g)) ekle(+m[1], +m[2], +m[3]);
  for (const m of text.matchAll(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/g)) ekle(+m[3], +m[2], +m[1]);
  const desen = new RegExp(`\\b(\\d{1,2})\\s+(${aylar.join('|')})\\s+(\\d{4})\\b`, 'g');
  for (const m of text.matchAll(desen)) ekle(+m[3], aylar.indexOf(m[2]) + 1, +m[1]);
  return tarihler.length ? tarihler.sort().at(-1)! : null;
}
