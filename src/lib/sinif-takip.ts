// Sınıf öğretmenine özel Takip Bildirimleri (kullanıcı kararı 23.10.2026,
// migration 0176) — SAF kurallar; veritabanı yok (bkz. rehber-takip-verisi.ts).
//
// KARARLAR (REHBER_ANALIZLERI_SINIF_OGRETMENI_KARAR_RAPORU.md önerisi):
//  * Kapsam yalnız öğretmenin KENDİ sınıfı (teachers.class_id). Branş
//    öğretmeni, ilkokul sınıf öğretmeni ve grup koçluğu kapsam dışı.
//  * Üç tür: net düşüşü, ders düşüşü, sessizlik. "Net yükselişi" ve "biriken
//    görev" rehberde kalır (sınıf öğretmenine bildirim yükü olmasın).
//  * Durum ve not KİŞİYE özel (takip_ogretmen_durumlari); rehberin ortak
//    durumu ve NOTU sınıf öğretmenine hiç taşınmaz.
import { kademeBul } from "@/lib/kademe";
import type { TakipDurumu, TakipTuru } from "@/lib/rehber-takip";

export const SINIF_TAKIP_TURLERI: readonly TakipTuru[] = ["net_dususu", "ders_dususu", "sessizlik"];

export const SINIF_TAKIP_NOT_EN_FAZLA = 500;

export function sinifTakipTuruMu(tur: string): tur is TakipTuru {
  return (SINIF_TAKIP_TURLERI as readonly string[]).includes(tur);
}

/** Tarama kaydı anahtarı (rehber_takip_taramalari.kapsam): "sinif:<sınıf id>". */
export function sinifTaramaAnahtari(sinifId: string): string {
  return `sinif:${sinifId}`;
}

export interface SinifOgretmeniGirdisi {
  sinifId: string | null;
  /** Öğretmenin sınıfının düzeyi ("9", "5" …); sınıf yoksa null. */
  sinifSeviyesi: string | null;
  /** Kurum grup koçluğu (grup_kapasitesi dolu) mu? */
  grupMu: boolean;
}

/** Bu öğretmen için sınıf takip kapsamı kurulabilir mi (ilkokul ve grup hariç)? */
export function sinifTakipKapsamiVarMi(g: SinifOgretmeniGirdisi): boolean {
  if (!g.sinifId || !g.sinifSeviyesi || g.grupMu) return false;
  return kademeBul(g.sinifSeviyesi) !== "ilkokul";
}

export interface KisiDurumu { durum: TakipDurumu; notMetni: string | null }

/** Kayıtta ortak durum/not ne olursa olsun, kişinin kendi durumunu uygular. */
export function kisiDurumunuUygula<T extends { id: string; durum: TakipDurumu; notMetni: string | null; kapatanAdi: string | null; kapatilmaAt: string | null }>(
  bildirimler: T[],
  durumlar: Map<string, KisiDurumu>,
): T[] {
  return bildirimler.map((b) => {
    const d = durumlar.get(b.id);
    return { ...b, durum: d?.durum ?? "yeni", notMetni: d?.notMetni ?? null, kapatanAdi: null, kapatilmaAt: null };
  });
}

/** Kişiye göre "yeni" sayısı: kendi durum satırı olmayanlar. */
export function kisiyeYeniSayisi(bildirimIdleri: string[], durumlar: Map<string, KisiDurumu>): number {
  return bildirimIdleri.filter((id) => !durumlar.has(id)).length;
}

export function sinifTakipNotunuTemizle(not: string | undefined | null): string | null {
  const t = (not ?? "").trim().slice(0, SINIF_TAKIP_NOT_EN_FAZLA);
  return t === "" ? null : t;
}
