import type { CalismaTuru } from "@/lib/ortaokul-calisma";

export interface DersAtamasi {
  teacher_id: string;
  class_id: string;
  ders: string;
}

function dersAnahtari(deger: string): string {
  return deger.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
}

// Dersin atanmış öğretmeni varsa sınıf öğretmeni onun yerine onaylayamaz.
export function ortaokulCalismaOnayYetkisi(girdi: {
  teacherId: string;
  kendiSinifId: string | null;
  ogrenciSinifId: string;
  dersAdi: string;
  atamalar: DersAtamasi[];
}): boolean {
  const ilgili = girdi.atamalar.filter((a) =>
    a.class_id === girdi.ogrenciSinifId && dersAnahtari(a.ders) === dersAnahtari(girdi.dersAdi));
  return ilgili.length > 0
    ? ilgili.some((a) => a.teacher_id === girdi.teacherId)
    : girdi.kendiSinifId === girdi.ogrenciSinifId;
}

export interface CalismaDuzeltmesi {
  tarih: string;
  sureDakika: number | null;
  dogru: number | null;
  yanlis: number | null;
  bos: number | null;
}

export function ortaokulDuzeltmeDogrula(
  tur: CalismaTuru,
  duzeltme: CalismaDuzeltmesi,
  bugun: string,
): { hata: string | null; temiz: CalismaDuzeltmesi | null } {
  const tarih = String(duzeltme.tarih ?? "");
  const gun = new Date(`${tarih}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tarih) || Number.isNaN(gun.valueOf()) ||
      gun.toISOString().slice(0, 10) !== tarih || tarih > bugun) {
    return { hata: "Geçerli ve bugünden ileri olmayan bir tarih seçin.", temiz: null };
  }
  const sayiUygun = (n: number | null) => n === null || (Number.isInteger(n) && n >= 0);
  if (![duzeltme.sureDakika, duzeltme.dogru, duzeltme.yanlis, duzeltme.bos].every(sayiUygun)) {
    return { hata: "Sayılar negatif veya ondalıklı olamaz.", temiz: null };
  }
  const sure = duzeltme.sureDakika;
  if (sure !== null && (sure < 1 || sure > 600)) {
    return { hata: "Süre 1–600 dakika arasında olmalı.", temiz: null };
  }
  if (tur === "konu") {
    if (sure === null) return { hata: "Konu çalışması için süre girin.", temiz: null };
    return { hata: null, temiz: { tarih, sureDakika: sure, dogru: null, yanlis: null, bos: null } };
  }
  const dogru = duzeltme.dogru ?? 0;
  const yanlis = duzeltme.yanlis ?? 0;
  const bos = duzeltme.bos ?? 0;
  const toplam = dogru + yanlis + bos;
  if (toplam < 1) return { hata: "En az bir soru girin.", temiz: null };
  if (sure !== null && sure > 2 * toplam) {
    return { hata: `${toplam} soru için süre en fazla ${2 * toplam} dakika olabilir.`, temiz: null };
  }
  return { hata: null, temiz: { tarih, sureDakika: sure, dogru, yanlis, bos } };
}
