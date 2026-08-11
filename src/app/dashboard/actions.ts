"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { telefonGecerliMi, okulNoGecerliMi, rastgeleSifre, adNormalize } from "@/lib/validators";
import { duyuruGonder as duyuruGonderTemel } from "@/lib/push-send";
import { DUYURU_MIN_UZUNLUK, duyuruGonderimIzniKontrol } from "@/lib/duyuru-guvenligi";

const DUYURU_MAKS_UZUNLUK = 500;

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Admin'e özel (service-role gerektiren) işlemler için: RLS'e güvenmek yerine
// burada da açıkça doğruluyoruz — service-role client RLS'i bypass ettiğinden
// bu kontrol olmadan herhangi bir oturum açmış kullanıcı admin API'sini
// tetikleyebilirdi.
async function requireAdmin() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { supabase, user, admin: null };
  return { supabase, user, admin: createAdminClient() };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function veliTalepOnayla(requestId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("veli_talep_onayla", { p_request_id: requestId });
  if (error) return { error: error.message, kod: null };
  revalidatePath("/dashboard");
  return { error: null, kod: data as string };
}

// Admin kontrol işlemlerini iz kaydına yazar. Log yazımı başarısız olsa bile
// asıl işlemi (sınıf ekleme, atama vb.) engellemez — sadece konsola düşer.
async function auditLogYaz(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  eylem: string,
  detay: Record<string, unknown>,
) {
  const { error } = await supabase.from("admin_audit_log").insert({ actor_id: actorId, eylem, detay });
  if (error) console.error("audit log yazılamadı:", error.message);
}

export async function sinifEkle(schoolId: string, seviye: "11" | "12", sube: string) {
  const { supabase, user } = await requireUser();
  const subeBuyuk = sube.trim().toUpperCase();
  const { error } = await supabase.from("classes").insert({
    school_id: schoolId, seviye, sube: subeBuyuk,
  });
  if (error) {
    if (error.code === "23505") return { error: "Bu sınıf/şube zaten var." };
    return { error: error.message };
  }
  await auditLogYaz(supabase, user.id, "sinif_ekle", { school_id: schoolId, seviye, sube: subeBuyuk });
  revalidatePath("/yonetici");
  return { error: null };
}

// ============ Admin: okul CRUD ============
// Ekleme/düzenleme RLS'te (schools_insert_admin / schools_update_admin,
// bkz. migration 0020) is_admin()'e bağlı — buradaki kontrol sadece daha
// anlaşılır bir hata mesajı göstermek için.
export async function okulEkle(input: { ad: string; tur: "okul" | "dershane"; okulKodu: string }) {
  const { supabase, user } = await requireUser();
  const ad = input.ad.trim();
  const okulKodu = input.okulKodu.trim();
  if (!ad) return { error: "Okul adı gerekli." };
  if (!okulKodu) return { error: "Okul kodu gerekli." };

  const { data, error } = await supabase.from("schools").insert({ ad, tur: input.tur, okul_kodu: okulKodu }).select("id").single();
  if (error) {
    if (error.code === "23505") return { error: "Bu okul kodu zaten kullanılıyor." };
    if (error.message?.includes("row-level security")) return { error: "Bu işlem için yönetici yetkisi gerekiyor." };
    return { error: error.message };
  }
  await auditLogYaz(supabase, user.id, "okul_ekle", { school_id: data.id, ad, okul_kodu: okulKodu });
  revalidatePath("/yonetici");
  return { error: null };
}

export async function okulDuzenle(id: string, input: { ad: string; okulKodu: string }) {
  const { supabase, user } = await requireUser();
  const ad = input.ad.trim();
  const okulKodu = input.okulKodu.trim();
  if (!ad) return { error: "Okul adı gerekli." };
  if (!okulKodu) return { error: "Okul kodu gerekli." };

  const { error } = await supabase.from("schools").update({ ad, okul_kodu: okulKodu }).eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Bu okul kodu zaten kullanılıyor." };
    return { error: "Bu işlem için yönetici yetkisi gerekiyor." };
  }
  await auditLogYaz(supabase, user.id, "okul_duzenle", { school_id: id, ad, okul_kodu: okulKodu });
  revalidatePath("/yonetici");
  return { error: null };
}

export async function okulAktiflikDegistir(id: string, aktif: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("schools").update({ aktif }).eq("id", id);
  if (error) return { error: "Bu işlem için yönetici yetkisi gerekiyor." };
  await auditLogYaz(supabase, user.id, aktif ? "okul_aktiflestir" : "okul_pasiflestir", { school_id: id });
  revalidatePath("/yonetici");
  return { error: null };
}

// Sınıf öğretmeni ataması — sadece admin çalıştırabilir, yetki kontrolü
// veritabanı tarafında (RLS + trigger, bkz. migration 0014) uygulanıyor.
// Buradaki kontrol yalnızca kullanıcıya daha anlaşılır bir hata göstermek için.
export async function sinifOgretmeniAta(ogretmenId: string, classId: string | null) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("teachers").update({ class_id: classId }).eq("id", ogretmenId);
  if (error) {
    if (error.code === "23505") return { error: "Bu sınıfın zaten bir sınıf öğretmeni var." };
    if (error.message?.includes("yönetici tarafından")) return { error: error.message };
    return { error: "Bu işlem için yönetici yetkisi gerekiyor." };
  }
  await auditLogYaz(supabase, user.id, classId ? "sinif_ogretmeni_ata" : "sinif_ogretmenliginden_cikar", { ogretmen_id: ogretmenId, class_id: classId });
  revalidatePath("/yonetici");
  return { error: null };
}

// ============ Admin: manuel öğretmen/öğrenci ekleme ============
// Admin API (service-role) ile hesap oluşturur; email_confirm: true olduğu
// için onay e-postası GÖNDERİLMEZ (bounce riski yok) — geçici şifre burada
// üretilip admin'e bir kerelik gösterilir, admin bunu ilgili kişiye iletir.

function manuelEklemeHatasi(mesaj: string): string {
  if (mesaj.includes("already been registered") || mesaj.includes("already registered")) {
    return "Bu e-posta zaten kayıtlı.";
  }
  if (mesaj.includes("okul_no")) return "Bu okul numarası zaten kullanılıyor.";
  return mesaj;
}

export async function ogretmenEkleManuel(input: {
  ad: string; email: string; telefon: string; schoolId: string; brans: string; mudur?: boolean;
}) {
  const { supabase, user, admin } = await requireAdmin();
  if (!admin) return { error: "Bu işlem için yönetici yetkisi gerekiyor.", sifre: null };

  const ad = adNormalize(input.ad);
  const email = input.email.trim().toLowerCase();
  if (!ad) return { error: "Ad Soyad gerekli.", sifre: null };
  if (!email) return { error: "E-posta gerekli.", sifre: null };
  if (!telefonGecerliMi(input.telefon)) return { error: "Telefon numarası geçersiz.", sifre: null };
  if (!input.schoolId) return { error: "Okul seçin.", sifre: null };
  // Müdür için branş anlamsız — handle_new_user() trigger'ı zaten 'Müdür'ü
  // sabit atıyor (bkz. migration 0009), metadata'daki brans'ı yok sayıyor.
  if (!input.mudur && !input.brans) return { error: "Branş seçin.", sifre: null };

  const rol = input.mudur ? "mudur" : "ogretmen";
  const sifre = rastgeleSifre();
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password: sifre, email_confirm: true,
    user_metadata: { role: rol, ad, telefon: input.telefon, school_id: input.schoolId, brans: input.brans },
  });
  if (error) return { error: manuelEklemeHatasi(error.message), sifre: null };

  await auditLogYaz(supabase, user.id, input.mudur ? "mudur_ekle_manuel" : "ogretmen_ekle_manuel", { ogretmen_id: created.user?.id, email, school_id: input.schoolId });
  revalidatePath("/yonetici");
  return { error: null, sifre };
}

export async function ogrenciEkleManuel(input: {
  ad: string; email: string; okulNo: string; telefon: string; schoolId: string; classId: string;
  aytAlan: "SAY" | "EA" | "SOZ"; hedefBolum: string;
}) {
  const { supabase, user, admin } = await requireAdmin();
  if (!admin) return { error: "Bu işlem için yönetici yetkisi gerekiyor.", sifre: null };

  const ad = adNormalize(input.ad);
  const email = input.email.trim().toLowerCase();
  if (!ad) return { error: "Ad Soyad gerekli.", sifre: null };
  if (!email) return { error: "E-posta gerekli.", sifre: null };
  if (!okulNoGecerliMi(input.okulNo)) return { error: "Okul no geçersiz (sadece rakam, en fazla 5 hane).", sifre: null };
  if (input.telefon && !telefonGecerliMi(input.telefon)) return { error: "Telefon numarası geçersiz.", sifre: null };
  if (!input.schoolId) return { error: "Okul seçin.", sifre: null };
  if (!input.classId) return { error: "Sınıf seçin.", sifre: null };

  const sifre = rastgeleSifre();
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password: sifre, email_confirm: true,
    user_metadata: {
      role: "ogrenci", ad, telefon: input.telefon || null, school_id: input.schoolId, class_id: input.classId,
      okul_no: input.okulNo, ayt_alan: input.aytAlan, hedef_bolum: input.hedefBolum,
      admin_ekledi: true, // izinli öğrenci listesi kontrolünden muaf (bkz. migration 0026)
    },
  });
  if (error) return { error: manuelEklemeHatasi(error.message), sifre: null };

  await auditLogYaz(supabase, user.id, "ogrenci_ekle_manuel", { ogrenci_id: created.user?.id, okul_no: input.okulNo, school_id: input.schoolId, class_id: input.classId });
  revalidatePath("/yonetici");
  return { error: null, sifre };
}

// ============ Admin: toplu öğrenci ekleme ============
// Bir sınıfın tüm listesini tek tek "Öğrenci ekle" formuyla girmek yerine
// satır satır (Ad Soyad, Okul No) yapıştırıp tek seferde hesap açar.
// E-posta öğrenciye hiç gösterilmiyor/kullanılmıyor (giriş okul no+şifre
// iledir) — sadece Auth hesabı için benzersiz bir değer gerektiğinden
// otomatik üretiliyor.
export interface TopluOgrenciSonuc {
  ad: string;
  okulNo: string;
  sifre: string | null;
  hata: string | null;
}

export async function ogrencileriTopluEkle(input: {
  schoolId: string; classId: string; aytAlan: "SAY" | "EA" | "SOZ";
  satirlar: { ad: string; okulNo: string }[];
}): Promise<{ error: string | null; sonuclar: TopluOgrenciSonuc[] }> {
  const { supabase, user, admin } = await requireAdmin();
  if (!admin) return { error: "Bu işlem için yönetici yetkisi gerekiyor.", sonuclar: [] };
  if (!input.schoolId) return { error: "Okul seçin.", sonuclar: [] };
  if (!input.classId) return { error: "Sınıf seçin.", sonuclar: [] };
  if (input.satirlar.length === 0) return { error: "Eklenecek satır bulunamadı.", sonuclar: [] };
  if (input.satirlar.length > 60) return { error: "Tek seferde en fazla 60 öğrenci eklenebilir.", sonuclar: [] };

  const sonuclar: TopluOgrenciSonuc[] = [];
  let basariliSayisi = 0;

  // Auth admin API'sinin eşzamanlı isteklerde oran sınırına takılmaması için
  // satırlar sırayla (paralel değil) işleniyor — sınıf boyutu (~20-35)
  // için birkaç saniye sürer, kabul edilebilir.
  for (const satir of input.satirlar) {
    const ad = adNormalize(satir.ad);
    const okulNo = satir.okulNo.trim();
    if (!ad || !okulNoGecerliMi(okulNo)) {
      sonuclar.push({ ad, okulNo, sifre: null, hata: "Ad/okul no geçersiz." });
      continue;
    }

    const sifre = rastgeleSifre();
    const email = `${crypto.randomUUID()}@ogrenci.sgeducoach.internal`;
    const { data: created, error } = await admin.auth.admin.createUser({
      email, password: sifre, email_confirm: true,
      user_metadata: {
        role: "ogrenci", ad, telefon: null, school_id: input.schoolId, class_id: input.classId,
        okul_no: okulNo, ayt_alan: input.aytAlan, hedef_bolum: "",
        admin_ekledi: true, // izinli öğrenci listesi kontrolünden muaf (bkz. migration 0026)
      },
    });
    if (error) {
      sonuclar.push({ ad, okulNo, sifre: null, hata: manuelEklemeHatasi(error.message) });
      continue;
    }
    void created;
    sonuclar.push({ ad, okulNo, sifre, hata: null });
    basariliSayisi++;
  }

  if (basariliSayisi > 0) {
    await auditLogYaz(supabase, user.id, "ogrenci_toplu_ekle", {
      school_id: input.schoolId, class_id: input.classId, basarili: basariliSayisi, toplam: input.satirlar.length,
    });
    revalidatePath("/yonetici");
  }

  return { error: null, sonuclar };
}

// Öğretmen (kendi sınıfına) veya müdür (kendi okuluna) duyuru gönderir —
// hem öğrencilere hem bağlı velilere aynı mesaj push bildirimi olarak gider.
// Kapsam server-side belirleniyor/doğrulanıyor (client'tan gelen `kapsam`
// sadece müdür için anlamlı, bir seçim ipucu — hangi okula/sınıfa ait
// olduğu burada tekrar kontrol ediliyor, öğretmen için tamamen yok sayılıyor
// çünkü onun kapsamı zaten sabit: kendi sınıfı).
// kapsam değerleri (müdür): "okul" (tüm okul, varsayılan) | "11" | "12"
// (seviye) | <classId> (belirli bir şube).
export async function ogretmenDuyuruGonder(mesaj: string, kapsam?: string): Promise<{ error: string | null; ogrenciSayisi: number; veliSayisi: number }> {
  const { supabase, user } = await requireUser();
  const bosSonuc = { ogrenciSayisi: 0, veliSayisi: 0 };

  const mesajTemiz = mesaj.trim();
  if (!mesajTemiz) return { error: "Mesaj boş olamaz.", ...bosSonuc };
  if (mesajTemiz.length < DUYURU_MIN_UZUNLUK) return { error: `Duyuru en az ${DUYURU_MIN_UZUNLUK} karakter olmalıdır.`, ...bosSonuc };
  if (mesajTemiz.length > DUYURU_MAKS_UZUNLUK) {
    return { error: `Mesaj en fazla ${DUYURU_MAKS_UZUNLUK} karakter olabilir.`, ...bosSonuc };
  }

  const [{ data: profile }, { data: teacher }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    supabase.from("teachers").select("school_id, class_id").eq("id", user.id).single(),
  ]);
  if (!teacher || (profile?.role !== "ogretmen" && profile?.role !== "mudur")) {
    return { error: "Bu işlem için öğretmen veya müdür yetkisi gerekiyor.", ...bosSonuc };
  }

  const admin = createAdminClient();
  const izin = await duyuruGonderimIzniKontrol(admin, user.id);
  if (izin.error) return { error: izin.error, ...bosSonuc };
  let ogrenciIdleri: string[];
  let baslik: string;

  if (profile.role === "mudur") {
    if (kapsam === "11" || kapsam === "12") {
      const { data: ogrenciler } = await admin
        .from("students").select("id, classes!inner(seviye)")
        .eq("school_id", teacher.school_id).eq("classes.seviye", kapsam);
      ogrenciIdleri = (ogrenciler ?? []).map((o) => o.id);
      baslik = `Okul yönetiminden duyuru (${kapsam}. sınıflar)`;
    } else if (kapsam && kapsam !== "okul") {
      // Belirli bir şube seçildi — o sınıfın gerçekten bu müdürün okuluna
      // ait olduğunu doğrulamadan öğrenci çekmiyoruz (başka okulun class_id'si
      // gönderilirse sessizce reddedilir, boş sonuç döner).
      const { data: sinif } = await admin.from("classes").select("id, seviye, sube").eq("id", kapsam).eq("school_id", teacher.school_id).maybeSingle();
      if (!sinif) return { error: "Seçilen sınıf bu okula ait değil.", ...bosSonuc };
      const { data: ogrenciler } = await admin.from("students").select("id").eq("class_id", sinif.id);
      ogrenciIdleri = (ogrenciler ?? []).map((o) => o.id);
      baslik = `Okul yönetiminden duyuru (${sinif.seviye}-${sinif.sube})`;
    } else {
      const { data: ogrenciler } = await admin.from("students").select("id").eq("school_id", teacher.school_id);
      ogrenciIdleri = (ogrenciler ?? []).map((o) => o.id);
      baslik = "Okul yönetiminden duyuru";
    }
  } else {
    if (!teacher.class_id) return { error: "Sınıf öğretmeni olmadığınız için duyuru gönderemezsiniz.", ...bosSonuc };
    const { data: ogrenciler } = await admin.from("students").select("id").eq("class_id", teacher.class_id);
    ogrenciIdleri = (ogrenciler ?? []).map((o) => o.id);
    baslik = "Öğretmeninizden duyuru";
  }

  const sonuc = await duyuruGonderTemel(admin, ogrenciIdleri, baslik, mesajTemiz, user.id);
  return { error: null, ...sonuc };
}
