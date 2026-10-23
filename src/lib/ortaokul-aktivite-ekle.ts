// Sınıf Analizi özetine ortaokul çalışması ekler. RPC sinif_analiz_ozeti
// (migration 0175) yalnız soru_cozumleri + konu_calismalar sayıyor; ortaokul
// öğrencisi ise ortaokul_calismalar'a yazıyor (migration 0132) — eklenmezse
// çalışan ortaokul öğrencisi "hiç veri girmemiş / uzaklaşmış" görünür.
// Pencere sınırları eski JS hesabıyla aynı: aktiflik = son AKTIFLIK gün,
// son dönem = son TREND gün, önceki dönem = ondan önceki TREND gün.
import { tarihEkle } from "@/lib/tarih";
import type { SinifAnalizOzeti } from "@/lib/sinif-analiz-ozeti";

export function ortaokulHareketiniEkle(
  ozet: SinifAnalizOzeti | undefined,
  studentId: string,
  tarihler: string[],
  bugun: string,
  aktiflikGun: number,
  trendGun: number,
): SinifAnalizOzeti {
  const taban: SinifAnalizOzeti = ozet ?? {
    studentId, aktiflik: 0, sonDonem: 0, oncekiDonem: 0,
    gorevToplam: 0, gorevTamamlanan: 0, gorevBekleyen: 0, gorevTamamlanmayan: 0, verisiVarMi: false,
  };
  if (tarihler.length === 0) return taban;
  const aktiflikBasi = tarihEkle(bugun, -aktiflikGun);
  const sonDonemBasi = tarihEkle(bugun, -trendGun);
  const oncekiDonemBasi = tarihEkle(bugun, -trendGun * 2);
  let { aktiflik, sonDonem, oncekiDonem } = taban;
  for (const t of tarihler) {
    if (t >= aktiflikBasi) aktiflik += 1;
    if (t >= sonDonemBasi) sonDonem += 1;
    else if (t >= oncekiDonemBasi) oncekiDonem += 1;
  }
  return { ...taban, aktiflik, sonDonem, oncekiDonem, verisiVarMi: true };
}

/** İki "son hareket" tarihinden (ISO) yenisi; biri yoksa diğeri. */
export function sonHareketiBirlestir(a: string | null | undefined, b: string | null | undefined): string | null {
  if (!a) return b ?? null;
  if (!b) return a;
  return a >= b ? a : b;
}

// Supabase istemcisinin tam tipi burada "excessively deep" hatası verdiği için gevşek (yalnız from() gerekir).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrtaokulIstemcisi = { from: (tablo: string) => any };

/**
 * Ortaokul öğrencilerinin en son çalışma tarihi (öğrenci → ISO tarih). RPC
 * ogrenci_aktivite_ozeti (migration 0174) ortaokul_calismalar'ı saymıyor;
 * ortaokul öğrencisi azdır, sorgu yalnız onlar için çalışır.
 */
export async function ortaokulSonHareketleriGetir(admin: OrtaokulIstemcisi, ortaokulOgrenciIdleri: string[]): Promise<Map<string, string>> {
  const sonuc = new Map<string, string>();
  if (ortaokulOgrenciIdleri.length === 0) return sonuc;
  const { data } = await admin.from("ortaokul_calismalar").select("student_id, tarih").in("student_id", ortaokulOgrenciIdleri);
  for (const r of ((data ?? []) as { student_id: string; tarih: string | null }[])) {
    if (r.tarih && (!sonuc.get(r.student_id) || r.tarih > sonuc.get(r.student_id)!)) sonuc.set(r.student_id, r.tarih);
  }
  return sonuc;
}
