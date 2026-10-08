import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrtaokulBolum } from "@/lib/ortaokul-bolum";
import {
  DESTEK_SIRASI, YETERLILIK_DURUMLARI, yeterlilikDurumuCoz,
  type YeterlilikDurumu,
} from "@/lib/ortaokul-yeterlilik";

// Ortaokul SINIF tema haritası (Faz 2'nin son parçası, 08.10.2026).
//
// SORUN: "Konu Yeterliliği" ekranı TEK ÖĞRENCİ üzerinden çalışıyor. 30
// kişilik bir sınıfta öğretmen "hangi temada sınıfın yarısı zayıf?"
// sorusunu ancak 30 öğrenciyi tek tek açarak cevaplayabiliyordu. Rehber
// Radarı'nda çözülen sorunun aynısı: öğrenci bazlı görünüm VAR, kesişen
// görünüm YOK.
//
// Tasarım dili ortaokul panelinin kendi ilkelerine BİREBİR uyuyor:
//   * "karar verilmemiş" AYRI bir sütun — "başlamadı" SAYILMAZ. Öğretmen
//     henüz bakmadı demektir, bu iki şey farklı (bkz. TemaYeterliligi).
//   * "başarısız" diye bir durum yok; destek dili kullanılıyor.
//   * "destek gereken" tanımı ortaokul-yeterlilik.ts'teki DESTEK_SIRASI'ndan
//     geliyor — iki yerde ayrı tanımlanırsa ekranlar birbirini yalanlar.
//
// Bu dosya YALNIZCA ortaokul tablolarını okur; lise/ortak akışlara dokunmaz.

export interface SinifTemaSatiri {
  temaId: string;
  temaAdi: string;
  // Sınıfın mevcudu (karar verilmiş + verilmemiş toplamı).
  ogrenciSayisi: number;
  durumSayilari: Record<YeterlilikDurumu, number>;
  kararVerilmemis: number;
  // O temada en az bir çalışma kaydı olan AYRI öğrenci sayısı (kayıt değil).
  calisanOgrenci: number;
  destekGereken: number;
}

export interface SinifTemaHaritasi {
  sinifAdi: string;
  ogrenciSayisi: number;
  satirlar: SinifTemaSatiri[];
  // Karar verilmiş tema-öğrenci çiftlerinin oranı; öğretmenin ne kadarını
  // değerlendirdiğini söyler. Kapsam dürüstlüğü ilkesi (bkz. lib/kapsam.ts):
  // kapsam düşükken sınıf hakkında yorum yapılmamalı.
  kararKapsami: { verilen: number; toplam: number };
}

function bosSayilar(): Record<YeterlilikDurumu, number> {
  return YETERLILIK_DURUMLARI.reduce((acc, d) => {
    acc[d] = 0;
    return acc;
  }, {} as Record<YeterlilikDurumu, number>);
}

export interface HaritaGirdisi {
  temalar: { id: string; ad: string | null; kod: string }[];
  // Sınıftaki öğrenci sayısı.
  ogrenciSayisi: number;
  // Yalnızca SEÇİLİ bölümün (Maarif|LGS) kararları verilmeli.
  kararlar: { temaId: string; studentId: string; durum: string | null }[];
  // (temaId, studentId) çiftleri — tekilleştirme çağırana ait DEĞİL, burada yapılır.
  calismalar: { temaId: string; studentId: string }[];
}

// Saf toplama — test edilebilir olsun diye sorgudan ayrı.
export function sinifTemaSatirlari(girdi: HaritaGirdisi): SinifTemaSatiri[] {
  const kararHarita = new Map<string, Map<string, YeterlilikDurumu>>();
  for (const k of girdi.kararlar) {
    const durum = yeterlilikDurumuCoz(k.durum);
    if (!durum) continue;
    if (!kararHarita.has(k.temaId)) kararHarita.set(k.temaId, new Map());
    // Aynı öğrenci-tema için son karar kazanır; çağıran sıralı veriyor.
    kararHarita.get(k.temaId)!.set(k.studentId, durum);
  }

  const calismaHarita = new Map<string, Set<string>>();
  for (const c of girdi.calismalar) {
    if (!calismaHarita.has(c.temaId)) calismaHarita.set(c.temaId, new Set());
    calismaHarita.get(c.temaId)!.add(c.studentId);
  }

  return girdi.temalar.map((t) => {
    const kararlar = kararHarita.get(t.id);
    const durumSayilari = bosSayilar();
    for (const durum of kararlar?.values() ?? []) durumSayilari[durum] += 1;
    const kararliOgrenci = kararlar?.size ?? 0;
    const destekGereken = DESTEK_SIRASI.reduce((t2, d) => t2 + durumSayilari[d], 0);
    return {
      temaId: t.id,
      temaAdi: t.ad?.trim() ? t.ad : t.kod,
      ogrenciSayisi: girdi.ogrenciSayisi,
      durumSayilari,
      // Negatife düşmesin: sınıftan ayrılmış öğrencinin kararı kalmış olabilir.
      kararVerilmemis: Math.max(0, girdi.ogrenciSayisi - kararliOgrenci),
      calisanOgrenci: calismaHarita.get(t.id)?.size ?? 0,
      destekGereken,
    };
  }).sort((a, b) =>
    // Öğretmenin müdahale listesi: en çok destek gereken tema başta.
    // Eşitlikte adı sabit tutmak için alfabetik — sıra kararlı kalsın.
    b.destekGereken - a.destekGereken || a.temaAdi.localeCompare(b.temaAdi, "tr"));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export async function sinifTemaHaritasiGetir(
  supabase: Istemci,
  schoolId: string,
  sinifId: string,
  ders: { id: string; temalar: { id: string; ad: string | null; kod: string }[] },
  bolum: OrtaokulBolum,
): Promise<SinifTemaHaritasi | null> {
  const { data: sinifHam } = await supabase
    .from("classes").select("seviye, sube").eq("id", sinifId).eq("school_id", schoolId).maybeSingle();
  if (!sinifHam) return null;
  const sinif = sinifHam as { seviye: string; sube: string };

  const { data: ogrencilerHam } = await supabase
    .from("students").select("id").eq("school_id", schoolId).eq("class_id", sinifId);
  const ogrenciIdleri = ((ogrencilerHam ?? []) as { id: string }[]).map((o) => o.id);

  const temaIdleri = ders.temalar.map((t) => t.id);
  if (ogrenciIdleri.length === 0 || temaIdleri.length === 0) {
    return {
      sinifAdi: `${sinif.seviye}-${sinif.sube}`,
      ogrenciSayisi: ogrenciIdleri.length,
      satirlar: sinifTemaSatirlari({ temalar: ders.temalar, ogrenciSayisi: ogrenciIdleri.length, kararlar: [], calismalar: [] }),
      kararKapsami: { verilen: 0, toplam: ogrenciIdleri.length * temaIdleri.length },
    };
  }

  const [kararlarHam, calismalarHam] = await Promise.all([
    supabase.from("ortaokul_konu_yeterlilikleri")
      .select("tema_id, student_id, durum")
      .in("student_id", ogrenciIdleri).in("tema_id", temaIdleri).eq("bolum", bolum)
      .order("guncellenme_at", { ascending: true }),
    supabase.from("ortaokul_calismalar")
      .select("tema_id, student_id")
      .in("student_id", ogrenciIdleri).in("tema_id", temaIdleri),
  ]);

  const kararlar = ((kararlarHam.data ?? []) as { tema_id: string; student_id: string; durum: string | null }[])
    .map((k) => ({ temaId: k.tema_id, studentId: k.student_id, durum: k.durum }));
  const calismalar = ((calismalarHam.data ?? []) as { tema_id: string | null; student_id: string }[])
    .flatMap((c) => (c.tema_id ? [{ temaId: c.tema_id, studentId: c.student_id }] : []));

  const satirlar = sinifTemaSatirlari({
    temalar: ders.temalar,
    ogrenciSayisi: ogrenciIdleri.length,
    kararlar,
    calismalar,
  });

  const verilen = satirlar.reduce((t, s) => t + (s.ogrenciSayisi - s.kararVerilmemis), 0);
  return {
    sinifAdi: `${sinif.seviye}-${sinif.sube}`,
    ogrenciSayisi: ogrenciIdleri.length,
    satirlar,
    kararKapsami: { verilen, toplam: ogrenciIdleri.length * temaIdleri.length },
  };
}
