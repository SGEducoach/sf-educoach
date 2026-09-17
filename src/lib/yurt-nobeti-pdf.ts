import { parcalariBirlestir, satirlariOlustur } from "./pdf-metni";
import type { PdfOgesi } from "./pdf-metni";

// Yurt (belletmen) nöbet listesi PDF'i — "Eylül Ayı Belletmen Öğretmen
// Listesi": her satırda tarih (13/09/2026), gün adı ve o gün nöbetçi
// öğretmenler. Adlar Türkçe harfler yüzünden parçalı geliyor, genişliğe göre
// birleştiriliyor (bkz. lib/pdf-metni.ts). "Yatılı" gibi sütun etiketleri
// atlanır. Saf fonksiyon; PDF okuma sunucuda (lib/pdf-oge.ts).

export interface YurtNobetGorevi { ad: string; tarih: string }
export interface YurtNobetiPdfSonucu {
  gorevler: YurtNobetGorevi[];
  ilkTarih: string | null;
  sonTarih: string | null;
  uyarilar: string[];
}

const TARIH_DESENI = /^(\d{2})\/(\d{2})\/(\d{4})\s*(.*)$/;
const AD_DESENI = /^[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü.'-]*(?:\s+[A-ZÇĞİÖŞÜ][A-ZÇĞİÖŞÜa-zçğıöşü.'-]*)+$/;
const ATLANACAK = /^(yat[ıi]l[ıi]|g[üu]nd[üu]zl[üu]|belletmen|öğretmen|tarih)$/i;

export function yurtNobetiPdfiniCoz(ogeler: PdfOgesi[]): YurtNobetiPdfSonucu {
  const gorevler: YurtNobetGorevi[] = [];
  const uyarilar: string[] = [];
  const gorulen = new Set<string>();

  for (const satir of satirlariOlustur(ogeler)) {
    const parcalar = parcalariBirlestir(satir.ogeler);
    const ilk = parcalar[0];
    if (!ilk) continue;
    const eslesme = TARIH_DESENI.exec(ilk.metin.trim());
    if (!eslesme) continue;

    const [, gun, ay, yil, kalan] = eslesme;
    const tarih = `${yil}-${ay}-${gun}`;
    if (Number(ay) < 1 || Number(ay) > 12 || Number(gun) < 1 || Number(gun) > 31) {
      uyarilar.push(`Geçersiz tarih: ${ilk.metin}`);
      continue;
    }

    const adlar = [kalan.trim(), ...parcalar.slice(1).map((p) => p.metin.trim())];
    for (const ad of adlar) {
      if (!ad || ATLANACAK.test(ad)) continue;
      if (!AD_DESENI.test(ad) || ad.length < 5 || ad.length > 80) {
        uyarilar.push(`${tarih}: "${ad}" ad olarak okunamadı.`);
        continue;
      }
      const anahtar = `${tarih}|${ad}`;
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      gorevler.push({ ad, tarih });
    }
  }

  const tarihler = [...new Set(gorevler.map((g) => g.tarih))].sort();
  if (gorevler.length === 0) uyarilar.push("PDF'te nöbet görevi bulunamadı.");
  return { gorevler, ilkTarih: tarihler[0] ?? null, sonTarih: tarihler.at(-1) ?? null, uyarilar };
}
