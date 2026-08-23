"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  telefonGecerliMi,
  okulNoGecerliMi,
  kullaniciAdiGecerliMi,
  rastgeleSifre,
  adNormalize,
  hedefBolumNormalize,
  KULLANICI_ADI_IPUCU,
  TELEFON_IPUCU,
} from "@/lib/validators";
import { duyuruGonder as duyuruGonderTemel } from "@/lib/push-send";
import type { DuyuruAliciTuru } from "@/lib/push-send";
import { DUYURU_MIN_UZUNLUK, duyuruGonderimIzniKontrol } from "@/lib/duyuru-guvenligi";
import { requireDershaneMudur } from "@/lib/dershane-auth";
import { bekleyenPdfSonuclariniOgrenciyeAktar } from "@/lib/deneme-sonucu-kaydet";
import type { SinifSeviyesi } from "@/lib/types";

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

export async function sinifEkle(schoolId: string, seviye: SinifSeviyesi, sube: string) {
  const { supabase, user } = await requireUser();
  if (!["9", "10", "11", "12"].includes(seviye)) return { error: "Geçersiz sınıf seviyesi." };
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
  const hedefBolum = hedefBolumNormalize(input.hedefBolum);

  const sifre = rastgeleSifre();
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password: sifre, email_confirm: true,
    user_metadata: {
      role: "ogrenci", ad, telefon: input.telefon || null, school_id: input.schoolId, class_id: input.classId,
      okul_no: input.okulNo, ayt_alan: input.aytAlan, hedef_bolum: hedefBolum,
      admin_ekledi: true, // izinli öğrenci listesi kontrolünden muaf (bkz. migration 0026)
    },
  });
  if (error) return { error: manuelEklemeHatasi(error.message), sifre: null };

  await auditLogYaz(supabase, user.id, "ogrenci_ekle_manuel", { ogrenci_id: created.user?.id, okul_no: input.okulNo, school_id: input.schoolId, class_id: input.classId });
  revalidatePath("/yonetici");
  return { error: null, sifre };
}

// ============ DERSHANE MODU: müdür/moderatör kesin öğrenci kaydı ============
// Tekli form doğrudan Auth + profiles + students kaydı oluşturur. Toplu
// Excel listesi ise aşağıdaki dershaneRosterTopluEkle akışında ön kayıt
// olarak kalır; öğrenci kendi kaydını daha sonra tamamlayabilir.
export async function dershaneOgrenciKesinKaydet(input: {
  ad: string;
  kullaniciAdi: string;
  telefon: string;
  veliTelefon?: string;
  classId: string;
  aytAlan: "SAY" | "EA" | "SOZ";
}): Promise<{
  error: string | null;
  sifre: string | null;
  kullaniciAdi: string | null;
  aktarilanDenemeSayisi: number;
}> {
  const { supabase, user, admin, schoolId } = await requireDershaneMudur();
  const bosSonuc = { sifre: null, kullaniciAdi: null, aktarilanDenemeSayisi: 0 };
  if (!admin || !schoolId) return { error: "Bu işlem için dershane müdürü yetkisi gerekiyor.", ...bosSonuc };

  const ad = adNormalize(input.ad);
  const kullaniciAdi = input.kullaniciAdi.trim();
  const telefon = input.telefon.trim();
  const veliTelefon = input.veliTelefon?.trim() || null;
  if (!ad) return { error: "Ad Soyad gerekli.", ...bosSonuc };
  if (!kullaniciAdiGecerliMi(kullaniciAdi)) return { error: `Kullanıcı adı geçersiz. ${KULLANICI_ADI_IPUCU}`, ...bosSonuc };
  if (!telefonGecerliMi(telefon)) return { error: "Telefon numarası geçersiz. " + TELEFON_IPUCU, ...bosSonuc };
  if (veliTelefon && !telefonGecerliMi(veliTelefon)) return { error: "Veli telefon numarası geçersiz. " + TELEFON_IPUCU, ...bosSonuc };
  if (!input.classId) return { error: "Sınıf seçin.", ...bosSonuc };

  const [sinifYaniti, mevcutYaniti, onKayitYaniti] = await Promise.all([
    admin.from("classes").select("id").eq("id", input.classId).eq("school_id", schoolId).maybeSingle(),
    admin.from("students").select("id").eq("school_id", schoolId).eq("okul_no", kullaniciAdi).maybeSingle(),
    admin.from("pending_dershane_ogrenciler")
      .select("id, ad")
      .eq("school_id", schoolId)
      .eq("telefon", telefon)
      .is("kullanildi_at", null)
      .maybeSingle(),
  ]);
  const sorguHatasi = sinifYaniti.error ?? mevcutYaniti.error ?? onKayitYaniti.error;
  if (sorguHatasi) return { error: "Öğrenci bilgileri doğrulanamadı. Lütfen tekrar deneyin.", ...bosSonuc };
  if (!sinifYaniti.data) return { error: "Seçilen sınıf bu dershaneye ait değil.", ...bosSonuc };
  if (mevcutYaniti.data) return { error: "Bu kullanıcı adı dershanede zaten kullanılıyor.", ...bosSonuc };

  const sifre = rastgeleSifre();
  const email = `${crypto.randomUUID()}@ogrenci.sgeducoach.internal`;
  const { data: created, error: hesapHatasi } = await admin.auth.admin.createUser({
    email,
    password: sifre,
    email_confirm: true,
    user_metadata: {
      role: "ogrenci",
      ad,
      telefon,
      veli_telefon: veliTelefon,
      school_id: schoolId,
      class_id: input.classId,
      okul_no: kullaniciAdi,
      ayt_alan: input.aytAlan,
      hedef_bolum: "Belirtilmedi",
      gecici_sifre: true,
      admin_ekledi: true,
    },
  });
  if (hesapHatasi || !created.user) {
    const mesaj = hesapHatasi?.message ?? "Öğrenci hesabı oluşturulamadı.";
    const kullaniciAdiHatasi = mesaj.includes("okul_no") || mesaj.toLocaleLowerCase("tr-TR").includes("duplicate");
    return { error: kullaniciAdiHatasi ? "Bu kullanıcı adı dershanede zaten kullanılıyor." : mesaj, ...bosSonuc };
  }

  let aktarilanDenemeSayisi = 0;
  const onKayit = onKayitYaniti.data;
  if (onKayit) {
    const aktarim = await bekleyenPdfSonuclariniOgrenciyeAktar(admin, {
      schoolId,
      pendingId: onKayit.id,
      studentId: created.user.id,
      ad: onKayit.ad,
    });
    aktarilanDenemeSayisi = aktarim.aktarilan;
    if (aktarim.error || aktarim.atlanan > 0) {
      console.error("Kesin kayıtta bekleyen PDF sonuçları tam aktarılamadı:", {
        error: aktarim.error,
        atlanan: aktarim.atlanan,
        pendingId: onKayit.id,
      });
    }
    const { error: onKayitGuncellemeHatasi } = await admin.from("pending_dershane_ogrenciler")
      .update({ kullanildi_at: new Date().toISOString() })
      .eq("id", onKayit.id)
      .is("kullanildi_at", null);
    if (onKayitGuncellemeHatasi) console.error("Kesin kayda dönüşen ön kayıt güncellenemedi:", onKayitGuncellemeHatasi);
  }

  await auditLogYaz(supabase, user.id, "dershane_ogrenci_kesin_kayit", {
    ogrenci_id: created.user.id,
    school_id: schoolId,
    class_id: input.classId,
    on_kayittan_donustu: !!onKayit,
    aktarilan_deneme_sayisi: aktarilanDenemeSayisi,
  });
  revalidatePath("/dashboard");
  revalidatePath("/moderator");
  return { error: null, sifre, kullaniciAdi, aktarilanDenemeSayisi };
}

// ============ DERSHANE MODU: müdür roster ekleme (toplu, .xlsx) ============
// Şablon: src/app/api/dershane/roster-sablonu (GET) — Sınıf Öğretmeni
// (bilgi amaçlı, yok sayılır) / Telefon / Ad Soyad / Veli Telefonu / Alan
// / Sınıf (seviye) / Şube / Hafta İçi-Sonu — Sınıf ve Şube kullanıcı
// isteğiyle ayrı kolonlara bölündü (önceden "11-A" gibi tek bir kolondu).
// Satırlar sırayla işlenir (admin'in ogrencileriTopluEkle'sindeki aynı
// desen) — bir satırın hatası diğerlerini engellemez, satır numarasıyla
// birlikte raporlanır.
export interface TopluRosterSonuc {
  satir: number;
  ad: string;
  hata: string | null;
}

const PROGRAM_ETIKET_TERS: Record<string, "haftaici" | "haftasonu"> = {
  "hafta içi": "haftaici", "haftaiçi": "haftaici", "hafta ici": "haftaici", "haftaici": "haftaici",
  "hafta sonu": "haftasonu", "haftasonu": "haftasonu",
};

export async function dershaneRosterTopluEkle(formData: FormData): Promise<{ error: string | null; sonuclar: TopluRosterSonuc[] }> {
  const { user, admin, schoolId } = await requireDershaneMudur();
  if (!admin || !schoolId) return { error: "Bu işlem için dershane müdürü yetkisi gerekiyor.", sonuclar: [] };

  const dosya = formData.get("dosya") as File | null;
  if (!dosya) return { error: "Dosya seçilmedi.", sonuclar: [] };

  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await dosya.arrayBuffer());
  } catch {
    return { error: "Dosya okunamadı — .xlsx formatında olduğundan emin olun.", sonuclar: [] };
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) return { error: "Sayfa bulunamadı.", sonuclar: [] };

  const { data: siniflarHam } = await admin.from("classes").select("id, seviye, sube").eq("school_id", schoolId);
  const sinifMap = new Map((siniflarHam ?? []).map((s) => [`${s.seviye}-${s.sube}`, s.id]));

  type Satir = { no: number; telefon: string; ad: string; veliTelefon: string; alan: string; seviye: string; sube: string; program: string };
  const satirlar: Satir[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // başlık
    const deger = (i: number) => String(row.getCell(i).value ?? "").trim();
    if (!deger(2) && !deger(3)) return; // tamamen boş satır — atla
    satirlar.push({
      no: rowNumber, telefon: deger(2), ad: deger(3), veliTelefon: deger(4), alan: deger(5).toUpperCase(),
      seviye: deger(6), sube: deger(7).toLocaleUpperCase("tr-TR"), program: deger(8),
    });
  });

  if (satirlar.length === 0) return { error: "Şablonda doldurulmuş satır bulunamadı.", sonuclar: [] };
  if (satirlar.length > 200) return { error: "Tek seferde en fazla 200 öğrenci yüklenebilir.", sonuclar: [] };

  const sonuclar: TopluRosterSonuc[] = [];
  let basariliSayisi = 0;

  for (const satir of satirlar) {
    const ad = adNormalize(satir.ad);
    if (!ad) { sonuclar.push({ satir: satir.no, ad: satir.ad, hata: "Ad Soyad gerekli." }); continue; }
    if (!telefonGecerliMi(satir.telefon)) { sonuclar.push({ satir: satir.no, ad, hata: "Telefon numarası geçersiz." }); continue; }
    if (satir.veliTelefon && !telefonGecerliMi(satir.veliTelefon)) { sonuclar.push({ satir: satir.no, ad, hata: "Veli telefon numarası geçersiz." }); continue; }
    if (!["SAY", "EA", "SOZ", "SÖZ"].includes(satir.alan)) { sonuclar.push({ satir: satir.no, ad, hata: "Alan SAY, EA veya SÖZ olmalı." }); continue; }
    const sinifEtiketi = `${satir.seviye}-${satir.sube}`;
    const classId = sinifMap.get(sinifEtiketi);
    if (!classId) { sonuclar.push({ satir: satir.no, ad, hata: `Sınıf "${sinifEtiketi}" bulunamadı — önce Şubeler bölümünden oluşturun.` }); continue; }
    const program = PROGRAM_ETIKET_TERS[satir.program.toLocaleLowerCase("tr-TR")];
    if (!program) { sonuclar.push({ satir: satir.no, ad, hata: 'Hafta İçi/Sonu "Hafta İçi" veya "Hafta Sonu" olmalı.' }); continue; }
    void program; // program şu an pending kayıtta tutulmuyor, class_id üzerinden zaten biliniyor

    const { error } = await admin.from("pending_dershane_ogrenciler").insert({
      school_id: schoolId, class_id: classId, ad, telefon: satir.telefon,
      veli_telefon: satir.veliTelefon || null, ayt_alan: satir.alan === "SÖZ" ? "SOZ" : satir.alan, created_by: user.id,
    });
    if (error) {
      sonuclar.push({ satir: satir.no, ad, hata: error.code === "23505" ? "Bu telefon numarasıyla zaten bir kayıt var." : error.message });
      continue;
    }
    sonuclar.push({ satir: satir.no, ad, hata: null });
    basariliSayisi++;
  }

  if (basariliSayisi > 0) revalidatePath("/dashboard");
  return { error: null, sonuclar };
}

// ============ DERSHANE MODU: müdür öğretmen ekleme ============
// Öğretmen/veli her yerde ortak (okulla aynı e-posta+şifre girişi) —
// admin'in ogretmenEkleManuel'iyle aynı desen, sadece requireDershaneMudur
// ile korunuyor ve schoolId müdürün kendi okulundan geliyor (input'tan
// alınmıyor — başka bir okula ekleme yapılamasın diye).
// classId opsiyonel: sınıf öğretmenliği burada, YARATMA anında atanabiliyor
// (teachers_class_id_guard trigger'ı sadece UPDATE'i admin'e kısıtlıyor,
// INSERT'i etkilemiyor — bkz. schema.sql).
export async function dershaneOgretmenEkle(input: {
  ad: string; email: string; telefon: string; brans: string; classId?: string;
}) {
  const { supabase, user, admin, schoolId } = await requireDershaneMudur();
  if (!admin || !schoolId) return { error: "Bu işlem için dershane müdürü yetkisi gerekiyor.", sifre: null };

  const ad = adNormalize(input.ad);
  const email = input.email.trim().toLowerCase();
  if (!ad) return { error: "Ad Soyad gerekli.", sifre: null };
  if (!email) return { error: "E-posta gerekli.", sifre: null };
  if (!telefonGecerliMi(input.telefon)) return { error: "Telefon numarası geçersiz. " + TELEFON_IPUCU, sifre: null };
  if (!input.brans) return { error: "Branş seçin.", sifre: null };

  const sifre = rastgeleSifre();
  const { error } = await admin.auth.admin.createUser({
    email, password: sifre, email_confirm: true,
    user_metadata: {
      role: "ogretmen", ad, telefon: input.telefon, school_id: schoolId, brans: input.brans,
      class_id: input.classId || undefined,
    },
  });
  if (error) return { error: manuelEklemeHatasi(error.message), sifre: null };

  await auditLogYaz(supabase, user.id, "dershane_ogretmen_ekle", { email, school_id: schoolId });
  revalidatePath("/dashboard");
  return { error: null, sifre };
}

// ============ DERSHANE MODU: müdür şube (sınıf) ekleme ============
// Okulda sınıf ekleme admin-only (classes_insert_admin RLS) — dershanede
// müdür kendi şubelerini kendi kurabiliyor. `program` (haftaiçi/haftasonu,
// migration 0051) sadece burada toplanıyor, okul şubelerinde kullanılmıyor.
export async function dershaneSinifEkle(input: { seviye: "9" | "10" | "11" | "12"; sube: string; program: "haftaici" | "haftasonu" }) {
  const { supabase, user, admin, schoolId } = await requireDershaneMudur();
  if (!admin || !schoolId) return { error: "Bu işlem için dershane müdürü yetkisi gerekiyor." };

  const sube = input.sube.trim().toLocaleUpperCase("tr-TR");
  if (!sube) return { error: "Şube adı gerekli." };

  const { error } = await admin.from("classes").insert({ school_id: schoolId, seviye: input.seviye, sube, program: input.program });
  if (error) {
    if (error.code === "23505") return { error: "Bu seviye ve şube zaten var." };
    return { error: error.message };
  }
  await auditLogYaz(supabase, user.id, "dershane_sinif_ekle", { school_id: schoolId, seviye: input.seviye, sube });
  revalidatePath("/dashboard");
  return { error: null };
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
export async function ogretmenDuyuruGonder(mesaj: string, kapsam?: string, aliciTuru: DuyuruAliciTuru = "hepsi"): Promise<{ error: string | null; ogrenciSayisi: number; veliSayisi: number; kalanGunlukHak: number }> {
  const { supabase, user } = await requireUser();
  const bosSonuc = { ogrenciSayisi: 0, veliSayisi: 0, kalanGunlukHak: 0 };

  const mesajTemiz = mesaj.trim();
  if (!["hepsi", "ogrenci", "veli"].includes(aliciTuru)) return { error: "Geçersiz alıcı seçimi.", ...bosSonuc };
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
    if (["9", "10", "11", "12"].includes(kapsam ?? "")) {
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

  const sonuc = await duyuruGonderTemel(admin, ogrenciIdleri, baslik, mesajTemiz, user.id, aliciTuru);
  await admin.from("admin_audit_log").insert({
    actor_id: user.id,
    eylem: profile.role === "mudur" ? "mudur_duyuru_gonder" : "ogretmen_duyuru_gonder",
    detay: { school_id: teacher.school_id, class_id: teacher.class_id, kapsam: kapsam ?? null, alici_turu: aliciTuru, ogrenci_sayisi: sonuc.ogrenciSayisi, veli_sayisi: sonuc.veliSayisi },
  });
  return { error: null, ...sonuc, kalanGunlukHak: izin.kalanGunlukHak };
}

// ============ Faz 2 (yenilikler_1.txt §4): öğretmen çoklu sınıf/ders ============
// Öğretmenin kendi ekleyip çıkarabildiği, admin onayı gerektirmeyen bir
// self-servis ilişki (bkz. migration 0045, ogretmen_dersleri). Yetki kontrolü
// RLS'te (kendi okulundaki bir sınıf olmalı) — buradaki kontrol sadece daha
// anlaşılır bir hata mesajı için.
export async function ogretmenDersEkle(classId: string, ders: string) {
  const { supabase, user } = await requireUser();
  const dersTemiz = ders.trim();
  if (!classId || !dersTemiz) return { error: "Sınıf ve ders seçin." };
  const { error } = await supabase.from("ogretmen_dersleri").insert({ teacher_id: user.id, class_id: classId, ders: dersTemiz });
  if (error) {
    if (error.code === "23505") return { error: "Bu sınıf/ders zaten listenizde." };
    if (error.message?.includes("row-level security")) return { error: "Bu sınıf kendi okulunuza ait değil." };
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { error: null };
}

export async function ogretmenDersSil(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("ogretmen_dersleri").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

// Öğrenci sınıf transferi ("öğrenci ekle/çıkar", kullanıcı kararı — bkz.
// migration 0045). RLS + students_transfer_guard trigger'ı, sadece kendi
// sınıfındaki bir öğrenciyi aynı okuldaki başka bir sınıfa taşımaya izin
// veriyor; buradaki kontrol yalnızca anlaşılır bir hata mesajı için.
export async function ogrenciSinifTasi(studentId: string, yeniSinifId: string) {
  const { supabase, user } = await requireUser();
  if (!yeniSinifId) return { error: "Hedef sınıf seçin." };
  const { error } = await supabase.from("students").update({ class_id: yeniSinifId }).eq("id", studentId);
  if (error) {
    if (error.message?.includes("row-level security")) return { error: "Bu öğrenciyi taşıma yetkiniz yok (kendi sınıfınızda olmalı)." };
    return { error: error.message };
  }
  await auditLogYaz(supabase, user.id, "ogrenci_sinif_tasi", { ogrenci_id: studentId, yeni_sinif_id: yeniSinifId });
  revalidatePath("/dashboard");
  return { error: null };
}

// Yurt öğrencisi işareti — sınıf öğretmeni kendi sınıfındaki bir öğrenciyi
// işaretleyebilir (aynı students_update_sinif_ogretmeni RLS politikası,
// migration 0045 — yeni bir politika gerekmedi). Admin ve okul moderatörü
// için aynı işlem yonetici/actions.ts ve moderator/actions.ts'te service-role
// ile ayrıca var (bkz. migration 0053 — rozet eşikleri ve hatırlatma
// cron'u bu bayrağa göre hafta sonuna esnetiliyor).
export async function ogrenciYurtDurumuGuncelle(studentId: string, yurtOgrencisi: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("students").update({ yurt_ogrencisi: yurtOgrencisi }).eq("id", studentId);
  if (error) {
    if (error.message?.includes("row-level security")) return { error: "Bu öğrenciyi işaretleme yetkiniz yok (kendi sınıfınızda olmalı)." };
    return { error: error.message };
  }
  await auditLogYaz(supabase, user.id, yurtOgrencisi ? "yurt_ogrencisi_isaretle" : "yurt_ogrencisi_kaldir", { ogrenci_id: studentId });
  revalidatePath("/dashboard");
  return { error: null };
}

// Soru çözümü "gördüm" onayı — RLS (soru_cozumleri_update_ogretmen_onay)
// sadece kendi sınıfındaki öğrencinin kaydına izin veriyor.
export async function soruCozumuOnayla(id: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("soru_cozumleri")
    .update({ onaylandi_mi: true, onaylayan_id: user.id, onaylanma_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

// Bir öğretmen/müdürün kendi gönderdiği duyuruların geçmişi — RLS'te
// "duyurular_select_alici" sadece alıcıya izin veriyor, gönderen kendi
// duyurusunun bile alıcısı olmayabileceği için burada admin client ile
// SADECE kendi gonderen_id'sine göre filtrelenmiş satırlar okunuyor.
export interface GonderilenDuyuru {
  id: string;
  baslik: string;
  mesaj: string;
  createdAt: string;
  aliciSayisi: number;
}

export async function gonderilenDuyurularGetir(): Promise<{ error: string | null; duyurular: GonderilenDuyuru[] }> {
  const { user } = await requireUser();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("duyurular")
    .select("id, baslik, mesaj, created_at")
    .eq("gonderen_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return { error: error.message, duyurular: [] };

  const ids = (data ?? []).map((d) => d.id as string);
  const aliciSayilari = new Map<string, number>();
  if (ids.length > 0) {
    const { data: aliciSatirlari } = await admin.from("duyuru_aliciler").select("duyuru_id").in("duyuru_id", ids);
    for (const satir of aliciSatirlari ?? []) {
      const id = satir.duyuru_id as string;
      aliciSayilari.set(id, (aliciSayilari.get(id) ?? 0) + 1);
    }
  }

  return {
    error: null,
    duyurular: (data ?? []).map((d) => ({
      id: d.id as string, baslik: d.baslik as string, mesaj: d.mesaj as string,
      createdAt: d.created_at as string, aliciSayisi: aliciSayilari.get(d.id as string) ?? 0,
    })),
  };
}
