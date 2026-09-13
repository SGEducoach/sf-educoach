import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { gerekYokHaritasiGetir } from "@/lib/konu-hakimiyeti";
import { TYT_DERSLERI, AYT_DERSLERI, dokuzOnSinifMi, maarifHiyerarsiSinifMi } from "@/lib/types";
import type { AytAlan } from "@/lib/types";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

// Dershane rehberlik servisi (kullanıcı isteği 13.09.2026) — rehber öğretmen
// öğrenci adına ödev verir, veri girer, program yapar. Öğrenci tablolarının
// RLS'i yalnızca öğrencinin kendisine ve sınıf öğretmenine yazma izni
// veriyor; rehber işlemleri servis anahtarıyla yazar, yetkiyi burada
// doğrular: öğretmen rolü + Rehber Öğretmen branşı + kurum dershane +
// öğrencilerin hepsi aynı dershanede. Okul rehber öğretmeni kapsam dışı.
export type RehberYetkisi =
  | { error: string; admin: null; rehberId: null; schoolId: null }
  | { error: null; admin: SupabaseClient; rehberId: string; schoolId: string };

const YETKI_MESAJI = "Bu işlem yalnızca dershane rehber öğretmenine açıktır.";

export async function dershaneRehberYetkisi(ogrenciIdleri: string[] = []): Promise<RehberYetkisi> {
  const hata = (error: string): RehberYetkisi => ({ error, admin: null, rehberId: null, schoolId: null });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return hata("Oturum açılmadı.");

  const admin = createAdminClient();
  const [{ data: profil }, { data: ogretmen }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("teachers").select("brans, school_id").eq("id", user.id).maybeSingle(),
  ]);
  if (profil?.role !== "ogretmen" || ogretmen?.brans !== REHBER_BRANSI || !ogretmen.school_id) return hata(YETKI_MESAJI);
  const { data: okul } = await admin.from("schools").select("tur").eq("id", ogretmen.school_id).maybeSingle();
  if (okul?.tur !== "dershane") return hata(YETKI_MESAJI);

  const tekilIdler = [...new Set(ogrenciIdleri)];
  if (tekilIdler.length > 0) {
    const { count, error } = await admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .in("id", tekilIdler)
      .eq("school_id", ogretmen.school_id);
    if (error || count !== tekilIdler.length) return hata("Seçilen öğrencilerden bazıları dershanenize ait değil.");
  }
  return { error: null, admin, rehberId: user.id, schoolId: ogretmen.school_id as string };
}

export interface RehberOgrenci {
  id: string;
  ad: string;
  okulNo: string;
  sinifAdi: string;
}

export interface RehberProgramKalemi {
  atamaId: string;
  tarih: string;
  baslangicSaat: string | null;
  bitisSaat: string | null;
  tur: string;
  ders: string;
  konu: string | null;
  durum: string;
  rehberYerlestirdi: boolean;
}

export interface RehberSecilenOgrenci {
  id: string;
  ad: string;
  sinifAdi: string;
  aytAlan: AytAlan;
  sinifSeviyesi: string | null;
  dersListesi: string[];
  mufredatAltKonulari: { ders: string; ustKonu: string; altBaslik: string }[];
  gerekYokListesi: string[];
  program: RehberProgramKalemi[];
}

function tek<T>(deger: T | T[] | null | undefined): T | null {
  if (deger == null) return null;
  return Array.isArray(deger) ? (deger[0] ?? null) : deger;
}

// "Öğrenci Takibi" ekranının verisi. Çağıran taraf (dashboard/page.tsx)
// rehberin dershane rehberi olduğunu doğruladıktan sonra çağırır; seçilen
// öğrenci yalnızca bu dershanenin listesinde varsa yüklenir.
export async function rehberOgrenciTakibiVerisiGetir(
  schoolId: string,
  secilenOgrenciId?: string,
): Promise<{ ogrenciler: RehberOgrenci[]; secilen: RehberSecilenOgrenci | null }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("students")
    .select("id, okul_no, ayt_alan, classes(seviye, sube), profiles!students_id_fkey(ad)")
    .eq("school_id", schoolId);

  type Satir = {
    id: string; okul_no: string | null; ayt_alan: AytAlan;
    classes: { seviye: string; sube: string } | { seviye: string; sube: string }[] | null;
    profiles: { ad: string | null } | { ad: string | null }[] | null;
  };
  const satirlar = (data ?? []) as unknown as Satir[];
  const sinifAdi = (s: Satir) => {
    const sinif = tek(s.classes);
    return sinif ? `${sinif.seviye}-${sinif.sube}` : "Sınıfsız";
  };
  const ogrenciler = satirlar
    .map((s) => ({ id: s.id, ad: tek(s.profiles)?.ad?.trim() || "İsimsiz öğrenci", okulNo: (s.okul_no ?? "").trim(), sinifAdi: sinifAdi(s) }))
    .sort((a, b) => a.sinifAdi.localeCompare(b.sinifAdi, "tr", { numeric: true }) || a.ad.localeCompare(b.ad, "tr"));

  const ham = secilenOgrenciId ? satirlar.find((s) => s.id === secilenOgrenciId) : undefined;
  if (!ham) return { ogrenciler, secilen: null };

  const seviye = tek(ham.classes)?.seviye ?? null;
  const dersListesi = dokuzOnSinifMi(seviye)
    ? [...TYT_DERSLERI]
    : [...TYT_DERSLERI, ...(AYT_DERSLERI[ham.ayt_alan] ?? []).filter((d) => !TYT_DERSLERI.includes(d as typeof TYT_DERSLERI[number]))];
  const bugun = bugununTarihiTR();

  const [gerekYok, { data: altKonularHam }, { data: programHam }] = await Promise.all([
    gerekYokHaritasiGetir(admin, ham.id),
    maarifHiyerarsiSinifMi(seviye)
      ? admin.from("mufredat_alt_konular").select("ders, ust_konu, alt_baslik").order("sira")
      : Promise.resolve({ data: [] }),
    admin
      .from("gorev_atamalari")
      .select("id, durum, rehber_yerlestirdi, ogrenci_tarih, ogrenci_baslangic_saat, ogrenci_bitis_saat, gorevler!inner(tur, ders, konu)")
      .eq("student_id", ham.id)
      .eq("programa_eklendi_mi", true)
      .gte("ogrenci_tarih", bugun)
      .lte("ogrenci_tarih", tarihEkle(bugun, 13))
      .order("ogrenci_tarih")
      .order("ogrenci_baslangic_saat"),
  ]);

  type ProgramSatiri = {
    id: string; durum: string; rehber_yerlestirdi: boolean;
    ogrenci_tarih: string; ogrenci_baslangic_saat: string | null; ogrenci_bitis_saat: string | null;
    gorevler: { tur: string; ders: string; konu: string | null } | { tur: string; ders: string; konu: string | null }[] | null;
  };
  const program = ((programHam ?? []) as unknown as ProgramSatiri[]).flatMap((p) => {
    const gorev = tek(p.gorevler);
    if (!gorev) return [];
    return [{
      atamaId: p.id, tarih: p.ogrenci_tarih, baslangicSaat: p.ogrenci_baslangic_saat, bitisSaat: p.ogrenci_bitis_saat,
      tur: gorev.tur, ders: gorev.ders, konu: gorev.konu, durum: p.durum, rehberYerlestirdi: p.rehber_yerlestirdi,
    }];
  });

  return {
    ogrenciler,
    secilen: {
      id: ham.id,
      ad: tek(ham.profiles)?.ad?.trim() || "İsimsiz öğrenci",
      sinifAdi: sinifAdi(ham),
      aytAlan: ham.ayt_alan,
      sinifSeviyesi: seviye,
      dersListesi,
      mufredatAltKonulari: ((altKonularHam ?? []) as { ders: string; ust_konu: string; alt_baslik: string }[])
        .map((r) => ({ ders: r.ders, ustKonu: r.ust_konu, altBaslik: r.alt_baslik })),
      gerekYokListesi: Array.from(gerekYok),
      program,
    },
  };
}
