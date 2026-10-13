import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calismaOzeti } from "@/lib/ortaokul-calisma";
import type { CalismaKaydi, CalismaOzeti } from "@/lib/ortaokul-calisma";
import { temaYeterlilikleri } from "@/lib/ortaokul-yeterlilik";
import type { TemaYeterliligi, YeterlilikKarari } from "@/lib/ortaokul-yeterlilik";
import type { OrtaokulBolum } from "@/lib/ortaokul-bolum";
import { seviyeEtiketi, seviyeNormalize } from "@/lib/kademe";
import { ortaokulDersKarsilastir } from "@/lib/ortaokul-ders-sirasi";

// Maarif | LGS ekranlarının sorguları (migration 0132). Şekillendirme saf
// tarafta: ortaokul-calisma.ts, ortaokul-yeterlilik.ts.
//
// Tablolar authenticated'a RLS ile açık; servis anahtarı KULLANILMIYOR —
// "öğrenci yeterliliğe karar vermez" kuralı RLS'te duruyor, burada tekrar
// edilen bir kontrole güvenilmiyor.

export interface DersSecenegi {
  id: string;
  ad: string;
  temalar: KonuSecenegi[];
  gizliTemalar?: KonuSecenegi[];
}

export interface KonuSecenegi {
  id: string;
  ad: string | null;
  kod: string;
  kaynakAd?: string | null;
  kurumaOzel?: boolean;
}

// Öğrencinin sınıfındaki dersler + temaları (çalışma kaydı ve yeterlilik
// ekranının ortak seçim kaynağı).
export async function ortaokulDersTemaSecenekleri(
  supabase: SupabaseClient,
  sinifSeviyesi: string | null | undefined,
  schoolId?: string | null,
  bolum: OrtaokulBolum = "maarif",
): Promise<DersSecenegi[]> {
  const seviye = seviyeNormalize(sinifSeviyesi);
  if (!seviye) return [];

  const { data: surum } = await supabase
    .from("ortaokul_mufredat_surumleri").select("id").eq("durum", "aktif").maybeSingle();
  if (!surum?.id) return [];

  const { data: dersler } = await supabase
    .from("ortaokul_mufredat_dersleri")
    .select("id, ad, sira")
    .eq("surum_id", surum.id)
    .eq("sinif_seviyesi", seviye);

  type Satir = { id: string; ad: string; sira: number };
  type Tema = { id: string; ders_id: string; ad: string | null; kod: string; sira: number; school_id: string | null };
  type Duzenleme = { tema_id: string; ad: string | null; aktif: boolean };
  const dersSatirlari = (dersler ?? []) as Satir[];
  if (dersSatirlari.length === 0) return [];
  const { data: temaData } = await supabase.from("ortaokul_mufredat_temalari")
    .select("id, ders_id, ad, kod, sira, school_id")
    .in("ders_id", dersSatirlari.map((d) => d.id));
  const temalar = ((temaData ?? []) as Tema[]).filter((t) => t.school_id === null || (bolum === "lgs" && t.school_id === schoolId));
  const { data: duzenlemeData } = schoolId && bolum === "lgs" && temalar.length > 0
    ? await supabase.from("ortaokul_sinava_dogru_konu_duzenlemeleri")
      .select("tema_id, ad, aktif").eq("school_id", schoolId)
      .in("tema_id", temalar.map((t) => t.id))
    : { data: [] };
  const duzenlemeler = new Map(((duzenlemeData ?? []) as Duzenleme[]).map((d) => [d.tema_id, d]));

  // Ders sırası KULLANICI KARARINDAN gelir (Türkçe, Matematik, Fen, Sosyal,
  // İngilizce, Din) — mufredat tablosundaki `sira` kolonu değerleri eşit
  // olduğu için eskiden alfabetik sıralanıyordu ve Din başta, Türkçe sonda
  // çıkıyordu (bkz. ortaokul-ders-sirasi.ts).
  return dersSatirlari
    .sort((a, b) => ortaokulDersKarsilastir(a.ad, b.ad))
    .map((d) => {
      const satirlar = temalar.filter((t) => t.ders_id === d.id)
        .sort((a, b) => a.sira - b.sira || a.kod.localeCompare(b.kod, "tr"));
      const konu = (t: Tema): KonuSecenegi => ({
        id: t.id, ad: duzenlemeler.get(t.id)?.ad ?? t.ad, kod: t.kod,
        kaynakAd: t.ad, kurumaOzel: t.school_id !== null,
      });
      return {
        id: d.id, ad: d.ad,
        temalar: satirlar.filter((t) => duzenlemeler.get(t.id)?.aktif !== false).map(konu),
        gizliTemalar: bolum === "lgs" ? satirlar.filter((t) => duzenlemeler.get(t.id)?.aktif === false).map(konu) : [],
      };
    });
}

// Öğretmenin "Ödev ver" formu için ortaokul konu havuzu.
//
// Form zaten `{ ders, konu, seviye }` şeklinde bir liste süzüyor (lise
// MUFREDAT_KONULARI); ortaokul müfredatı AYNI ŞEKLE çevrilince formun süzme
// mantığı değişmeden çalışıyor. `seviye` "5. Sınıf" biçiminde olmalı —
// formun seviye karşılaştırması bu kalıba bakıyor.
//
// Kullanıcı bildirimi (02.10.2026): "ödev ver lise branş listesi gibi
// açılıyor, ve konular açık değil" — sebebi buydu: ortaokul öğretmenine lise
// konu havuzu veriliyordu, 5-8 için hiç eşleşme çıkmıyordu.
export async function ortaokulKonuHavuzu(
  supabase: SupabaseClient,
  seviyeler: readonly string[],
): Promise<{ ders: string; konu: string; seviye: string }[]> {
  const temiz = [...new Set(seviyeler.map((s) => seviyeNormalize(s)).filter((s): s is string => !!s))];
  if (temiz.length === 0) return [];

  const { data: surum } = await supabase
    .from("ortaokul_mufredat_surumleri").select("id").eq("durum", "aktif").maybeSingle();
  if (!surum?.id) return [];

  const { data } = await supabase
    .from("ortaokul_mufredat_dersleri")
    .select("ad, sinif_seviyesi, sira, ortaokul_mufredat_temalari(ad, kod, sira)")
    .eq("surum_id", surum.id)
    .in("sinif_seviyesi", temiz);

  type Satir = {
    ad: string; sinif_seviyesi: string; sira: number;
    ortaokul_mufredat_temalari: { ad: string | null; kod: string; sira: number }[] | null;
  };

  const havuz: { ders: string; konu: string; seviye: string }[] = [];
  for (const d of ((data ?? []) as unknown as Satir[]).sort((a, b) => a.sira - b.sira || a.ad.localeCompare(b.ad, "tr"))) {
    for (const t of [...(d.ortaokul_mufredat_temalari ?? [])].sort((a, b) => a.sira - b.sira)) {
      havuz.push({
        ders: d.ad,
        // Adı çıkarılamamış tema için kod gösterilir; boş bırakmaktan iyi.
        konu: t.ad?.trim() ? t.ad : t.kod,
        seviye: seviyeEtiketi(d.sinif_seviyesi),
      });
    }
  }
  return havuz;
}

// ---- Öğrenci çalışma kayıtları ----

export interface CalismaVerisi {
  kayitlar: CalismaKaydi[];
  ozet: CalismaOzeti;
}

interface CalismaSatiri {
  id: string; bolum: OrtaokulBolum; tur: string; tarih: string; tema_id: string | null;
  sure_dakika: number | null; dogru: number | null; yanlis: number | null; bos: number | null;
  ortaokul_mufredat_dersleri: { ad: string } | null;
  ortaokul_mufredat_temalari: { ad: string | null; kod: string } | null;
}

export async function ortaokulCalismalariGetir(
  supabase: SupabaseClient,
  studentId: string,
  bolum: OrtaokulBolum,
  baslangic: string,
  schoolId?: string | null,
): Promise<CalismaVerisi> {
  const { data } = await supabase
    .from("ortaokul_calismalar")
    .select("id, bolum, tur, tarih, tema_id, sure_dakika, dogru, yanlis, bos, ortaokul_mufredat_dersleri(ad), ortaokul_mufredat_temalari(ad, kod)")
    .eq("student_id", studentId)
    .eq("bolum", bolum)
    .gte("tarih", baslangic)
    .order("tarih", { ascending: false })
    .order("created_at", { ascending: false });

  const temaIdleri = [...new Set(((data ?? []) as unknown as CalismaSatiri[]).map((s) => s.tema_id).filter((id): id is string => !!id))];
  const { data: duzenlemeData } = schoolId && bolum === "lgs" && temaIdleri.length > 0
    ? await supabase.from("ortaokul_sinava_dogru_konu_duzenlemeleri")
      .select("tema_id, ad").eq("school_id", schoolId).in("tema_id", temaIdleri)
    : { data: [] };
  const adlar = new Map(((duzenlemeData ?? []) as { tema_id: string; ad: string | null }[]).map((d) => [d.tema_id, d.ad]));

  // Gömülü ilişki çalışma anında NESNE döner (bkz. proje notu).
  const kayitlar: CalismaKaydi[] = ((data ?? []) as unknown as CalismaSatiri[]).map((s) => ({
    id: s.id,
    bolum: s.bolum,
    tur: s.tur === "soru" ? "soru" : "konu",
    dersAdi: s.ortaokul_mufredat_dersleri?.ad ?? "Ders",
    temaAdi: s.ortaokul_mufredat_temalari
      ? (adlar.get(s.tema_id ?? "") || s.ortaokul_mufredat_temalari.ad?.trim() || s.ortaokul_mufredat_temalari.kod)
      : null,
    tarih: s.tarih,
    sureDakika: s.sure_dakika,
    dogru: s.dogru,
    yanlis: s.yanlis,
    bos: s.bos,
  }));

  return { kayitlar, ozet: calismaOzeti(kayitlar) };
}

// ---- Yeterlilik kararları ----

interface YeterlilikSatiri {
  tema_id: string; bolum: OrtaokulBolum; durum: string;
  aciklama: string | null; guncellenme_at: string; karar_veren_id: string;
}

// Bir öğrencinin bir dersteki temaları + o bölümdeki kararlar.
export async function ortaokulYeterlilikGetir(
  supabase: SupabaseClient,
  studentId: string,
  ders: DersSecenegi,
  bolum: OrtaokulBolum,
): Promise<TemaYeterliligi[]> {
  if (ders.temalar.length === 0) return [];

  const { data } = await supabase
    .from("ortaokul_konu_yeterlilikleri")
    .select("tema_id, bolum, durum, aciklama, guncellenme_at, karar_veren_id")
    .eq("student_id", studentId)
    .eq("bolum", bolum)
    .in("tema_id", ders.temalar.map((t) => t.id));

  const satirlar = (data ?? []) as unknown as YeterlilikSatiri[];

  // Karar veren öğretmenlerin adı: öğrenci de öğretmen de kimin karar
  // verdiğini görsün.
  const idler = [...new Set(satirlar.map((s) => s.karar_veren_id))];
  const adlar = new Map<string, string>();
  if (idler.length > 0) {
    const { data: profiller } = await supabase.from("profiles").select("id, ad").in("id", idler);
    for (const p of ((profiller ?? []) as { id: string; ad: string | null }[])) {
      if (p.ad) adlar.set(p.id, p.ad);
    }
  }

  const kararlar: YeterlilikKarari[] = satirlar.flatMap((s) => {
    const durum = s.durum;
    if (!["baslamadi", "ogreniyor", "biraz_pratik", "saglamlastirdi", "tekrar_zamani"].includes(durum)) return [];
    return [{
      temaId: s.tema_id,
      bolum: s.bolum,
      durum: durum as YeterlilikKarari["durum"],
      kararVerenAdi: adlar.get(s.karar_veren_id) ?? null,
      aciklama: s.aciklama,
      guncellenmeTarihi: s.guncellenme_at,
    }];
  });

  return temaYeterlilikleri(ders.temalar, kararlar, bolum);
}
