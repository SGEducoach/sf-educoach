import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ilkokulMu } from "@/lib/kademe";
import { gelisimDuzeyiMi, gelisimKalemiMi, oncekiAy } from "@/lib/ilkokul-gelisim";
import type { GelisimKaydi, GelisimNotTuru, GelisimYetkisi } from "@/lib/ilkokul-gelisim";

// İlkokul gelişim raporunun sorguları (migration 0157). Öğretmen ekranı
// yetki kontrolünden SONRA service-role istemciyle okur; veli ekranı kendi
// oturumuyla okur (RLS: has_student_access).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export interface IlkokulSinifi {
  id: string;
  schoolId: string;
  seviye: string;
  sube: string;
  yetkiler: GelisimYetkisi[];
}

// Kişinin gelişim raporuna erişebildiği ilkokul sınıfları ve her birinde
// hangi kalemleri yazabildiği. Erişimi olmayan sınıf listeye girmez.
export async function ilkokulSiniflariGetir(admin: Istemci, userId: string): Promise<IlkokulSinifi[]> {
  const [{ data: profil }, { data: ogretmen }, { data: moderatorluk }, { data: rehberlik }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", userId).maybeSingle(),
    admin.from("teachers").select("school_id, class_id").eq("id", userId).maybeSingle(),
    admin.from("school_moderators").select("school_id").eq("profile_id", userId).maybeSingle(),
    admin.from("rehberlik_servisi").select("school_id, sinif_duzeyleri").eq("profile_id", userId).maybeSingle(),
  ]);
  const rol = profil?.role as string | undefined;
  const yonetimOkullari = new Set<string>();
  if (rol === "mudur" && ogretmen?.school_id) yonetimOkullari.add(ogretmen.school_id as string);
  if (moderatorluk?.school_id) yonetimOkullari.add(moderatorluk.school_id as string);
  const okullar = new Set<string>([...yonetimOkullari]);
  if (ogretmen?.school_id) okullar.add(ogretmen.school_id as string);
  if (rehberlik?.school_id) okullar.add(rehberlik.school_id as string);
  if (okullar.size === 0) return [];

  const { data: siniflar } = await admin.from("classes").select("id, school_id, seviye, sube")
    .in("school_id", [...okullar]).order("seviye").order("sube");
  const rehberDuzeyleri = new Set<string>((rehberlik?.sinif_duzeyleri as string[] | null) ?? []);
  const sonuc: IlkokulSinifi[] = [];
  for (const s of (siniflar ?? []) as { id: string; school_id: string; seviye: string; sube: string }[]) {
    if (!ilkokulMu(s.seviye)) continue;
    const yetkiler: GelisimYetkisi[] = [];
    if (yonetimOkullari.has(s.school_id)) yetkiler.push("yonetim");
    if (ogretmen?.class_id === s.id) yetkiler.push("sinif_ogretmeni");
    if (rehberlik?.school_id === s.school_id && rehberDuzeyleri.has(s.seviye)) yetkiler.push("rehberlik");
    if (yetkiler.length > 0) sonuc.push({ id: s.id, schoolId: s.school_id, seviye: s.seviye, sube: s.sube, yetkiler });
  }
  return sonuc;
}

export type IlkokulSinifKaydi = GelisimKaydi & { studentId: string };

export interface IlkokulSinifRaporu {
  ogrenciler: { id: string; ad: string; okulNo: string }[];
  // Seçili ay ve bir önceki ay (öğretmen ekranında boş aya ön dolgu için).
  kayitlar: IlkokulSinifKaydi[];
  oncekiAyKayitlari: IlkokulSinifKaydi[];
  notlar: { studentId: string; tur: GelisimNotTuru; metin: string }[];
}

export async function ilkokulSinifRaporuGetir(admin: Istemci, classId: string, ay: string): Promise<IlkokulSinifRaporu> {
  const { data: ogrencilerHam } = await admin.from("students")
    .select("id, okul_no, profiles!students_id_fkey(ad)").eq("class_id", classId);
  type Satir = { id: string; okul_no: string; profiles: { ad: string } | { ad: string }[] | null };
  const ogrenciler = ((ogrencilerHam ?? []) as unknown as Satir[]).map((o) => {
    const p = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
    return { id: o.id, ad: p?.ad ?? "İsimsiz", okulNo: o.okul_no };
  }).sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  if (ogrenciler.length === 0) return { ogrenciler, kayitlar: [], oncekiAyKayitlari: [], notlar: [] };

  const idler = ogrenciler.map((o) => o.id);
  const onceki = oncekiAy(ay);
  const [{ data: kayitHam }, { data: notHam }] = await Promise.all([
    admin.from("ilkokul_gelisim").select("student_id, ay, kalem, duzey").in("student_id", idler).in("ay", [ay, onceki]),
    admin.from("ilkokul_gelisim_notlari").select("student_id, tur, metin").in("student_id", idler).eq("ay", ay),
  ]);
  const tumu = ((kayitHam ?? []) as { student_id: string; ay: string; kalem: string; duzey: string }[])
    .filter((k) => gelisimKalemiMi(k.kalem) && gelisimDuzeyiMi(k.duzey))
    .map((k) => ({ studentId: k.student_id, ay: k.ay, kalem: k.kalem, duzey: k.duzey }) as IlkokulSinifKaydi);
  return {
    ogrenciler,
    kayitlar: tumu.filter((k) => k.ay === ay),
    oncekiAyKayitlari: tumu.filter((k) => k.ay === onceki),
    notlar: ((notHam ?? []) as { student_id: string; tur: GelisimNotTuru; metin: string }[])
      .map((n) => ({ studentId: n.student_id, tur: n.tur, metin: n.metin })),
  };
}

export interface IlkokulEtkinligi {
  id: string;
  ad: string;
  tarih: string;
  aciklama: string | null;
  katilimcilar: string[];
}

// Sınıfın seçili aydaki etkinlikleri (öğretmen ekranı; service-role).
export async function ilkokulSinifEtkinlikleriGetir(admin: Istemci, classId: string, ay: string): Promise<IlkokulEtkinligi[]> {
  const [y, a] = ay.split("-").map(Number);
  const sonraki = a === 12 ? `${y + 1}-01-01` : `${y}-${String(a + 1).padStart(2, "0")}-01`;
  const { data } = await admin.from("ilkokul_etkinlikleri")
    .select("id, ad, tarih, aciklama, ilkokul_etkinlik_katilimlari(student_id)")
    .eq("class_id", classId).gte("tarih", ay).lt("tarih", sonraki).order("tarih", { ascending: false });
  type Satir = { id: string; ad: string; tarih: string; aciklama: string | null; ilkokul_etkinlik_katilimlari: { student_id: string }[] | null };
  return ((data ?? []) as unknown as Satir[]).map((e) => ({
    id: e.id, ad: e.ad, tarih: e.tarih, aciklama: e.aciklama,
    katilimcilar: (e.ilkokul_etkinlik_katilimlari ?? []).map((k) => k.student_id),
  }));
}

export interface IlkokulOgrenciRaporu {
  kayitlar: GelisimKaydi[];
  notlar: { ay: string; tur: GelisimNotTuru; metin: string }[];
  // Çocuğun katıldığı son etkinlikler (en yeni önce).
  etkinlikler: { ad: string; tarih: string; aciklama: string | null }[];
}

// Tek öğrencinin son aylarının raporu — veli ve öğretmen öğrenci sayfası.
export async function ilkokulOgrenciRaporuGetir(client: Istemci, studentId: string, ayLimiti = 6): Promise<IlkokulOgrenciRaporu> {
  const [{ data: kayitHam }, { data: notHam }, { data: etkinlikHam }] = await Promise.all([
    client.from("ilkokul_gelisim").select("ay, kalem, duzey").eq("student_id", studentId).order("ay", { ascending: false }).limit(ayLimiti * 10),
    client.from("ilkokul_gelisim_notlari").select("ay, tur, metin").eq("student_id", studentId).order("ay", { ascending: false }).limit(ayLimiti * 2),
    client.from("ilkokul_etkinlik_katilimlari").select("ilkokul_etkinlikleri(ad, tarih, aciklama)").eq("student_id", studentId),
  ]);
  type EtkinlikSatiri = { ilkokul_etkinlikleri: { ad: string; tarih: string; aciklama: string | null } | { ad: string; tarih: string; aciklama: string | null }[] | null };
  const etkinlikler = ((etkinlikHam ?? []) as unknown as EtkinlikSatiri[])
    .map((s) => (Array.isArray(s.ilkokul_etkinlikleri) ? s.ilkokul_etkinlikleri[0] : s.ilkokul_etkinlikleri))
    .filter((e): e is { ad: string; tarih: string; aciklama: string | null } => !!e)
    .sort((a, b) => b.tarih.localeCompare(a.tarih))
    .slice(0, 10);
  return {
    etkinlikler,
    kayitlar: ((kayitHam ?? []) as { ay: string; kalem: string; duzey: string }[])
      .filter((k) => gelisimKalemiMi(k.kalem) && gelisimDuzeyiMi(k.duzey))
      .map((k) => ({ ay: k.ay, kalem: k.kalem, duzey: k.duzey }) as GelisimKaydi),
    notlar: (notHam ?? []) as { ay: string; tur: GelisimNotTuru; metin: string }[],
  };
}
