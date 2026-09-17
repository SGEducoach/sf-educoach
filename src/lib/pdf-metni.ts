// PDF'ten çıkarılan metin parçaları üzerinde ORTAK, saf yardımcılar
// (ders programı ve yurt nöbeti listesi çözümleyicileri paylaşıyor).
// pdfjs getTextContent her parçayı kendi konumu ve genişliğiyle veriyor;
// Türkçe harfler (İ, ğ, Ş…) çoğu belgede ayrı parça olarak geldiği için
// adların doğru okunması birleştirmeye bağlı.

export interface PdfOgesi {
  sayfa: number;
  metin: string;
  x: number;
  y: number;
  genislik: number;
}

export interface PdfSatiri {
  sayfa: number;
  y: number;
  ogeler: PdfOgesi[];
}

// Aynı yükseklikteki (±tolerans) parçalar bir satır sayılır; satırlar
// yukarıdan aşağıya, parçalar soldan sağa sıralı döner.
export function satirlariOlustur(ogeler: PdfOgesi[], tolerans = 2): PdfSatiri[] {
  const satirlar: PdfSatiri[] = [];
  for (const oge of ogeler) {
    if (!oge.metin.trim()) continue;
    const satir = satirlar.find((s) => s.sayfa === oge.sayfa && Math.abs(s.y - oge.y) <= tolerans);
    if (satir) satir.ogeler.push(oge);
    else satirlar.push({ sayfa: oge.sayfa, y: oge.y, ogeler: [oge] });
  }
  for (const satir of satirlar) satir.ogeler.sort((a, b) => a.x - b.x);
  return satirlar.sort((a, b) => a.sayfa - b.sayfa || b.y - a.y);
}

// Bitişik parçaları tek metne birleştirir (İ/ğ/Ş gibi ayrı gelen harfler).
// Aradaki boşluk `bosluk` eşiğini aşarsa yeni bir parça başlar.
// `kelimeAraligi` ile eşik arasındaki mesafe KELİME ARASI sayılır ve araya
// boşluk konur: bazı belgelerde boşluk karakteri hiç parça olarak gelmiyor,
// "AL" + "İ" + "YILMAZ" doğrudan birleşince "ALİYILMAZ" oluyordu.
export function parcalariBirlestir(ogeler: PdfOgesi[], bosluk = 2.2, kelimeAraligi = 0.9): PdfOgesi[] {
  const sonuc: PdfOgesi[] = [];
  for (const oge of ogeler) {
    const son = sonuc.at(-1);
    const mesafe = son ? oge.x - (son.x + son.genislik) : Number.POSITIVE_INFINITY;
    if (son && mesafe < bosluk) {
      const ayirici = mesafe >= kelimeAraligi && !son.metin.endsWith(" ") && !oge.metin.startsWith(" ") ? " " : "";
      son.metin += ayirici + oge.metin;
      son.genislik = oge.x + oge.genislik - son.x;
    } else {
      sonuc.push({ ...oge });
    }
  }
  return sonuc.map((o) => ({ ...o, metin: o.metin.replace(/\s+/g, " ").trim() })).filter((o) => o.metin);
}

// Satırın okunabilir metni: parçalar birleştirilip aralarına boşluk konur.
export function satirMetni(satir: PdfSatiri, bosluk = 2.2): string {
  return parcalariBirlestir(satir.ogeler, bosluk).map((o) => o.metin).join(" ").replace(/\s+/g, " ").trim();
}

// Sütun merkezlerine en yakın sütunu bulur (ders programı tablosu gibi
// ızgaralarda hücreyi sütuna oturtmak için). Tolerans dışındaysa -1.
export function enYakinSutun(x: number, merkezler: number[], tolerans = 22): number {
  let enIyi = -1;
  let enKucukFark = Number.POSITIVE_INFINITY;
  merkezler.forEach((merkez, i) => {
    const fark = Math.abs(x - merkez);
    if (fark < enKucukFark) {
      enKucukFark = fark;
      enIyi = i;
    }
  });
  return enKucukFark <= tolerans ? enIyi : -1;
}

// Türkçe ad karşılaştırma anahtarı — DB'deki public.ad_esleme_anahtari ile
// BİREBİR aynı kural olmalı (öğretmenler bu anahtarla eşleştiriliyor):
// büyük harfler küçüğe, Ç/Ğ/Ö/Ş/Ü korunur, "I", "İ" ve "ı" hepsi "i" olur
// (böylece "IŞIK" ile "Işık" aynı anahtara düşer), birleşen nokta (U+0307)
// atılır, boşluklar teke iner.
const AD_HARF_ESLESMESI: Record<string, string> = {
  Ç: "ç", Ğ: "ğ", Ö: "ö", Ş: "ş", Ü: "ü", İ: "i", I: "i", ı: "i",
};

export function adAnahtari(ad: string): string {
  return (ad ?? "")
    .normalize("NFC")
    .replace(/[̇]/g, "")
    .split("")
    .map((harf) => AD_HARF_ESLESMESI[harf] ?? (harf >= "A" && harf <= "Z" ? harf.toLowerCase() : harf))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}
