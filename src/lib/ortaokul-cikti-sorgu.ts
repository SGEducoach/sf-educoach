import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import senaryoVerisi from "./ortaokul-senaryo-ciktilari.json";
import {
  bransCiktiDersleri, ciktiDersiMi, ciktiDuzeyiMi, ortaokulCiktiSinifiMi, sinifCiktiDersleri,
} from "@/lib/ortaokul-cikti";
import type { CiktiDersi, CiktiKaydi, SenaryoCiktisi } from "@/lib/ortaokul-cikti";

// 5-8. sınıf öğrenme çıktısı değerlendirmesinin sorguları (migration 0182).
// Öğretmen ekranı yetki kontrolünden SONRA service-role istemciyle okur
// (ilkokul-gelisim-sorgu.ts ile aynı desen).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

// Senaryoların ait olduğu dönem. 2. dönem tabloları MEB yayımlayınca
// JSON yenilenir; o zamana kadar yalnız bu dönem işaretlenebilir.
export const SENARYO_DONEMI = { egitimYili: senaryoVerisi.egitimYili, donem: senaryoVerisi.donem as 1 | 2 };
export const SENARYO_KAYNAGI = senaryoVerisi.kaynak;

const TUM_CIKTILAR = senaryoVerisi.ciktilar as SenaryoCiktisi[];

export function senaryoCiktilariGetir(ders: CiktiDersi, sinif: string): SenaryoCiktisi[] {
  return TUM_CIKTILAR.filter((c) => c.ders === ders && c.sinif === sinif);
}

export interface OrtaokulCiktiSinifi {
  id: string;
  schoolId: string;
  seviye: string;
  sube: string;
  // Kişinin işaretleyebildiği dersler; boşsa yalnız görür (sınıfın
  // danışman öğretmeni, rehberlik servisi).
  yazabilecegiDersler: CiktiDersi[];
}

// Kişinin öğrenme çıktısı değerlendirmesine erişebildiği 5-8. sınıflar.
// Müdür/moderatör her dersi, branş öğretmeni kurumundaki bütün 5-8.
// sınıflarda kendi dersini yazar; sınıfın danışman öğretmeni ve kapsamındaki
// rehberlik servisi görür.
export async function ortaokulCiktiSiniflariGetir(admin: Istemci, userId: string): Promise<OrtaokulCiktiSinifi[]> {
  const [{ data: profil }, { data: ogretmen }, { data: moderatorluk }, { data: rehberlik }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", userId).maybeSingle(),
    admin.from("teachers").select("school_id, class_id, brans").eq("id", userId).maybeSingle(),
    admin.from("school_moderators").select("school_id").eq("profile_id", userId).maybeSingle(),
    admin.from("rehberlik_servisi").select("school_id, sinif_duzeyleri").eq("profile_id", userId).maybeSingle(),
  ]);
  const yonetimOkullari = new Set<string>();
  if (profil?.role === "mudur" && ogretmen?.school_id) yonetimOkullari.add(ogretmen.school_id as string);
  if (moderatorluk?.school_id) yonetimOkullari.add(moderatorluk.school_id as string);
  const okullar = new Set<string>([...yonetimOkullari]);
  if (ogretmen?.school_id) okullar.add(ogretmen.school_id as string);
  if (rehberlik?.school_id) okullar.add(rehberlik.school_id as string);
  if (okullar.size === 0) return [];

  const { data: siniflar } = await admin.from("classes").select("id, school_id, seviye, sube").in("school_id", [...okullar]);
  const bransDersleri = bransCiktiDersleri(ogretmen?.brans as string | undefined);
  const rehberDuzeyleri = new Set<string>((rehberlik?.sinif_duzeyleri as string[] | null) ?? []);
  const sonuc: OrtaokulCiktiSinifi[] = [];
  for (const s of (siniflar ?? []) as { id: string; school_id: string; seviye: string; sube: string }[]) {
    if (!ortaokulCiktiSinifiMi(s.seviye)) continue;
    const sinifDersleri = sinifCiktiDersleri(s.seviye);
    const yonetim = yonetimOkullari.has(s.school_id);
    const brans = ogretmen?.school_id === s.school_id ? sinifDersleri.filter((d) => bransDersleri.includes(d)) : [];
    const gorur = yonetim || brans.length > 0 || ogretmen?.class_id === s.id
      || (rehberlik?.school_id === s.school_id && rehberDuzeyleri.has(s.seviye));
    if (gorur) sonuc.push({ id: s.id, schoolId: s.school_id, seviye: s.seviye, sube: s.sube, yazabilecegiDersler: yonetim ? sinifDersleri : brans });
  }
  return sonuc;
}

export interface OrtaokulCiktiRaporu {
  ogrenciler: { id: string; ad: string; okulNo: string }[];
  kayitlar: CiktiKaydi[];
}

export async function ortaokulCiktiRaporuGetir(admin: Istemci, classId: string, ders: CiktiDersi): Promise<OrtaokulCiktiRaporu> {
  const { data: ogrencilerHam } = await admin.from("students")
    .select("id, okul_no, profiles!students_id_fkey(ad)").eq("class_id", classId);
  type Satir = { id: string; okul_no: string; profiles: { ad: string } | { ad: string }[] | null };
  const ogrenciler = ((ogrencilerHam ?? []) as unknown as Satir[]).map((o) => {
    const p = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
    return { id: o.id, ad: p?.ad ?? "İsimsiz", okulNo: o.okul_no };
  }).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  if (ogrenciler.length === 0) return { ogrenciler, kayitlar: [] };

  const { data } = await admin.from("ortaokul_cikti_degerlendirmeleri")
    .select("student_id, yazili, cikti_kod, duzey, ders")
    .in("student_id", ogrenciler.map((o) => o.id))
    .eq("egitim_yili", SENARYO_DONEMI.egitimYili).eq("donem", SENARYO_DONEMI.donem).eq("ders", ders);
  const kayitlar: CiktiKaydi[] = [];
  for (const k of (data ?? []) as { student_id: string; yazili: number; cikti_kod: string; duzey: string; ders: string }[]) {
    if (!ciktiDersiMi(k.ders) || !ciktiDuzeyiMi(k.duzey) || (k.yazili !== 1 && k.yazili !== 2)) continue;
    kayitlar.push({ studentId: k.student_id, yazili: k.yazili, kod: k.cikti_kod, duzey: k.duzey });
  }
  return { ogrenciler, kayitlar };
}
