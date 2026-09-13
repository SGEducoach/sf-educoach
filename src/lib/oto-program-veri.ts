import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { konuHakimiyetiGetir } from "@/lib/konu-hakimiyeti";
import { oncelikSiralamasiOlustur } from "@/lib/analiz-motoru";
import { TYT_DERSLERI, AYT_DERSLERI, dokuzOnSinifMi } from "@/lib/types";
import type { AytAlan, GorevDurumu } from "@/lib/types";
import { bugununTarihiTR } from "@/lib/tarih";
import { gunEkle } from "@/lib/oto-program";
import type { BlokTuru, DoluAralik, OtoProgramAyari, OtoProgramVerisi, ProgramKapsami, SabitGorev } from "@/lib/oto-program";

type SupabaseSunucu = Awaited<ReturnType<typeof createClient>>;

function tek<T>(deger: T | T[] | null | undefined): T | null {
  if (deger == null) return null;
  return Array.isArray(deger) ? (deger[0] ?? null) : deger;
}

const saat = (deger: string | null | undefined) => (deger ? deger.slice(0, 5) : null);

// SeFu Oto Program için öğrencinin verisi (öğrencinin kendi oturumuyla, RLS
// altında): ders havuzu, zayıflık önceliğine göre konu sırası (yarım kalan
// konular önde), program döneminde dolu saatler, programa yerleştirilecek
// saatsiz öğretmen ödevleri ve son onaylanan program (taşıma için).
// Aynı döneme uygulanmış önceki oto programın BEKLEYEN kalemleri dolu
// sayılmaz — yeni program onaylanınca onların yerini alır.
export async function otoProgramVerisiGetir(
  supabase: SupabaseSunucu,
  userId: string,
  baslangicTarihi: string,
  haftaSayisi: number,
): Promise<{ error: string | null; veri: OtoProgramVerisi | null }> {
  const { data: ogrenci } = await supabase
    .from("students")
    .select("ayt_alan, classes(seviye), schools(tur)")
    .eq("id", userId)
    .maybeSingle();
  if (!ogrenci) return { error: "Öğrenci profili bulunamadı.", veri: null };

  type OgrenciSatiri = { ayt_alan: AytAlan; classes: { seviye: string } | { seviye: string }[] | null; schools: { tur: string } | { tur: string }[] | null };
  const o = ogrenci as unknown as OgrenciSatiri;
  const seviye = tek(o.classes)?.seviye ?? null;
  const dershaneMi = tek(o.schools)?.tur === "dershane";
  const dokuzOnMu = dokuzOnSinifMi(seviye);
  const dersListesi = dokuzOnMu
    ? [...TYT_DERSLERI]
    : [...TYT_DERSLERI, ...(AYT_DERSLERI[o.ayt_alan] ?? []).filter((d) => !TYT_DERSLERI.includes(d as typeof TYT_DERSLERI[number]))];

  const bugun = bugununTarihiTR();
  const donemSonu = gunEkle(baslangicTarihi, haftaSayisi * 7 - 1);
  const odevAltSiniri = baslangicTarihi > bugun ? baslangicTarihi : bugun;

  const [hakimiyet, { data: sonProgramHam }, { data: programKalemleri }, { data: saatliOdevler }, { data: etkinlikler }, { data: saatsizOdevler }] = await Promise.all([
    konuHakimiyetiGetir(supabase, userId, seviye, o.ayt_alan, dokuzOnMu, dershaneMi),
    supabase.from("ogrenci_oto_programlari")
      .select("id, ayar, baslangic_tarihi, bitis_tarihi, kapsam")
      .eq("student_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("gorev_atamalari")
      .select("durum, ogrenci_tarih, ogrenci_baslangic_saat, ogrenci_bitis_saat, gorevler!inner(oto_program_id)")
      .eq("student_id", userId)
      .eq("programa_eklendi_mi", true)
      .gte("ogrenci_tarih", baslangicTarihi)
      .lte("ogrenci_tarih", donemSonu),
    supabase.from("gorev_atamalari")
      .select("gorevler!inner(tarih, baslangic_saat, bitis_saat)")
      .eq("student_id", userId)
      .eq("programa_eklendi_mi", false)
      .not("gorevler.baslangic_saat", "is", null)
      .gte("gorevler.tarih", baslangicTarihi)
      .lte("gorevler.tarih", donemSonu),
    supabase.from("etkinlik_calisma_atamalari")
      .select("etkinlik_calismalari!inner(tarih, baslangic_saat, bitis_saat)")
      .eq("student_id", userId)
      .eq("durum", "kabul")
      .gte("etkinlik_calismalari.tarih", baslangicTarihi)
      .lte("etkinlik_calismalari.tarih", donemSonu),
    supabase.from("gorev_atamalari")
      .select("id, gorevler!inner(tur, ders, konu, tarih, son_tarih, baslangic_saat, olusturan_ogretmen_id)")
      .eq("student_id", userId)
      .eq("programa_eklendi_mi", false)
      .eq("durum", "bekliyor")
      .is("gorevler.baslangic_saat", null)
      .not("gorevler.olusturan_ogretmen_id", "is", null)
      .in("gorevler.tur", ["konu", "soru"])
      .lte("gorevler.tarih", donemSonu)
      .gte("gorevler.son_tarih", odevAltSiniri),
  ]);

  // Konu sırası: analiz motorunun öncelik sıralaması (zayıf + uzun süredir
  // çalışılmamış + ders ağırlığı), "gerek yok" işaretliler hariç.
  const gerekYok = new Set(hakimiyet.filter((s) => s.tekrarDurumu === "gerek_yok").map((s) => `${s.ders}|${s.konu}`));
  const konuKuyruklari: Record<string, string[]> = {};
  const oncelik = oncelikSiralamasiOlustur(hakimiyet.map((s) => ({
    ders: s.ders, ustKonu: s.ustKonu, konu: s.konu, seviye: s.seviye, masterySkoru: s.masterySkoru, guncellenmeTarihi: s.guncellenmeTarihi,
  })));
  for (const satir of oncelik) {
    if (!dersListesi.includes(satir.ders) || gerekYok.has(`${satir.ders}|${satir.konu}`)) continue;
    const kuyruk = (konuKuyruklari[satir.ders] ??= []);
    if (!kuyruk.includes(satir.konu)) kuyruk.push(satir.konu);
  }

  type SonProgramSatiri = { id: string; ayar: OtoProgramAyari; baslangic_tarihi: string; bitis_tarihi: string; kapsam: ProgramKapsami };
  const sonProgramSatiri = sonProgramHam as SonProgramSatiri | null;
  if (sonProgramSatiri) {
    // Son programda yarım kalan konular (geçmişte tamamlanmamış ya da bu
    // dönemde değiştirilecek olanlar) sıranın başına.
    const { data: yarimHam } = await supabase
      .from("gorevler")
      .select("ders, konu, tarih, gorev_atamalari(durum)")
      .eq("oto_program_id", sonProgramSatiri.id)
      .eq("tur", "konu")
      .not("konu", "is", null)
      .order("tarih", { ascending: false });
    type YarimSatir = { ders: string; konu: string; tarih: string; gorev_atamalari: { durum: GorevDurumu } | { durum: GorevDurumu }[] | null };
    for (const r of (yarimHam ?? []) as unknown as YarimSatir[]) {
      if (tek(r.gorev_atamalari)?.durum === "tamamlandi") continue;
      if (!(r.tarih < bugun || (r.tarih >= baslangicTarihi && r.tarih <= donemSonu))) continue;
      if (gerekYok.has(`${r.ders}|${r.konu}`)) continue;
      const kuyruk = (konuKuyruklari[r.ders] ??= []).filter((k) => k !== r.konu);
      konuKuyruklari[r.ders] = [r.konu, ...kuyruk];
    }
  }

  const doluAraliklar: DoluAralik[] = [];
  let degisecekKalemSayisi = 0;
  type ProgramKalemi = { durum: GorevDurumu; ogrenci_tarih: string; ogrenci_baslangic_saat: string | null; ogrenci_bitis_saat: string | null; gorevler: { oto_program_id: string | null } | { oto_program_id: string | null }[] | null };
  for (const k of (programKalemleri ?? []) as unknown as ProgramKalemi[]) {
    if (tek(k.gorevler)?.oto_program_id && k.durum === "bekliyor") {
      degisecekKalemSayisi++;
      continue;
    }
    const baslangic = saat(k.ogrenci_baslangic_saat);
    const bitis = saat(k.ogrenci_bitis_saat);
    if (baslangic && bitis) doluAraliklar.push({ tarih: k.ogrenci_tarih, baslangic, bitis });
  }
  type SaatliSatir<A extends string> = { [K in A]: { tarih: string; baslangic_saat: string | null; bitis_saat: string | null } | { tarih: string; baslangic_saat: string | null; bitis_saat: string | null }[] | null };
  for (const r of (saatliOdevler ?? []) as unknown as SaatliSatir<"gorevler">[]) {
    const g = tek(r.gorevler);
    const baslangic = saat(g?.baslangic_saat);
    const bitis = saat(g?.bitis_saat);
    if (g && baslangic && bitis) doluAraliklar.push({ tarih: g.tarih, baslangic, bitis });
  }
  for (const r of (etkinlikler ?? []) as unknown as SaatliSatir<"etkinlik_calismalari">[]) {
    const e = tek(r.etkinlik_calismalari);
    const baslangic = saat(e?.baslangic_saat);
    const bitis = saat(e?.bitis_saat);
    if (e && baslangic && bitis) doluAraliklar.push({ tarih: e.tarih, baslangic, bitis });
  }

  type SaatsizSatir = { id: string; gorevler: { tur: BlokTuru; ders: string; konu: string | null; tarih: string; son_tarih: string } | { tur: BlokTuru; ders: string; konu: string | null; tarih: string; son_tarih: string }[] | null };
  const sabitGorevler: SabitGorev[] = ((saatsizOdevler ?? []) as unknown as SaatsizSatir[]).flatMap((r) => {
    const g = tek(r.gorevler);
    return g ? [{ atamaId: r.id, tur: g.tur, ders: g.ders, konu: g.konu, tarih: g.tarih, sonTarih: g.son_tarih }] : [];
  });

  return {
    error: null,
    veri: {
      bugun,
      baslangicTarihi,
      haftaSayisi,
      okulOgrencisi: !dershaneMi,
      dersListesi,
      konuKuyruklari,
      doluAraliklar,
      sabitGorevler,
      degisecekKalemSayisi,
      sonProgram: sonProgramSatiri
        ? { ayar: sonProgramSatiri.ayar, baslangicTarihi: sonProgramSatiri.baslangic_tarihi, bitisTarihi: sonProgramSatiri.bitis_tarihi, kapsam: sonProgramSatiri.kapsam }
        : null,
    },
  };
}
