"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rastgeleSifre } from "@/lib/validators";
import { getAnthropicClient } from "@/lib/anthropic";
import { KONU_ANLATIMI_SISTEM_PROMPTU, icerikTemizle } from "@/lib/konu-anlatimi";
import type { UserRole } from "@/lib/types";

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
  if (q.length < 2) return { error: null, sonuclar: [] };

  let query = supabase
    .from("profiles")
    .select("id, ad, email, telefon, role, aktif")
    .neq("role", "admin")
    .or(`ad.ilike.%${q}%,email.ilike.%${q}%`)
    .order("ad")
    .limit(40);
  if (rolFiltre !== "hepsi") query = query.eq("role", rolFiltre);

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
  await auditLogYaz(supabase, user.id, "sifre_sifirla", { hedef_id: userId });
  return { error: null, sifre };
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
  const { error } = await admin.from("students").update({ class_id: classId }).eq("id", studentId);
  if (error) return { error: error.message };
  await auditLogYaz(supabase, user.id, "ogrenci_sinif_tasi", { student_id: studentId, class_id: classId });
  revalidatePath("/yonetici");
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
  const kod = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();

  const { error } = await admin
    .from("veli_link_requests")
    .update({ durum: "onaylandi", kod, onaylayan_ogretmen_id: user.id, onaylanma_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("durum", "bekliyor");
  if (error) return { error: error.message, kod: null };

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
