"use server";

// DERSHANE MODU (Faz D5) — admin'in (site yöneticisi) PDF deneme eşleştirme
// inceleme kuyruğu. Ayrı bir dosyada tutuluyor (yonetici/actions.ts zaten
// büyük ve bu oturumda eşzamanlı düzenleniyor) — yetki kontrolü burada
// (requireEslesmeYetkisi) kasıtlı olarak yeniden tanımlı (yonetici/actions.ts'teki aynı desen,
// bkz. oradaki gerekçe: service-role client RLS'i bypass ettiğinden bu
// kontrol olmadan herhangi bir oturum açmış kullanıcı admin API'sini
// tetikleyebilirdi).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dershaneModeratorKurumu } from "@/lib/dershane-auth";
import { ogretmenDenemeSonucuKaydet, yayineviAyniMi } from "@/lib/deneme-sonucu-kaydet";
import { adlarBenzerMi } from "@/lib/ad-benzerligi";
import { adNormalize } from "@/lib/validators";
import { eslestirilebilirMi, pdfEslesmeDurumEtiketi } from "@/lib/pdf-eslesme-durum";
import type { PdfEslesmeDurumEtiketi, PdfEslesmeDurumu } from "@/lib/pdf-eslesme-durum";
import type { DenemeTuru } from "@/lib/types";

// Yetki: yönetici bütün kurumları görür (kurumFiltresi null); dershane
// moderatörü (kullanıcı isteği 03.10.2026) yalnızca KENDİ kurumunun
// satırlarını görür ve eşleştirir — kurum her zaman sunucuda
// school_moderators kaydından okunur, istemciden gelen id'ye güvenilmez.
async function requireEslesmeYetkisi(): Promise<{ user: { id: string }; admin: ReturnType<typeof createAdminClient>; kurumFiltresi: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin") return { user, admin: createAdminClient(), kurumFiltresi: null };
  const moderator = await dershaneModeratorKurumu();
  if (!moderator) redirect("/dashboard");
  return { user, admin: moderator.admin, kurumFiltresi: moderator.schoolId };
}

function eslesmeYollariniYenile() {
  revalidatePath("/yonetici");
  revalidatePath("/moderator");
}

export interface PdfEslesmeBekleyeni {
  id: string;
  adSoyadHam: string;
  dersSonuclari: { ders: string; dogru: number; yanlis: number }[];
  yayinevi: string;
  tarih: string;
  tur: string;
  okulAdi: string;
  schoolId: string;
  createdAt: string;
  durum: PdfEslesmeDurumu;
  durumEtiketi: PdfEslesmeDurumEtiketi;
  atananOgrenciAdi: string | null;
  // PDF'te yazan öğrenci numarası (migration 0130). Adaş satırları ekranda
  // ayırt etmenin TEK yolu — ad ve netler yan yana aynı görünebiliyor.
  ogrenciNo: number | null;
  eslestirilebilir: boolean;
}

// Ekran tek seferde bu kadar satır çekiyor. Kuyruk artık PDF'teki BÜTÜN
// adları tuttuğu için yükleme başına 100+ satır birikiyor; sınırsız çekmek
// sayfayı da sorguyu da şişirir. En yeniler önce geliyor, süzgeçler bunun
// üstünde çalışıyor.
const EKRAN_SATIR_SINIRI = 500;

export async function pdfEslesmeBekleyenleriGetir(): Promise<{ error: string | null; bekleyenler: PdfEslesmeBekleyeni[]; kirpildi: boolean }> {
  const { admin, kurumFiltresi } = await requireEslesmeYetkisi();
  let sorgu = admin
    .from("pdf_deneme_eslesme_bekleyenler")
    .select("id, ad_soyad_ham, ders_sonuclari, ogrenci_no, yayinevi, tarih, tur, school_id, durum, atanan_student_id, created_at, schools(ad)");
  if (kurumFiltresi) sorgu = sorgu.eq("school_id", kurumFiltresi);
  const { data, error } = await sorgu
    .order("created_at", { ascending: false })
    .limit(EKRAN_SATIR_SINIRI + 1);
  if (error) return { error: error.message, bekleyenler: [], kirpildi: false };

  type Row = {
    id: string; ad_soyad_ham: string; ders_sonuclari: { ders: string; dogru: number; yanlis: number }[];
    ogrenci_no: number | null;
    yayinevi: string; tarih: string; tur: string; school_id: string; created_at: string;
    durum: PdfEslesmeDurumu; atanan_student_id: string | null;
    schools: { ad: string } | null;
  };
  const tumSatirlar = (data ?? []) as unknown as Row[];
  const kirpildi = tumSatirlar.length > EKRAN_SATIR_SINIRI;
  const satirlar = kirpildi ? tumSatirlar.slice(0, EKRAN_SATIR_SINIRI) : tumSatirlar;
  const schoolIds = [...new Set(satirlar.map((r) => r.school_id))];
  const atananIds = [...new Set(satirlar.map((r) => r.atanan_student_id).filter((id): id is string => !!id))];
  const [{ data: onKayitlar }, { data: okulOgrencileri }, { data: atananlar }] = await Promise.all([
    schoolIds.length > 0
      ? admin.from("pending_dershane_ogrenciler").select("school_id, ad").in("school_id", schoolIds).is("kullanildi_at", null)
      : Promise.resolve({ data: [] }),
    schoolIds.length > 0
      ? admin.from("students").select("school_id, profiles!students_id_fkey(ad)").in("school_id", schoolIds)
      : Promise.resolve({ data: [] }),
    atananIds.length > 0
      ? admin.from("students").select("id, profiles!students_id_fkey(ad)").in("id", atananIds)
      : Promise.resolve({ data: [] }),
  ]);
  const onKayitAnahtarlari = new Set((onKayitlar ?? []).map((o) => `${o.school_id}|${adNormalize(String(o.ad))}`));
  const okulAdlari = new Map<string, string[]>();
  for (const o of (okulOgrencileri ?? []) as unknown as { school_id: string; profiles: { ad: string } | null }[]) {
    if (!o.profiles) continue;
    const liste = okulAdlari.get(o.school_id) ?? [];
    liste.push(o.profiles.ad);
    okulAdlari.set(o.school_id, liste);
  }
  const atananAdlari = new Map(((atananlar ?? []) as unknown as { id: string; profiles: { ad: string } | null }[])
    .map((o) => [o.id, o.profiles?.ad ?? "Bilinmiyor"]));

  const bekleyenler = satirlar.map((r) => {
    // Etiket kararı saf fonksiyonda (pdf-eslesme-durum.ts) — sıra önemli ve
    // sınanabilir olması gerekiyor.
    const girdi = {
      durum: r.durum,
      dersSonucSayisi: r.ders_sonuclari?.length ?? 0,
      onKayittaVarMi: onKayitAnahtarlari.has(`${r.school_id}|${adNormalize(r.ad_soyad_ham)}`),
      benzeyenOgrenciSayisi: (okulAdlari.get(r.school_id) ?? []).filter((ad) => adlarBenzerMi(r.ad_soyad_ham, ad)).length,
    };
    return {
      id: r.id, adSoyadHam: r.ad_soyad_ham, dersSonuclari: r.ders_sonuclari, yayinevi: r.yayinevi,
      tarih: r.tarih, tur: r.tur, schoolId: r.school_id, okulAdi: r.schools?.ad ?? "Bilinmiyor", createdAt: r.created_at,
      durum: r.durum,
      ogrenciNo: r.ogrenci_no,
      atananOgrenciAdi: r.atanan_student_id ? (atananAdlari.get(r.atanan_student_id) ?? "Bilinmiyor") : null,
      durumEtiketi: pdfEslesmeDurumEtiketi(girdi),
      eslestirilebilir: eslestirilebilirMi(girdi),
    };
  });
  return { error: null, bekleyenler, kirpildi };
}

export interface PdfEslesmeOgrencisi { id: string; ad: string; sinif: string | null; yerlestirildi: boolean }

// Bekleyen satırın kurumundaki öğrencileri (isim ara-seç için) getirir. Sınıf
// da dönüyor — kullanıcı isteği (25.09.2026): tüm okul tek listede
// geliyordu, sınıfa göre süzülebilsin. Kullanıcı isteği (27.09.2026): aynı
// denemede (tarih + tür + yayınevi) sonucu zaten okul kaydı olarak yerleşmiş
// öğrenciler işaretlenir, seçim listesinde gizlenir — arama daralsın.
export async function pdfEslesmeOgrencileriGetir(
  schoolId: string,
  deneme?: { tarih: string; tur: string; yayinevi: string },
): Promise<{ error: string | null; ogrenciler: PdfEslesmeOgrencisi[] }> {
  const { admin, kurumFiltresi } = await requireEslesmeYetkisi();
  if (kurumFiltresi && kurumFiltresi !== schoolId) return { error: "Bu kurumun öğrencilerini görme yetkiniz yok.", ogrenciler: [] };
  const { data, error } = await admin.from("students")
    .select("id, profiles!students_id_fkey(ad), classes(seviye, sube)").eq("school_id", schoolId);
  if (error) return { error: error.message, ogrenciler: [] };
  type Row = { id: string; profiles: { ad: string } | null; classes: { seviye: string; sube: string } | null };
  const satirlar = ((data ?? []) as unknown as Row[]).filter((o) => o.profiles);

  const yerlesenler = new Set<string>();
  if (deneme && satirlar.length > 0) {
    const { data: denemeler, error: denemeHatasi } = await admin.from("denemeler")
      .select("student_id, yayinevi")
      .in("student_id", satirlar.map((o) => o.id))
      .eq("tarih", deneme.tarih).eq("tur", deneme.tur).eq("kaynak", "ogretmen");
    if (denemeHatasi) console.warn("Yerleşmiş öğrenciler alınamadı (liste süzülmeden gösteriliyor):", denemeHatasi.message);
    for (const d of denemeler ?? []) {
      if (yayineviAyniMi(String(d.yayinevi ?? ""), deneme.yayinevi)) yerlesenler.add(d.student_id as string);
    }
  }

  const ogrenciler = satirlar
    .map((o) => ({
      id: o.id, ad: o.profiles!.ad, sinif: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : null,
      yerlestirildi: yerlesenler.has(o.id),
    }))
    .sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  return { error: null, ogrenciler };
}

export async function pdfEslesmeAta(id: string, studentId: string): Promise<{ error: string | null }> {
  const { user, admin, kurumFiltresi } = await requireEslesmeYetkisi();
  const { data: bekleyen, error: bulmaHatasi } = await admin
    .from("pdf_deneme_eslesme_bekleyenler")
    .select("*")
    .eq("id", id).eq("durum", "bekliyor")
    .maybeSingle();
  if (bulmaHatasi) return { error: bulmaHatasi.message };
  if (!bekleyen) return { error: "Kayıt bulunamadı veya zaten işlenmiş." };
  if (kurumFiltresi && bekleyen.school_id !== kurumFiltresi) return { error: "Bu kayıt kurumunuza ait değil." };

  const { data: hedefOgrenci, error: ogrenciHatasi } = await admin.from("students")
    .select("id, school_id").eq("id", studentId).maybeSingle();
  if (ogrenciHatasi) return { error: ogrenciHatasi.message };
  if (!hedefOgrenci || hedefOgrenci.school_id !== bekleyen.school_id) {
    return { error: "Seçilen öğrenci bu kurumda değil." };
  }

  // ADAŞ KORUMASI: aynı denemede bu öğrenciye BAŞKA bir PDF satırı zaten
  // atanmışsa durdur. Canlı veride olan buydu — PDF'teki iki ayrı
  // "MEHMET ŞAHİN" satırı tek hesaba bağlandı, biri diğerinin sonucunu
  // bastırdı ve hangisinin o hesabın sahibine ait olduğu kayboldu.
  const { data: zatenAtanmis } = await admin
    .from("pdf_deneme_eslesme_bekleyenler")
    .select("id, ad_soyad_ham, ogrenci_no")
    .eq("school_id", bekleyen.school_id)
    .eq("yayinevi", bekleyen.yayinevi)
    .eq("tarih", bekleyen.tarih)
    .eq("tur", bekleyen.tur)
    .eq("durum", "atandi")
    .eq("atanan_student_id", studentId)
    .limit(1)
    .maybeSingle();
  if (zatenAtanmis) {
    const kim = zatenAtanmis.ogrenci_no
      ? `"${zatenAtanmis.ad_soyad_ham}" (no: ${zatenAtanmis.ogrenci_no})`
      : `"${zatenAtanmis.ad_soyad_ham}"`;
    return {
      error: `Bu öğrenciye aynı denemeden ${kim} satırı zaten atanmış. İki satır aynı kişiye bağlanırsa biri diğerinin sonucunu bastırır. Doğru satır buysa önce eski atamayı düzeltin.`,
    };
  }

  const kayit = await ogretmenDenemeSonucuKaydet(admin, {
    studentId,
    tarih: bekleyen.tarih,
    tur: bekleyen.tur as DenemeTuru,
    yayinevi: bekleyen.yayinevi,
    dersSonuclari: bekleyen.ders_sonuclari as { ders: string; dogru: number; yanlis: number }[],
  });
  if (kayit.error) return { error: kayit.error };

  const { error: guncellemeHatasi } = await admin.from("pdf_deneme_eslesme_bekleyenler")
    .update({ durum: "atandi", atanan_student_id: studentId }).eq("id", id);
  if (guncellemeHatasi) return { error: guncellemeHatasi.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "pdf_deneme_eslesme_ata", detay: { bekleyen_id: id, student_id: studentId } });
  eslesmeYollariniYenile();
  return { error: null };
}

export async function pdfEslesmeReddet(id: string): Promise<{ error: string | null }> {
  const { user, admin, kurumFiltresi } = await requireEslesmeYetkisi();
  let guncelleme = admin.from("pdf_deneme_eslesme_bekleyenler").update({ durum: "reddedildi" }).eq("id", id).eq("durum", "bekliyor");
  if (kurumFiltresi) guncelleme = guncelleme.eq("school_id", kurumFiltresi);
  const { error } = await guncelleme;
  if (error) return { error: error.message };
  await admin.from("admin_audit_log").insert({ actor_id: user.id, eylem: "pdf_deneme_eslesme_reddet", detay: { bekleyen_id: id } });
  eslesmeYollariniYenile();
  return { error: null };
}
