import type { SupabaseClient } from "@supabase/supabase-js";
import { ortaokulCalismaOnayYetkisi } from "@/lib/ortaokul-calisma-onay";
import type { DersAtamasi } from "@/lib/ortaokul-calisma-onay";
import type { OrtaokulBolum } from "@/lib/ortaokul-bolum";
import type { CalismaTuru } from "@/lib/ortaokul-calisma";

export interface OrtaokulBekleyenCalisma {
  id: string;
  studentId: string;
  ogrenciAdi: string;
  sinifAdi: string;
  bolum: OrtaokulBolum;
  tur: CalismaTuru;
  dersAdi: string;
  konuAdi: string | null;
  altBaslik: string | null;
  tarih: string;
  sureDakika: number | null;
  dogru: number | null;
  yanlis: number | null;
  bos: number | null;
}

// Yönetici istemcisi yalnız sunucu tarafında kullanılır. Sınıf ve ders
// yetkileri uygulanmadan hiçbir öğrenci kaydı istemciye döndürülmez.
export async function ortaokulBekleyenCalismalarGetir(
  admin: SupabaseClient,
  girdi: { teacherId: string; schoolId: string; kendiSinifId: string | null },
): Promise<OrtaokulBekleyenCalisma[]> {
  const { data: kendiAtamalari } = await admin.from("ogretmen_dersleri")
    .select("teacher_id, class_id, ders").eq("teacher_id", girdi.teacherId);
  const sinifIdleri = [...new Set([
    girdi.kendiSinifId,
    ...((kendiAtamalari ?? []) as DersAtamasi[]).map((a) => a.class_id),
  ].filter((id): id is string => !!id))];
  if (sinifIdleri.length === 0) return [];

  const [{ data: ogrenciData }, { data: tumAtamalar }] = await Promise.all([
    admin.from("students")
      .select("id, class_id, profiles!students_id_fkey(ad), classes(seviye, sube)")
      .eq("school_id", girdi.schoolId).in("class_id", sinifIdleri),
    admin.from("ogretmen_dersleri")
      .select("teacher_id, class_id, ders").in("class_id", sinifIdleri),
  ]);
  type Ogrenci = { id: string; class_id: string; profiles: { ad: string } | null; classes: { seviye: string; sube: string } | null };
  const ogrenciler = (ogrenciData ?? []) as unknown as Ogrenci[];
  if (ogrenciler.length === 0) return [];
  const ogrenciMap = new Map(ogrenciler.map((o) => [o.id, o]));
  const atamalar = (tumAtamalar ?? []) as DersAtamasi[];

  const kayitData: unknown[] = [];
  for (let ilk = 0; ; ilk += 500) {
    const { data, error } = await admin.from("ortaokul_calismalar")
      .select("id, student_id, bolum, tur, tarih, sure_dakika, dogru, yanlis, bos, alt_baslik, ortaokul_mufredat_dersleri(ad), ortaokul_mufredat_temalari(ad, kod)")
      .in("student_id", ogrenciler.map((o) => o.id))
      .eq("onaylandi_mi", false)
      .order("created_at", { ascending: false })
      .range(ilk, ilk + 499);
    if (error) throw new Error("Bekleyen çalışmalar okunamadı.");
    kayitData.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  type Kayit = {
    id: string; student_id: string; bolum: OrtaokulBolum; tur: CalismaTuru; tarih: string;
    sure_dakika: number | null; dogru: number | null; yanlis: number | null; bos: number | null;
    alt_baslik: string | null;
    ortaokul_mufredat_dersleri: { ad: string } | null;
    ortaokul_mufredat_temalari: { ad: string | null; kod: string } | null;
  };
  return (kayitData as Kayit[]).flatMap((k) => {
    const ogrenci = ogrenciMap.get(k.student_id);
    const dersAdi = k.ortaokul_mufredat_dersleri?.ad;
    if (!ogrenci || !dersAdi || !ortaokulCalismaOnayYetkisi({
      teacherId: girdi.teacherId,
      kendiSinifId: girdi.kendiSinifId,
      ogrenciSinifId: ogrenci.class_id,
      dersAdi,
      atamalar,
    })) return [];
    return [{
      id: k.id, studentId: k.student_id,
      ogrenciAdi: ogrenci.profiles?.ad ?? "İsimsiz",
      sinifAdi: ogrenci.classes ? `${ogrenci.classes.seviye}-${ogrenci.classes.sube}` : "—",
      bolum: k.bolum, tur: k.tur, dersAdi,
      konuAdi: k.ortaokul_mufredat_temalari?.ad?.trim() || k.ortaokul_mufredat_temalari?.kod || null,
      altBaslik: k.alt_baslik,
      tarih: k.tarih, sureDakika: k.sure_dakika,
      dogru: k.dogru, yanlis: k.yanlis, bos: k.bos,
    }];
  });
}
