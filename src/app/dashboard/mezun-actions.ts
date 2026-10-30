"use server";

// Mezun Takip modülü sunucu işlemleri (kullanıcı isteği 30.10.2026, migration
// 0184). Yetki her işlemde mezunErisimi ile veritabanından çözülür; kayıtlar
// yalnız kişinin kurumunda okunur/yazılır.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pdfOgeleriniCikar } from "@/lib/pdf-oge";
import { mezunPdfiniCoz } from "@/lib/mezun-pdf";
import { mezunBilgisiDogrula, mezunGuncellemesi, mezunPdfEslestir, type MezunHamBilgisi, type MezunKaydi, type MezunPdfOnizlemesi } from "@/lib/mezun";
import { mezunErisimi, mezunlariGetir } from "@/lib/mezun-veri";
import { smsMezunlaraGonder } from "@/lib/sms-gonderim";
import type { SmsGonderimSonucu } from "@/lib/sms-gonderim";
import { bugununTarihiTR } from "@/lib/tarih";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EN_BUYUK_DOSYA = 10 * 1024 * 1024;
const EN_COK_PDF_SATIRI = 3000;

async function baglam() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Oturumunuz bulunamadı. Yeniden giriş yapın." } as const;
  const admin = createAdminClient();
  const erisim = await mezunErisimi(admin, user.id);
  if (!erisim) return { error: "Mezun Takip modülünü kurumun rehberlik servisi ve müdürü kullanabilir." } as const;
  return { error: null, admin, erisim } as const;
}

const buYil = () => Number(bugununTarihiTR().slice(0, 4));

function bilgiSatiri(b: NonNullable<ReturnType<typeof mezunBilgisiDogrula>["bilgi"]>) {
  return {
    ad: b.ad, soyad: b.soyad, il: b.il, ilce: b.ilce, eposta: b.eposta, telefon: b.telefon,
    universite: b.universite, meslek: b.meslek, mezuniyet_yili: b.mezuniyetYili,
  };
}

// Yazmadan sonra güncel liste döner: ekran sayfa yenilemesini beklemeden
// gösterir (kullanıcı bildirimi 30.10.2026: eklenen mezun listede görünmedi).
async function yenile(b: { admin: ReturnType<typeof createAdminClient>; erisim: { schoolId: string } }): Promise<MezunKaydi[]> {
  revalidatePath("/dashboard/mezun-takip");
  return mezunlariGetir(b.admin, b.erisim.schoolId);
}

// Tek mezun ekleme (id yok) ya da düzenleme.
export async function mezunKaydet(girdi: { id: string | null; bilgi: MezunHamBilgisi }): Promise<{ error: string | null; uyarilar: string[]; mezunlar?: MezunKaydi[] }> {
  const b = await baglam();
  if (b.error !== null) return { error: b.error, uyarilar: [] };
  const { bilgi, hatalar, uyarilar } = mezunBilgisiDogrula(girdi?.bilgi ?? {}, buYil());
  if (!bilgi) return { error: hatalar.join(" "), uyarilar };
  const satir = { ...bilgiSatiri(bilgi), guncelleyen_id: b.erisim.userId, updated_at: new Date().toISOString() };
  if (girdi.id !== null) {
    if (typeof girdi.id !== "string" || !UUID.test(girdi.id)) return { error: "Geçersiz kayıt.", uyarilar };
    const { data, error } = await b.admin.from("mezunlar").update(satir).eq("id", girdi.id).eq("school_id", b.erisim.schoolId).select("id");
    if (error) return { error: error.message, uyarilar };
    if (!data || data.length === 0) return { error: "Kayıt bulunamadı.", uyarilar };
  } else {
    const { error } = await b.admin.from("mezunlar").insert({ ...satir, school_id: b.erisim.schoolId, kaynak: "elle", ekleyen_id: b.erisim.userId });
    if (error) return { error: error.message, uyarilar };
  }
  return { error: null, uyarilar, mezunlar: await yenile(b) };
}

export async function mezunSil(id: string): Promise<{ error: string | null; mezunlar?: MezunKaydi[] }> {
  const b = await baglam();
  if (b.error !== null) return { error: b.error };
  if (typeof id !== "string" || !UUID.test(id)) return { error: "Geçersiz kayıt." };
  const { error } = await b.admin.from("mezunlar").delete().eq("id", id).eq("school_id", b.erisim.schoolId);
  if (error) return { error: error.message };
  return { error: null, mezunlar: await yenile(b) };
}

export interface MezunPdfOnizlemeSonucu {
  error: string | null;
  satirlar: MezunPdfOnizlemesi[];
  eksikSutunlar: string[];
  /** Onaylanınca sunucuya geri gönderilecek ham satırlar. */
  ham: MezunHamBilgisi[];
}

// PDF'i okur ve kurumun mevcut mezunlarıyla eşleştirir; hiçbir şey yazmaz.
export async function mezunPdfOnizle(formData: FormData): Promise<MezunPdfOnizlemeSonucu> {
  const bos = (error: string): MezunPdfOnizlemeSonucu => ({ error, satirlar: [], eksikSutunlar: [], ham: [] });
  const b = await baglam();
  if (b.error !== null) return bos(b.error);
  const dosya = formData.get("dosya");
  if (!(dosya instanceof File) || dosya.size === 0) return bos("PDF dosyası seçilmedi.");
  if (dosya.size > EN_BUYUK_DOSYA) return bos("Dosya çok büyük (en fazla 10 MB).");
  if (!dosya.name.toLowerCase().endsWith(".pdf")) return bos("Yalnızca PDF dosyası yüklenebilir.");
  let ogeler: Awaited<ReturnType<typeof pdfOgeleriniCikar>>;
  try {
    ogeler = await pdfOgeleriniCikar(new Uint8Array(await dosya.arrayBuffer()));
  } catch {
    return bos("PDF okunamadı. Dosyanın bozuk ya da şifreli olmadığından emin olun.");
  }
  if (ogeler.length === 0) {
    return bos("Bu PDF taranmış bir görüntü (metin katmanı yok), okunamıyor. Tabloyu Word ya da Excel'den \"PDF olarak kaydet\" ile oluşturun.");
  }
  const cozum = mezunPdfiniCoz(ogeler);
  if (!cozum.baslikBulundu) {
    return bos("Tablo başlığı bulunamadı. İlk satırda en az Ad (ya da Ad Soyad) ve iki sütun daha (ör. Telefon, Mezuniyet Yılı) olmalı.");
  }
  if (cozum.satirlar.length === 0) return bos("Tabloda mezun satırı bulunamadı.");
  if (cozum.satirlar.length > EN_COK_PDF_SATIRI) return bos(`Tek seferde en çok ${EN_COK_PDF_SATIRI} satır yüklenebilir.`);
  const mevcut = await mezunlariGetir(b.admin, b.erisim.schoolId);
  return {
    error: null,
    satirlar: mezunPdfEslestir(cozum.satirlar, mevcut, buYil()),
    eksikSutunlar: cozum.eksikSutunlar,
    ham: cozum.satirlar,
  };
}

// Önizlemesi onaylanan satırları yazar. Eşleştirme sunucuda, güncel kayıtlarla
// yeniden yapılır (önizlemeden sonra eklenen/silinen kayıtlar hesaba katılır).
export async function mezunPdfAktar(ham: MezunHamBilgisi[]): Promise<{ error: string | null; eklenen: number; guncellenen: number; atlanan: number; mezunlar?: MezunKaydi[] }> {
  const b = await baglam();
  if (b.error !== null) return { error: b.error, eklenen: 0, guncellenen: 0, atlanan: 0 };
  if (!Array.isArray(ham) || ham.length === 0 || ham.length > EN_COK_PDF_SATIRI) return { error: "Geçersiz satırlar.", eklenen: 0, guncellenen: 0, atlanan: 0 };
  const mevcut = await mezunlariGetir(b.admin, b.erisim.schoolId);
  const satirlar = mezunPdfEslestir(ham.map((h) => (h && typeof h === "object" ? h : {})), mevcut, buYil());
  const simdi = new Date().toISOString();
  const yeniler = satirlar.filter((s) => s.durum === "yeni" && s.bilgi).map((s) => ({
    ...bilgiSatiri(s.bilgi!), school_id: b.erisim.schoolId, kaynak: "pdf", ekleyen_id: b.erisim.userId, guncelleyen_id: b.erisim.userId,
  }));
  for (let i = 0; i < yeniler.length; i += 500) {
    const { error } = await b.admin.from("mezunlar").insert(yeniler.slice(i, i + 500));
    if (error) return { error: error.message, eklenen: i, guncellenen: 0, atlanan: 0 };
  }
  let guncellenen = 0;
  for (const s of satirlar.filter((x) => x.durum === "guncelle" && x.bilgi && x.mezunId)) {
    const g = mezunGuncellemesi(s.bilgi!);
    const alanlar = Object.fromEntries(Object.entries({
      ad: g.ad, soyad: g.soyad, il: g.il, ilce: g.ilce, eposta: g.eposta, telefon: g.telefon,
      universite: g.universite, meslek: g.meslek, mezuniyet_yili: g.mezuniyetYili,
    }).filter(([, v]) => v !== undefined));
    const { error } = await b.admin.from("mezunlar").update({ ...alanlar, guncelleyen_id: b.erisim.userId, updated_at: simdi })
      .eq("id", s.mezunId!).eq("school_id", b.erisim.schoolId);
    if (!error) guncellenen++;
  }
  await b.admin.from("admin_audit_log").insert({
    actor_id: b.erisim.userId, eylem: "mezun_pdf_aktar",
    detay: { school_id: b.erisim.schoolId, eklenen: yeniler.length, guncellenen, atlanan: satirlar.filter((s) => s.durum === "hatali").length },
  });
  return { error: null, eklenen: yeniler.length, guncellenen, atlanan: satirlar.filter((s) => s.durum === "hatali").length, mezunlar: await yenile(b) };
}

export async function mezunSmsGonder(girdi: { mezunIdleri: string[]; icerik: string; zamanIso: string | null }): Promise<{ error: string | null; sonuc?: SmsGonderimSonucu }> {
  const b = await baglam();
  if (b.error !== null) return { error: b.error };
  const idler = girdi?.mezunIdleri;
  if (!Array.isArray(idler) || idler.length > 5000 || !idler.every((i) => typeof i === "string" && UUID.test(i)) || typeof girdi.icerik !== "string") {
    return { error: "Geçersiz gönderim isteği." };
  }
  let zaman: Date | null = null;
  if (girdi.zamanIso !== null) {
    zaman = new Date(girdi.zamanIso);
    if (typeof girdi.zamanIso !== "string" || Number.isNaN(zaman.getTime())) return { error: "Geçerli bir gönderim zamanı girin." };
  }
  const telefonlar: (string | null)[] = [];
  for (let i = 0; i < idler.length; i += 500) {
    const { data } = await b.admin.from("mezunlar").select("telefon").eq("school_id", b.erisim.schoolId).in("id", idler.slice(i, i + 500));
    telefonlar.push(...((data ?? []) as { telefon: string | null }[]).map((m) => m.telefon));
  }
  const sonuc = await smsMezunlaraGonder(b.admin, {
    schoolId: b.erisim.schoolId, userId: b.erisim.userId, icerik: girdi.icerik, telefonlar, zaman,
    hedefOzeti: `Mezunlar: ${telefonlar.length} kişi`,
  });
  revalidatePath("/dashboard/sms");
  return sonuc.error !== null ? { error: sonuc.error } : { error: null, sonuc: sonuc.sonuc };
}
