"use server";

// SMS modülü sunucu işlemleri (kullanıcı kararı 28.10.2026, migration 0183).
// İki ayrı yetki: (1) SMS gönderen — müdür, müdür yardımcısı, rehber öğretmen
// (smsKullaniciErisimi); (2) bağlantıyı kuran — kurum moderatörü/müdürü ve admin
// (smsYonetimErisimi). Kimlik bilgileri şifreli saklanır, istemciye dönmez.
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { smsKimlikCoz, smsKimlikSifrele } from "@/lib/sms-kimlik-sifre";
import { SmsHatasi, smsKimliginiTemizle, smsSaglayicisi } from "@/lib/sms-saglayicilar";
import { smsSaglayiciBilgisi } from "@/lib/sms-saglayici-bilgi";
import { smsKullaniciErisimi, smsKurumunuGetir, smsYonetimErisimi } from "@/lib/sms-erisim";
import { SMS_ICERIK_SINIRI, smsIcerigiTemizle } from "@/lib/sms-mesaj";
import { smsGonder, type SmsGonderimSonucu } from "@/lib/sms-gonderim";
import { smsAlicilariCoz, smsOgrencisiyeIndir, type SmsOgrencisi } from "@/lib/sms-veri";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SABLON_SINIRI = 100;
const GIRIS_HATASI = "Oturumunuz bulunamadı. Yeniden giriş yapın.";

async function oturum() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { userId: user.id, admin: createAdminClient() } : null;
}

function yenile() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/moderator", "layout");
  revalidatePath("/yonetici", "layout");
}

function idlerGecerliMi(idler: unknown, enFazla: number): idler is string[] {
  return Array.isArray(idler) && idler.length <= enFazla && idler.every((i) => typeof i === "string" && UUID.test(i));
}

// ------------------------------------------------------------ gönderim tarafı
async function gonderenBaglami() {
  const o = await oturum();
  if (!o) return { error: GIRIS_HATASI } as const;
  const erisim = await smsKullaniciErisimi(o.admin, o.userId);
  if (!erisim) return { error: "SMS modülünü yalnız müdür, müdür yardımcısı ve rehber öğretmen kullanabilir." } as const;
  const kurum = await smsKurumunuGetir(o.admin, erisim.schoolId);
  if (!kurum) return { error: "Kurum bulunamadı ya da erişime kapalı." } as const;
  if (!kurum.modulAcik) return { error: "SMS modülü kurumunuz için kapalı. Kurum yetkilinizle görüşün." } as const;
  return { error: null, admin: o.admin, erisim } as const;
}

export async function smsAlicilariGetir(sinifIdleri: string[]): Promise<{ error: string | null; ogrenciler: SmsOgrencisi[] }> {
  const b = await gonderenBaglami();
  if (b.error !== null) return { error: b.error, ogrenciler: [] };
  if (!idlerGecerliMi(sinifIdleri, 100) || sinifIdleri.length === 0) return { error: "Geçersiz sınıf seçimi.", ogrenciler: [] };
  const { data: siniflar } = await b.admin.from("classes").select("id, seviye").eq("school_id", b.erisim.schoolId).in("id", sinifIdleri);
  const izinli = ((siniflar ?? []) as { id: string; seviye: string }[])
    .filter((s) => b.erisim.sinifDuzeyleri === null || b.erisim.sinifDuzeyleri.includes(s.seviye));
  if (izinli.length !== new Set(sinifIdleri).size) return { error: "Seçilen sınıflardan bazılarına yetkiniz yok.", ogrenciler: [] };
  const alicilar = await smsAlicilariCoz(b.admin, b.erisim.schoolId, izinli.map((s) => s.id));
  return {
    error: null,
    ogrenciler: alicilar.map(smsOgrencisiyeIndir).sort((x, y) => x.ad.localeCompare(y.ad, "tr")),
  };
}

export async function smsMesajGonder(girdi: {
  sinifIdleri: string[]; ogrenciIdleri: string[] | null; icerik: string; zamanIso: string | null;
}): Promise<{ error: string | null; sonuc?: SmsGonderimSonucu }> {
  const b = await gonderenBaglami();
  if (b.error !== null) return { error: b.error };
  if (typeof girdi?.icerik !== "string" || !idlerGecerliMi(girdi.sinifIdleri, 100)) return { error: "Geçersiz gönderim isteği." };
  if (girdi.ogrenciIdleri !== null && !idlerGecerliMi(girdi.ogrenciIdleri, 5000)) return { error: "Geçersiz alıcı seçimi." };
  let zaman: Date | null = null;
  if (girdi.zamanIso !== null) {
    zaman = new Date(girdi.zamanIso);
    if (typeof girdi.zamanIso !== "string" || Number.isNaN(zaman.getTime())) return { error: "Geçerli bir gönderim zamanı girin." };
  }
  const sonuc = await smsGonder(b.admin, {
    erisim: b.erisim, icerik: girdi.icerik, sinifIdleri: girdi.sinifIdleri, ogrenciIdleri: girdi.ogrenciIdleri, zaman,
  });
  yenile();
  return sonuc.error === null ? { error: null, sonuc: sonuc.sonuc } : { error: sonuc.error };
}

export async function smsSablonKaydet(girdi: { id?: string; ad: string; icerik: string }): Promise<{ error: string | null }> {
  const b = await gonderenBaglami();
  if (b.error !== null) return { error: b.error };
  const ad = typeof girdi?.ad === "string" ? girdi.ad.trim() : "";
  const icerik = typeof girdi?.icerik === "string" ? smsIcerigiTemizle(girdi.icerik) : "";
  if (!ad || ad.length > 80) return { error: "Şablon adı 1-80 karakter olmalı." };
  if (!icerik || [...icerik].length > SMS_ICERIK_SINIRI) return { error: `Şablon içeriği 1-${SMS_ICERIK_SINIRI} karakter olmalı.` };
  if (girdi.id !== undefined) {
    if (!UUID.test(girdi.id)) return { error: "Geçersiz şablon." };
    const { data, error } = await b.admin.from("sms_sablonlari").update({ ad, icerik })
      .eq("id", girdi.id).eq("school_id", b.erisim.schoolId).select("id").maybeSingle();
    if (error) return { error: "Şablon kaydedilemedi." };
    if (!data) return { error: "Şablon bulunamadı." };
  } else {
    const { count } = await b.admin.from("sms_sablonlari").select("id", { count: "exact", head: true }).eq("school_id", b.erisim.schoolId);
    if ((count ?? 0) >= SABLON_SINIRI) return { error: `En fazla ${SABLON_SINIRI} şablon saklanabilir.` };
    const { error } = await b.admin.from("sms_sablonlari").insert({ school_id: b.erisim.schoolId, ad, icerik, olusturan_id: b.erisim.userId });
    if (error) return { error: "Şablon kaydedilemedi." };
  }
  yenile();
  return { error: null };
}

export async function smsSablonSil(id: string): Promise<{ error: string | null }> {
  const b = await gonderenBaglami();
  if (b.error !== null) return { error: b.error };
  if (typeof id !== "string" || !UUID.test(id)) return { error: "Geçersiz şablon." };
  const { error } = await b.admin.from("sms_sablonlari").delete().eq("id", id).eq("school_id", b.erisim.schoolId);
  if (error) return { error: "Şablon silinemedi." };
  yenile();
  return { error: null };
}

// -------------------------------------------------------------- bağlantı tarafı
async function yonetimBaglami(istenenOkulId?: string) {
  const o = await oturum();
  if (!o) return { error: GIRIS_HATASI } as const;
  if (istenenOkulId !== undefined && !UUID.test(istenenOkulId)) return { error: "Geçersiz kurum." } as const;
  const yetki = await smsYonetimErisimi(o.admin, o.userId, istenenOkulId);
  if (!yetki) return { error: "SMS bağlantısını yalnız kurum yöneticisi kurabilir." } as const;
  const kurum = await smsKurumunuGetir(o.admin, yetki.schoolId);
  if (!kurum) return { error: "Kurum bulunamadı ya da erişime kapalı." } as const;
  // Admin, modül kapalıyken de kurum adına hazırlık yapabilir; kurum yöneticisi yapamaz.
  if (!kurum.modulAcik && !yetki.admin) return { error: "SMS modülü kurumunuz için kapalı." } as const;
  return { error: null, admin: o.admin, yetki } as const;
}

function saglayiciHatasi(e: unknown): string {
  if (e instanceof SmsHatasi) return e.message;
  if (e instanceof Error && /şifreleme anahtarı/.test(e.message)) return "SMS şifreleme anahtarı sunucuda tanımlı değil. Sistem yöneticisine bildirin.";
  return "SMS sağlayıcısıyla bağlantı kurulamadı.";
}

export async function smsBaglantiKaydet(girdi: {
  saglayici: string; kimlik: Record<string, string>; okulId?: string;
}): Promise<{ error: string | null }> {
  const b = await yonetimBaglami(girdi?.okulId);
  if (b.error !== null) return { error: b.error };
  const bilgi = smsSaglayiciBilgisi(girdi?.saglayici);
  if (!bilgi) return { error: "Listeden bir SMS sağlayıcısı seçin." };
  const kimlik = smsKimliginiTemizle(bilgi.kod, (girdi.kimlik ?? {}) as Record<string, unknown>);
  if (!kimlik) return { error: "Tüm sağlayıcı bilgilerini doldurun." };

  let dogrulama;
  try {
    dogrulama = await smsSaglayicisi(bilgi.kod).dogrula(kimlik);
  } catch (e) {
    return { error: saglayiciHatasi(e) };
  }
  if (dogrulama.basliklar.length === 0) {
    return { error: `${bilgi.ad} hesabınızda onaylı SMS başlığı bulunamadı. Başlığı sağlayıcı panelinden tanımlatın.` };
  }

  let sifreli: string;
  try { sifreli = smsKimlikSifrele(kimlik); } catch (e) { return { error: saglayiciHatasi(e) }; }

  const { data: onceki } = await b.admin.from("kurum_sms_ayarlari").select("saglayici, secili_baslik").eq("school_id", b.yetki.schoolId).maybeSingle();
  const koru = onceki?.saglayici === bilgi.kod && dogrulama.basliklar.includes(onceki.secili_baslik as string);
  const { error } = await b.admin.from("kurum_sms_ayarlari").upsert({
    school_id: b.yetki.schoolId, saglayici: bilgi.kod, kimlik_sifreli: sifreli,
    basliklar: dogrulama.basliklar, secili_baslik: koru ? onceki!.secili_baslik : dogrulama.basliklar[0],
    bakiye: dogrulama.bakiye, son_dogrulama_at: new Date().toISOString(),
    guncelleyen_id: b.yetki.userId, updated_at: new Date().toISOString(),
  }, { onConflict: "school_id" });
  if (error) return { error: "Bağlantı kaydedilemedi." };
  await b.admin.from("admin_audit_log").insert({ actor_id: b.yetki.userId, eylem: "sms_baglanti_kaydet", detay: { school_id: b.yetki.schoolId, saglayici: bilgi.kod } });
  yenile();
  return { error: null };
}

export async function smsBaslikSec(baslik: string, okulId?: string): Promise<{ error: string | null }> {
  const b = await yonetimBaglami(okulId);
  if (b.error !== null) return { error: b.error };
  const { data } = await b.admin.from("kurum_sms_ayarlari").select("basliklar").eq("school_id", b.yetki.schoolId).maybeSingle();
  const basliklar = Array.isArray(data?.basliklar) ? (data.basliklar as string[]) : [];
  // Başlık yazılamaz: yalnız sağlayıcıdan gelen listeden seçilir.
  if (!data || typeof baslik !== "string" || !basliklar.includes(baslik)) return { error: "Başlık sağlayıcının listesinde yok." };
  const { error } = await b.admin.from("kurum_sms_ayarlari").update({ secili_baslik: baslik, updated_at: new Date().toISOString() }).eq("school_id", b.yetki.schoolId);
  if (error) return { error: "Başlık seçilemedi." };
  yenile();
  return { error: null };
}

/** Kayıtlı bilgilerle sağlayıcıyı yeniden sorgular: başlıklar ve bakiye tazelenir. */
export async function smsBaglantiYenile(okulId?: string): Promise<{ error: string | null }> {
  const b = await yonetimBaglami(okulId);
  if (b.error !== null) return { error: b.error };
  const { data } = await b.admin.from("kurum_sms_ayarlari").select("saglayici, kimlik_sifreli, secili_baslik").eq("school_id", b.yetki.schoolId).maybeSingle();
  const bilgi = smsSaglayiciBilgisi(data?.saglayici as string | undefined);
  if (!data || !bilgi) return { error: "Henüz bir SMS bağlantısı kurulmamış." };
  try {
    const d = await smsSaglayicisi(bilgi.kod).dogrula(smsKimlikCoz(data.kimlik_sifreli as string));
    if (d.basliklar.length === 0) return { error: "Hesapta onaylı SMS başlığı kalmamış." };
    const secili = d.basliklar.includes(data.secili_baslik as string) ? data.secili_baslik : d.basliklar[0];
    await b.admin.from("kurum_sms_ayarlari").update({
      basliklar: d.basliklar, secili_baslik: secili, bakiye: d.bakiye,
      son_dogrulama_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("school_id", b.yetki.schoolId);
  } catch (e) {
    return { error: saglayiciHatasi(e) };
  }
  yenile();
  return { error: null };
}

export async function smsBaglantiKaldir(okulId?: string): Promise<{ error: string | null }> {
  const b = await yonetimBaglami(okulId);
  if (b.error !== null) return { error: b.error };
  const { error } = await b.admin.from("kurum_sms_ayarlari").delete().eq("school_id", b.yetki.schoolId);
  if (error) return { error: "Bağlantı kaldırılamadı." };
  await b.admin.from("admin_audit_log").insert({ actor_id: b.yetki.userId, eylem: "sms_baglanti_kaldir", detay: { school_id: b.yetki.schoolId } });
  yenile();
  return { error: null };
}
