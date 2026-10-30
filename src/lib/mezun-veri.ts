import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { adSoyadAyir, otomatikAktarimYili, type MezunKaydi, type MezunKaynagi } from "@/lib/mezun";
import { telefonuNormallestir } from "@/lib/sms-telefon";

// Mezun Takip modülünün sorguları (migration 0184). Tablo yalnız service-role
// ile okunur; kimin hangi kurumun mezunlarını görebileceği burada çözülür.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

export interface MezunErisimi {
  userId: string;
  schoolId: string;
  rol: "rehber" | "mudur";
}

// Kullanıcı kararı (30.10.2026): kurumun rehberlik servisi üyeleri ve müdürü.
// Yalnız lise öğrencisi olan okul kurumlarında (ortaokulda mezun yok).
export async function mezunErisimi(admin: Istemci, userId: string): Promise<MezunErisimi | null> {
  const { data: profil } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  const rol = profil?.role as string | undefined;
  let schoolId: string | null = null;
  let mezunRolu: MezunErisimi["rol"] | null = null;
  if (rol === "mudur") {
    const { data: o } = await admin.from("teachers").select("school_id").eq("id", userId).maybeSingle();
    schoolId = (o?.school_id as string | undefined) ?? null;
    mezunRolu = "mudur";
  } else if (rol === "ogretmen") {
    const { data: r } = await admin.from("rehberlik_servisi").select("school_id").eq("profile_id", userId).maybeSingle();
    schoolId = (r?.school_id as string | undefined) ?? null;
    mezunRolu = "rehber";
  }
  if (!schoolId || !mezunRolu) return null;
  const { data: okul } = await admin.from("schools").select("tur, kademe, aktif, manuel_aktif").eq("id", schoolId).maybeSingle();
  if (!okul || okul.tur !== "okul" || okul.kademe === "ortaokul" || okul.aktif === false || okul.manuel_aktif === false) return null;
  return { userId, schoolId, rol: mezunRolu };
}

type MezunSatiri = {
  id: string; ad: string; soyad: string; il: string | null; ilce: string | null; eposta: string | null; telefon: string | null;
  universite: string | null; meslek: string | null; mezuniyet_yili: number; okul_no: string | null; kaynak: MezunKaynagi;
  student_id: string | null; updated_at: string;
};
const MEZUN_ALANLARI = "id, ad, soyad, il, ilce, eposta, telefon, universite, meslek, mezuniyet_yili, okul_no, kaynak, student_id, updated_at";

export function mezunSatiriniOku(m: MezunSatiri): MezunKaydi {
  return {
    id: m.id, ad: m.ad, soyad: m.soyad, il: m.il, ilce: m.ilce, eposta: m.eposta, telefon: m.telefon,
    universite: m.universite, meslek: m.meslek, mezuniyetYili: m.mezuniyet_yili, okulNo: m.okul_no,
    kaynak: m.kaynak, hesabiVar: m.student_id !== null, guncelleme: m.updated_at,
  };
}

export async function mezunlariGetir(admin: Istemci, schoolId: string): Promise<MezunKaydi[]> {
  const tum: MezunKaydi[] = [];
  for (let bas = 0; ; bas += 1000) {
    const { data } = await admin.from("mezunlar").select(MEZUN_ALANLARI).eq("school_id", schoolId)
      .order("mezuniyet_yili", { ascending: false }).order("ad").order("id").range(bas, bas + 999);
    tum.push(...((data ?? []) as MezunSatiri[]).map(mezunSatiriniOku));
    if ((data ?? []).length < 1000) break;
  }
  return tum;
}

// Ders yılı bitince (1 Temmuz–31 Ağustos) kurumun 12. sınıflarındaki
// öğrencileri o yılın mezunu olarak ekler: hesabı olanlar (ad, e-posta,
// telefon) ve okul listesindeki hesapsızlar (ad, okul no). Daha önce
// eklenmiş kişi tekrar eklenmez; elle düzeltilmiş kayıtlara dokunulmaz.
export async function mezunOtomatikAktar(admin: Istemci, schoolId: string, bugun: string): Promise<number> {
  const yil = otomatikAktarimYili(bugun);
  if (yil === null) return 0;
  const { data: siniflar } = await admin.from("classes").select("id").eq("school_id", schoolId).eq("seviye", "12");
  const sinifIdleri = ((siniflar ?? []) as { id: string }[]).map((s) => s.id);
  if (sinifIdleri.length === 0) return 0;

  const [{ data: ogrenciler }, { data: liste }, { data: mevcut }] = await Promise.all([
    admin.from("students").select("id, okul_no, profiles!students_id_fkey(ad, email, telefon)").in("class_id", sinifIdleri),
    admin.from("okul_ogrenci_listesi").select("id, ad_soyad, okul_no").in("class_id", sinifIdleri).is("student_id", null),
    admin.from("mezunlar").select("student_id, liste_ogrenci_id").eq("school_id", schoolId),
  ]);
  const varOgrenci = new Set(((mevcut ?? []) as { student_id: string | null }[]).map((m) => m.student_id).filter(Boolean));
  const varListe = new Set(((mevcut ?? []) as { liste_ogrenci_id: string | null }[]).map((m) => m.liste_ogrenci_id).filter(Boolean));

  type Ogrenci = { id: string; okul_no: string | null; profiles: { ad: string; email: string | null; telefon: string | null } | { ad: string; email: string | null; telefon: string | null }[] | null };
  const yeniler: Record<string, unknown>[] = [];
  for (const o of (ogrenciler ?? []) as unknown as Ogrenci[]) {
    if (varOgrenci.has(o.id)) continue;
    const p = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
    if (!p?.ad?.trim()) continue;
    const { ad, soyad } = adSoyadAyir(p.ad);
    // Sistemin ürettiği giriş adresleri (…@ogrenci.sgeducoach.internal,
    // …@sefukoc.com) gerçek e-posta değil; mezun kaydına alınmaz.
    const eposta = p.email && !/@(.+\.internal|sefukoc\.com)$/i.test(p.email) ? p.email.toLocaleLowerCase("tr-TR") : null;
    yeniler.push({
      school_id: schoolId, ad, soyad, eposta, telefon: telefonuNormallestir(p.telefon), mezuniyet_yili: yil,
      okul_no: o.okul_no, student_id: o.id, kaynak: "otomatik",
    });
  }
  for (const l of (liste ?? []) as { id: string; ad_soyad: string; okul_no: string | null }[]) {
    if (varListe.has(l.id) || !l.ad_soyad?.trim()) continue;
    const { ad, soyad } = adSoyadAyir(l.ad_soyad);
    yeniler.push({ school_id: schoolId, ad, soyad, mezuniyet_yili: yil, okul_no: l.okul_no, liste_ogrenci_id: l.id, kaynak: "otomatik" });
  }
  if (yeniler.length === 0) return 0;
  const { error } = await admin.from("mezunlar").insert(yeniler);
  if (error) {
    console.error("Mezun aktarımı yazılamadı:", error.message);
    return 0;
  }
  return yeniler.length;
}

// Zamanlanmış görev: lise öğrencisi olan bütün etkin okullar.
export async function mezunOtomatikAktarTumOkullar(admin: Istemci, bugun: string): Promise<{ okul: number; eklenen: number }> {
  if (otomatikAktarimYili(bugun) === null) return { okul: 0, eklenen: 0 };
  const { data: okullar } = await admin.from("schools").select("id, kademe, aktif, manuel_aktif").eq("tur", "okul");
  let okul = 0;
  let eklenen = 0;
  for (const s of (okullar ?? []) as { id: string; kademe: string | null; aktif: boolean | null; manuel_aktif: boolean | null }[]) {
    if (s.kademe === "ortaokul" || s.aktif === false || s.manuel_aktif === false) continue;
    okul++;
    eklenen += await mezunOtomatikAktar(admin, s.id, bugun);
  }
  return { okul, eklenen };
}
