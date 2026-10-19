import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ilkokulMu } from "@/lib/kademe";
import { GELISIM_KALEMLERI, donemAylari, duzeyOku, gelisimKalemiMi, oncekiAy, sdoDuzeyiMi, sdoGostergesiMi } from "@/lib/ilkokul-gelisim";
import type { DonemBilgisi, GelisimKaydi, GelisimKalemi, GelisimNotTuru, GelisimYetkisi, SdoDuzeyi } from "@/lib/ilkokul-gelisim";

// Ham kayıt satırını okur: bilinmeyen kalem ya da düzey atlanır, eski üç
// düzeyli ölçek dört düzeye çevrilir (bkz. duzeyOku).
function kayitOku<T extends { kalem: string; duzey: string }>(k: T): (Omit<T, "kalem" | "duzey"> & { kalem: GelisimKalemi; duzey: NonNullable<ReturnType<typeof duzeyOku>> }) | null {
  const duzey = duzeyOku(k.duzey);
  if (!gelisimKalemiMi(k.kalem) || !duzey) return null;
  return { ...k, kalem: k.kalem, duzey };
}

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
    .map(kayitOku).filter((k) => k !== null)
    .map((k) => ({ studentId: k.student_id, ay: k.ay, kalem: k.kalem, duzey: k.duzey }));
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
  studentId: string;
  // Öğrencinin sınıf düzeyi: hangi kalemlerin gösterileceğini belirler.
  seviye: string | null;
  kayitlar: GelisimKaydi[];
  notlar: { ay: string; tur: GelisimNotTuru; metin: string }[];
  // Çocuğun katıldığı son etkinlikler (en yeni önce).
  etkinlikler: { ad: string; tarih: string; aciklama: string | null }[];
}

// Tek öğrencinin son aylarının raporu — veli ve öğretmen öğrenci sayfası.
export async function ilkokulOgrenciRaporuGetir(client: Istemci, studentId: string, ayLimiti = 6): Promise<IlkokulOgrenciRaporu> {
  const [{ data: kayitHam }, { data: notHam }, { data: etkinlikHam }, { data: sinifHam }] = await Promise.all([
    client.from("ilkokul_gelisim").select("ay, kalem, duzey").eq("student_id", studentId).order("ay", { ascending: false }).limit(ayLimiti * GELISIM_KALEMLERI.length),
    client.from("ilkokul_gelisim_notlari").select("ay, tur, metin").eq("student_id", studentId).order("ay", { ascending: false }).limit(ayLimiti * 2),
    client.from("ilkokul_etkinlik_katilimlari").select("ilkokul_etkinlikleri(ad, tarih, aciklama)").eq("student_id", studentId),
    client.from("students").select("classes(seviye)").eq("id", studentId).maybeSingle(),
  ]);
  const sinif = (sinifHam as { classes: { seviye: string } | { seviye: string }[] | null } | null)?.classes;
  const seviye = (Array.isArray(sinif) ? sinif[0]?.seviye : sinif?.seviye) ?? null;
  type EtkinlikSatiri = { ilkokul_etkinlikleri: { ad: string; tarih: string; aciklama: string | null } | { ad: string; tarih: string; aciklama: string | null }[] | null };
  const etkinlikler = ((etkinlikHam ?? []) as unknown as EtkinlikSatiri[])
    .map((s) => (Array.isArray(s.ilkokul_etkinlikleri) ? s.ilkokul_etkinlikleri[0] : s.ilkokul_etkinlikleri))
    .filter((e): e is { ad: string; tarih: string; aciklama: string | null } => !!e)
    .sort((a, b) => b.tarih.localeCompare(a.tarih))
    .slice(0, 10);
  return {
    studentId,
    seviye,
    etkinlikler,
    kayitlar: ((kayitHam ?? []) as { ay: string; kalem: string; duzey: string }[])
      .map(kayitOku).filter((k) => k !== null)
      .map((k) => ({ ay: k.ay, kalem: k.kalem, duzey: k.duzey })),
    notlar: (notHam ?? []) as { ay: string; tur: GelisimNotTuru; metin: string }[],
  };
}

// ---- Sosyal duygusal beceriler ve dönem görüşü (migration 0167) ----

export interface SdoKaydi { studentId: string; gosterge: string; duzey: SdoDuzeyi }

// Tablolar yoksa (0167 uygulanmadıysa) hazir=false ve boş liste.
export async function ilkokulSinifSdoGetir(admin: Istemci, ogrenciIdleri: string[], d: DonemBilgisi): Promise<{ hazir: boolean; kayitlar: SdoKaydi[]; gorusler: { studentId: string; metin: string }[] }> {
  if (ogrenciIdleri.length === 0) return { hazir: true, kayitlar: [], gorusler: [] };
  const [{ data: kayitHam, error: e1 }, { data: gorusHam, error: e2 }] = await Promise.all([
    admin.from("ilkokul_sosyal_duygusal").select("student_id, gosterge, duzey")
      .in("student_id", ogrenciIdleri).eq("egitim_yili", d.egitimYili).eq("donem", d.donem),
    admin.from("ilkokul_donem_gorusleri").select("student_id, metin")
      .in("student_id", ogrenciIdleri).eq("egitim_yili", d.egitimYili).eq("donem", d.donem),
  ]);
  if (e1 || e2) return { hazir: false, kayitlar: [], gorusler: [] };
  return {
    hazir: true,
    kayitlar: ((kayitHam ?? []) as { student_id: string; gosterge: string; duzey: string }[])
      .filter((k) => sdoGostergesiMi(k.gosterge) && sdoDuzeyiMi(k.duzey))
      .map((k) => ({ studentId: k.student_id, gosterge: k.gosterge, duzey: k.duzey as SdoDuzeyi })),
    gorusler: ((gorusHam ?? []) as { student_id: string; metin: string }[]).map((g) => ({ studentId: g.student_id, metin: g.metin })),
  };
}

export interface IlkokulDonemRaporu {
  ogrenci: { id: string; ad: string; okulNo: string; sinif: string; seviye: string | null; kurumAdi: string };
  kayitlar: GelisimKaydi[];
  sdo: Map<string, SdoDuzeyi>;
  gorus: string | null;
  // Dönemin son ayındaki notlar (dönem görüşü yoksa öğretmen notu yedek).
  ogretmenNotu: string | null;
  rehberlikNotu: string | null;
  etkinlikler: { ad: string; tarih: string }[];
}

// Dönem sonu raporu için tek öğrencinin dönem verisi. Yetki kontrolü
// çağıranda; istemci service-role.
export async function ilkokulDonemRaporuGetir(admin: Istemci, studentId: string, d: DonemBilgisi): Promise<IlkokulDonemRaporu | null> {
  const aylar = donemAylari(d);
  const [{ data: ogr }, { data: kayitHam }, { data: notHam }, sdo, { data: etkinlikHam }] = await Promise.all([
    admin.from("students").select("id, okul_no, profiles!students_id_fkey(ad), classes(seviye, sube), schools(ad)").eq("id", studentId).maybeSingle(),
    admin.from("ilkokul_gelisim").select("ay, kalem, duzey").eq("student_id", studentId).in("ay", aylar),
    admin.from("ilkokul_gelisim_notlari").select("ay, tur, metin").eq("student_id", studentId).in("ay", aylar).order("ay", { ascending: false }),
    ilkokulSinifSdoGetir(admin, [studentId], d),
    admin.from("ilkokul_etkinlik_katilimlari").select("ilkokul_etkinlikleri(ad, tarih)").eq("student_id", studentId),
  ]);
  if (!ogr) return null;
  const tek = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
  const o = ogr as unknown as { id: string; okul_no: string; profiles: { ad: string } | null; classes: { seviye: string; sube: string } | null; schools: { ad: string } | null };
  const sinif = tek(o.classes);
  const notlar = (notHam ?? []) as { ay: string; tur: GelisimNotTuru; metin: string }[];
  const ilk = aylar[0];
  const son = aylar[aylar.length - 1].slice(0, 7) + "-31";
  type Etk = { ilkokul_etkinlikleri: { ad: string; tarih: string } | { ad: string; tarih: string }[] | null };
  return {
    ogrenci: {
      id: o.id, ad: tek(o.profiles)?.ad ?? "İsimsiz", okulNo: o.okul_no ?? "",
      sinif: sinif ? `${sinif.seviye}-${sinif.sube}` : "—", seviye: sinif?.seviye ?? null, kurumAdi: tek(o.schools)?.ad ?? "",
    },
    kayitlar: ((kayitHam ?? []) as { ay: string; kalem: string; duzey: string }[])
      .map(kayitOku).filter((k) => k !== null)
      .map((k) => ({ ay: k.ay, kalem: k.kalem, duzey: k.duzey })),
    sdo: new Map(sdo.kayitlar.map((k) => [k.gosterge, k.duzey])),
    gorus: sdo.gorusler[0]?.metin ?? null,
    ogretmenNotu: notlar.find((n) => n.tur === "ogretmen")?.metin ?? null,
    rehberlikNotu: notlar.find((n) => n.tur === "rehberlik")?.metin ?? null,
    etkinlikler: ((etkinlikHam ?? []) as unknown as Etk[])
      .map((s) => tek(s.ilkokul_etkinlikleri))
      .filter((e): e is { ad: string; tarih: string } => !!e && e.tarih >= ilk && e.tarih <= son)
      .sort((a, b) => a.tarih.localeCompare(b.tarih)),
  };
}
