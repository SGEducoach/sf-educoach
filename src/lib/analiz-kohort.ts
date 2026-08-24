// Analiz Motoru Faz A5 — Katman 6 (kohort karşılaştırması) veri katmanı.
//
// BİLİNÇLİ TASARIM KARARI: bu YENİ bir SECURITY DEFINER RPC olarak
// açılmadı — konu_zayiflik_raporu (migration 0058) deseninin aksine, düz
// bir sorgu (analizVerisiGetir ile aynı yaklaşım): çağıranın supabase
// client'ına (öğretmen/müdür'ün RLS-scoped client'ı VEYA admin'in
// service-role client'ı) güveniyor. Bunun güvenli olma nedeni: mevcut RLS
// zaten "herhangi bir öğretmen herhangi bir öğrenciyi görebilir" politikasını
// kuruyor (denemeler_select_any_teacher / students_select_any_teacher, bkz.
// schema.sql) — bu fonksiyon o kapsamı GENİŞLETMİYOR, sadece zaten erişilebilir
// veriyi kohort istatistiğine dönüştürüyor. Öğrencinin KENDİ (RLS-scoped)
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
import { netHesapla } from "@/lib/types";
import { persentilHesapla } from "@/lib/analiz-motoru";
import type { PersentilSonucu } from "@/lib/analiz-motoru";

export interface KohortKarsilastirmaSatiri {
  tur: "TYT" | "AYT";
  kendiNet: number;
  persentil: PersentilSonucu;
}

export async function kohortKarsilastirmasiGetir(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
): Promise<KohortKarsilastirmaSatiri[]> {
  const { data: ogrenciRow } = await supabase.from("students").select("class_id").eq("id", studentId).maybeSingle();
  const classId = (ogrenciRow as { class_id: string | null } | null)?.class_id ?? null;
  if (!classId) return [];

  const { data: sinifOgrencileri } = await supabase.from("students").select("id").eq("class_id", classId);
  const sinifIdleri = ((sinifOgrencileri ?? []) as { id: string }[]).map((s) => s.id);
  // k-anonymity ön-kontrolü: kendisi + en az 3 sınıf arkadaşı olmadan
  // sorguyu bile çalıştırmaya gerek yok (persentilHesapla zaten tür bazında
  // aynı eşiği tekrar uygular, bu sadece ucuz bir kısa devre).
  if (sinifIdleri.length < 4) return [];

  const { data: denemeler } = await supabase
    .from("denemeler")
    .select("student_id, tarih, tur, deneme_ders_sonuclari(dogru, yanlis)")
    .in("student_id", sinifIdleri)
    .order("tarih");

  type Row = { student_id: string; tarih: string; tur: "TYT" | "AYT"; deneme_ders_sonuclari: { dogru: number; yanlis: number }[] };
  const liste = (denemeler as unknown as Row[]) ?? [];

  // Her (student_id, tur) için EN SON net — liste zaten tarihe göre artan
  // sıralı (denemeler .order("tarih")), bu yüzden Map'e sırayla yazmak
  // otomatik olarak "en son" değeri bırakır.
  const sonNetMap = new Map<string, number>();
  for (const d of liste) {
    const net = d.deneme_ders_sonuclari.reduce((t, s) => t + netHesapla(s.dogru, s.yanlis), 0);
    sonNetMap.set(`${d.student_id}|${d.tur}`, Math.round(net * 100) / 100);
  }

  const sonuc: KohortKarsilastirmaSatiri[] = [];
  for (const tur of ["TYT", "AYT"] as const) {
    const kendiNet = sonNetMap.get(`${studentId}|${tur}`);
    if (kendiNet === undefined) continue; // öğrencinin bu türde hiç denemesi yok — karşılaştırılacak bir şey yok
    const digerDegerler: number[] = [];
    for (const id of sinifIdleri) {
      if (id === studentId) continue;
      const net = sonNetMap.get(`${id}|${tur}`);
      if (net !== undefined) digerDegerler.push(net);
    }
    sonuc.push({ tur, kendiNet, persentil: persentilHesapla(kendiNet, digerDegerler) });
  }
  return sonuc;
}
