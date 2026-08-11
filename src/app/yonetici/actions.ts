"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rastgeleSifre, adNormalize, telefonGecerliMi, okulNoGecerliMi } from "@/lib/validators";
import { getAnthropicClient } from "@/lib/anthropic";
import { KONU_ANLATIMI_SISTEM_PROMPTU, icerikTemizle } from "@/lib/konu-anlatimi";
import { duyuruGonder, pushGonderProfile } from "@/lib/push-send";
import { DUYURU_MIN_UZUNLUK, duyuruGonderimIzniKontrol } from "@/lib/duyuru-guvenligi";
import type { AytAlan, DenemeTuru, DenemeZorlugu, UserRole } from "@/lib/types";

const DUYURU_MAKS_UZUNLUK = 500;

// /yonetici'ye özel (admin-only) server action'lar. dashboard/actions.ts'teki
// requireAdmin ile aynı desen: service-role client'a güvenmeden önce burada
// da açıkça role==='admin' doğrulanıyor.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { supabase, user, admin: createAdminClient() };
}

async function auditLogYaz(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  eylem: string,
  detay: Record<string, unknown>,
) {
  const { error } = await supabase.from("admin_audit_log").insert({ actor_id: actorId, eylem, detay });
  if (error) console.error("audit log yazılamadı:", error.message);
}

export interface KullaniciSonuc {
  id: string;
  ad: string;
  email: string | null;
  telefon: string | null;
  role: UserRole;
  aktif: boolean;
  okulAdi: string | null;
  okulId: string | null;
  sinifAdi: string | null;
  sinifId: string | null;
  okulNo: string | null;
  brans: string | null;
}

// Okul/sınıf sınırı olmadan tüm öğrenci/öğretmen/veli/müdür hesaplarında
// ad veya e-posta üzerinden arama. Admin dışındaki roller RLS'te zaten
// is_ogretmen() üzerinden admin'e tam okuma izni veriyor (bkz. migration
// 0014); burada ekstra bir RLS gerekmiyor.
export async function kullaniciAra(sorgu: string, rolFiltre: UserRole | "hepsi"): Promise<{ error: string | null; sonuclar: KullaniciSonuc[] }> {
  const { supabase } = await requireAdmin();
    const q = sorgu.trim();

let query = supabase
  .from("profiles")
  .select("id, ad, email, telefon, role, aktif")
  .neq("role", "admin")
  .order("ad")
  .limit(40);

if (q.length >= 2) {
  query = query.or(`ad.ilike.%${q}%,email.ilike.%${q}%`);
}

if (rolFiltre !== "hepsi") {
  query = query.eq("role", rolFiltre);
}
  const { data: profiller, error } = await query;
  if (error) return { error: error.message, sonuclar: [] };

  const satirlar = (profiller ?? []) as { id: string; ad: string; email: string | null; telefon: string | null; role: UserRole; aktif: boolean }[];
  const ogrenciIdleri = satirlar.filter((s) => s.role === "ogrenci").map((s) => s.id);
  const ogretmenIdleri = satirlar.filter((s) => s.role === "ogretmen" || s.role === "mudur").map((s) => s.id);

  const [ogrenciDetay, ogretmenDetay] = await Promise.all([
    ogrenciIdleri.length
      ? supabase.from("students").select("id, okul_no, school_id, class_id, schools(ad), classes(seviye, sube)").in("id", ogrenciIdleri)
      : Promise.resolve({ data: [] }),
    ogretmenIdleri.length
      ? supabase.from("teachers").select("id, brans, school_id, schools(ad)").in("id", ogretmenIdleri)
      : Promise.resolve({ data: [] }),
  ]);

  type OgrenciRow = { id: string; okul_no: string; school_id: string; class_id: string; schools: { ad: string } | null; classes: { seviye: string; sube: string } | null };
  type OgretmenRow = { id: string; brans: string; school_id: string; schools: { ad: string } | null };
  const ogrenciMap = new Map(((ogrenciDetay.data as unknown as OgrenciRow[]) ?? []).map((o) => [o.id, o]));
  const ogretmenMap = new Map(((ogretmenDetay.data as unknown as OgretmenRow[]) ?? []).map((o) => [o.id, o]));

  const sonuclar: KullaniciSonuc[] = satirlar.map((s) => {
    const o = ogrenciMap.get(s.id);
    const t = ogretmenMap.get(s.id);
    return {
      id: s.id, ad: s.ad, email: s.email, telefon: s.telefon, role: s.role, aktif: s.aktif,
      okulAdi: o?.schools?.ad ?? t?.schools?.ad ?? null,
      okulId: o?.school_id ?? t?.school_id ?? null,
      sinifAdi: o?.classes ? `${o.classes.seviye}-${o.classes.sube}` : null,
      sinifId: o?.class_id ?? null,
      okulNo: o?.okul_no ?? null,
      brans: t?.brans ?? null,
    };
  });

  return { error: null, sonuclar };
}

// ============ Şifre sıfırlama ============
// Herhangi bir hesabın şifresini tek tuşla resetleyip yeni geçici şifre
// üretir — "şifremi unuttum" destek talepleri için (öğrenci/veli/öğretmen
// şifresini kendi başına sıfırlayamıyor, bu akış admin üzerinden çözülüyor).
export async function sifreSifirla(userId: string): Promise<{ error: string | null; sifre: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const sifre = rastgeleSifre();
  const { error } = await admin.auth.admin.updateUserById(userId, { password: sifre });
  if (error) return { error: error.message, sifre: null };
  const { error: profileError } = await admin.from("profiles").update({ gecici_sifre: true }).eq("id", userId).neq("role", "admin");
  if (profileError) return { error: profileError.message, sifre: null };
  await auditLogYaz(supabase, user.id, "sifre_sifirla", { hedef_id: userId });
  return { error: null, sifre };
}

// Kullanıcı Auth kaydı silinince profiles ve kullanıcıya bağlı veriler,
// şemadaki foreign key zinciri üzerinden kalıcı olarak temizlenir.
export async function hesapSil(userId: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { data: hedef } = await admin.from("profiles").select("ad, role").eq("id", userId).maybeSingle();
  if (!hedef) return { error: "Kullanıcı bulunamadı." };
  if (hedef.role === "admin") return { error: "Yönetici hesabı bu ekrandan silinemez." };

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "hesap_sil", { hedef_id: userId, hedef_ad: hedef.ad, hedef_rol: hedef.role });
  revalidatePath("/yonetici");
  return { error: null };
}

// ============ Hesap pasifleştirme/aktifleştirme (soft-delete) ============
// Hard-delete değil: profiles.aktif bayrağı sadece görüntüleme/filtreleme
// için, gerçek giriş engeli Supabase Auth'un ban_duration'ı ile uygulanıyor
// — böylece pasifleştirilen kullanıcı giriş yapamaz ama veri kaybı olmaz,
// istenirse tekrar aktifleştirilebilir.
export async function hesapAktiflikDegistir(userId: string, aktif: boolean): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();

  const { error: banError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: aktif ? "none" : "87600h",
  });
  if (banError) return { error: banError.message };

  const { error: profileError } = await admin.from("profiles").update({ aktif }).eq("id", userId);
  if (profileError) return { error: profileError.message };

  await auditLogYaz(supabase, user.id, aktif ? "hesap_aktiflestir" : "hesap_pasiflestir", { hedef_id: userId });
  return { error: null };
}

// ============ Sınıf/öğretmen/öğrenci düzenleme ============

// classes_select_all RLS policy'si zaten herkese açık (using (true)) —
// service-role client'a gerek yok.
export async function okulSiniflari(schoolId: string): Promise<{ error: string | null; siniflar: { id: string; seviye: string; sube: string }[] }> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("classes").select("id, seviye, sube").eq("school_id", schoolId).order("seviye").order("sube");
  if (error) return { error: error.message, siniflar: [] };
  return { error: null, siniflar: data ?? [] };
}

// FK kısıtı (students.class_id / teachers.class_id "not null references",
// ON DELETE belirtilmemiş → RESTRICT) sınıfta öğrenci/öğretmen varken
// silinmesini zaten engelliyor — burada sadece daha anlaşılır bir hata
// mesajına çeviriyoruz.
export async function sinifSil(classId: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { error } = await admin.from("classes").delete().eq("id", classId);
  if (error) {
    if (error.code === "23503") return { error: "Bu sınıfta öğrenci veya öğretmen var, önce onları başka sınıfa taşıyın." };
    return { error: error.message };
  }
  await auditLogYaz(supabase, user.id, "sinif_sil", { class_id: classId });
  revalidatePath("/yonetici");
  return { error: null };
}

export async function ogrenciSinifTasi(studentId: string, classId: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const [{ data: ogrenci }, { data: hedefSinif }] = await Promise.all([
    admin.from("students").select("school_id").eq("id", studentId).maybeSingle(),
    admin.from("classes").select("school_id").eq("id", classId).maybeSingle(),
  ]);
  if (!ogrenci || !hedefSinif) return { error: "Öğrenci veya hedef sınıf bulunamadı." };
  if (ogrenci.school_id !== hedefSinif.school_id) return { error: "Öğrenci yalnızca kendi okulundaki bir sınıfa taşınabilir." };
  const { error } = await admin.from("students").update({ class_id: classId }).eq("id", studentId);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "ogrenci_sinif_tasi", { student_id: studentId, class_id: classId });
  revalidatePath("/yonetici");
  return { error: null };
}

export async function kullaniciProfilGuncelle(input: {
  userId: string; ad: string; email: string; telefon: string; okulNo?: string;
}): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const ad = adNormalize(input.ad);
  const email = input.email.trim().toLowerCase();
  const telefon = input.telefon.trim();
  if (!ad) return { error: "Ad soyad gerekli." };
  if (!email || !email.includes("@")) return { error: "Geçerli bir e-posta girin." };
  if (telefon && !telefonGecerliMi(telefon)) return { error: "Telefon 10-11 rakam olmalı." };

  const { data: mevcut } = await admin.from("profiles").select("email, role").eq("id", input.userId).maybeSingle();
  if (!mevcut || mevcut.role === "admin") return { error: "Kullanıcı bulunamadı veya düzenlenemez." };
  if (mevcut.role === "ogrenci" && input.okulNo !== undefined && !okulNoGecerliMi(input.okulNo)) return { error: "Okul numarası geçersiz." };

  const { error: authError } = await admin.auth.admin.updateUserById(input.userId, { email, email_confirm: true });
  if (authError) return { error: authError.message };
  const { error: profileError } = await admin.from("profiles").update({ ad, email, telefon: telefon || null }).eq("id", input.userId);
  if (profileError) {
    if (mevcut.email) await admin.auth.admin.updateUserById(input.userId, { email: mevcut.email, email_confirm: true });
    return { error: profileError.message };
  }
  if (mevcut.role === "ogrenci" && input.okulNo !== undefined) {
    const { error: ogrenciError } = await admin.from("students").update({ okul_no: input.okulNo }).eq("id", input.userId);
    if (ogrenciError) return { error: ogrenciError.message };
  }
  await auditLogYaz(supabase, user.id, "kullanici_profil_guncelle", { hedef_id: input.userId });
  revalidatePath("/yonetici");
  return { error: null };
}

export interface YonetimOkulu { id: string; ad: string; siniflar: { id: string; ad: string }[] }

export async function yonetimOkullariGetir(): Promise<{ error: string | null; okullar: YonetimOkulu[] }> {
  const { admin } = await requireAdmin();
  const [{ data: okullar, error }, { data: siniflar }] = await Promise.all([
    admin.from("schools").select("id, ad").eq("aktif", true).order("ad"),
    admin.from("classes").select("id, school_id, seviye, sube").order("seviye").order("sube"),
  ]);
  if (error) return { error: error.message, okullar: [] };
  return { error: null, okullar: (okullar ?? []).map((o) => ({ id: o.id, ad: o.ad, siniflar: (siniflar ?? []).filter((s) => s.school_id === o.id).map((s) => ({ id: s.id, ad: `${s.seviye}-${s.sube}` })) })) };
}

export async function kullaniciKurumDegistir(input: { userId: string; role: UserRole; schoolId: string; classId?: string }): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  if (input.role === "ogrenci") {
    if (!input.classId) return { error: "Öğrenci için sınıf seçin." };
    const { data: sinif } = await admin.from("classes").select("school_id").eq("id", input.classId).maybeSingle();
    if (!sinif || sinif.school_id !== input.schoolId) return { error: "Seçilen sınıf bu okula ait değil." };
    const { error } = await admin.from("students").update({ school_id: input.schoolId, class_id: input.classId }).eq("id", input.userId);
    if (error) return { error: error.message };
  } else if (input.role === "ogretmen" || input.role === "mudur") {
    const { error } = await admin.from("teachers").update({ school_id: input.schoolId, class_id: null }).eq("id", input.userId);
    if (error) return { error: error.message };
  } else return { error: "Bu kullanıcı rolünde okul değiştirilemez." };
  await auditLogYaz(supabase, user.id, "kullanici_kurum_degistir", { hedef_id: input.userId, school_id: input.schoolId, class_id: input.classId ?? null });
  revalidatePath("/yonetici");
  return { error: null };
}

export interface VeliBaglantisi {
  parentId: string;
  parentAd: string;
  parentEmail: string | null;
}

export async function ogrenciVeliBaglantilari(studentId: string): Promise<{ error: string | null; baglantilar: VeliBaglantisi[] }> {
  const { admin } = await requireAdmin();
  const { data, error } = await admin.from("parent_students").select("parent_id, profiles!parent_students_parent_id_fkey(ad, email)").eq("student_id", studentId);
  if (error) return { error: error.message, baglantilar: [] };
  type Row = { parent_id: string; profiles: { ad: string; email: string | null } | null };
  return { error: null, baglantilar: ((data as unknown as Row[]) ?? []).map((r) => ({ parentId: r.parent_id, parentAd: r.profiles?.ad ?? "İsimsiz", parentEmail: r.profiles?.email ?? null })) };
}

export async function ogrenciyeVeliBagla(studentId: string, veliSorgu: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const q = veliSorgu.trim();
  if (q.length < 2) return { error: "Veli adı veya e-postası girin." };
  const veliQuery = admin.from("profiles").select("id").eq("role", "veli").limit(2);
  const { data: veliler, error: bulmaError } = q.includes("@")
    ? await veliQuery.eq("email", q.toLowerCase())
    : await veliQuery.ilike("ad", `%${q.replace(/[%_,()]/g, "")}%`);
  if (bulmaError) return { error: bulmaError.message };
  if (!veliler || veliler.length !== 1) return { error: veliler?.length ? "Birden fazla veli bulundu; tam e-posta yazın." : "Veli bulunamadı." };
  const { error } = await admin.from("parent_students").upsert({ parent_id: veliler[0].id, student_id: studentId }, { onConflict: "parent_id,student_id", ignoreDuplicates: true });
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "veli_ogrenci_bagla", { parent_id: veliler[0].id, student_id: studentId });
  revalidatePath("/yonetici");
  return { error: null };
}

export async function ogrenciVeliBaglantisiSil(studentId: string, parentId: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { error } = await admin.from("parent_students").delete().eq("student_id", studentId).eq("parent_id", parentId);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "veli_ogrenci_baglantisi_sil", { parent_id: parentId, student_id: studentId });
  revalidatePath("/yonetici");
  return { error: null };
}

export type OgrenciKayitTuru = "konu" | "soru" | "deneme";
export interface OgrenciYonetimKaydi {
  id: string; tur: OgrenciKayitTuru; tarih: string; ders: string; aciklama: string; sureDakika: number;
  konu?: string; dogru?: number; yanlis?: number;
}

export async function ogrenciYonetimKayitlari(studentId: string): Promise<{ error: string | null; kayitlar: OgrenciYonetimKaydi[] }> {
  const { admin } = await requireAdmin();
  const [konular, sorular, denemeler] = await Promise.all([
    admin.from("konu_calismalar").select("id, tarih, ders, konu, sure_dakika").eq("student_id", studentId).order("tarih", { ascending: false }).limit(30),
    admin.from("soru_cozumleri").select("id, tarih, ders, dogru, yanlis, sure_dakika").eq("student_id", studentId).order("tarih", { ascending: false }).limit(30),
    admin.from("denemeler").select("id, tarih, tur, sure_dakika").eq("student_id", studentId).order("tarih", { ascending: false }).limit(30),
  ]);
  const hata = konular.error ?? sorular.error ?? denemeler.error;
  if (hata) return { error: hata.message, kayitlar: [] };
  const kayitlar: OgrenciYonetimKaydi[] = [
    ...(konular.data ?? []).map((r) => ({ id: r.id, tur: "konu" as const, tarih: r.tarih, ders: r.ders, aciklama: r.konu, sureDakika: r.sure_dakika, konu: r.konu })),
    ...(sorular.data ?? []).map((r) => ({ id: r.id, tur: "soru" as const, tarih: r.tarih, ders: r.ders, aciklama: `${r.dogru} doğru / ${r.yanlis} yanlış`, sureDakika: r.sure_dakika, dogru: r.dogru, yanlis: r.yanlis })),
    ...(denemeler.data ?? []).map((r) => ({ id: r.id, tur: "deneme" as const, tarih: r.tarih, ders: r.tur, aciklama: `${r.tur} denemesi`, sureDakika: r.sure_dakika })),
  ].sort((a, b) => b.tarih.localeCompare(a.tarih));
  return { error: null, kayitlar };
}

export async function ogrenciYonetimKaydiGuncelle(input: { id: string; tur: OgrenciKayitTuru; tarih: string; sureDakika: number; ders: string; konu?: string; dogru?: number; yanlis?: number }): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarih)) return { error: "Tarih geçersiz." };
  if (!Number.isInteger(input.sureDakika) || input.sureDakika < 1 || input.sureDakika > 480) return { error: "Süre 1-480 dakika arasında olmalı." };
  const ders = input.ders.trim();
  if (!ders) return { error: "Ders veya deneme türü boş olamaz." };
  let error: { message: string } | null = null;
  if (input.tur === "konu") {
    const konu = input.konu?.trim();
    if (!konu) return { error: "Konu boş olamaz." };
    ({ error } = await admin.from("konu_calismalar").update({ tarih: input.tarih, sure_dakika: input.sureDakika, ders, konu }).eq("id", input.id));
  } else if (input.tur === "soru") {
    if (!Number.isInteger(input.dogru) || !Number.isInteger(input.yanlis) || input.dogru! < 0 || input.yanlis! < 0) return { error: "Doğru ve yanlış sayıları sıfır veya daha büyük olmalı." };
    ({ error } = await admin.from("soru_cozumleri").update({ tarih: input.tarih, sure_dakika: input.sureDakika, ders, dogru: input.dogru, yanlis: input.yanlis }).eq("id", input.id));
  } else {
    if (ders !== "TYT" && ders !== "AYT") return { error: "Deneme türü TYT veya AYT olmalı." };
    ({ error } = await admin.from("denemeler").update({ tarih: input.tarih, sure_dakika: input.sureDakika, tur: ders }).eq("id", input.id));
  }
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "ogrenci_kaydi_guncelle", { kayit_id: input.id, tur: input.tur });
  return { error: null };
}

export async function ogrenciYonetimKaydiSil(id: string, tur: OgrenciKayitTuru): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const tablo = tur === "konu" ? "konu_calismalar" : tur === "soru" ? "soru_cozumleri" : "denemeler";
  const { error } = await admin.from(tablo).delete().eq("id", id);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "ogrenci_kaydi_sil", { kayit_id: id, tur });
  return { error: null };
}

export async function ogretmenBransDegistir(teacherId: string, brans: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { error } = await admin.from("teachers").update({ brans }).eq("id", teacherId);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "ogretmen_brans_degistir", { teacher_id: teacherId, brans });
  revalidatePath("/yonetici");
  return { error: null };
}

// ============ Veli talepleri (admin görünürlüğü) ============
// veli_link_requests RLS'i sadece ilgili öğretmene/öğrenciye açık (bkz.
// schema.sql); admin'in okul/sınıf sınırı olmadan tüm talepleri görebilmesi
// için service-role client kullanılıyor — yeni bir RLS policy gerekmedi.

export interface VeliTalebiSonuc {
  id: string;
  veliAd: string;
  veliTelefon: string;
  durum: "bekliyor" | "onaylandi" | "reddedildi" | "kullanildi";
  kod: string | null;
  createdAt: string;
  ogrenciAd: string;
  okulAdi: string | null;
  sinifAdi: string | null;
}

export async function veliTalepleriGetir(): Promise<{ error: string | null; talepler: VeliTalebiSonuc[] }> {
  const { admin } = await requireAdmin();
  const { data, error } = await admin
    .from("veli_link_requests")
    .select("id, veli_ad, veli_telefon, durum, kod, created_at, students(profiles!students_id_fkey(ad), schools(ad), classes(seviye, sube))")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { error: error.message, talepler: [] };

  type Row = {
    id: string; veli_ad: string; veli_telefon: string; durum: VeliTalebiSonuc["durum"]; kod: string | null; created_at: string;
    students: { profiles: { ad: string } | null; schools: { ad: string } | null; classes: { seviye: string; sube: string } | null } | null;
  };
  const talepler = ((data as unknown as Row[]) ?? []).map((r) => ({
    id: r.id, veliAd: r.veli_ad, veliTelefon: r.veli_telefon, durum: r.durum, kod: r.kod, createdAt: r.created_at,
    ogrenciAd: r.students?.profiles?.ad ?? "—",
    okulAdi: r.students?.schools?.ad ?? null,
    sinifAdi: r.students?.classes ? `${r.students.classes.seviye}-${r.students.classes.sube}` : null,
  }));
  return { error: null, talepler };
}

// Öğretmen onay RPC'si (veli_talep_onayla) auth.uid()'in ilgili sınıfın
// öğretmeni olmasını şart koşuyor — admin'in bu şartı sağlaması beklenmez,
// bu yüzden aynı işlemi service-role client ile burada tekrarlıyoruz.
export async function veliTalebiAdminOnayla(requestId: string): Promise<{ error: string | null; kod: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const kod = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();

  const { data: guncellenen, error } = await admin
    .from("veli_link_requests")
    .update({ durum: "onaylandi", kod, onaylayan_ogretmen_id: user.id, onaylanma_at: new Date().toISOString(), kod_expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() })
    .eq("id", requestId)
    .eq("durum", "bekliyor")
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message, kod: null };
  if (!guncellenen) return { error: "Talep daha önce işlenmiş veya bulunamadı.", kod: null };

  await auditLogYaz(supabase, user.id, "veli_talebi_admin_onayla", { request_id: requestId });
  revalidatePath("/yonetici");
  return { error: null, kod };
}

export async function veliTalebiReddet(requestId: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { error } = await admin.from("veli_link_requests").update({ durum: "reddedildi" }).eq("id", requestId).eq("durum", "bekliyor");
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "veli_talebi_reddet", { request_id: requestId });
  revalidatePath("/yonetici");
  return { error: null };
}

// ============ Platform istatistikleri ============
// Sayımlar normal (RLS'e tabi) client ile yapılıyor — is_ogretmen() zaten
// admin'e profiles/konu_calismalar/soru_cozumleri/denemeler/
// haftalik_verimlilikler üzerinde tam okuma izni veriyor. Sadece
// veli_link_requests admin'e RLS'te açık olmadığı için orada service-role
// kullanılıyor.
export interface PlatformIstatistikleri {
  okulSayisi: number;
  aktifOkulSayisi: number;
  ogrenciSayisi: number;
  ogretmenSayisi: number;
  veliSayisi: number;
  bekleyenVeliTalebi: number;
  son7GunAktifOgrenci: number;
}

export async function platformIstatistikleriGetir(): Promise<{ error: string | null; istatistik: PlatformIstatistikleri | null }> {
  const { supabase, admin } = await requireAdmin();
  const yediGunOnce = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    okulToplam, okulAktif, ogrenciToplam, ogretmenToplam, veliToplam, bekleyenTalep,
    konuAktif, soruAktif, denemeAktif, verimlilikAktif,
  ] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }),
    supabase.from("schools").select("id", { count: "exact", head: true }).eq("aktif", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "ogrenci"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "ogretmen"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "veli"),
    admin.from("veli_link_requests").select("id", { count: "exact", head: true }).eq("durum", "bekliyor"),
    supabase.from("konu_calismalar").select("student_id").gte("created_at", yediGunOnce),
    supabase.from("soru_cozumleri").select("student_id").gte("created_at", yediGunOnce),
    supabase.from("denemeler").select("student_id").gte("created_at", yediGunOnce),
    supabase.from("haftalik_verimlilikler").select("student_id").gte("created_at", yediGunOnce),
  ]);

  const aktifSet = new Set<string>();
  for (const r of [konuAktif, soruAktif, denemeAktif, verimlilikAktif]) {
    for (const row of (r.data ?? []) as { student_id: string }[]) aktifSet.add(row.student_id);
  }

  return {
    error: null,
    istatistik: {
      okulSayisi: okulToplam.count ?? 0,
      aktifOkulSayisi: okulAktif.count ?? 0,
      ogrenciSayisi: ogrenciToplam.count ?? 0,
      ogretmenSayisi: ogretmenToplam.count ?? 0,
      veliSayisi: veliToplam.count ?? 0,
      bekleyenVeliTalebi: bekleyenTalep.count ?? 0,
      son7GunAktifOgrenci: aktifSet.size,
    },
  };
}

// ============ Konu anlatımı içerik yönetimi ============
// konu_anlatimlari_select_all RLS'i herkese açık (using (true)), yazma ise
// sadece service-role — düzenleme/yeniden üretme admin client kullanıyor.

export interface KonuAnlatimiSatiri {
  id: string;
  ders: string;
  konu: string;
  seviye: string | null;
  createdAt: string;
}

export async function konuAnlatimlariAra(sorgu: string): Promise<{ error: string | null; satirlar: KonuAnlatimiSatiri[] }> {
  const { supabase } = await requireAdmin();
  const q = sorgu.trim();
  if (q.length < 2) return { error: null, satirlar: [] };

  const { data, error } = await supabase
    .from("konu_anlatimlari")
    .select("id, ders, konu, seviye, created_at")
    .or(`konu.ilike.%${q}%,ders.ilike.%${q}%`)
    .order("ders")
    .order("konu")
    .limit(30);
  if (error) return { error: error.message, satirlar: [] };

  const satirlar = ((data ?? []) as { id: string; ders: string; konu: string; seviye: string | null; created_at: string }[]).map((r) => ({
    id: r.id, ders: r.ders, konu: r.konu, seviye: r.seviye, createdAt: r.created_at,
  }));
  return { error: null, satirlar };
}

export async function konuAnlatimiDetay(id: string): Promise<{ error: string | null; icerik: string | null }> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("konu_anlatimlari").select("icerik").eq("id", id).single();
  if (error) return { error: error.message, icerik: null };
  return { error: null, icerik: data.icerik as string };
}

export async function konuAnlatimiGuncelle(id: string, icerik: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const temizIcerik = icerik.trim();
  if (!temizIcerik) return { error: "İçerik boş olamaz." };
  const { error } = await admin.from("konu_anlatimlari").update({ icerik: temizIcerik }).eq("id", id);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "konu_anlatimi_duzenle", { konu_anlatimi_id: id });
  revalidatePath("/yonetici");
  return { error: null };
}

export async function konuAnlatimiYenidenUret(id: string): Promise<{ error: string | null; icerik: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { data: satir, error: bulmaHatasi } = await supabase.from("konu_anlatimlari").select("ders, konu").eq("id", id).single();
  if (bulmaHatasi || !satir) return { error: "Konu bulunamadı.", icerik: null };

  let icerik: string;
  try {
    const anthropic = getAnthropicClient();
    const yanit = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      system: KONU_ANLATIMI_SISTEM_PROMPTU,
      messages: [{ role: "user", content: `${satir.ders} dersinden "${satir.konu}" konusunu anlat.` }],
    });
    const metinBlogu = yanit.content.find((b) => b.type === "text");
    icerik = metinBlogu && "text" in metinBlogu ? icerikTemizle(metinBlogu.text) : "";
    if (!icerik) return { error: "İçerik üretilemedi, lütfen tekrar deneyin.", icerik: null };
  } catch (e) {
    console.error("konu anlatımı yeniden üretme hatası:", e);
    return { error: "Konu anlatımı şu anda üretilemedi. Lütfen daha sonra tekrar deneyin.", icerik: null };
  }

  const { error: kayitHatasi } = await admin.from("konu_anlatimlari").update({ icerik }).eq("id", id);
  if (kayitHatasi) return { error: kayitHatasi.message, icerik };

  await auditLogYaz(supabase, user.id, "konu_anlatimi_yeniden_uret", { konu_anlatimi_id: id });
  revalidatePath("/yonetici");
  return { error: null, icerik };
}

// ============ Kayıt ve kullanım kuralları metni ============
// app_ayarlari(anahtar='kurallar_metni'/'kurallar_versiyon') — signup
// sayfası bunu appAyariGetir ile (RLS: select herkese açık) okuyor. Metin
// her güncellendiğinde versiyon otomatik bump'lanır (timestamp bazlı),
// böylece daha önce eski metni kabul etmiş kullanıcılara tekrar sorulur.

export async function kurallarGetir(): Promise<{ error: string | null; metin: string | null; versiyon: string | null }> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.from("app_ayarlari").select("anahtar, deger").in("anahtar", ["kurallar_metni", "kurallar_versiyon"]);
  if (error) return { error: error.message, metin: null, versiyon: null };
  const harita = new Map((data ?? []).map((r) => [r.anahtar as string, r.deger as string]));
  return { error: null, metin: harita.get("kurallar_metni") ?? null, versiyon: harita.get("kurallar_versiyon") ?? null };
}

export async function kurallarGuncelle(yeniMetin: string): Promise<{ error: string | null; versiyon: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const metin = yeniMetin.trim();
  if (!metin) return { error: "Metin boş olamaz.", versiyon: null };
  const yeniVersiyon = `v${Date.now()}`;
  const simdi = new Date().toISOString();

  const { error } = await admin.from("app_ayarlari").upsert(
    [
      { anahtar: "kurallar_metni", deger: metin, guncelleyen_id: user.id, updated_at: simdi },
      { anahtar: "kurallar_versiyon", deger: yeniVersiyon, guncelleyen_id: user.id, updated_at: simdi },
    ],
    { onConflict: "anahtar" },
  );
  if (error) return { error: error.message, versiyon: null };

  await auditLogYaz(supabase, user.id, "kurallar_metni_guncelle", { versiyon: yeniVersiyon });
  revalidatePath("/yonetici");
  revalidatePath("/signup");
  return { error: null, versiyon: yeniVersiyon };
}

// ============ Toplu deneme sonucu girişi ============
// Bir sınıfın/okulun tamamı için, tek bir ders üzerinden (ör. optik okuma
// sonrası "şimdi tüm sınıfın Türkçe sonucunu gir") toplu giriş. Aynı
// öğrenci+tarih+tür için "ogretmen" kaynaklı bir deneme zaten varsa (başka
// bir ders için önceden oluşturulmuşsa) onun üzerine ders sonucu eklenir;
// yoksa önce deneme kaydı (varsayılan süre + 'belirsiz' hedefe yakınlık ile)
// oluşturulur.

export interface SinifOgrencisi {
  id: string;
  ad: string;
  okulNo: string;
  aytAlan: AytAlan;
}

export async function sinifOgrencileriGetir(classId: string): Promise<{ error: string | null; ogrenciler: SinifOgrencisi[] }> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("students")
    .select("id, okul_no, ayt_alan, profiles!students_id_fkey(ad)")
    .eq("class_id", classId)
    .order("okul_no");
  if (error) return { error: error.message, ogrenciler: [] };

  type Row = { id: string; okul_no: string; ayt_alan: AytAlan; profiles: { ad: string } | null };
  const ogrenciler = ((data as unknown as Row[]) ?? []).map((r) => ({
    id: r.id, ad: r.profiles?.ad ?? "İsimsiz", okulNo: r.okul_no, aytAlan: r.ayt_alan,
  }));
  return { error: null, ogrenciler };
}

export interface DenemeTopluSonuc {
  studentId: string;
  hata: string | null;
}

export async function denemeSonucuTopluGir(input: {
  tarih: string; tur: DenemeTuru; zorluk: DenemeZorlugu; ders: string;
  sonuclar: { studentId: string; dogru: number; yanlis: number }[];
}): Promise<{ error: string | null; sonuclar: DenemeTopluSonuc[] }> {
  const { supabase, user, admin } = await requireAdmin();
  if (!input.tarih) return { error: "Tarih gerekli.", sonuclar: [] };
  if (!input.ders) return { error: "Ders seçin.", sonuclar: [] };
  if (input.sonuclar.length === 0) return { error: "Girilecek öğrenci bulunamadı.", sonuclar: [] };

  const sonuclar: DenemeTopluSonuc[] = [];
  let basariliSayisi = 0;

  for (const s of input.sonuclar) {
    if (s.dogru < 0 || s.yanlis < 0) {
      sonuclar.push({ studentId: s.studentId, hata: "Doğru/yanlış negatif olamaz." });
      continue;
    }

    const { data: mevcutDeneme, error: aramaHatasi } = await admin
      .from("denemeler")
      .select("id")
      .eq("student_id", s.studentId)
      .eq("tarih", input.tarih)
      .eq("tur", input.tur)
      .eq("kaynak", "ogretmen")
      .maybeSingle();
    if (aramaHatasi) {
      sonuclar.push({ studentId: s.studentId, hata: aramaHatasi.message });
      continue;
    }

    let denemeId = mevcutDeneme?.id as string | undefined;
    if (!denemeId) {
      const { data: yeniDeneme, error: olusturmaHatasi } = await admin
        .from("denemeler")
        .insert({
          student_id: s.studentId, tarih: input.tarih, tur: input.tur,
          sure_dakika: input.tur === "TYT" ? 165 : 180,
          hedefe_yakinlik: "belirsiz", zorluk: input.zorluk, kaynak: "ogretmen",
        })
        .select("id")
        .single();
      if (olusturmaHatasi || !yeniDeneme) {
        sonuclar.push({ studentId: s.studentId, hata: olusturmaHatasi?.message ?? "Deneme oluşturulamadı." });
        continue;
      }
      denemeId = yeniDeneme.id as string;
    }

    const { error: sonucHatasi } = await admin
      .from("deneme_ders_sonuclari")
      .upsert({ deneme_id: denemeId, ders: input.ders, dogru: s.dogru, yanlis: s.yanlis }, { onConflict: "deneme_id,ders" });
    if (sonucHatasi) {
      sonuclar.push({ studentId: s.studentId, hata: sonucHatasi.message });
      continue;
    }

    sonuclar.push({ studentId: s.studentId, hata: null });
    basariliSayisi++;
  }

  if (basariliSayisi > 0) {
    await auditLogYaz(supabase, user.id, "deneme_toplu_gir", {
      tarih: input.tarih, tur: input.tur, ders: input.ders, basarili: basariliSayisi, toplam: input.sonuclar.length,
    });
    revalidatePath("/dashboard");
  }

  return { error: null, sonuclar };
}

// ============ Deneme sonucu bildirimleri ============
// Bir sınıfın tüm dersleri toplu girildikten sonra admin bunu tek seferlik
// tetikler: o tarih+tür için hiç sonucu girilmemiş öğrencinin velisine
// uyarı, sonucu girilmiş öğrencinin velisine VE sınıf öğretmenine bilgi,
// öğrencinin kendisine de ayrı bir bilgi mesajı gider. deneme_bildirimleri
// tablosu aynı öğrenci+tarih+tür için durumu değişmeyene ikinci kez
// bildirim gitmesini engelliyor (buton güvenle tekrar tıklanabilir) —
// 'girilmedi' iken sonradan sonuç girilirse durum 'girildi'ye yükselip
// yeniden bildirim gönderilir.

async function bildirimGonderVeKaydet(
  admin: ReturnType<typeof createAdminClient>,
  profileId: string,
  baslik: string,
  govde: string,
  gonderenId: string,
) {
  await pushGonderProfile(admin, profileId, baslik, govde);
  const { data: duyuru } = await admin.from("duyurular").insert({ gonderen_id: gonderenId, baslik, mesaj: govde }).select("id").single();
  if (duyuru) await admin.from("duyuru_aliciler").insert({ duyuru_id: duyuru.id, profile_id: profileId });
}

export interface DenemeBildirimSonucu {
  ad: string;
  durum: "girildi" | "girilmedi";
  gonderildi: boolean;
}

export async function denemeBildirimGonder(input: {
  classId: string; tarih: string; tur: DenemeTuru; aytAlan?: AytAlan;
}): Promise<{ error: string | null; sonuclar: DenemeBildirimSonucu[] }> {
  const { supabase, user, admin } = await requireAdmin();
  if (!input.classId) return { error: "Sınıf seçin.", sonuclar: [] };
  if (!input.tarih) return { error: "Tarih gerekli.", sonuclar: [] };

  const { data: ogrencilerHam, error: ogrenciHata } = await admin
    .from("students")
    .select("id, ayt_alan, profiles!students_id_fkey(ad)")
    .eq("class_id", input.classId);
  if (ogrenciHata) return { error: ogrenciHata.message, sonuclar: [] };

  type OgrenciRow = { id: string; ayt_alan: AytAlan; profiles: { ad: string } | null };
  const ogrenciler = ((ogrencilerHam as unknown as OgrenciRow[]) ?? []).filter(
    (o) => input.tur === "TYT" || o.ayt_alan === input.aytAlan,
  );
  if (ogrenciler.length === 0) return { error: "Bu sınıfta/alanda öğrenci yok.", sonuclar: [] };

  const ogrenciIdleri = ogrenciler.map((o) => o.id);

  const { data: denemelerHam } = await admin
    .from("denemeler")
    .select("id, student_id")
    .in("student_id", ogrenciIdleri)
    .eq("tarih", input.tarih)
    .eq("tur", input.tur)
    .eq("kaynak", "ogretmen");
  const denemeIdMap = new Map((denemelerHam ?? []).map((d) => [d.student_id as string, d.id as string]));

  const girildiSet = new Set<string>();
  const denemeIdleri = [...denemeIdMap.values()];
  if (denemeIdleri.length > 0) {
    const { data: sonucHam } = await admin.from("deneme_ders_sonuclari").select("deneme_id").in("deneme_id", denemeIdleri);
    const sonucluDenemeIdleri = new Set((sonucHam ?? []).map((s) => s.deneme_id as string));
    for (const [studentId, denemeId] of denemeIdMap) {
      if (sonucluDenemeIdleri.has(denemeId)) girildiSet.add(studentId);
    }
  }

  const { data: mevcutBildirimlerHam } = await admin
    .from("deneme_bildirimleri")
    .select("student_id, durum")
    .in("student_id", ogrenciIdleri)
    .eq("tarih", input.tarih)
    .eq("tur", input.tur);
  const mevcutBildirimMap = new Map((mevcutBildirimlerHam ?? []).map((b) => [b.student_id as string, b.durum as string]));

  // Sınıf öğretmeni(ler)i — normalde tek kişi, birden fazlaysa hepsine gider.
  const { data: ogretmenlerHam } = await admin.from("teachers").select("id").eq("class_id", input.classId);
  const ogretmenIdleri = (ogretmenlerHam ?? []).map((t) => t.id as string);

  const sonuclar: DenemeBildirimSonucu[] = [];

  for (const o of ogrenciler) {
    const ad = o.profiles?.ad ?? "Öğrenci";
    const yeniDurum: "girildi" | "girilmedi" = girildiSet.has(o.id) ? "girildi" : "girilmedi";
    const oncekiDurum = mevcutBildirimMap.get(o.id);

    if (oncekiDurum === yeniDurum) {
      sonuclar.push({ ad, durum: yeniDurum, gonderildi: false });
      continue;
    }

    const { data: veliler } = await admin.from("parent_students").select("parent_id").eq("student_id", o.id);
    const baslik = `${ad} — Deneme sonucu bildirimi`;

    if (yeniDurum === "girilmedi") {
      const govde = "Bugünkü yüklenen deneme sınavı sonuçlarında öğrenciniz yer almamaktadır.";
      for (const v of veliler ?? []) await bildirimGonderVeKaydet(admin, v.parent_id, baslik, govde, user.id);
    } else {
      const veliGovde = "Öğrencinizin deneme sonuçları yüklendi.";
      for (const v of veliler ?? []) await bildirimGonderVeKaydet(admin, v.parent_id, baslik, veliGovde, user.id);
      for (const ogretmenId of ogretmenIdleri) await bildirimGonderVeKaydet(admin, ogretmenId, baslik, veliGovde, user.id);
      await bildirimGonderVeKaydet(admin, o.id, "Deneme sonucu bildirimi", "Deneme sınavı sonuçlarınız yüklendi.", user.id);
    }

    await admin.from("deneme_bildirimleri").upsert(
      { student_id: o.id, tarih: input.tarih, tur: input.tur, durum: yeniDurum, gonderen_id: user.id, updated_at: new Date().toISOString() },
      { onConflict: "student_id,tarih,tur" },
    );

    sonuclar.push({ ad, durum: yeniDurum, gonderildi: true });
  }

  const gonderilenSayisi = sonuclar.filter((s) => s.gonderildi).length;
  if (gonderilenSayisi > 0) {
    await auditLogYaz(supabase, user.id, "deneme_bildirim_gonder", {
      class_id: input.classId, tarih: input.tarih, tur: input.tur, gonderilen: gonderilenSayisi, toplam: sonuclar.length,
    });
  }

  return { error: null, sonuclar };
}

// ============ CSV dışa aktarma ============
// Dosya oluşturma/indirme tarayıcıda yapılıyor (Blob) — burada sadece veri
// hazırlanıyor, admin bunu okul bazında indirip Excel'de açabiliyor.
export interface OgrenciDisaAktarSatiri {
  ad: string;
  okulNo: string;
  sinifAdi: string | null;
  aytAlan: AytAlan;
  hedefBolum: string;
  email: string | null;
  telefon: string | null;
}

export async function ogrenciListesiDisaAktar(schoolId: string): Promise<{ error: string | null; satirlar: OgrenciDisaAktarSatiri[] }> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("students")
    .select("okul_no, ayt_alan, hedef_bolum, profiles!students_id_fkey(ad, email, telefon), classes(seviye, sube)")
    .eq("school_id", schoolId)
    .order("okul_no");
  if (error) return { error: error.message, satirlar: [] };

  type Row = {
    okul_no: string; ayt_alan: AytAlan; hedef_bolum: string;
    profiles: { ad: string; email: string | null; telefon: string | null } | null;
    classes: { seviye: string; sube: string } | null;
  };
  const satirlar = ((data as unknown as Row[]) ?? []).map((r) => ({
    ad: r.profiles?.ad ?? "—", okulNo: r.okul_no, sinifAdi: r.classes ? `${r.classes.seviye}-${r.classes.sube}` : null,
    aytAlan: r.ayt_alan, hedefBolum: r.hedef_bolum, email: r.profiles?.email ?? null, telefon: r.profiles?.telefon ?? null,
  }));
  return { error: null, satirlar };
}

// ============ İzinli öğrenci listesi ============
// Bir okul için bu liste yüklendiyse, self-signup'ta girilen ad bu listede
// olmayan öğrenci hesabı açamaz (bkz. migration 0026, handle_new_user
// trigger'ı). Admin'in manuel/toplu eklediği hesaplar her zaman muaf.

export async function izinliOgrencileriYukle(schoolId: string, isimler: string[]): Promise<{ error: string | null; eklenen: number }> {
  const { supabase, user, admin } = await requireAdmin();
  const normalizeler = [...new Set(isimler.map(adNormalize).filter(Boolean))];
  if (normalizeler.length === 0) return { error: "En az bir isim girin.", eklenen: 0 };
  if (normalizeler.length > 1000) return { error: "Tek seferde en fazla 1000 isim yüklenebilir.", eklenen: 0 };

  const satirlar = normalizeler.map((ad_soyad) => ({ school_id: schoolId, ad_soyad }));
  const { error } = await admin.from("izinli_ogrenciler").upsert(satirlar, { onConflict: "school_id,ad_soyad", ignoreDuplicates: true });
  if (error) return { error: error.message, eklenen: 0 };

  await auditLogYaz(supabase, user.id, "izinli_ogrenci_listesi_yukle", { school_id: schoolId, satir_sayisi: normalizeler.length });
  revalidatePath("/yonetici");
  return { error: null, eklenen: normalizeler.length };
}

export async function izinliOgrencileriGetir(schoolId: string): Promise<{ error: string | null; isimler: string[] }> {
  const { admin } = await requireAdmin();
  const { data, error } = await admin.from("izinli_ogrenciler").select("ad_soyad").eq("school_id", schoolId).order("ad_soyad");
  if (error) return { error: error.message, isimler: [] };
  return { error: null, isimler: (data ?? []).map((r) => r.ad_soyad as string) };
}

export async function izinliOgrenciSil(schoolId: string, adSoyad: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { error } = await admin.from("izinli_ogrenciler").delete().eq("school_id", schoolId).eq("ad_soyad", adSoyad);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "izinli_ogrenci_sil", { school_id: schoolId, ad_soyad: adSoyad });
  revalidatePath("/yonetici");
  return { error: null };
}

export async function izinliOgrencileriTemizle(schoolId: string): Promise<{ error: string | null }> {
  const { supabase, user, admin } = await requireAdmin();
  const { error } = await admin.from("izinli_ogrenciler").delete().eq("school_id", schoolId);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "izinli_ogrenci_listesi_temizle", { school_id: schoolId });
  revalidatePath("/yonetici");
  return { error: null };
}

// Admin duyurusu — TÜM okullardaki tüm öğrencilere ve bağlı velilere gider.
// Öğretmen/müdür sürümü (kendi sınıfı/okulu ile sınırlı) dashboard/
// actions.ts'te ogretmenDuyuruGonder.
export async function adminDuyuruGonder(mesaj: string): Promise<{ error: string | null; ogrenciSayisi: number; veliSayisi: number }> {
  const { supabase, user, admin } = await requireAdmin();
  const bosSonuc = { ogrenciSayisi: 0, veliSayisi: 0 };

  const mesajTemiz = mesaj.trim();
  if (!mesajTemiz) return { error: "Mesaj boş olamaz.", ...bosSonuc };
  if (mesajTemiz.length < DUYURU_MIN_UZUNLUK) return { error: `Duyuru en az ${DUYURU_MIN_UZUNLUK} karakter olmalıdır.`, ...bosSonuc };
  if (mesajTemiz.length > DUYURU_MAKS_UZUNLUK) {
    return { error: `Mesaj en fazla ${DUYURU_MAKS_UZUNLUK} karakter olabilir.`, ...bosSonuc };
  }

  const izin = await duyuruGonderimIzniKontrol(admin, user.id);
  if (izin.error) return { error: izin.error, ...bosSonuc };
  const { data: ogrenciler } = await admin.from("students").select("id");
  const ogrenciIdleri = (ogrenciler ?? []).map((o) => o.id);

  const sonuc = await duyuruGonder(admin, ogrenciIdleri, "SG EDUCOACH duyurusu", mesajTemiz, user.id);
  await auditLogYaz(supabase, user.id, "admin_duyuru_gonder", { ogrenci_sayisi: sonuc.ogrenciSayisi, veli_sayisi: sonuc.veliSayisi, mesaj: mesajTemiz });
  return { error: null, ...sonuc };
}
