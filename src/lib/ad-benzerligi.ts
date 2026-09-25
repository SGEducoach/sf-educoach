// Deneme PDF'lerindeki öğrenci adı, kurumdaki kayıtlı adla birebir aynı
// olmayabiliyor (kullanıcı isteği, 25.09.2026 — "fen lisesi dublör" PDF'inde
// 110 öğrenciden yalnızca 9'u birebir eşleşti): soyadı hiç yazılmamış
// ("GAMZENUR"), kısaltılmış ("ALPEREN Y", "BEREN CR"), ikinci ad eksik ya da
// tek harf hatalı olabiliyor. Bu modül yalnızca "bu satır kayıtlı bir
// öğrenciye BENZİYOR mu" sorusunu cevaplar — benzeyen satırlar OTOMATİK
// KAYDEDİLMEZ, yönetici onay kuyruğuna düşer. Okulda hiç kaydı olmayan
// öğrenciler kuyruğu doldurmasın diye kural bilinçli olarak tutucu.

// Türkçe harfleri sadeleştirip küçük harfli kelime listesine çevirir —
// PDF'lerde "MIHÇI"/"Mıhçı"/"Mihçi" gibi farklı yazımlar aynı sayılsın.
function kelimeler(ad: string): string[] {
  return ad
    .normalize("NFC")
    .toLocaleLowerCase("tr-TR")
    .replace(/([iı])̇/g, "$1")
    .replace(/[çğıöşü]/g, (h) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[h] ?? h)
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function tekHarfFarkliMi(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let fark = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++fark > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return fark + (a.length - i) + (b.length - j) <= 1;
}

// "cr" → "cirit", "agkc" → "agkoc", "y" → "yilmaz": ilk harf aynı ve kısa
// yazımın harfleri uzun kelimede aynı sırayla geçiyor.
function kisaltmasiMi(kisa: string, uzun: string): boolean {
  if (kisa.length >= uzun.length || kisa[0] !== uzun[0]) return false;
  let j = 0;
  for (const harf of uzun) if (harf === kisa[j]) j++;
  return j === kisa.length;
}

function kelimeUyumu(a: string, b: string): "ayni" | "benzer" | null {
  if (a === b) return "ayni";
  if (a.length >= 4 && b.length >= 4 && tekHarfFarkliMi(a, b)) return "benzer";
  if (kisaltmasiMi(a, b) || kisaltmasiMi(b, a)) return "benzer";
  return null;
}

// Kısa adın HER kelimesi uzun adın farklı bir kelimesine uymalı ve en az
// biri (3+ harfli) birebir aynı olmalı. Tek kelimelik PDF adı ("GAMZENUR")
// ancak kayıtlı adın İLK kelimesiyle aynıysa benzer sayılır.
function kapsiyorMu(kisa: string[], uzun: string[]): boolean {
  if (kisa.length === 0 || kisa.length > uzun.length) return false;
  if (kisa.length === 1) return kisa[0].length >= 3 && kisa[0] === uzun[0];
  const kullanilan = new Set<number>();
  let birebir = false;
  for (const k of kisa) {
    let bulunan = -1;
    let bulunanTur: "ayni" | "benzer" | null = null;
    uzun.forEach((u, idx) => {
      if (kullanilan.has(idx) || bulunanTur === "ayni") return;
      const tur = kelimeUyumu(k, u);
      if (tur) { bulunan = idx; bulunanTur = tur; }
    });
    if (bulunan === -1) return false;
    kullanilan.add(bulunan);
    if (bulunanTur === "ayni" && k.length >= 3) birebir = true;
  }
  return birebir;
}

// Kullanıcı isteği (25.09.2026): adı birebir tutmayan PDF satırı, okul
// numarası kurumdaki TEK bir öğrencininkiyle aynıysa VE adlar benzerse o
// öğrenciye otomatik yazılabilir. Numara 0/boşsa ya da ad benzemiyorsa null
// — satır yönetici onayına kalır.
export function numaraVeAdIleBul<T extends { ad: string; okulNo: string | null }>(
  pdf: { ad: string; ogrenciNo?: number },
  ogrenciler: T[],
): T | null {
  if (!pdf.ogrenciNo) return null;
  const numarasiTutanlar = ogrenciler.filter((o) => o.okulNo !== null && /^\d+$/.test(o.okulNo) && Number(o.okulNo) === pdf.ogrenciNo);
  return numarasiTutanlar.length === 1 && adlarBenzerMi(pdf.ad, numarasiTutanlar[0].ad) ? numarasiTutanlar[0] : null;
}

// Kullanıcı isteği (25.09.2026): numarası olmayan (PDF'te 0) ama adı çok
// güçlü benzeyen satırlar da otomatik eşleşsin. Numarayla doğrulanmadığı için
// kural bilinçli olarak sıkı: PDF adı en az 2 kelime, kelimelerin HEPSİ
// kayıtlı adda BİREBİR geçiyor (kısaltma/harf hatası yok — "NUR EFŞAN
// ALBAY" → "Nur Efşan Sude Albay"), kurumda bu koşulu sağlayan TEK öğrenci
// var ve aynı adla bir ön kayıt yok. PDF'teki numara kurumda başka birine
// aitse (çelişki) eşleştirilmez.
export function gucluAdIleBul<T extends { ad: string; okulNo: string | null }>(
  pdf: { ad: string; ogrenciNo?: number },
  ogrenciler: T[],
  onKayitAdlari: string[],
): T | null {
  const p = kelimeler(pdf.ad);
  if (p.length < 2) return null;
  if (pdf.ogrenciNo && ogrenciler.some((o) => o.okulNo !== null && /^\d+$/.test(o.okulNo) && Number(o.okulNo) === pdf.ogrenciNo)) {
    return null;
  }
  const hepsiGeciyor = (kayitliAd: string) => {
    const kalan = kelimeler(kayitliAd);
    return p.every((k) => {
      const idx = kalan.indexOf(k);
      if (idx === -1) return false;
      kalan.splice(idx, 1);
      return true;
    });
  };
  const adaylar = ogrenciler.filter((o) => hepsiGeciyor(o.ad));
  if (adaylar.length !== 1 || onKayitAdlari.some(hepsiGeciyor)) return null;
  return adaylar[0];
}

export function adlarBenzerMi(pdfAdi: string, kayitliAd: string): boolean {
  const p = kelimeler(pdfAdi);
  const k = kelimeler(kayitliAd);
  if (p.join(" ") === k.join(" ")) return true;
  return p.length <= k.length ? kapsiyorMu(p, k) : kapsiyorMu(k, p);
}
