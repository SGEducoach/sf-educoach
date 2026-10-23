import type { SupabaseClient } from "@supabase/supabase-js";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import {
  anaSayfaSerileriHesapla, HAFTA_GUN, HAFTA_SAYISI,
  type DenemeGirdisi, type DershaneAnaSayfaVerisi, type OgrenciGirdisi, type SoruGirdisi,
} from "@/lib/dershane-ana-sayfa-hesap";

export type {
  DershaneAnaSayfaVerisi, HaftalikNokta, SoruNoktasi, NetSerileri, SoruSerileri, NetTuru,
} from "@/lib/dershane-ana-sayfa-hesap";

// Dershane müdürü "Ana Sayfa" — kurum geneli + kademe (9./10./11./12.
// sınıf) bazlı haftalık performans. Kullanıcı isteği: "genel kurum
// performansı, kademeye bağlı performans... bu hafta çözülen toplam soru
// sayısı, tüm kurumun genel net ortalaması, kademe düzeyinde net
// ortalaması gibi verileri haftalık grafik olarak görecek." — son 8
// hafta (kullanıcı onayı), kayan 7 günlük pencereler (analiz.ts'teki
// "bu hafta" = son 7 gün deseniyle tutarlı, takvim haftası değil).
//
// Hesabın kendisi dershane-ana-sayfa-hesap.ts'te (saf, test edilebilir):
// net serileri deneme TÜRÜNE göre (TYT/AYT) ayrı üretilir, kapsamı yetersiz
// hafta ortalama taşımaz. Burası yalnız veriyi çeker.
export async function dershaneAnaSayfaVerisiGetir(
  admin: SupabaseClient,
  schoolId: string,
  izinliSeviyeler?: string[],
): Promise<DershaneAnaSayfaVerisi> {
  const bugun = bugununTarihiTR();
  const baslangicTarihi = tarihEkle(bugun, -(HAFTA_SAYISI * HAFTA_GUN - 1));

  const { data: ogrencilerHam } = await admin
    .from("students")
    .select("id, classes(id,seviye,sube)")
    .eq("school_id", schoolId);
  type OgrenciRow = { id: string; classes: { id: string; seviye: string; sube: string } | null };
  const ogrenciler: OgrenciGirdisi[] = ((ogrencilerHam ?? []) as unknown as OgrenciRow[])
    .filter((o) => !izinliSeviyeler || (o.classes && izinliSeviyeler.includes(o.classes.seviye)))
    .map((o) => ({
      id: o.id,
      seviye: o.classes?.seviye ?? null,
      sinifId: o.classes?.id ?? null,
      sinifAd: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : null,
    }));
  const studentIds = ogrenciler.map((o) => o.id);

  let denemeler: DenemeGirdisi[] = [];
  let sorular: SoruGirdisi[] = [];
  if (studentIds.length > 0) {
    type DenemeRow = { student_id: string; tarih: string; tur: string; deneme_ders_sonuclari: { dogru: number; yanlis: number }[] | null };
    type SoruRow = { student_id: string; tarih: string; dogru: number; yanlis: number };
    const [{ data: denemelerHam }, { data: sorularHam }] = await Promise.all([
      admin.from("denemeler").select("student_id, tarih, tur, deneme_ders_sonuclari(dogru, yanlis)")
        .in("student_id", studentIds).gte("tarih", baslangicTarihi),
      admin.from("soru_cozumleri").select("student_id, tarih, dogru, yanlis")
        .in("student_id", studentIds).gte("tarih", baslangicTarihi),
    ]);
    denemeler = ((denemelerHam ?? []) as unknown as DenemeRow[]).map((d) => ({
      studentId: d.student_id, tarih: d.tarih, tur: d.tur, dersler: d.deneme_ders_sonuclari ?? [],
    }));
    sorular = ((sorularHam ?? []) as unknown as SoruRow[]).map((s) => ({
      studentId: s.student_id, tarih: s.tarih, dogru: s.dogru, yanlis: s.yanlis,
    }));
  }

  return anaSayfaSerileriHesapla(bugun, ogrenciler, denemeler, sorular);
}
