// "... SIRALI TYT LİSTESİ" biçimli kurum sonuç listeleri (kullanıcı bildirimi
// 27.09.2026 — Kariyerim dershanesinin "Türkiye Geneli TYT İlk Prova"
// PDF'i). Bu biçim ne okul net listesi ne sınıf listesi okuyucusuna uyuyordu,
// Claude'a gidip yanıt sınırını aşıyordu. Satır yapısı:
//   SIRA  AD SOYAD  [ders D Y N]×n  TOPLAM D Y N  PUAN  [sıralama]×m
// Öğrenci no / sınıf sütunu YOK. Ders ve sıralama sütunları başlıktan
// okunur; her satır toplam D/Y ile çapraz doğrulanır. Saf modül — PDF metni
// deneme-pdf-ayristirici.ts'teki pdfSatirMetinleri ile çıkarılır.

// Başlıktaki kısaltma → TYT dersi. Matematik = T. MAT + GEO (TYT'de tek ders).
const DERS_KARSILIGI: Record<string, string> = {
  "TÜRKÇE": "Türkçe", "TÜR": "Türkçe",
  "TAR-1": "Tarih", "TARİH": "Tarih",
  "COĞ-1": "Coğrafya", "COĞRAFYA": "Coğrafya",
  "FEL-1": "Felsefe", "FELSEFE": "Felsefe",
  "DİN-1": "Din Kültürü", "DİN": "Din Kültürü",
  "T. MAT": "Matematik", "T.MAT": "Matematik", "MAT-1": "Matematik", "MAT": "Matematik",
  "GEO-1": "Matematik", "GEO": "Matematik",
  "FİZ-1": "Fizik", "FİZİK": "Fizik",
  "KİM-1": "Kimya", "KİMYA": "Kimya",
  "BİY-1": "Biyoloji", "BİYOLOJİ": "Biyoloji",
};

export interface SiraliListeOgrencisi {
  sira: number;
  isimHam: string;
  dersSonuclari: { ders: string; dogru: number; yanlis: number }[];
  toplam: { dogru: number; yanlis: number; net: number };
}

export interface SiraliListeSonucu {
  basarili: boolean;
  hata?: string;
  dersEtiketleri: string[];
  ogrenciler: SiraliListeOgrencisi[];
  okunamayanSatirlar: { sira: number; isimHam: string }[];
}

function sayi(t: string): number | null {
  return /^-?\d+(?:,\d+)?$/.test(t) ? Number(t.replace(",", ".")) : null;
}

// "SIRA TÜRKÇE TAR-1 ... T. MAT GEO-1 ... TOPLAM TYT ŞB KRM İLÇE İL GENEL"
function basligiCoz(satir: string): { dersler: string[]; siraSutunu: number } | null {
  const m = /^SIRA\s+(.+?)\s+TOPLAM\s+\S+\s*(.*)$/.exec(satir.trim());
  if (!m) return null;
  const tokenlar = m[1].split(/\s+/);
  const dersler: string[] = [];
  for (let i = 0; i < tokenlar.length; i++) {
    // "T." + "MAT" gibi iki parçalı başlıklar
    if (/\.$/.test(tokenlar[i]) && tokenlar[i + 1]) { dersler.push(`${tokenlar[i]} ${tokenlar[i + 1]}`); i++; } else dersler.push(tokenlar[i]);
  }
  const siraSutunu = m[2].split(/\s+/).filter(Boolean).length;
  return dersler.length >= 2 ? { dersler, siraSutunu } : null;
}

export function siraliListeCoz(sayfalar: string[][]): SiraliListeSonucu {
  const bos = (hata: string): SiraliListeSonucu => ({ basarili: false, hata, dersEtiketleri: [], ogrenciler: [], okunamayanSatirlar: [] });
  let baslik: { dersler: string[]; siraSutunu: number } | null = null;
  const ogrenciler: SiraliListeOgrencisi[] = [];
  const okunamayanSatirlar: { sira: number; isimHam: string }[] = [];
  const gorulenSira = new Set<number>();

  for (const satirlar of sayfalar) {
    let sayfadaBaslik = false;
    for (const hamSatir of satirlar) {
      const satir = hamSatir.replace(/\s+/g, " ").trim();
      const b = basligiCoz(satir);
      if (b) { baslik ??= b; sayfadaBaslik = true; continue; }
      if (!sayfadaBaslik || !baslik) continue;

      const tokenlar = satir.split(" ");
      const sira = sayi(tokenlar[0]);
      if (sira === null || !Number.isInteger(sira)) continue;
      let i = 1;
      const isimParcalari: string[] = [];
      while (i < tokenlar.length && sayi(tokenlar[i]) === null) isimParcalari.push(tokenlar[i++]);
      const sayilar = tokenlar.slice(i).map(sayi);
      if (sayilar.some((n) => n === null)) continue;
      const s = sayilar as number[];
      const beklenen = baslik.dersler.length * 3 + 3 + 1 + baslik.siraSutunu;
      // Grafik ekseni, sayfa numarası gibi kısa sayısal satırlar öğrenci değil.
      if (s.length < beklenen - 6) continue;
      if (gorulenSira.has(sira)) continue;
      gorulenSira.add(sira);
      const isimHam = isimParcalari.join(" ");
      if (s.length !== beklenen) { okunamayanSatirlar.push({ sira, isimHam }); continue; }

      const toplamIdx = baslik.dersler.length * 3;
      const toplam = { dogru: s[toplamIdx], yanlis: s[toplamIdx + 1], net: s[toplamIdx + 2] };
      const birlesen = new Map<string, { dogru: number; yanlis: number }>();
      let dogruTop = 0;
      let yanlisTop = 0;
      baslik.dersler.forEach((etiket, d) => {
        const ders = DERS_KARSILIGI[etiket.toLocaleUpperCase("tr-TR")] ?? etiket;
        const mevcut = birlesen.get(ders) ?? { dogru: 0, yanlis: 0 };
        mevcut.dogru += s[d * 3];
        mevcut.yanlis += s[d * 3 + 1];
        dogruTop += s[d * 3];
        yanlisTop += s[d * 3 + 1];
        birlesen.set(ders, mevcut);
      });
      // Çapraz doğrulama: ders D/Y toplamları satırın TOPLAM sütunuyla tutmalı.
      if (dogruTop !== toplam.dogru || yanlisTop !== toplam.yanlis) { okunamayanSatirlar.push({ sira, isimHam }); continue; }
      ogrenciler.push({ sira, isimHam, dersSonuclari: [...birlesen.entries()].map(([ders, v]) => ({ ders, ...v })), toplam });
    }
  }

  if (!baslik) return bos("Sıralı liste başlığı (SIRA … TOPLAM) bulunamadı.");
  const bilinmeyen = baslik.dersler.filter((d) => !DERS_KARSILIGI[d.toLocaleUpperCase("tr-TR")]);
  if (bilinmeyen.length > 0) return bos(`Tanınmayan ders sütunları: ${bilinmeyen.join(", ")}`);
  if (ogrenciler.length === 0) return bos("Başlık bulundu ama öğrenci satırı okunamadı.");
  return { basarili: true, dersEtiketleri: baslik.dersler, ogrenciler, okunamayanSatirlar };
}
