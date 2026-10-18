// Yurt listesi stüdyosunun sunucu verisi: resmî öğrenci listesi (ön kayıt)
// + kayıtlı öğrenciler, müdüre öğretmen listesi, kullanıcının cinsiyeti.
// cinsiyet sütunları migration 0161 ile geldi; yoksa cinsiyetsiz okunur.
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  yurtOgrencileriniBirlestir, type KayitliOgrenciSatiri, type OgretmenCinsiyeti, type ResmiYurtSatiri,
} from "@/lib/yurt-listesi";
import type { YurtVerisi } from "@/components/dashboard/YurtListeStudyosu";

async function hepsi<T>(sorgu: (bas: number, son: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<{ satirlar: T[]; hata: string | null }> {
  const satirlar: T[] = [];
  for (let bas = 0; ; bas += 1000) {
    const { data, error } = await sorgu(bas, bas + 999);
    if (error) return { satirlar, hata: error.message };
    const parca = (data ?? []) as T[];
    satirlar.push(...parca);
    if (parca.length < 1000) return { satirlar, hata: null };
  }
}

const ogretmenCinsiyeti = (c: unknown): OgretmenCinsiyeti | null => (c === "kadin" || c === "erkek" ? c : null);

export async function yurtVerisiGetir(admin: SupabaseClient, schoolId: string, userId: string, mudurMu: boolean): Promise<YurtVerisi> {
  const resmiSorgu = (sutunlar: string) => hepsi<ResmiYurtSatiri>((b, s) => admin.from("resmi_ogrenci_listesi").select(sutunlar).eq("school_id", schoolId).order("okul_no").range(b, s));
  const kayitSorgu = (sutunlar: string) => hepsi<{ id: string; okul_no: string | null; yurt_ogrencisi: boolean; cinsiyet?: string | null; profiles: { ad: string } | null; classes: { seviye: string; sube: string } | null }>(
    (b, s) => admin.from("students").select(sutunlar).eq("school_id", schoolId).order("id").range(b, s));

  let cinsiyetHazir = true;
  let resmi = await resmiSorgu("id, ad_soyad, okul_no, yurt_ogrencisi, cinsiyet");
  if (resmi.hata) { cinsiyetHazir = false; resmi = await resmiSorgu("id, ad_soyad, okul_no, yurt_ogrencisi"); }
  const kayitSutun = "id, okul_no, yurt_ogrencisi, profiles!students_id_fkey(ad), classes(seviye, sube)";
  let kayit = await kayitSorgu(cinsiyetHazir ? `${kayitSutun}, cinsiyet` : kayitSutun);
  if (kayit.hata && cinsiyetHazir) { cinsiyetHazir = false; kayit = await kayitSorgu(kayitSutun); }

  const kayitli: KayitliOgrenciSatiri[] = kayit.satirlar.map((k) => ({
    id: k.id, ad: k.profiles?.ad ?? "İsimsiz", okul_no: k.okul_no, yurt_ogrencisi: k.yurt_ogrencisi,
    sinif: k.classes ? `${k.classes.seviye}-${k.classes.sube}` : null, seviye: k.classes?.seviye ?? null, sube: k.classes?.sube ?? null,
    cinsiyet: k.cinsiyet ?? null,
  }));

  const tSutun = cinsiyetHazir ? "id, brans, cinsiyet, profiles!teachers_id_fkey(ad)" : "id, brans, profiles!teachers_id_fkey(ad)";
  type OgretmenRow = { id: string; brans: string | null; cinsiyet?: string | null; profiles: { ad: string } | null };
  const [{ data: ben }, ogretmenler] = await Promise.all([
    admin.from("teachers").select(tSutun).eq("id", userId).maybeSingle(),
    mudurMu ? hepsi<OgretmenRow>((b, s) => admin.from("teachers").select(tSutun).eq("school_id", schoolId).order("id").range(b, s)) : Promise.resolve({ satirlar: [] as OgretmenRow[], hata: null }),
  ]);
  const benimSatirim = ben as OgretmenRow | null;

  return {
    ogrenciler: yurtOgrencileriniBirlestir(resmi.satirlar, kayitli),
    ogretmenler: ogretmenler.satirlar
      .map((t) => ({ id: t.id, ad: t.profiles?.ad ?? "İsimsiz", brans: t.brans, cinsiyet: ogretmenCinsiyeti(t.cinsiyet) }))
      .sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
    benimCinsiyetim: ogretmenCinsiyeti(benimSatirim?.cinsiyet),
    mudurMu,
    hazirlayan: benimSatirim?.profiles?.ad ?? "Nöbetçi öğretmen",
    cinsiyetHazir,
  };
}
