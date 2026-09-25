// Deneme konu analizi (kullanıcı isteği, 25.09.2026) — karneli deneme
// PDF'lerinden çıkan konu (kazanım) dökümünü (deneme_kazanim_sonuclari)
// öğrenci ve sınıf/okul düzeyinde özetler. Veri zaten P4'te yazılıyordu ama
// hiçbir ekran okumuyordu. Saf/deterministik — sorgu yok, test edilebilir.
//
// Konu adları yayınevinin kendi adları ("PARAGRAF YORUMU"); müfredat konu
// adlarına eşleştirme ayrı iş (kazanim_konu_eslesmeleri).

export interface KazanimSatiriGirdi {
  denemeId: string;
  studentId: string;
  tarih: string;
  tur: string;
  yayinevi: string;
  ders: string;
  kazanimMetni: string;
  soru: number;
  dogru: number;
  yanlis: number;
}

export interface DenemeOzeti {
  anahtar: string;
  tarih: string;
  tur: string;
  yayinevi: string;
  ogrenciSayisi: number;
}

export interface KonuSonucu {
  anahtar: string;
  ders: string;
  konu: string;
  soru: number;
  dogru: number;
  yanlis: number;
  bos: number;
  // 0-100, doğru / soru.
  basari: number;
  // Bu konuda kaçırılan net: soru - (doğru - yanlış/4).
  kayipNet: number;
  ogrenciSayisi: number;
  // Deneme deneme başarı (yalnızca "tüm denemeler" özetinde, eskiden yeniye).
  gecmis: { anahtar: string; tarih: string; basari: number }[];
}

export interface KonuAnaliziOzeti {
  denemeler: DenemeOzeti[];
  tumu: KonuSonucu[];
  denemeBazli: Record<string, KonuSonucu[]>;
}

export function denemeAnahtari(s: { tarih: string; tur: string; yayinevi: string }): string {
  return `${s.tarih}|${s.tur}|${s.yayinevi.trim().toLocaleUpperCase("tr-TR")}`;
}

// "Tarih-1" → "Tarih", "Matematik-1" → "Matematik"; "Geometri" olduğu gibi.
export function dersGosterimAdi(ders: string): string {
  return ders.trim().replace(/-\d+$/, "");
}

// Başlık ortasında küçük kalan Türkçe bağlaç/edatlar.
const KUCUK_KELIMELER = new Set(["ve", "ile", "ya", "veya", "da", "de", "ki", "için"]);

// "PARAGRAF YORUMU" → "Paragraf Yorumu", "DENKLEM VE EŞİTSİZLİKLER" →
// "Denklem ve Eşitsizlikler", "İslam'da İbadetler" aynı kalır.
export function konuGosterimAdi(metin: string): string {
  return metin
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("tr-TR")
    .replace(/(^|[\s(/-])(\p{L}+)/gu, (tam, ayirici: string, kelime: string, konum: number) =>
      konum > 0 && ayirici === " " && KUCUK_KELIMELER.has(kelime)
        ? tam
        : ayirici + kelime[0].toLocaleUpperCase("tr-TR") + kelime.slice(1));
}

function yuvarla(n: number): number {
  return Math.round(n * 100) / 100;
}

// Öğrencinin hiç çözmediği seçmeli test ("Felsefe (Seçmeli)", 0 D / 0 Y)
// başarıyı yapay olarak düşürmesin diye o denemede o dersin satırları atılır.
function secmeliBoslariniAt(satirlar: KazanimSatiriGirdi[]): KazanimSatiriGirdi[] {
  const cevaplanan = new Map<string, number>();
  for (const s of satirlar) {
    const k = `${s.denemeId}|${s.ders}`;
    cevaplanan.set(k, (cevaplanan.get(k) ?? 0) + s.dogru + s.yanlis);
  }
  return satirlar.filter((s) => !/\(Se[çc]meli\)$/.test(s.ders.trim()) || (cevaplanan.get(`${s.denemeId}|${s.ders}`) ?? 0) > 0);
}

function konulariTopla(satirlar: KazanimSatiriGirdi[], gecmisEkle: boolean): KonuSonucu[] {
  const gruplar = new Map<string, { ders: string; konu: string; soru: number; dogru: number; yanlis: number; ogrenciler: Set<string>; denemeler: Map<string, { tarih: string; soru: number; dogru: number }> }>();
  for (const s of satirlar) {
    const ders = dersGosterimAdi(s.ders);
    const konu = konuGosterimAdi(s.kazanimMetni);
    const anahtar = `${ders}|${konu.toLocaleUpperCase("tr-TR")}`;
    let g = gruplar.get(anahtar);
    if (!g) {
      g = { ders, konu, soru: 0, dogru: 0, yanlis: 0, ogrenciler: new Set(), denemeler: new Map() };
      gruplar.set(anahtar, g);
    }
    g.soru += s.soru;
    g.dogru += s.dogru;
    g.yanlis += s.yanlis;
    g.ogrenciler.add(s.studentId);
    const dAnahtar = denemeAnahtari(s);
    const d = g.denemeler.get(dAnahtar) ?? { tarih: s.tarih, soru: 0, dogru: 0 };
    d.soru += s.soru;
    d.dogru += s.dogru;
    g.denemeler.set(dAnahtar, d);
  }
  return [...gruplar.entries()]
    .filter(([, g]) => g.soru > 0)
    .map(([anahtar, g]) => ({
      anahtar,
      ders: g.ders,
      konu: g.konu,
      soru: g.soru,
      dogru: g.dogru,
      yanlis: g.yanlis,
      bos: Math.max(0, g.soru - g.dogru - g.yanlis),
      basari: Math.round((g.dogru / g.soru) * 100),
      kayipNet: yuvarla(g.soru - (g.dogru - g.yanlis / 4)),
      ogrenciSayisi: g.ogrenciler.size,
      gecmis: gecmisEkle
        ? [...g.denemeler.entries()]
          .sort((a, b) => a[1].tarih.localeCompare(b[1].tarih))
          .map(([dAnahtar, d]) => ({ anahtar: dAnahtar, tarih: d.tarih, basari: d.soru > 0 ? Math.round((d.dogru / d.soru) * 100) : 0 }))
        : [],
    }))
    // En çok net kaybedilen önce; eşitlikte başarısı düşük olan.
    .sort((a, b) => b.kayipNet - a.kayipNet || a.basari - b.basari);
}

export function konuAnaliziOzetle(hamSatirlar: KazanimSatiriGirdi[]): KonuAnaliziOzeti {
  const satirlar = secmeliBoslariniAt(hamSatirlar);
  const denemeGruplari = new Map<string, { tarih: string; tur: string; yayinevi: string; ogrenciler: Set<string>; satirlar: KazanimSatiriGirdi[] }>();
  for (const s of satirlar) {
    const anahtar = denemeAnahtari(s);
    let g = denemeGruplari.get(anahtar);
    if (!g) {
      g = { tarih: s.tarih, tur: s.tur, yayinevi: s.yayinevi.trim(), ogrenciler: new Set(), satirlar: [] };
      denemeGruplari.set(anahtar, g);
    }
    g.ogrenciler.add(s.studentId);
    g.satirlar.push(s);
  }
  const denemeler = [...denemeGruplari.entries()]
    .map(([anahtar, g]) => ({ anahtar, tarih: g.tarih, tur: g.tur, yayinevi: g.yayinevi, ogrenciSayisi: g.ogrenciler.size }))
    .sort((a, b) => b.tarih.localeCompare(a.tarih) || a.anahtar.localeCompare(b.anahtar));
  const denemeBazli: Record<string, KonuSonucu[]> = {};
  for (const [anahtar, g] of denemeGruplari) denemeBazli[anahtar] = konulariTopla(g.satirlar, false);
  return { denemeler, tumu: konulariTopla(satirlar, true), denemeBazli };
}
