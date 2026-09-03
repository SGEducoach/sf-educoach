"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adNormalize, hedefBolumNormalize, okulNoGecerliMi, rastgeleSifre, sifreGecerliMi, telefonGecerliMi, teslimEdilebilirEpostaMi } from "@/lib/validators";
import type { AytAlan, SinifSeviyesi, UserRole } from "@/lib/types";

export interface ModeratorKullanici {
  id: string;
  ad: string;
  role: UserRole;
  aktif: boolean;
  email: string | null;
  detay: string;
  kategori: "ogrenci" | "ogretmen" | "veli";
  sinif: string | null;
  yurtOgrencisi: boolean;
  // Kullanıcı bulgusu (26.08.2026): "diğer moderatör öğretmenler
  // listelenmiyor" — aslında listeleniyorlardı ama sade "Öğretmen" olarak
  // görünüp moderatörlükleri hiç belirtilmiyordu, ayırt edilemiyorlardı.
  moderatorMu: boolean;
}

// targetSchoolId: admin'in /yonetici → "Moderatörler" listesinden bir okula
// tıklayıp o okulun moderatör panelini GÖRÜNTÜLEMESİ için (bkz. /moderator
// ?okul=...). Sadece gerçekten admin olan çağıran için onurlandırılır —
// admin değilse bu parametre yok sayılır ve normal akış (kendi
// school_moderators satırı) çalışır, yani sahte bir okul id'si göndermek
// yetki yükseltmeye yaramaz.
async function requireModerator(targetSchoolId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (targetSchoolId) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (profile?.role === "admin") {
      const admin = createAdminClient();
      const { data: okul } = await admin.from("schools").select("ad").eq("id", targetSchoolId).maybeSingle();
      if (!okul) redirect("/yonetici");
      return { user, admin, schoolId: targetSchoolId, okulAdi: okul.ad };
    }
  }
  const { data: yetki } = await supabase.from("school_moderators").select("school_id, schools(ad)").eq("profile_id", user.id).maybeSingle();
  if (!yetki) redirect("/dashboard");
  const okul = yetki.schools as unknown as { ad: string } | null;
  return { user, admin: createAdminClient(), schoolId: yetki.school_id, okulAdi: okul?.ad ?? "Okul" };
}

async function hedefOkuldaMi(admin: ReturnType<typeof createAdminClient>, schoolId: string, targetId: string) {
  const [{ data: student }, { data: teacher }, { data: parent }] = await Promise.all([
    admin.from("students").select("id").eq("id", targetId).eq("school_id", schoolId).maybeSingle(),
    admin.from("teachers").select("id").eq("id", targetId).eq("school_id", schoolId).maybeSingle(),
    admin.from("parent_students").select("parent_id, students!inner(school_id)").eq("parent_id", targetId).eq("students.school_id", schoolId).limit(1),
  ]);
  return !!student || !!teacher || !!parent?.length;
}

// Moderatör kendi hesabını (öğretmen/müdür olarak school_moderators
// üzerinden yetkilendiği için kendi satırı bu listede de çıkabiliyordu)
// artık burada hiç görmüyor — "kendini silip pasifleştirme" riskini kökten
// kaldırmak için kendi bilgilerini yönetmek isterse ayrı "Profilim"
// sayfasına yönlendiriliyor (bkz. profil-actions.ts, ModeratorProfilim.tsx).
export async function moderatorKullanicilariGetir(targetSchoolId?: string): Promise<{ okulAdi: string; kullanicilar: ModeratorKullanici[] }> {
  const { user, admin, schoolId, okulAdi } = await requireModerator(targetSchoolId);
  const [{ data: students }, { data: teachers }, { data: parents }] = await Promise.all([
    admin.from("students").select("id, okul_no, yurt_ogrencisi, classes(seviye, sube)").eq("school_id", schoolId),
    admin.from("teachers").select("id, brans, classes(seviye, sube)").eq("school_id", schoolId),
    admin.from("parent_students").select("parent_id, students!inner(school_id)").eq("students.school_id", schoolId),
  ]);
  const ids = [...new Set([...(students ?? []).map(x => x.id), ...(teachers ?? []).map(x => x.id), ...(parents ?? []).map(x => x.parent_id)])]
    .filter((id) => id !== user.id);
  if (!ids.length) return { okulAdi, kullanicilar: [] };
  const [{ data: profiles }, { data: moderatorler }] = await Promise.all([
    admin.from("profiles").select("id, ad, email, role, aktif").in("id", ids).neq("role", "admin"),
    admin.from("school_moderators").select("profile_id").in("profile_id", ids),
  ]);
  const studentMap = new Map((students ?? []).map(s => [s.id, s]));
  const teacherMap = new Map((teachers ?? []).map(t => [t.id, t]));
  const moderatorIdSeti = new Set((moderatorler ?? []).map((m) => m.profile_id));
  return {
    okulAdi,
    kullanicilar: ((profiles ?? []) as { id: string; ad: string; email: string | null; role: UserRole; aktif: boolean }[]).map(p => {
      const s = studentMap.get(p.id) as { okul_no: string; yurt_ogrencisi: boolean; classes: { seviye: string; sube: string } | null } | undefined;
      const t = teacherMap.get(p.id) as { brans: string; classes: { seviye: string; sube: string } | null } | undefined;
      const sinif = s?.classes ? `${s.classes.seviye}-${s.classes.sube}` : t?.classes ? `${t.classes.seviye}-${t.classes.sube}` : null;
      return {
        id: p.id, ad: p.ad, email: p.email, role: p.role, aktif: p.aktif, sinif,
        kategori: s ? "ogrenci" as const : t ? "ogretmen" as const : "veli" as const,
        detay: s ? `Öğrenci · #${s.okul_no}${sinif ? ` · ${sinif}` : ""}` : t ? `${p.role === "mudur" ? "Müdür" : "Öğretmen"} · ${t.brans}${sinif ? ` · ${sinif}` : ""}` : "Veli",
        yurtOgrencisi: s?.yurt_ogrencisi ?? false,
        moderatorMu: moderatorIdSeti.has(p.id),
      };
    }).sort((a, b) => a.ad.localeCompare(b.ad, "tr")),
  };
}

export async function moderatorAktiflikDegistir(targetId: string, aktif: boolean, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (targetId === user.id || !(await hedefOkuldaMi(admin, schoolId, targetId))) return { error: "Bu kullanıcı için yetkiniz yok." };
  const { error } = await admin.auth.admin.updateUserById(targetId, { ban_duration: aktif ? "none" : "87600h" });
  if (error) return { error: error.message };
  await admin.from("profiles").update({ aktif }).eq("id", targetId).neq("role", "admin");
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: aktif ? "moderator_hesap_aktiflestir" : "moderator_hesap_pasiflestir", detay: { hedef_id: targetId, school_id: schoolId } });
  revalidatePath("/moderator");
  return { error: null };
}

// Yurt öğrencisi işareti — hafta içi telefonuna erişemeyen öğrenciler için
// rozet eşikleri ve "sisteme girmedi" hatırlatmaları hafta sonuna göre
// esnetiliyor (bkz. migration 0053). targetId===user.id kontrolüne gerek
// yok — moderatör zaten hiçbir zaman kendi kaydında öğrenci rolünde olmaz.
export async function moderatorYurtDurumuDegistir(targetId: string, yurtOgrencisi: boolean, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (!(await hedefOkuldaMi(admin, schoolId, targetId))) return { error: "Bu kullanıcı için yetkiniz yok." };
  const { data: profil } = await admin.from("profiles").select("role").eq("id", targetId).maybeSingle();
  if (!profil || profil.role !== "ogrenci") return { error: "Bu işlem yalnızca öğrenciler için yapılabilir." };
  const { error } = await admin.from("students").update({ yurt_ogrencisi: yurtOgrencisi }).eq("id", targetId);
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: yurtOgrencisi ? "moderator_yurt_ogrencisi_isaretle" : "moderator_yurt_ogrencisi_kaldir", detay: { hedef_id: targetId, school_id: schoolId } });
  revalidatePath("/moderator");
  return { error: null };
}

export async function moderatorSifreSifirla(targetId: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (targetId === user.id || !(await hedefOkuldaMi(admin, schoolId, targetId))) return { error: "Bu kullanıcı için yetkiniz yok.", sifre: null };
  const { data: hedef } = await admin.from("profiles").select("email").eq("id", targetId).neq("role", "admin").maybeSingle();
  if (!hedef || !teslimEdilebilirEpostaMi(hedef.email)) return { error: "Önce kullanıcıya geçerli bir e-posta adresi kaydedin.", sifre: null };
  const sifre = rastgeleSifre();
  const { error } = await admin.auth.admin.updateUserById(targetId, { password: sifre });
  if (error) return { error: error.message, sifre: null };
  await admin.from("profiles").update({ gecici_sifre: true }).eq("id", targetId).neq("role", "admin");
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_sifre_sifirla", detay: { hedef_id: targetId, school_id: schoolId } });
  return { error: null, sifre };
}

export async function moderatorHesapSil(targetId: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (targetId === user.id || !(await hedefOkuldaMi(admin, schoolId, targetId))) return { error: "Bu kullanıcı için yetkiniz yok." };
  const { data: profil } = await admin.from("profiles").select("role").eq("id", targetId).maybeSingle();
  if (!profil || profil.role === "admin") return { error: "Bu hesap silinemez." };
  if (profil.role === "veli") {
    const { data: digerOkulBaglantisi } = await admin
      .from("parent_students")
      .select("parent_id, students!inner(school_id)")
      .eq("parent_id", targetId)
      .neq("students.school_id", schoolId)
      .limit(1);
    if (digerOkulBaglantisi?.length) return { error: "Bu veli başka bir okuldaki öğrenciye de bağlı olduğu için okul moderatörü tarafından silinemez." };
  }
  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_hesap_sil", detay: { hedef_id: targetId, school_id: schoolId } });
  revalidatePath("/moderator");
  return { error: null };
}

// Elle şifre belirleme — mevcut moderatorSifreSifirla (rastgele üretim) ile
// birlikte kullanılıyor; kullanıcı 25.08.2026 isteğinde ikisini de istedi
// ("isterse elle girer, isterse rastgele oluşturur").
export async function moderatorSifreBelirle(targetId: string, yeniSifre: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (targetId === user.id || !(await hedefOkuldaMi(admin, schoolId, targetId))) return { error: "Bu kullanıcı için yetkiniz yok." };
  const { data: hedef } = await admin.from("profiles").select("email").eq("id", targetId).neq("role", "admin").maybeSingle();
  if (!hedef || !teslimEdilebilirEpostaMi(hedef.email)) return { error: "Önce kullanıcıya geçerli bir e-posta adresi kaydedin." };
  if (!sifreGecerliMi(yeniSifre)) return { error: "Şifre en az 8 karakter olmalı; harf, rakam ve özel işaret içermeli." };
  const { error } = await admin.auth.admin.updateUserById(targetId, { password: yeniSifre });
  if (error) return { error: error.message };
  await admin.from("profiles").update({ gecici_sifre: false }).eq("id", targetId).neq("role", "admin");
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_sifre_belirle", detay: { hedef_id: targetId, school_id: schoolId } });
  return { error: null };
}

export async function moderatorEpostaKaydet(targetId: string, yeniEmail: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (targetId === user.id || !(await hedefOkuldaMi(admin, schoolId, targetId))) return { error: "Bu kullanıcı için yetkiniz yok." };
  const email = yeniEmail.trim().toLowerCase();
  if (!teslimEdilebilirEpostaMi(email)) return { error: "Geçerli, e-posta alabilen bir adres girin." };
  const { data: mevcut } = await admin.from("profiles").select("email, role").eq("id", targetId).maybeSingle();
  if (!mevcut || mevcut.role === "admin") return { error: "Kullanıcı bulunamadı veya düzenlenemez." };
  const { error: authError } = await admin.auth.admin.updateUserById(targetId, { email, email_confirm: true });
  if (authError) return { error: authError.message };
  const { error: profileError } = await admin.from("profiles").update({ email }).eq("id", targetId);
  if (profileError) {
    if (mevcut.email) await admin.auth.admin.updateUserById(targetId, { email: mevcut.email, email_confirm: true });
    return { error: profileError.message };
  }
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_eposta_kaydet", detay: { hedef_id: targetId, school_id: schoolId } });
  revalidatePath("/moderator");
  return { error: null };
}

// Rozet sıfırlama (bkz. migration 0071) — kalıcı bir "puan sıfırlama" değil,
// rozet hesaplamasının pencere başlangıcını bugüne çekiyor; geçmiş çalışma
// kayıtları silinmiyor.
export async function moderatorRozetSifirla(studentId: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (!(await hedefOkuldaMi(admin, schoolId, studentId))) return { error: "Bu kullanıcı için yetkiniz yok." };
  const { data: profil } = await admin.from("profiles").select("role").eq("id", studentId).maybeSingle();
  if (!profil || profil.role !== "ogrenci") return { error: "Bu işlem yalnızca öğrenciler için yapılabilir." };
  const { error } = await admin.from("students").update({ rozet_sifirlama_tarihi: new Date().toISOString().slice(0, 10) }).eq("id", studentId);
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_rozet_sifirla", detay: { hedef_id: studentId, school_id: schoolId } });
  revalidatePath("/moderator");
  return { error: null };
}

// ============ Sınıf/branş müdahalesi (KullaniciArama'daki admin akışının
// okul-sınırlı eşdeğeri) ============
export async function moderatorOkulSiniflari(targetSchoolId?: string): Promise<{ error: string | null; siniflar: { id: string; seviye: string; sube: string }[] }> {
  const { admin, schoolId } = await requireModerator(targetSchoolId);
  const { data, error } = await admin.from("classes").select("id, seviye, sube").eq("school_id", schoolId).order("seviye").order("sube");
  if (error) return { error: error.message, siniflar: [] };
  return { error: null, siniflar: data ?? [] };
}

// Kullanıcı isteği (27.08.2026): "kullanıcılar sınıf bölümü de eklensin" —
// önceden sadece admin (/yonetici) sınıf ekleyebiliyordu, okul moderatörü/
// dershane müdürü kendi kurumu için sınıf açmak istediğinde admin'e
// bağımlıydı. `sinifEkle` (dashboard/actions.ts, admin-only) ile birebir
// aynı doğrulama/hata deseni, sadece requireModerator ile korunuyor.
export async function moderatorSinifEkle(seviye: SinifSeviyesi, sube: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (!["9", "10", "11", "12"].includes(seviye)) return { error: "Geçersiz sınıf seviyesi." };
  const subeBuyuk = sube.trim().toUpperCase();
  if (!subeBuyuk) return { error: "Şube adı girin." };
  const { error } = await admin.from("classes").insert({ school_id: schoolId, seviye, sube: subeBuyuk });
  if (error) {
    if (error.code === "23505") return { error: "Bu sınıf/şube zaten var." };
    return { error: error.message };
  }
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_sinif_ekle", detay: { school_id: schoolId, seviye, sube: subeBuyuk } });
  revalidatePath("/moderator");
  return { error: null };
}

// FK kısıtı (students.class_id / teachers.class_id) dolu bir sınıfın
// silinmesini zaten engelliyor — bkz. yonetici/actions.ts sinifSil, aynı
// desen. targetSchoolId doğrulaması: silinecek sınıfın gerçekten çağıranın
// (veya admin'in görüntülediği) kurumuna ait olduğunu garantiliyor.
export async function moderatorSinifSil(classId: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  const { data: sinif } = await admin.from("classes").select("school_id").eq("id", classId).maybeSingle();
  if (!sinif || sinif.school_id !== schoolId) return { error: "Bu sınıf kurumunuza ait değil." };
  const { error } = await admin.from("classes").delete().eq("id", classId);
  if (error) {
    if (error.code === "23503") return { error: "Bu sınıfta öğrenci veya öğretmen var, önce onları başka sınıfa taşıyın." };
    return { error: error.message };
  }
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_sinif_sil", detay: { school_id: schoolId, class_id: classId } });
  revalidatePath("/moderator");
  return { error: null };
}

export async function moderatorOgrenciSinifTasi(studentId: string, classId: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (!(await hedefOkuldaMi(admin, schoolId, studentId))) return { error: "Bu kullanıcı için yetkiniz yok." };
  const { data: hedefSinif } = await admin.from("classes").select("school_id").eq("id", classId).maybeSingle();
  if (!hedefSinif || hedefSinif.school_id !== schoolId) return { error: "Bu sınıf kurumunuza ait değil." };
  const { error } = await admin.from("students").update({ class_id: classId }).eq("id", studentId);
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_ogrenci_sinif_tasi", detay: { student_id: studentId, class_id: classId, school_id: schoolId } });
  revalidatePath("/moderator");
  return { error: null };
}

export async function moderatorOgretmenBransDegistir(teacherId: string, brans: string, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  if (!(await hedefOkuldaMi(admin, schoolId, teacherId))) return { error: "Bu kullanıcı için yetkiniz yok." };
  const { error } = await admin.from("teachers").update({ brans }).eq("id", teacherId);
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_ogretmen_brans_degistir", detay: { teacher_id: teacherId, brans, school_id: schoolId } });
  revalidatePath("/moderator");
  return { error: null };
}

// ============ Öğretmen/öğrenci ekleme (kendi kurumuna, admin'in
// ogretmenEkleManuel/ogrenciEkleManuel akışının okul-sınırlı eşdeğeri) ============
function manuelEklemeHatasi(mesaj: string): string {
  if (mesaj.includes("already been registered") || mesaj.includes("already registered")) return "Bu e-posta zaten kayıtlı.";
  if (mesaj.includes("okul_no")) return "Bu okul numarası zaten kullanılıyor.";
  return mesaj;
}

export async function moderatorOgretmenEkle(input: { ad: string; email: string; telefon: string; brans: string }, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  const ad = adNormalize(input.ad);
  const email = input.email.trim().toLowerCase();
  if (!ad) return { error: "Ad Soyad gerekli.", sifre: null };
  if (!email) return { error: "E-posta gerekli.", sifre: null };
  if (!telefonGecerliMi(input.telefon)) return { error: "Telefon numarası geçersiz.", sifre: null };
  if (!input.brans) return { error: "Branş seçin.", sifre: null };

  const sifre = rastgeleSifre();
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password: sifre, email_confirm: true,
    user_metadata: { role: "ogretmen", ad, telefon: input.telefon, school_id: schoolId, brans: input.brans },
  });
  if (error) return { error: manuelEklemeHatasi(error.message), sifre: null };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_ogretmen_ekle", detay: { ogretmen_id: created.user?.id, email, school_id: schoolId } });
  revalidatePath("/moderator");
  return { error: null, sifre };
}

export async function moderatorOgrenciEkle(input: {
  ad: string; email: string; okulNo: string; telefon: string; classId: string; aytAlan: AytAlan; hedefBolum: string;
}, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  const ad = adNormalize(input.ad);
  const email = input.email.trim().toLowerCase();
  if (!ad) return { error: "Ad Soyad gerekli.", sifre: null };
  if (!email) return { error: "E-posta gerekli.", sifre: null };
  if (!okulNoGecerliMi(input.okulNo)) return { error: "Okul no geçersiz (sadece rakam, en fazla 5 hane).", sifre: null };
  if (input.telefon && !telefonGecerliMi(input.telefon)) return { error: "Telefon numarası geçersiz.", sifre: null };
  if (!input.classId) return { error: "Sınıf seçin.", sifre: null };
  const { data: hedefSinif } = await admin.from("classes").select("school_id").eq("id", input.classId).maybeSingle();
  if (!hedefSinif || hedefSinif.school_id !== schoolId) return { error: "Bu sınıf kurumunuza ait değil.", sifre: null };
  const hedefBolum = hedefBolumNormalize(input.hedefBolum);

  const sifre = rastgeleSifre();
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password: sifre, email_confirm: true,
    user_metadata: {
      role: "ogrenci", ad, telefon: input.telefon || null, school_id: schoolId, class_id: input.classId,
      okul_no: input.okulNo, ayt_alan: input.aytAlan, hedef_bolum: hedefBolum,
      admin_ekledi: true, // izinli öğrenci listesi kontrolünden muaf (bkz. migration 0026)
    },
  });
  if (error) return { error: manuelEklemeHatasi(error.message), sifre: null };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_ogrenci_ekle", detay: { ogrenci_id: created.user?.id, okul_no: input.okulNo, school_id: schoolId, class_id: input.classId } });
  revalidatePath("/moderator");
  return { error: null, sifre };
}

// ============ Kurum ayarları (isim, kurum kodu) ============
export async function moderatorKurumBilgisiGetir(targetSchoolId?: string): Promise<{ error: string | null; ad: string; okulKodu: string }> {
  const { admin, schoolId } = await requireModerator(targetSchoolId);
  const { data, error } = await admin.from("schools").select("ad, okul_kodu").eq("id", schoolId).maybeSingle();
  if (error || !data) return { error: error?.message ?? "Kurum bulunamadı.", ad: "", okulKodu: "" };
  return { error: null, ad: data.ad, okulKodu: data.okul_kodu };
}

export async function moderatorKurumGuncelle(input: { ad: string; okulKodu: string }, targetSchoolId?: string) {
  const { user, admin, schoolId } = await requireModerator(targetSchoolId);
  const ad = input.ad.trim();
  const okulKodu = input.okulKodu.trim();
  if (!ad) return { error: "Kurum adı gerekli." };
  if (!okulKodu) return { error: "Kurum kodu gerekli." };
  const { error } = await admin.from("schools").update({ ad, okul_kodu: okulKodu }).eq("id", schoolId);
  if (error) {
    if (error.code === "23505") return { error: "Bu kurum kodu zaten kullanılıyor." };
    return { error: error.message };
  }
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "moderator_kurum_duzenle", detay: { school_id: schoolId, ad, okul_kodu: okulKodu } });
  revalidatePath("/moderator");
  return { error: null };
}

// ============ Moderatörün KENDİ profili ("Profilim") ============
// targetSchoolId hiçbir zaman kabul edilmiyor — bu action'lar her zaman
// oturumdaki kullanıcının kendi kaydını düzenler, admin-override
// (/moderator?okul=...) görüntülemesinde de moderatörün KENDİ okulu
// yerine hedef okula bakmaya çalışmaz (requireModerator(undefined) çağrılır,
// yani admin'in kendi school_moderators satırı aranır — yoksa zaten
// /dashboard'a düşer, bu sayfa admin-override sırasında hiç gösterilmiyor).
export async function moderatorKendiBilgileriniGetir(): Promise<{ error: string | null; ad: string; email: string; telefon: string }> {
  const { user, admin } = await requireModerator();
  const { data, error } = await admin.from("profiles").select("ad, email, telefon").eq("id", user.id).maybeSingle();
  if (error || !data) return { error: error?.message ?? "Profil bulunamadı.", ad: "", email: "", telefon: "" };
  return { error: null, ad: data.ad, email: data.email ?? "", telefon: data.telefon ?? "" };
}

export async function moderatorKendiBilgileriniGuncelle(input: { ad: string; email: string; telefon: string }): Promise<{ error: string | null }> {
  const { user, admin } = await requireModerator();
  const ad = adNormalize(input.ad);
  const email = input.email.trim().toLowerCase();
  const telefon = input.telefon.trim();
  if (!ad) return { error: "Ad soyad gerekli." };
  if (!email || !email.includes("@")) return { error: "Geçerli bir e-posta girin." };
  if (telefon && !telefonGecerliMi(telefon)) return { error: "Telefon 10-11 rakam olmalı." };

  const { data: mevcut } = await admin.from("profiles").select("email").eq("id", user.id).maybeSingle();

  const { error: authError } = await admin.auth.admin.updateUserById(user.id, { email, email_confirm: true });
  if (authError) return { error: authError.message };
  const { error: profileError } = await admin.from("profiles").update({ ad, email, telefon: telefon || null }).eq("id", user.id);
  if (profileError) {
    if (mevcut?.email) await admin.auth.admin.updateUserById(user.id, { email: mevcut.email, email_confirm: true });
    return { error: profileError.message };
  }
  revalidatePath("/moderator");
  return { error: null };
}
