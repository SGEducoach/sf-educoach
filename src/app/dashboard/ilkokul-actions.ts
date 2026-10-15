"use server";

// İlkokul (16.10.2026, migration 0157): gelişim raporunu kaydetme ve veli
// davet kodu listesi. Yazma service-role ile; kimin hangi kalemi
// yazabileceği ilkokul-gelisim.ts'teki kurallarla burada zorlanır.
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/dershane-auth";
import { ilkokulMu } from "@/lib/kademe";
import { ilkokulSiniflariGetir } from "@/lib/ilkokul-gelisim-sorgu";
import { veliDavetiOlustur } from "@/lib/veli-davet";
import { ayAnahtari, gelisimDuzeyiMi, gelisimKalemiMi, kalemiYazabilirMi, notuYazabilirMi } from "@/lib/ilkokul-gelisim";
import type { GelisimDuzeyi, GelisimKalemi, GelisimNotTuru, GelisimYetkisi } from "@/lib/ilkokul-gelisim";

type Admin = ReturnType<typeof createAdminClient>;

export interface GelisimHucresi {
  studentId: string;
  kalem: GelisimKalemi;
  // null = işareti kaldır.
  duzey: GelisimDuzeyi | null;
}

export interface GelisimNotu {
  studentId: string;
  tur: GelisimNotTuru;
  // Boş metin = notu sil.
  metin: string;
}

async function sinifYetkisi(admin: Admin, userId: string, classId: string): Promise<GelisimYetkisi[]> {
  const siniflar = await ilkokulSiniflariGetir(admin, userId);
  return siniflar.find((s) => s.id === classId)?.yetkiler ?? [];
}

export async function ilkokulGelisimKaydet(girdi: {
  classId: string;
  ay: string;
  hucreler: GelisimHucresi[];
  notlar: GelisimNotu[];
}): Promise<{ error: string | null; kaydedilen: number }> {
  const { user } = await requireUser();
  const admin = createAdminClient();
  const ay = ayAnahtari(girdi.ay);
  if (!ay) return { error: "Geçerli bir ay seçin.", kaydedilen: 0 };
  const yetkiler = await sinifYetkisi(admin, user.id, girdi.classId);
  if (yetkiler.length === 0) return { error: "Bu sınıfın gelişim raporunu düzenleme yetkiniz yok.", kaydedilen: 0 };

  const { data: ogrenciler } = await admin.from("students").select("id").eq("class_id", girdi.classId);
  const sinifOgrencileri = new Set(((ogrenciler ?? []) as { id: string }[]).map((o) => o.id));

  const yazilacak: { student_id: string; ay: string; kalem: GelisimKalemi; duzey: GelisimDuzeyi; giren_id: string; updated_at: string }[] = [];
  const silinecek: { studentId: string; kalem: GelisimKalemi }[] = [];
  const simdi = new Date().toISOString();
  for (const h of girdi.hucreler) {
    if (!sinifOgrencileri.has(h.studentId) || !gelisimKalemiMi(h.kalem)) return { error: "Geçersiz satır.", kaydedilen: 0 };
    if (!kalemiYazabilirMi(yetkiler, h.kalem)) return { error: "Bu kalemi işaretleme yetkiniz yok.", kaydedilen: 0 };
    if (h.duzey === null) silinecek.push({ studentId: h.studentId, kalem: h.kalem });
    else if (gelisimDuzeyiMi(h.duzey)) yazilacak.push({ student_id: h.studentId, ay, kalem: h.kalem, duzey: h.duzey, giren_id: user.id, updated_at: simdi });
    else return { error: "Geçersiz düzey.", kaydedilen: 0 };
  }

  const notYaz: { student_id: string; ay: string; tur: GelisimNotTuru; metin: string; giren_id: string; updated_at: string }[] = [];
  const notSil: { studentId: string; tur: GelisimNotTuru }[] = [];
  for (const n of girdi.notlar) {
    if (!sinifOgrencileri.has(n.studentId) || (n.tur !== "ogretmen" && n.tur !== "rehberlik")) return { error: "Geçersiz not.", kaydedilen: 0 };
    if (!notuYazabilirMi(yetkiler, n.tur)) return { error: "Bu notu yazma yetkiniz yok.", kaydedilen: 0 };
    const metin = n.metin.trim().slice(0, 600);
    if (metin) notYaz.push({ student_id: n.studentId, ay, tur: n.tur, metin, giren_id: user.id, updated_at: simdi });
    else notSil.push({ studentId: n.studentId, tur: n.tur });
  }

  if (yazilacak.length > 0) {
    const { error } = await admin.from("ilkokul_gelisim").upsert(yazilacak, { onConflict: "student_id,ay,kalem" });
    if (error) return { error: error.message, kaydedilen: 0 };
  }
  for (const s of silinecek) {
    await admin.from("ilkokul_gelisim").delete().eq("student_id", s.studentId).eq("ay", ay).eq("kalem", s.kalem);
  }
  if (notYaz.length > 0) {
    const { error } = await admin.from("ilkokul_gelisim_notlari").upsert(notYaz, { onConflict: "student_id,ay,tur" });
    if (error) return { error: error.message, kaydedilen: 0 };
  }
  for (const s of notSil) {
    await admin.from("ilkokul_gelisim_notlari").delete().eq("student_id", s.studentId).eq("ay", ay).eq("tur", s.tur);
  }

  revalidatePath("/dashboard/ilkokul-gelisim");
  return { error: null, kaydedilen: yazilacak.length + silinecek.length + notYaz.length + notSil.length };
}

// ---- Veli davet kodu ----

export interface VeliDavetKodu {
  ogrenciAd: string;
  okulNo: string;
  sinif: string;
  veliAd: string;
  kod: string;
  sonGecerlilik: string;
}

// Yönetici, müdür ya da kurum moderatörü bir sınıfın velileri için kod
// listesi alır. Velisi bağlı olan ve hâlâ geçerli kodu bulunan öğrenciler
// atlanır; aynı liste iki kez alınsa da yeni kod yalnız eksiklere üretilir.
export async function veliDavetKodlariOlustur(classId: string): Promise<{ error: string | null; kodlar: VeliDavetKodu[]; atlanan: number }> {
  const { user } = await requireUser();
  const admin = createAdminClient();

  const { data: sinif } = await admin.from("classes").select("id, school_id, seviye, sube").eq("id", classId).maybeSingle();
  if (!sinif) return { error: "Sınıf bulunamadı.", kodlar: [], atlanan: 0 };
  const [{ data: profil }, { data: ogretmen }, { data: moderatorluk }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("teachers").select("school_id").eq("id", user.id).maybeSingle(),
    admin.from("school_moderators").select("school_id").eq("profile_id", user.id).eq("school_id", sinif.school_id).maybeSingle(),
  ]);
  const yetkili = profil?.role === "admin"
    || (profil?.role === "mudur" && ogretmen?.school_id === sinif.school_id)
    || !!moderatorluk;
  if (!yetkili) return { error: "Veli kodu listesini yalnız yönetici, müdür ya da kurum moderatörü alabilir.", kodlar: [], atlanan: 0 };

  const { data: ogrencilerHam } = await admin.from("students")
    .select("id, okul_no, veli_telefon, profiles!students_id_fkey(ad)").eq("class_id", classId);
  type Satir = { id: string; okul_no: string; veli_telefon: string | null; profiles: { ad: string } | { ad: string }[] | null };
  const ogrenciler = (ogrencilerHam ?? []) as unknown as Satir[];
  if (ogrenciler.length === 0) return { error: "Bu sınıfta öğrenci yok.", kodlar: [], atlanan: 0 };
  const idler = ogrenciler.map((o) => o.id);

  const simdiIso = new Date().toISOString();
  const [{ data: bagliVeliler }, { data: gecerliKodlar }] = await Promise.all([
    admin.from("parent_students").select("student_id").in("student_id", idler),
    admin.from("veli_link_requests").select("student_id").in("student_id", idler).eq("durum", "onaylandi").gt("kod_expires_at", simdiIso),
  ]);
  const atlanacak = new Set([
    ...((bagliVeliler ?? []) as { student_id: string }[]).map((r) => r.student_id),
    ...((gecerliKodlar ?? []) as { student_id: string }[]).map((r) => r.student_id),
  ]);

  const sinifAdi = `${sinif.seviye}-${sinif.sube}`;
  const kodlar: VeliDavetKodu[] = [];
  for (const o of ogrenciler) {
    if (atlanacak.has(o.id)) continue;
    const ad = (Array.isArray(o.profiles) ? o.profiles[0]?.ad : o.profiles?.ad) ?? "Öğrenci";
    const veliAd = `${ad} Velisi`;
    const sonuc = await veliDavetiOlustur(admin, { studentId: o.id, veliAd, veliTelefon: o.veli_telefon, olusturanId: user.id });
    if ("error" in sonuc) return { error: sonuc.error, kodlar, atlanan: atlanacak.size };
    kodlar.push({ ogrenciAd: ad, okulNo: o.okul_no, sinif: sinifAdi, veliAd, kod: sonuc.kod, sonGecerlilik: sonuc.sonGecerlilik });
  }
  kodlar.sort((a, b) => a.ogrenciAd.localeCompare(b.ogrenciAd, "tr"));

  await admin.from("admin_audit_log").insert({
    actor_id: user.id, eylem: "veli_davet_kodlari", detay: { class_id: classId, uretilen: kodlar.length, atlanan: atlanacak.size, ilkokul: ilkokulMu(sinif.seviye) },
  });
  return { error: null, kodlar, atlanan: atlanacak.size };
}
