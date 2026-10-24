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
import { denemeModeratorKurumu } from "@/lib/dershane-auth";
import { ogretmenDenemeSonucuKaydet, yayineviAyniMi } from "@/lib/deneme-sonucu-kaydet";
import { adlarBenzerMi } from "@/lib/ad-benzerligi";
import { adNormalize } from "@/lib/validators";import { eslestirilebilirMi, pdfEslesmeDenemeAnahtari, pdfEslesmeDurumEtiketi } from "@/lib/pdf-eslesme-durum";
import type { PdfEslesmeDurumEtiketi, PdfEslesmeDurumu } from "@/lib/pdf-eslesme-durum";
import type { DenemeTuru } from "@/lib/types";

// Yetki: yönetici bütün kurumları görür (kurumFiltresi null); kurum
// (dershane ya da okul) moderatörü (kullanıcı isteği 03.10.2026) yalnızca KENDİ kurumunun
// satırlarını görür ve eşleştirir — kurum her zaman sunucuda
// school_moderators kaydından okunur, istemciden gelen id'ye güvenilmez.
async function requireEslesmeYetkisi(): Promise<{ user: { id: string }; admin: ReturnType<typeof createAdminClient>; kurumFiltresi: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role === "admin") return { user, admin: createAdminClient(), kurumFiltresi: null };
  const moderator = await denemeModeratorKurumu();
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
  // Öğrenci arama listesinin açıldığı seviye (yükleyenin belirttiği ya da
  // denemede eşleşenlerden tahmin); null = bütün kurum.
  sinifSeviyesi: string | null;
}

// Kullanıcı isteği (17.10.2026): ekran listesiz açılır. Önce yalnızca
// denemelerin özeti (kurum + tarih + tür + yayınevi, satır sayılarıyla)
// gelir; bir deneme seçilince YALNIZCA o denemenin satırları, sınırsız
// çekilir. Eskiden ekran son 500 satırı çekiyordu ve büyük yüklemelerde
// eski denemeler listeden düşüyordu.
export interface PdfEslesmeDenemesi {
  anahtar: string; // pdfEslesmeDenemeAnahtari
  schoolId: string;
  okulAdi: string;
  tarih: string;
  tur: string;
  yayinevi: string;
  toplam: number;
  bekleyen: number;
  sonYukleme: string;
}

export interface PdfEslesmeSecimi { schoolId: string; tarih: string; tur: string; yayinevi: string }

const SAYFA = 1000;

export async function pdfEslesmeDenemeleriGetir(kurumId?: string): Promise<{ error: string | null; denemeler: PdfEslesmeDenemesi[] }> {
  const { admin, kurumFiltresi } = await requireEslesmeYetkisi();
  const kurum = kurumFiltresi ?? kurumId ?? null;
  type OzetRow = { school_id: string; tarih: string; tur: string; yayinevi: string; durum: PdfEslesmeDurumu; created_at: string };
  const satirlar: OzetRow[] = [];
  for (let bas = 0; ; bas += SAYFA) {
    let sorgu = admin.from("pdf_deneme_eslesme_bekleyenler").select("school_id, tarih, tur, yayinevi, durum, created_at");
    if (kurum) sorgu = sorgu.eq("school_id", kurum);
    const { data, error } = await sorgu.order("id").range(bas, bas + SAYFA - 1);
    if (error) return { error: error.message, denemeler: [] };
    satirlar.push(...((data ?? []) as OzetRow[]));
    if ((data ?? []).length < SAYFA) break;
  }
  const gruplar = new Map<string, PdfEslesmeDenemesi>();
  for (const r of satirlar) {
    const secim = { schoolId: r.school_id, tarih: r.tarih, tur: r.tur, yayinevi: r.yayinevi };
    const anahtar = pdfEslesmeDenemeAnahtari(secim);
    const g = gruplar.get(anahtar) ?? { anahtar, ...secim, okulAdi: "", toplam: 0, bekleyen: 0, sonYukleme: r.created_at };
    g.toplam++;
    if (r.durum === "bekliyor") g.bekleyen++;
    if (r.created_at > g.sonYukleme) g.sonYukleme = r.created_at;
    gruplar.set(anahtar, g);
  }
  const okulIdleri = [...new Set(satirlar.map((r) => r.school_id))];
  const { data: okullar } = okulIdleri.length > 0
    ? await admin.from("schools").select("id, ad").in("id", okulIdleri)
    : { data: [] };
  const okulAdi = new Map(((okullar ?? []) as { id: string; ad: string }[]).map((o) => [o.id, o.ad]));
  const denemeler = [...gruplar.values()]
    .map((g) => ({ ...g, okulAdi: okulAdi.get(g.schoolId) ?? "Bilinmiyor" }))
    .sort((a, b) => b.sonYukleme.localeCompare(a.sonYukleme));
  return { error: null, denemeler };
}

export async function pdfEslesmeBekleyenleriGetir(secim: PdfEslesmeSecimi): Promise<{ error: string | null; bekleyenler: PdfEslesmeBekleyeni[] }> {
  const { admin, kurumFiltresi } = await requireEslesmeYetkisi();
  if (kurumFiltresi && kurumFiltresi !== secim.schoolId) return { error: "Bu kurumun satırlarını görme yetkiniz yok.", bekleyenler: [] };
  const tumSatirlar: unknown[] = [];
  const temelSutunlar = "id, ad_soyad_ham, ders_sonuclari, ogrenci_no, yayinevi, tarih, tur, school_id, durum, atanan_student_id, created_at, schools(ad)";
  // sinif_seviyesi migration 0158'le geldi; uygulanmadıysa sütunsuz okunur.
  let sutunlar = `${temelSutunlar}, sinif_seviyesi`;
  for (let bas = 0; ; bas += SAYFA) {
    const sorgu = () => admin
      .from("pdf_deneme_eslesme_bekleyenler")
      .select(sutunlar)
      .eq("school_id", secim.schoolId).eq("tarih", secim.tarih).eq("tur", secim.tur).eq("yayinevi", secim.yayinevi)
      .order("created_at", { ascending: false }).order("id")
      .range(bas, bas + SAYFA - 1);
    let { data, error } = await sorgu();
    if (error && /sinif_seviyesi/.test(error.message) && sutunlar !== temelSutunlar) {
      sutunlar = temelSutunlar;
      ({ data, error } = await sorgu());
    }
    if (error) return { error: error.message, bekleyenler: [] };
    tumSatirlar.push(...(data ?? []));
    if ((data ?? []).length < SAYFA) break;
  }

  type Row = {
    id: string; ad_soyad_ham: string; ders_sonuclari: { ders: string; dogru: number; yanlis: number }[];
    ogrenci_no: number | null;
    yayinevi: string; tarih: string; tur: string; school_id: string; created_at: string;
    durum: PdfEslesmeDurumu; atanan_student_id: string | null;
    schools: { ad: string } | null;
    sinif_seviyesi?: string | null;
  };
  const satirlar = tumSatirlar as Row[];
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
      ? admin.from("students").select("id, profiles!students_id_fkey(ad), classes(seviye)").in("id", atananIds)
      : Promise.resolve({ data: [] }),
  ]);
  // Yükleyen seviye belirtmediyse (eski satırlar, karışık): bu denemede zaten
  // eşleşmiş öğrencilerin en az %70'i aynı seviyedeyse o seviye kullanılır.
  const seviyeSayaci = new Map<string, number>();
  for (const o of (atananlar ?? []) as unknown as { classes: { seviye: string } | null }[]) {
    if (o.classes?.seviye) seviyeSayaci.set(o.classes.seviye, (seviyeSayaci.get(o.classes.seviye) ?? 0) + 1);
  }
  const toplamAtanan = [...seviyeSayaci.values()].reduce((t, n) => t + n, 0);
  const baskinSeviye = [...seviyeSayaci.entries()].sort((a, b) => b[1] - a[1])[0];
  const tahminiSeviye = baskinSeviye && baskinSeviye[1] / toplamAtanan >= 0.7 ? baskinSeviye[0] : null;
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
      sinifSeviyesi: r.sinif_seviyesi ?? tahminiSeviye,
    };
  });
  return { error: null, bekleyenler };
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
  // Kullanıcı isteği (17.10.2026): bütün kurum yerine denemeye giren seviye.
  sinifSeviyesi?: string | null,
): Promise<{ error: string | null; ogrenciler: PdfEslesmeOgrencisi[] }> {
  const { admin, kurumFiltresi } = await requireEslesmeYetkisi();
  if (kurumFiltresi && kurumFiltresi !== schoolId) return { error: "Bu kurumun öğrencilerini görme yetkiniz yok.", ogrenciler: [] };
  const { data, error } = await admin.from("students")
    .select("id, profiles!students_id_fkey(ad), classes(seviye, sube)").eq("school_id", schoolId);
  if (error) return { error: error.message, ogrenciler: [] };
  type Row = { id: string; profiles: { ad: string } | null; classes: { seviye: string; sube: string } | null };
  const satirlar = ((data ?? []) as unknown as Row[])
    .filter((o) => o.profiles && (!sinifSeviyesi || o.classes?.seviye === sinifSeviyesi));

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
    pdfAktoruId: user.id,
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

// ATAMAYI GERİ AL (08.10.2026). Daha önce bir atama YAPILABİLİYOR ama GERİ
// ALINAMIYORDU: pdfEslesmeReddet yalnızca "bekliyor" satırlarda çalışıyor,
// pdfEslesmeAta ise öğrenciye zaten satır atanmışsa "önce eski atamayı
// düzeltin" diyerek duruyordu — ama düzeltmenin bir yolu yoktu. Canlı 4K
// yüklemesinde bir öğrenciye adaşının netleri yazıldı ve bu yüzden site
// üzerinden düzeltilemedi.
//
// Yazılan deneme kaydı YALNIZCA bu yüklemenin oluşturduğu kayıtsa silinir.
// Kuyruk satırı her zaman sonucun hemen ÖNCESİNDE yazılır, bu yüzden
// yüklemenin açtığı kayıtta deneme.created_at >= kuyruk satırının tarihi
// olur. Daha ESKİ bir kayıt yüklemeden önce vardı (öğrencinin kendi girdiği
// kayıt devralınmış olabilir, bkz. okulDenemeKaydiniHazirla) — onu silmek
// öğrencinin kendi verisini yok ederdi, bu yüzden silinmez, yöneticiye
// uyarı döner.
export async function pdfEslesmeAtamayiGeriAl(id: string): Promise<{ error: string | null; uyari: string | null }> {
  const { user, admin, kurumFiltresi } = await requireEslesmeYetkisi();
  const { data: kayit, error: bulmaHatasi } = await admin
    .from("pdf_deneme_eslesme_bekleyenler")
    .select("*")
    .eq("id", id).eq("durum", "atandi")
    .maybeSingle();
  if (bulmaHatasi) return { error: bulmaHatasi.message, uyari: null };
  if (!kayit) return { error: "Kayıt bulunamadı veya atanmış değil.", uyari: null };
  if (kurumFiltresi && kayit.school_id !== kurumFiltresi) return { error: "Bu kayıt kurumunuza ait değil.", uyari: null };

  let uyari: string | null = null;
  if (kayit.atanan_student_id) {
    // Yayınevi adı birebir aynı yazılmamış olabilir (bkz. yayineviAyniMi).
    const { data: adaylar, error: denemeHatasi } = await admin
      .from("denemeler")
      .select("id, created_at, yayinevi")
      .eq("student_id", kayit.atanan_student_id)
      .eq("tarih", kayit.tarih)
      .eq("tur", kayit.tur);
    if (denemeHatasi) return { error: denemeHatasi.message, uyari: null };
    const ayniDeneme = (adaylar ?? []).filter((d) => yayineviAyniMi(d.yayinevi ?? "", kayit.yayinevi));
    const yuklemeninActiklari = ayniDeneme.filter((d) => new Date(d.created_at) >= new Date(kayit.created_at));
    if (yuklemeninActiklari.length > 0) {
      // deneme_ders_sonuclari / karne / kazanım kayıtları CASCADE ile gider.
      const { error: silmeHatasi } = await admin.from("denemeler").delete()
        .in("id", yuklemeninActiklari.map((d) => d.id));
      if (silmeHatasi) return { error: silmeHatasi.message, uyari: null };
    } else if (ayniDeneme.length > 0) {
      uyari = "Öğrencinin bu denemeye ait kaydı yüklemeden ÖNCE de vardı, bu yüzden SİLİNMEDİ — içeriği bu PDF ile güncellenmiş olabilir, elle kontrol edin.";
    }
  }

  const { error: guncellemeHatasi } = await admin.from("pdf_deneme_eslesme_bekleyenler")
    // liste_ogrenci_id de temizlenir: geri alınan satır, öğrencinin bir sonraki
    // panel açılışında (ön kayıtlı aktarımı) kendiliğinden yeniden yazılmasın.
    .update({ durum: "bekliyor", atanan_student_id: null, liste_ogrenci_id: null }).eq("id", id);
  if (guncellemeHatasi) return { error: guncellemeHatasi.message, uyari: null };
  await admin.from("admin_audit_log").insert({
    actor_id: user.id,
    eylem: "pdf_deneme_eslesme_geri_al",
    detay: { bekleyen_id: id, student_id: kayit.atanan_student_id, sonuc_silindi: uyari === null },
  });
  eslesmeYollariniYenile();
  return { error: null, uyari };
}
