"use server";

// Grup Koçluk — Faz 3 koç paneli işlemleri (kullanıcı isteği 18.09.2026):
// koç öğrencilerini kendisi ekler, kullanıcı adı ve şifre belirler, hesaplarını
// yönetir. Yetki grup-koc-auth.ts'te; yazma servis anahtarıyla. Kapasite
// veritabanında da zorlanır (migration 0114) — burada önceden kontrol edilip
// anlaşılır mesaj veriliyor.
import { revalidatePath } from "next/cache";
import { adNormalize, rastgeleSifre, sifreGecerliMi, SIFRE_IPUCU } from "@/lib/validators";
import { grupKocuYazmaYetkisi, grupKocuYetkisi } from "@/lib/grup-koc-auth";
import { GRUP_SINIF_DUZEYLERI, GRUP_SINIF_SUBESI, grupOgrencisiGirdisiHatasi } from "@/lib/grup-kocluk";

type Admin = NonNullable<Awaited<ReturnType<typeof grupKocuYetkisi>>["admin"]>;

function kapasiteMesaji(mesaj: string): string {
  if (mesaj.includes("GRUP_KAPASITESI_DOLU")) return "Grup kapasitesi dolu. Yer açmak için bir öğrenciyi pasife alın ya da kapasite artırımı için SeFu Koç yönetimiyle görüşün.";
  return mesaj;
}

async function islemKaydi(admin: Admin, actorId: string, eylem: string, detay: Record<string, unknown>) {
  const { error } = await admin.from("admin_audit_log").insert({ actor_id: actorId, eylem, detay });
  if (error) console.error("grup koç işlem kaydı yazılamadı:", error.message);
}

async function aktifOgrenciSayisi(admin: Admin, schoolId: string): Promise<number> {
  const { data } = await admin.rpc("grup_aktif_ogrenci_sayisi", { p_school_id: schoolId });
  return typeof data === "number" ? data : 0;
}

// Hedef öğrenci bu grubun öğrencisi mi (koç yalnızca kendi grubuna dokunur).
async function grubunOgrencisiMi(admin: Admin, schoolId: string, ogrenciId: string): Promise<boolean> {
  const { data } = await admin.from("students").select("id").eq("id", ogrenciId).eq("school_id", schoolId).maybeSingle();
  return !!data;
}

async function grupSinifi(admin: Admin, schoolId: string, seviye: string): Promise<string | null> {
  const { data: mevcut } = await admin.from("classes").select("id")
    .eq("school_id", schoolId).eq("seviye", seviye).eq("sube", GRUP_SINIF_SUBESI).maybeSingle();
  if (mevcut) return mevcut.id as string;
  const { data: yeni, error } = await admin.from("classes")
    .insert({ school_id: schoolId, seviye, sube: GRUP_SINIF_SUBESI }).select("id").single();
  if (error) {
    // Aynı anda iki ekleme aynı sınıfı açmaya çalıştıysa mevcut olanı kullan.
    const { data: tekrar } = await admin.from("classes").select("id")
      .eq("school_id", schoolId).eq("seviye", seviye).eq("sube", GRUP_SINIF_SUBESI).maybeSingle();
    return (tekrar?.id as string | undefined) ?? null;
  }
  return yeni.id as string;
}

export interface GrupOgrencisi {
  id: string;
  ad: string;
  kullaniciAdi: string;
  seviye: string;
  aktif: boolean;
  ilkGirisBekliyor: boolean;
  eklenme: string;
}

export async function grupOgrencileriGetir(): Promise<{ error: string | null; ogrenciler: GrupOgrencisi[] }> {
  const yetki = await grupKocuYetkisi();
  if (yetki.error !== null) return { error: yetki.error, ogrenciler: [] };
  const { admin, grup } = yetki;
  const { data, error } = await admin
    .from("students")
    .select("id, okul_no, created_at, classes(seviye), profiles!students_id_fkey(ad, aktif, gecici_sifre)")
    .eq("school_id", grup.id)
    .order("created_at", { ascending: true });
  if (error) return { error: error.message, ogrenciler: [] };
  type Satir = {
    id: string; okul_no: string; created_at: string;
    classes: { seviye: string } | { seviye: string }[] | null;
    profiles: { ad: string; aktif: boolean; gecici_sifre: boolean } | { ad: string; aktif: boolean; gecici_sifre: boolean }[] | null;
  };
  const tek = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
  return {
    error: null,
    ogrenciler: ((data ?? []) as unknown as Satir[]).map((s) => {
      const p = tek(s.profiles);
      return {
        id: s.id, ad: p?.ad ?? "İsimsiz", kullaniciAdi: s.okul_no, seviye: tek(s.classes)?.seviye ?? "—",
        aktif: p?.aktif !== false, ilkGirisBekliyor: p?.gecici_sifre === true, eklenme: s.created_at,
      };
    }),
  };
}

export async function grupOgrencisiEkle(input: { ad: string; kullaniciAdi: string; seviye: string; sifre?: string }): Promise<{ error: string | null; sifre: string | null }> {
  const yetki = await grupKocuYazmaYetkisi();
  if (yetki.error !== null) return { error: yetki.error, sifre: null };
  const { admin, kocId, grup } = yetki;

  const girdiHatasi = grupOgrencisiGirdisiHatasi(input);
  if (girdiHatasi) return { error: girdiHatasi, sifre: null };
  const sifre = input.sifre?.trim() || rastgeleSifre();
  if (!sifreGecerliMi(sifre)) return { error: `Şifre geçersiz. ${SIFRE_IPUCU}`, sifre: null };
  const kullaniciAdi = input.kullaniciAdi.trim().toLowerCase();

  if (await aktifOgrenciSayisi(admin, grup.id) >= grup.kapasite) {
    return { error: kapasiteMesaji("GRUP_KAPASITESI_DOLU"), sifre: null };
  }
  const { data: ayniAd } = await admin.from("students").select("id").eq("school_id", grup.id).eq("okul_no", kullaniciAdi).maybeSingle();
  if (ayniAd) return { error: "Bu kullanıcı adı grubunuzda zaten var; başka bir ad seçin.", sifre: null };

  const classId = await grupSinifi(admin, grup.id, input.seviye);
  if (!classId) return { error: "Sınıf oluşturulamadı, tekrar deneyin.", sifre: null };

  // Öğrenci hesapları sistem içi e-postayla açılır (dershane öğrencileri gibi);
  // gerçek e-posta ilk girişte isteğe bağlı eklenir (Faz 5). Alan ve hedef
  // bölüm de ilk girişte öğrenci tarafından seçilir; burada yer tutucu.
  const { data: olusan, error } = await admin.auth.admin.createUser({
    email: `${crypto.randomUUID()}@ogrenci.sgeducoach.internal`,
    password: sifre,
    email_confirm: true,
    user_metadata: {
      role: "ogrenci", ad: adNormalize(input.ad), school_id: grup.id, class_id: classId, okul_no: kullaniciAdi,
      ayt_alan: "SAY", hedef_bolum: "Belirtilmedi", gecici_sifre: true, admin_ekledi: true,
    },
  });
  if (error || !olusan.user) {
    console.error("grup öğrencisi eklenemedi:", error?.message);
    // Tetikleyici hataları (kapasite yarışı gibi) Auth'tan genel mesajla döner.
    if (await aktifOgrenciSayisi(admin, grup.id) >= grup.kapasite) return { error: kapasiteMesaji("GRUP_KAPASITESI_DOLU"), sifre: null };
    return { error: "Öğrenci eklenemedi. Kullanıcı adını değiştirip tekrar deneyin.", sifre: null };
  }

  await islemKaydi(admin, kocId, "grup_ogrenci_ekle", { school_id: grup.id, ogrenci_id: olusan.user.id, kullanici_adi: kullaniciAdi });
  revalidatePath("/dashboard");
  return { error: null, sifre };
}

// Koç şifreyi yeniler; öğrenci bir sonraki girişte kendi şifresini belirler.
export async function grupOgrenciSifresiYenile(ogrenciId: string, yeniSifre?: string): Promise<{ error: string | null; sifre: string | null }> {
  const yetki = await grupKocuYazmaYetkisi();
  if (yetki.error !== null) return { error: yetki.error, sifre: null };
  const { admin, kocId, grup } = yetki;
  if (!await grubunOgrencisiMi(admin, grup.id, ogrenciId)) return { error: "Öğrenci bulunamadı.", sifre: null };

  const sifre = yeniSifre?.trim() || rastgeleSifre();
  if (!sifreGecerliMi(sifre)) return { error: `Şifre geçersiz. ${SIFRE_IPUCU}`, sifre: null };
  const { error } = await admin.auth.admin.updateUserById(ogrenciId, { password: sifre });
  if (error) return { error: error.message, sifre: null };
  await admin.from("profiles").update({ gecici_sifre: true }).eq("id", ogrenciId);
  await islemKaydi(admin, kocId, "grup_ogrenci_sifre", { school_id: grup.id, ogrenci_id: ogrenciId });
  return { error: null, sifre };
}

export async function grupOgrenciAktiflik(ogrenciId: string, aktif: boolean): Promise<{ error: string | null }> {
  const yetki = await grupKocuYazmaYetkisi();
  if (yetki.error !== null) return { error: yetki.error };
  const { admin, kocId, grup } = yetki;
  if (!await grubunOgrencisiMi(admin, grup.id, ogrenciId)) return { error: "Öğrenci bulunamadı." };

  const { error } = await admin.from("profiles").update({ aktif }).eq("id", ogrenciId);
  if (error) return { error: kapasiteMesaji(error.message) };
  await islemKaydi(admin, kocId, aktif ? "grup_ogrenci_aktiflestir" : "grup_ogrenci_pasiflestir", { school_id: grup.id, ogrenci_id: ogrenciId });
  revalidatePath("/dashboard");
  return { error: null };
}

export async function grupOgrenciSeviyeDegistir(ogrenciId: string, seviye: string): Promise<{ error: string | null }> {
  const yetki = await grupKocuYazmaYetkisi();
  if (yetki.error !== null) return { error: yetki.error };
  const { admin, kocId, grup } = yetki;
  if (!(GRUP_SINIF_DUZEYLERI as readonly string[]).includes(seviye)) return { error: "Sınıf düzeyi seçin." };
  if (!await grubunOgrencisiMi(admin, grup.id, ogrenciId)) return { error: "Öğrenci bulunamadı." };

  const classId = await grupSinifi(admin, grup.id, seviye);
  if (!classId) return { error: "Sınıf oluşturulamadı, tekrar deneyin." };
  const { error } = await admin.from("students").update({ class_id: classId }).eq("id", ogrenciId).eq("school_id", grup.id);
  if (error) return { error: error.message };
  await islemKaydi(admin, kocId, "grup_ogrenci_sinif", { school_id: grup.id, ogrenci_id: ogrenciId, seviye });
  revalidatePath("/dashboard");
  return { error: null };
}
