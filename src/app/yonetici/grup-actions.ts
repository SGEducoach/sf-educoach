"use server";

// Grup Koçluk — Faz 2 (kullanıcı isteği ve kararları 18.09.2026): yönetici
// kurum dışı koçlar için grup açar, listeler, kapasite/süre değiştirir,
// dondurur. Grup = dershanenin alt türü (schools.grup_kapasitesi dolu, bkz.
// migration 0114); koç tek hesap: öğretmen + "Rehber Öğretmen" branşı (rehber
// modülü grubun tamamında ödev/veri/program) + grubun moderatörü (hesap
// yönetimi). requireAdmin() burada kasıtlı olarak yeniden tanımlı (bkz.
// moderatorler-actions.ts'teki aynı desen ve gerekçe).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adNormalize, rastgeleSifre } from "@/lib/validators";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { bugununTarihiTR } from "@/lib/tarih";
import { SITE_ADRESI, ogretmenBildirimEpostasi } from "@/lib/ogretmen-bildirim-sablon";
import { grupGirdisiHatasi, grupKapasitesiMi, grupKoduUret, kalanGun, type GrupGirdisi } from "@/lib/grup-kocluk";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/yonetici");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");
  return { user, admin: createAdminClient() };
}

type Admin = ReturnType<typeof createAdminClient>;

async function islemKaydi(admin: Admin, actorId: string, eylem: string, detay: Record<string, unknown>) {
  const { error } = await admin.from("admin_audit_log").insert({ actor_id: actorId, eylem, detay });
  if (error) console.error("grup işlem kaydı yazılamadı:", error.message);
}

// Veritabanı tetikleyicilerinin (kapasite) hatalarını kullanıcı diline çevirir.
function grupHatasi(mesaj: string): string {
  if (mesaj.includes("GRUP_KAPASITESI_DUSUK")) return mesaj.replace(/^.*GRUP_KAPASITESI_DUSUK:\s*/, "");
  if (mesaj.includes("GRUP_KAPASITESI_DOLU")) return mesaj.replace(/^.*GRUP_KAPASITESI_DOLU:\s*/, "");
  return mesaj;
}

export interface GrupSatiri {
  id: string;
  ad: string;
  kod: string;
  kapasite: number;
  aktifOgrenci: number;
  bitisTarihi: string;
  kalanGun: number;
  donduruldu: boolean;
  koc: { id: string; ad: string; email: string | null; telefon: string | null } | null;
  olusturma: string;
}

export async function gruplariGetir(): Promise<{ error: string | null; gruplar: GrupSatiri[] }> {
  const { admin } = await requireAdmin();
  const { data: okullar, error } = await admin
    .from("schools")
    .select("id, ad, okul_kodu, aktif, grup_kapasitesi, grup_bitis_tarihi, created_at")
    .not("grup_kapasitesi", "is", null)
    .order("created_at", { ascending: false });
  if (error) return { error: error.message, gruplar: [] };
  const gruplar = (okullar ?? []) as { id: string; ad: string; okul_kodu: string; aktif: boolean; grup_kapasitesi: number; grup_bitis_tarihi: string; created_at: string }[];
  if (gruplar.length === 0) return { error: null, gruplar: [] };
  const idler = gruplar.map((g) => g.id);

  const [{ data: ogrenciler }, { data: kocHam }] = await Promise.all([
    admin.from("students").select("school_id, profiles!students_id_fkey(aktif)").in("school_id", idler),
    admin.from("teachers").select("id, school_id, profiles!teachers_id_fkey(ad, email, telefon)").in("school_id", idler),
  ]);
  type OgrSatir = { school_id: string; profiles: { aktif: boolean } | { aktif: boolean }[] | null };
  type KocSatir = { id: string; school_id: string; profiles: { ad: string; email: string | null; telefon: string | null } | { ad: string; email: string | null; telefon: string | null }[] | null };
  const tek = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const aktifSayisi = new Map<string, number>();
  for (const o of (ogrenciler ?? []) as unknown as OgrSatir[]) {
    if (tek(o.profiles)?.aktif) aktifSayisi.set(o.school_id, (aktifSayisi.get(o.school_id) ?? 0) + 1);
  }
  const koclar = new Map<string, GrupSatiri["koc"]>();
  for (const k of (kocHam ?? []) as unknown as KocSatir[]) {
    const p = tek(k.profiles);
    if (!koclar.has(k.school_id)) koclar.set(k.school_id, { id: k.id, ad: p?.ad ?? "İsimsiz", email: p?.email ?? null, telefon: p?.telefon ?? null });
  }

  const bugun = bugununTarihiTR();
  return {
    error: null,
    gruplar: gruplar.map((g) => ({
      id: g.id, ad: g.ad, kod: g.okul_kodu, kapasite: g.grup_kapasitesi,
      aktifOgrenci: aktifSayisi.get(g.id) ?? 0,
      bitisTarihi: g.grup_bitis_tarihi, kalanGun: kalanGun(g.grup_bitis_tarihi, bugun),
      donduruldu: !g.aktif, koc: koclar.get(g.id) ?? null, olusturma: g.created_at,
    })),
  };
}

// Koça giriş bilgisi e-postası (şifre içermez — geçici şifreyi yönetici iletir).
async function kocaDavetGonder(email: string, ad: string, grupAdi: string) {
  if (!process.env.RESEND_API_KEY) return;
  const mesaj =
    `"${grupAdi}" grubunuz için SeFu Koç grup koçluk hesabınız açıldı. ` +
    `Giriş ekranında "Öğretmen" sekmesini seçip bu e-posta adresiyle giriş yapabilirsiniz. ` +
    `Geçici şifreniz yöneticiniz tarafından iletilecek; ilk girişte kendi şifrenizi belirleyeceksiniz.`;
  const { subject, html } = ogretmenBildirimEpostasi(ad, "Grup koçluk hesabınız hazır", mesaj, `${SITE_ADRESI}/login`);
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: "SeFu Koç <bildirim@sefukoc.com>", to: email, subject, html,
  });
  if (error) console.error("koç davet e-postası gönderilemedi:", error.message);
}

export async function grupOlustur(input: GrupGirdisi): Promise<{ error: string | null; sifre: string | null; kod: string | null }> {
  const { user, admin } = await requireAdmin();
  const hata = grupGirdisiHatasi(input, bugununTarihiTR());
  if (hata) return { error: hata, sifre: null, kod: null };

  const grupAdi = input.grupAdi.trim().replace(/\s+/g, " ");
  const kocAd = adNormalize(input.kocAd);
  const email = input.kocEmail.trim().toLowerCase();
  const telefon = input.kocTelefon.trim();

  // 1) Grup kaydı — kod çakışırsa (benzersiz okul_kodu) yeni kodla tekrar dene.
  let grup: { id: string; okul_kodu: string } | null = null;
  for (let deneme = 0; deneme < 5 && !grup; deneme++) {
    const { data, error } = await admin.from("schools").insert({
      ad: grupAdi, okul_kodu: grupKoduUret(), tur: "dershane",
      grup_kapasitesi: input.kapasite, grup_bitis_tarihi: input.bitisTarihi,
      koc_taahhut_at: new Date().toISOString(),
    }).select("id, okul_kodu").single();
    if (!error) grup = data;
    else if (error.code !== "23505") return { error: error.message, sifre: null, kod: null };
  }
  if (!grup) return { error: "Grup kodu üretilemedi, tekrar deneyin.", sifre: null, kod: null };

  // 2) Koç hesabı — tetikleyici öğretmen kaydını açar; ilk girişte şifre değişir.
  const sifre = rastgeleSifre();
  const { data: olusan, error: hesapHatasi } = await admin.auth.admin.createUser({
    email, password: sifre, email_confirm: true,
    user_metadata: {
      role: "ogretmen", ad: kocAd, telefon, school_id: grup.id, brans: REHBER_BRANSI,
      gecici_sifre: true, admin_ekledi: true,
    },
  });
  if (hesapHatasi || !olusan.user) {
    await admin.from("schools").delete().eq("id", grup.id);
    const kayitli = hesapHatasi?.message?.toLowerCase().includes("already") ?? false;
    return { error: kayitli ? "Bu e-posta ile zaten bir hesap var." : (hesapHatasi?.message ?? "Koç hesabı açılamadı."), sifre: null, kod: null };
  }

  // 3) Koç grubun moderatörü (hesap yönetimi: şifre, aktif/pasif, sınıf).
  const { error: modHatasi } = await admin.from("school_moderators").insert({ profile_id: olusan.user.id, school_id: grup.id });
  if (modHatasi) {
    await admin.auth.admin.deleteUser(olusan.user.id);
    await admin.from("schools").delete().eq("id", grup.id);
    return { error: modHatasi.message, sifre: null, kod: null };
  }

  await islemKaydi(admin, user.id, "grup_olustur", {
    school_id: grup.id, grup_adi: grupAdi, grup_kodu: grup.okul_kodu, koc_id: olusan.user.id, koc_email: email,
    kapasite: input.kapasite, bitis: input.bitisTarihi,
  });
  await kocaDavetGonder(email, kocAd, grupAdi);
  revalidatePath("/yonetici");
  return { error: null, sifre, kod: grup.okul_kodu };
}

export async function grupGuncelle(input: { id: string; kapasite?: number; bitisTarihi?: string }): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  const degisiklik: Record<string, unknown> = {};
  if (input.kapasite !== undefined) {
    if (!grupKapasitesiMi(input.kapasite)) return { error: "Kapasite 5, 10, 15 ya da 20 olmalı." };
    degisiklik.grup_kapasitesi = input.kapasite;
  }
  if (input.bitisTarihi !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.bitisTarihi)) return { error: "Geçerli bir tarih seçin." };
    degisiklik.grup_bitis_tarihi = input.bitisTarihi;
  }
  if (Object.keys(degisiklik).length === 0) return { error: null };

  const { data, error } = await admin.from("schools").update(degisiklik)
    .eq("id", input.id).not("grup_kapasitesi", "is", null).select("id").maybeSingle();
  if (error) return { error: grupHatasi(error.message) };
  if (!data) return { error: "Grup bulunamadı." };
  await islemKaydi(admin, user.id, "grup_guncelle", { school_id: input.id, ...degisiklik });
  revalidatePath("/yonetici");
  return { error: null };
}

// Dondurma yalnızca grup düzeyinde (schools.aktif): giriş ve panel, dondurulmuş
// grubun üyelerini durdurur (bkz. deneme-suresi.ts grupDondurulmus). Öğrenci
// hesaplarına dokunulmaz — koçun bilerek pasife aldığı öğrenciler açılınca da
// pasif kalır, kapasite hesabı bozulmaz.
export async function grupDondur(id: string, dondur: boolean): Promise<{ error: string | null }> {
  const { user, admin } = await requireAdmin();
  const { data, error } = await admin.from("schools").update({ aktif: !dondur })
    .eq("id", id).not("grup_kapasitesi", "is", null).select("id").maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Grup bulunamadı." };
  await islemKaydi(admin, user.id, dondur ? "grup_dondur" : "grup_ac", { school_id: id });
  revalidatePath("/yonetici");
  return { error: null };
}
