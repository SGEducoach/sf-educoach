// Analiz Motoru Faz A5 — Katman 6 (kohort karşılaştırması) veri katmanı.
//
// BİLİNÇLİ TASARIM KARARI: bu YENİ bir SECURITY DEFINER RPC olarak
// açılmadı — konu_zayiflik_raporu (migration 0058) deseninin aksine, düz
// bir sorgu (analizVerisiGetir ile aynı yaklaşım): çağıranın supabase
// client'ına (öğretmen/müdür'ün RLS-scoped client'ı VEYA admin'in
// service-role client'ı) güveniyor. Bunun güvenli olma nedeni: RLS öğretmene
// kendi kurumunun öğrencilerini okutuyor (denemeler_select_ayni_kurum /
// students_select_ayni_kurum, migration 0114 — öncesinde "herhangi bir
// öğretmen herhangi bir öğrenci" idi) ve kohort zaten aynı sınıf; bu
// fonksiyon o kapsamı GENİŞLETMİYOR, sadece zaten erişilebilir veriyi kohort
// istatistiğine dönüştürüyor. Öğrencinin KENDİ (RLS-scoped)
// client'ıyla yanlışlıkla çağrılırsa has_student_access() sınıf arkadaşlarının
// satırlarını zaten döndürmez (sadece kendi/bağlı veli/öğretmen) — yani bir
// kodlama hatası veri sızıntısına DEĞİL, boş bir kohorta yol açar.
//
// Kullanıcı kararı (25.08.2026, açık soru 2): bu katmanın çıktısı SADECE
// öğretmen/müdür/admin görünümünde gösterilir — bu fonksiyon SADECE o çağrı
// noktalarından (dashboard/page.tsx'in secilenOgrenciId dalı,
// yonetici/kullanici/[id]/page.tsx) import edilmeli, öğrencinin/velinin
// kendi görünümünden ASLA çağrılmamalı.
import type { createClient } from "@/lib/supabase/server";
import { netHesapla, dokuzOnSinifMi } from "@/lib/types";
import { persentilHesapla } from "@/lib/analiz-motoru";
import { yayineviAnahtari } from "@/lib/sinif-analizi";
import type { PersentilSonucu } from "@/lib/analiz-motoru";

export interface KohortKarsilastirmaSatiri {
  tur: "TYT" | "AYT" | "BRANS";
  kendiNet: number;
  persentil: PersentilSonucu;
  /**
   * "ortak-deneme": öğrencinin son denemesiyle AYNI deneme (yayınevi+tarih+tür)
   * sınıf arkadaşlarının sonucuyla karşılaştırıldı — gerçek sınıf konumu.
   * "yaklasik": ortak deneme yeterli kişiyle bulunamadı; herkesin SON (farklı
   * olabilen) denemesine göre yaklaşık konum.
   */
  temel: "ortak-deneme" | "yaklasik";
}

// Ortak denemede karşılaştırma için gereken en az sınıf arkadaşı (persentilHesapla
// da aynı k-anonymity eşiğini uygular; burada hangi temelin seçileceğini belirler).
const ORTAK_DENEME_MIN_DIGER = 3;

export async function kohortKarsilastirmasiGetir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
): Promise<KohortKarsilastirmaSatiri[]> {
  const { data: ogrenciRow } = await supabase.from("students").select("class_id, classes(seviye)").eq("id", studentId).maybeSingle();
  const ogrenci = ogrenciRow as unknown as { class_id: string | null; classes: { seviye: string } | null } | null;
  const classId = ogrenci?.class_id ?? null;
  if (!classId) return [];
  // 9-10. sınıf yalnız Branş denemesiyle karşılaştırılır (bkz. analiz.ts denemeKapsami).
  const turler = dokuzOnSinifMi(ogrenci?.classes?.seviye) ? (["BRANS"] as const) : (["TYT", "AYT"] as const);

  const { data: sinifOgrencileri } = await supabase.from("students").select("id").eq("class_id", classId);
  const sinifIdleri = ((sinifOgrencileri ?? []) as { id: string }[]).map((s) => s.id);
  // k-anonymity ön-kontrolü: kendisi + en az 3 sınıf arkadaşı olmadan
  // sorguyu bile çalıştırmaya gerek yok (persentilHesapla zaten tür bazında
  // aynı eşiği tekrar uygular, bu sadece ucuz bir kısa devre).
  if (sinifIdleri.length < 4) return [];

  const { data: denemeler } = await supabase
    .from("denemeler")
    .select("student_id, tarih, tur, yayinevi, deneme_ders_sonuclari(dogru, yanlis)")
    .in("student_id", sinifIdleri)
    .order("tarih");

  type Row = { student_id: string; tarih: string; tur: string; yayinevi?: string | null; deneme_ders_sonuclari: { dogru: number; yanlis: number }[] };
  const liste = (denemeler as unknown as Row[]) ?? [];

  // Her (student_id, tur) için EN SON net — liste zaten tarihe göre artan
  // sıralı (denemeler .order("tarih")), bu yüzden Map'e sırayla yazmak
  // otomatik olarak "en son" değeri bırakır.
  const sonNetMap = new Map<string, number>();
  // Aynı deneme (yayınevi|tarih|tür) için herkesin neti — ortak karşılaştırma için.
  const denemeNetMap = new Map<string, number>();
  const sonDenemeAnahtari = new Map<string, string>();
  for (const d of liste) {
    const net = Math.round(d.deneme_ders_sonuclari.reduce((t, s) => t + netHesapla(s.dogru, s.yanlis), 0) * 100) / 100;
    const anahtar = `${yayineviAnahtari(d.yayinevi)}|${d.tarih}|${d.tur}`;
    sonNetMap.set(`${d.student_id}|${d.tur}`, net);
    denemeNetMap.set(`${d.student_id}|${anahtar}`, net);
    sonDenemeAnahtari.set(`${d.student_id}|${d.tur}`, anahtar);
  }

  const sonuc: KohortKarsilastirmaSatiri[] = [];
  for (const tur of turler) {
    const kendiNet = sonNetMap.get(`${studentId}|${tur}`);
    if (kendiNet === undefined) continue; // öğrencinin bu türde hiç denemesi yok — karşılaştırılacak bir şey yok
    // Önce ortak deneme: öğrencinin son denemesine sınıfından yeterli kişi girdiyse onunla kıyasla.
    const anahtar = sonDenemeAnahtari.get(`${studentId}|${tur}`);
    const ortakDegerler: number[] = [];
    if (anahtar) {
      for (const id of sinifIdleri) {
        if (id === studentId) continue;
        const net = denemeNetMap.get(`${id}|${anahtar}`);
        if (net !== undefined) ortakDegerler.push(net);
      }
    }
    if (ortakDegerler.length >= ORTAK_DENEME_MIN_DIGER) {
      sonuc.push({ tur, kendiNet, persentil: persentilHesapla(kendiNet, ortakDegerler), temel: "ortak-deneme" });
      continue;
    }
    const digerDegerler: number[] = [];
    for (const id of sinifIdleri) {
      if (id === studentId) continue;
      const net = sonNetMap.get(`${id}|${tur}`);
      if (net !== undefined) digerDegerler.push(net);
    }
    sonuc.push({ tur, kendiNet, persentil: persentilHesapla(kendiNet, digerDegerler), temel: "yaklasik" });
  }
  return sonuc;
}
