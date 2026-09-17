"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pdfOgeleriniCikar } from "@/lib/pdf-oge";
import { adAnahtari } from "@/lib/pdf-metni";
import { programPdfiniCoz } from "@/lib/ders-programi-pdf";
import type { ProgramGunu } from "@/lib/ders-programi-pdf";
import { yurtNobetiPdfiniCoz } from "@/lib/yurt-nobeti-pdf";
import type { NobetGorunumu, ProgramYuklemeOzeti, YurtNobetiYuklemeOzeti } from "@/lib/nobet-yukleme";
import { ogretmeneBildirimGonder } from "@/lib/ogretmen-bildirim";

// Ders programı ve nöbet listesi yükleme (kullanıcı isteği 17.09.2026) —
// yönetici/müdür okulun MEB ders programı PDF'ini ve yurt (belletmen) nöbet
// listesini site içinden yükler. Kullanıcı kararları: yüklenen ders programı
// elle değiştirilemez (kaynak='pdf'), nöbetler ise değiştirilebilir.
// Yazma servis anahtarıyla; yetki burada doğrulanır (bkz. migration 0112).

const EN_BUYUK_DOSYA = 10 * 1024 * 1024;

type AdminClient = ReturnType<typeof createAdminClient>;
type Yetki =
  | { error: string; admin: null; schoolId: null }
  | { error: null; admin: AdminClient; schoolId: string };

async function yuklemeYetkisi(okulId?: string | null): Promise<Yetki> {
  const hata = (error: string): Yetki => ({ error, admin: null, schoolId: null });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return hata("Oturum açılmadı.");
  const { data: profil } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const admin = createAdminClient();

  if (profil?.role === "admin") {
    if (!okulId) return hata("Önce okul seçin.");
    const { data: okul } = await admin.from("schools").select("id").eq("id", okulId).maybeSingle();
    if (!okul) return hata("Okul bulunamadı.");
    return { error: null, admin, schoolId: okulId };
  }
  if (profil?.role === "mudur") {
    const { data: ogretmen } = await admin.from("teachers").select("school_id").eq("id", user.id).maybeSingle();
    if (!ogretmen?.school_id) return hata("Kurum bilginiz bulunamadı.");
    if (okulId && okulId !== ogretmen.school_id) return hata("Yalnızca kendi kurumunuz için yükleme yapabilirsiniz.");
    return { error: null, admin, schoolId: ogretmen.school_id as string };
  }
  return hata("Bu işlem için yönetici ya da müdür yetkisi gerekiyor.");
}

async function pdfOkuAyikla(formData: FormData): Promise<{ error: string; ogeler: null } | { error: null; ogeler: Awaited<ReturnType<typeof pdfOgeleriniCikar>> }> {
  const dosya = formData.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) return { error: "PDF dosyası seçilmedi.", ogeler: null };
  if (dosya.size > EN_BUYUK_DOSYA) return { error: "Dosya çok büyük (en fazla 10 MB).", ogeler: null };
  if (!dosya.name.toLowerCase().endsWith(".pdf")) return { error: "Yalnızca PDF dosyası yüklenebilir.", ogeler: null };
  try {
    return { error: null, ogeler: await pdfOgeleriniCikar(new Uint8Array(await dosya.arrayBuffer())) };
  } catch (e) {
    console.error("PDF okunamadı:", e);
    return { error: "PDF okunamadı. Dosyanın bozuk olmadığından emin olun.", ogeler: null };
  }
}

// Okulun öğretmenleri: ad anahtarı -> teacher_id. Aynı ada sahip birden fazla
// öğretmen varsa eşleştirme yapılmaz (yanlış kişiye program yazılmasın).
async function ogretmenHaritasi(admin: AdminClient, schoolId: string): Promise<{ harita: Map<string, string>; ikiliAdlar: Set<string> }> {
  const { data } = await admin
    .from("teachers")
    .select("id, profiles!teachers_id_fkey(ad)")
    .eq("school_id", schoolId);
  type Satir = { id: string; profiles: { ad: string | null } | { ad: string | null }[] | null };
  const harita = new Map<string, string>();
  const ikiliAdlar = new Set<string>();
  for (const satir of (data ?? []) as unknown as Satir[]) {
    const profil = Array.isArray(satir.profiles) ? satir.profiles[0] : satir.profiles;
    const anahtar = adAnahtari(profil?.ad ?? "");
    if (!anahtar) continue;
    if (harita.has(anahtar)) {
      ikiliAdlar.add(anahtar);
      harita.delete(anahtar);
      continue;
    }
    if (!ikiliAdlar.has(anahtar)) harita.set(anahtar, satir.id);
  }
  return { harita, ikiliAdlar };
}

export async function dersProgramiPdfYukle(formData: FormData): Promise<{ error: string | null; ozet: ProgramYuklemeOzeti | null }> {
  const okuma = await pdfOkuAyikla(formData);
  if (okuma.error !== null) return { error: okuma.error, ozet: null };
  const yetki = await yuklemeYetkisi(String(formData.get("okulId") ?? "") || null);
  if (yetki.error !== null) return { error: yetki.error, ozet: null };
  const { admin, schoolId } = yetki;

  const cozum = programPdfiniCoz(okuma.ogeler);
  if (cozum.ogretmenler.length === 0) {
    return { error: "PDF'te öğretmen programı bulunamadı. Doğru dosyayı seçtiğinizden emin olun.", ozet: null };
  }

  const [{ data: sinifSatirlari }, { harita: ogretmenler, ikiliAdlar }] = await Promise.all([
    admin.from("classes").select("id, seviye, sube").eq("school_id", schoolId),
    ogretmenHaritasi(admin, schoolId),
  ]);
  const sinifIdleri = new Map<string, string>();
  for (const s of (sinifSatirlari ?? []) as { id: string; seviye: string; sube: string }[]) {
    sinifIdleri.set(`${s.seviye}/${s.sube}`.toLocaleUpperCase("tr"), s.id);
  }

  const uyarilar = [...cozum.uyarilar];
  const anahtarlar: string[] = [];
  const eslesenIdler: string[] = [];
  const programSatirlari: { teacher_id: string; gun: ProgramGunu; ders_saati_sira: number; class_id: string; ders: string; kaynak: string }[] = [];
  const bekleyenSatirlar: { school_id: string; ad_soyad: string; gun: ProgramGunu; ders_saati_sira: number; class_id: string; ders: string; kaynak: string }[] = [];
  const nobetSatirlari: { school_id: string; ad_soyad: string; teacher_id: string | null; gun: ProgramGunu; yer: string }[] = [];
  let bekleyenOgretmen = 0;

  for (const ogretmen of cozum.ogretmenler) {
    const anahtar = adAnahtari(ogretmen.ad);
    if (!anahtar) continue;
    // PDF'te aynı ad iki kez geçerse (iki farklı öğretmen aynı adda) ikinci
    // blok yazılamaz — kayıtlar ad anahtarına göre benzersiz.
    if (anahtarlar.includes(anahtar)) {
      uyarilar.push(`${ogretmen.ad}: PDF'te aynı ad birden fazla kez geçiyor, ilk program alındı.`);
      continue;
    }
    anahtarlar.push(anahtar);
    const teacherId = ogretmenler.get(anahtar) ?? null;
    if (!teacherId && ikiliAdlar.has(anahtar)) {
      uyarilar.push(`${ogretmen.ad}: aynı adda birden fazla öğretmen hesabı var, programı bekleyen listesine alındı.`);
    }
    if (teacherId) eslesenIdler.push(teacherId);
    else bekleyenOgretmen++;

    // Aynı öğretmen/gün/saat tek satır olabilir (tablodaki benzersizlik);
    // PDF'te birleşik hücre yüzünden tekrar gelirse ilki alınır.
    const dolusaatler = new Set<string>();
    for (const hucre of ogretmen.hucreler) {
      const classId = sinifIdleri.get(hucre.sinif.toLocaleUpperCase("tr"));
      if (!classId) {
        uyarilar.push(`${ogretmen.ad}: ${hucre.sinif} sınıfı okulun listesinde yok, o saat atlandı.`);
        continue;
      }
      const saatAnahtari = `${hucre.gun}-${hucre.sira}`;
      if (dolusaatler.has(saatAnahtari)) {
        uyarilar.push(`${ogretmen.ad}: ${hucre.gun} ${hucre.sira}. saatte birden fazla ders var, ilki alındı.`);
        continue;
      }
      dolusaatler.add(saatAnahtari);
      if (teacherId) {
        programSatirlari.push({ teacher_id: teacherId, gun: hucre.gun, ders_saati_sira: hucre.sira, class_id: classId, ders: hucre.ders, kaynak: "pdf" });
      } else {
        bekleyenSatirlar.push({ school_id: schoolId, ad_soyad: ogretmen.ad, gun: hucre.gun, ders_saati_sira: hucre.sira, class_id: classId, ders: hucre.ders, kaynak: "pdf" });
      }
    }
    const nobetGunleri = new Set<string>();
    for (const nobet of ogretmen.nobetler) {
      if (nobetGunleri.has(nobet.gun)) continue;
      nobetGunleri.add(nobet.gun);
      nobetSatirlari.push({ school_id: schoolId, ad_soyad: ogretmen.ad, teacher_id: teacherId, gun: nobet.gun, yer: nobet.yer });
    }
  }

  // Aynı öğretmenin eski kayıtları (elle girilmiş olanlar dahil) yenisiyle değişir.
  if (eslesenIdler.length > 0) {
    const { error } = await admin.from("ogretmen_ders_programi").delete().in("teacher_id", eslesenIdler);
    if (error) return { error: error.message, ozet: null };
  }
  if (anahtarlar.length > 0) {
    await admin.from("bekleyen_ogretmen_programlari").delete().eq("school_id", schoolId).in("ad_anahtari", anahtarlar);
    await admin.from("ogretmen_okul_nobetleri").delete().eq("school_id", schoolId).in("ad_anahtari", anahtarlar);
  }

  if (programSatirlari.length > 0) {
    const { error } = await admin.from("ogretmen_ders_programi").insert(programSatirlari);
    if (error) return { error: error.message, ozet: null };
  }
  if (bekleyenSatirlar.length > 0) {
    const { error } = await admin.from("bekleyen_ogretmen_programlari").insert(bekleyenSatirlar);
    if (error) return { error: error.message, ozet: null };
  }
  if (nobetSatirlari.length > 0) {
    const { error } = await admin.from("ogretmen_okul_nobetleri").insert(nobetSatirlari);
    if (error) return { error: error.message, ozet: null };
  }

  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return {
    error: null,
    ozet: {
      ogretmen: cozum.ogretmenler.length,
      eslesen: new Set(eslesenIdler).size,
      bekleyen: bekleyenOgretmen,
      hucre: programSatirlari.length + bekleyenSatirlar.length,
      nobet: nobetSatirlari.length,
      uyarilar: uyarilar.slice(0, 40),
    },
  };
}

export async function yurtNobetiPdfYukle(formData: FormData): Promise<{ error: string | null; ozet: YurtNobetiYuklemeOzeti | null }> {
  const okuma = await pdfOkuAyikla(formData);
  if (okuma.error !== null) return { error: okuma.error, ozet: null };
  const yetki = await yuklemeYetkisi(String(formData.get("okulId") ?? "") || null);
  if (yetki.error !== null) return { error: yetki.error, ozet: null };
  const { admin, schoolId } = yetki;
  const bildir = String(formData.get("bildir") ?? "") === "evet";

  const cozum = yurtNobetiPdfiniCoz(okuma.ogeler);
  if (cozum.gorevler.length === 0 || !cozum.ilkTarih || !cozum.sonTarih) {
    return { error: "PDF'te nöbet görevi bulunamadı. Doğru dosyayı seçtiğinizden emin olun.", ozet: null };
  }

  const { harita: ogretmenler, ikiliAdlar } = await ogretmenHaritasi(admin, schoolId);
  const uyarilar = [...cozum.uyarilar];
  const satirlar: { school_id: string; ad_soyad: string; teacher_id: string | null; tarih: string }[] = [];
  const eslesenIdler = new Set<string>();
  const adlar = new Set<string>();

  const yazilanlar = new Set<string>();
  for (const gorev of cozum.gorevler) {
    const anahtar = adAnahtari(gorev.ad);
    if (!anahtar) continue;
    // Aynı öğretmen aynı güne iki kez yazılamaz (tablodaki benzersizlik).
    if (yazilanlar.has(`${anahtar}|${gorev.tarih}`)) continue;
    yazilanlar.add(`${anahtar}|${gorev.tarih}`);
    adlar.add(anahtar);
    const teacherId = ogretmenler.get(anahtar) ?? null;
    if (!teacherId && ikiliAdlar.has(anahtar)) uyarilar.push(`${gorev.ad}: aynı adda birden fazla öğretmen hesabı var, nöbeti hesabına bağlanmadı.`);
    if (teacherId) eslesenIdler.add(teacherId);
    satirlar.push({ school_id: schoolId, ad_soyad: gorev.ad, teacher_id: teacherId, tarih: gorev.tarih });
  }

  // Listedeki dönem yeniden yazılır; dönem dışındaki nöbetler korunur.
  const { error: silmeHatasi } = await admin
    .from("yurt_nobet_gorevleri")
    .delete()
    .eq("school_id", schoolId)
    .gte("tarih", cozum.ilkTarih)
    .lte("tarih", cozum.sonTarih);
  if (silmeHatasi) return { error: silmeHatasi.message, ozet: null };

  const { error: eklemeHatasi } = await admin.from("yurt_nobet_gorevleri").insert(satirlar);
  if (eklemeHatasi) return { error: eklemeHatasi.message, ozet: null };

  let bildirilen = 0;
  if (bildir) {
    const baslik = "Bu ayın nöbet görevleri yüklendi";
    const mesaj = `${cozum.ilkTarih} – ${cozum.sonTarih} dönemine ait yurt nöbeti göreviniz SeFu Koç'a yüklendi. Ajandanızdan görebilirsiniz.`;
    for (const teacherId of eslesenIdler) {
      const sonuc = await ogretmeneBildirimGonder(admin, teacherId, "yurt_nobeti", baslik, mesaj);
      if (!sonuc.error) bildirilen++;
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return {
    error: null,
    ozet: {
      gorev: satirlar.length,
      ogretmen: adlar.size,
      eslesen: eslesenIdler.size,
      ilkTarih: cozum.ilkTarih,
      sonTarih: cozum.sonTarih,
      bildirilen,
      uyarilar: uyarilar.slice(0, 40),
    },
  };
}

export async function nobetleriGetir(okulId?: string | null, baslangic?: string, bitis?: string): Promise<{ error: string | null; veri: NobetGorunumu | null }> {
  const yetki = await yuklemeYetkisi(okulId ?? null);
  if (yetki.error !== null) return { error: yetki.error, veri: null };
  const { admin, schoolId } = yetki;

  let yurtSorgusu = admin.from("yurt_nobet_gorevleri").select("id, ad_soyad, tarih, teacher_id").eq("school_id", schoolId);
  if (baslangic) yurtSorgusu = yurtSorgusu.gte("tarih", baslangic);
  if (bitis) yurtSorgusu = yurtSorgusu.lte("tarih", bitis);

  const [{ data: okulHam }, { data: yurtHam }] = await Promise.all([
    admin.from("ogretmen_okul_nobetleri").select("id, ad_soyad, gun, yer, teacher_id").eq("school_id", schoolId).order("ad_soyad"),
    yurtSorgusu.order("tarih").order("ad_soyad"),
  ]);

  return {
    error: null,
    veri: {
      okulNobetleri: ((okulHam ?? []) as { id: string; ad_soyad: string; gun: ProgramGunu; yer: string; teacher_id: string | null }[])
        .map((n) => ({ id: n.id, adSoyad: n.ad_soyad, gun: n.gun, yer: n.yer, bagli: !!n.teacher_id })),
      yurtNobetleri: ((yurtHam ?? []) as { id: string; ad_soyad: string; tarih: string; teacher_id: string | null }[])
        .map((n) => ({ id: n.id, adSoyad: n.ad_soyad, tarih: n.tarih, bagli: !!n.teacher_id })),
    },
  };
}

// Nöbetler öğretmenler arasında değişebiliyor (kullanıcı isteği): ekleme,
// silme ve gün/yer (yurtta tarih) değiştirme serbest.
async function ogretmenIdBul(admin: AdminClient, schoolId: string, adSoyad: string): Promise<string | null> {
  const { harita } = await ogretmenHaritasi(admin, schoolId);
  return harita.get(adAnahtari(adSoyad)) ?? null;
}

const GUNLER: ProgramGunu[] = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"];

export async function okulNobetiKaydet(input: { id?: string; okulId?: string; adSoyad: string; gun: ProgramGunu; yer: string }): Promise<{ error: string | null }> {
  const yetki = await yuklemeYetkisi(input.okulId ?? null);
  if (yetki.error !== null) return { error: yetki.error };
  const { admin, schoolId } = yetki;
  const adSoyad = input.adSoyad.trim();
  const yer = input.yer.trim();
  if (adSoyad.length < 3) return { error: "Öğretmen adını yazın." };
  if (!yer) return { error: "Nöbet yerini yazın." };
  if (!GUNLER.includes(input.gun)) return { error: "Geçersiz gün." };

  const teacherId = await ogretmenIdBul(admin, schoolId, adSoyad);
  if (input.id) {
    const { error } = await admin.from("ogretmen_okul_nobetleri")
      .update({ ad_soyad: adSoyad, gun: input.gun, yer, teacher_id: teacherId })
      .eq("id", input.id).eq("school_id", schoolId);
    if (error) return { error: error.code === "23505" ? "Bu öğretmenin o gün için nöbeti zaten var." : error.message };
  } else {
    const { error } = await admin.from("ogretmen_okul_nobetleri")
      .insert({ school_id: schoolId, ad_soyad: adSoyad, gun: input.gun, yer, teacher_id: teacherId });
    if (error) return { error: error.code === "23505" ? "Bu öğretmenin o gün için nöbeti zaten var." : error.message };
  }
  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return { error: null };
}

export async function okulNobetiSil(id: string, okulId?: string): Promise<{ error: string | null }> {
  const yetki = await yuklemeYetkisi(okulId ?? null);
  if (yetki.error !== null) return { error: yetki.error };
  const { error } = await yetki.admin.from("ogretmen_okul_nobetleri").delete().eq("id", id).eq("school_id", yetki.schoolId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return { error: null };
}

export async function yurtNobetiKaydet(input: { id?: string; okulId?: string; adSoyad: string; tarih: string }): Promise<{ error: string | null }> {
  const yetki = await yuklemeYetkisi(input.okulId ?? null);
  if (yetki.error !== null) return { error: yetki.error };
  const { admin, schoolId } = yetki;
  const adSoyad = input.adSoyad.trim();
  if (adSoyad.length < 3) return { error: "Öğretmen adını yazın." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tarih)) return { error: "Geçerli bir tarih seçin." };

  const teacherId = await ogretmenIdBul(admin, schoolId, adSoyad);
  const satir = { school_id: schoolId, ad_soyad: adSoyad, tarih: input.tarih, teacher_id: teacherId };
  const { error } = input.id
    ? await admin.from("yurt_nobet_gorevleri").update(satir).eq("id", input.id).eq("school_id", schoolId)
    : await admin.from("yurt_nobet_gorevleri").insert(satir);
  if (error) return { error: error.code === "23505" ? "Bu öğretmenin o tarihte nöbeti zaten var." : error.message };
  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return { error: null };
}

export async function yurtNobetiSil(id: string, okulId?: string): Promise<{ error: string | null }> {
  const yetki = await yuklemeYetkisi(okulId ?? null);
  if (yetki.error !== null) return { error: yetki.error };
  const { error } = await yetki.admin.from("yurt_nobet_gorevleri").delete().eq("id", id).eq("school_id", yetki.schoolId);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/yonetici");
  return { error: null };
}
