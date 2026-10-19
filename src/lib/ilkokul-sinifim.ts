// İlkokul sınıf öğretmeninin "Sınıfım" panosu (kullanıcı kararı 18.10.2026)
// — saf özet hesabı. Sınıf öğretmeni Rehberlik dışındaki kalemleri yazar
// (Rehberlik'i rehberlik servisi işaretler, bkz. kalemiYazabilirMi); bir
// öğrencinin aylık raporu sınıf düzeyinin bu kalemleri dolunca "tamam"
// sayılır (kalemler sınıf düzeyine göre, bkz. sinifKalemleri).
import { sinifKalemleri } from "@/lib/ilkokul-gelisim";
import type { IlkokulEtkinligi, IlkokulSinifRaporu } from "@/lib/ilkokul-gelisim-sorgu";

export function ogretmenKalemleri(seviye: string | null | undefined): string[] {
  return sinifKalemleri(seviye).map((k) => k.anahtar as string).filter((k) => k !== "rehberlik");
}

export interface SinifimOgrencisi {
  id: string;
  ad: string;
  okulNo: string;
  yazilanKalem: number; // bu ay, sınıf öğretmeninin 9 kaleminden
  veliBagli: boolean;
}

export interface SinifimOzeti {
  ogrenciler: SinifimOgrencisi[];
  kalemSayisi: number; // sınıf öğretmeninin bu sınıf düzeyindeki kalem sayısı
  raporuTamam: number;
  raporaBaslanmamis: number;
  veliBagli: number;
  etkinlikSayisi: number;
  // Bugünden itibaren en yakın, sonra son geçenler (en fazla 3).
  oneCikanEtkinlikler: { ad: string; tarih: string; gecti: boolean; katilim: number }[];
}

export function sinifimOzeti(girdi: {
  rapor: IlkokulSinifRaporu;
  etkinlikler: IlkokulEtkinligi[];
  veliBagliIdler: Set<string>;
  bugun: string;
  seviye: string;
}): SinifimOzeti {
  const ogretmeninKalemleri = ogretmenKalemleri(girdi.seviye);
  const kalemToplami = ogretmeninKalemleri.length;
  const kalemSayisi = new Map<string, Set<string>>();
  for (const k of girdi.rapor.kayitlar) {
    if (!ogretmeninKalemleri.includes(k.kalem)) continue;
    const s = kalemSayisi.get(k.studentId) ?? new Set<string>();
    s.add(k.kalem);
    kalemSayisi.set(k.studentId, s);
  }
  const ogrenciler = [...girdi.rapor.ogrenciler]
    .sort((a, b) => a.okulNo.localeCompare(b.okulNo, "tr", { numeric: true }))
    .map((o) => ({
      id: o.id, ad: o.ad, okulNo: o.okulNo,
      yazilanKalem: kalemSayisi.get(o.id)?.size ?? 0,
      veliBagli: girdi.veliBagliIdler.has(o.id),
    }));
  const gelecek = girdi.etkinlikler.filter((e) => e.tarih >= girdi.bugun).sort((a, b) => a.tarih.localeCompare(b.tarih));
  const gecen = girdi.etkinlikler.filter((e) => e.tarih < girdi.bugun).sort((a, b) => b.tarih.localeCompare(a.tarih));
  return {
    ogrenciler,
    kalemSayisi: kalemToplami,
    raporuTamam: ogrenciler.filter((o) => o.yazilanKalem >= kalemToplami).length,
    raporaBaslanmamis: ogrenciler.filter((o) => o.yazilanKalem === 0).length,
    veliBagli: ogrenciler.filter((o) => o.veliBagli).length,
    etkinlikSayisi: girdi.etkinlikler.length,
    oneCikanEtkinlikler: [...gelecek, ...gecen].slice(0, 3).map((e) => ({
      ad: e.ad, tarih: e.tarih, gecti: e.tarih < girdi.bugun, katilim: e.katilimcilar.length,
    })),
  };
}
