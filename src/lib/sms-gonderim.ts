// Yalnız sunucuda: gönderim çekirdeği. Tüm denetimler (kurum modülü açık mı,
// kişi kapsamı, başlık, hız sınırı, zamanlama) burada tek yerde yapılır; sunucu
// işlemi yalnız çağırır. İstemciden gelen hiçbir alan güvenilmez: sınıflar ve
// öğrenciler kişinin kapsamıyla yeniden kesiştirilir, başlık veritabanından okunur.
import type { SupabaseClient } from "@supabase/supabase-js";
import { smsKimlikCoz } from "@/lib/sms-kimlik-sifre";
import { SMS_PARCA_BOYUTU, SmsHatasi, smsSaglayicisi } from "@/lib/sms-saglayicilar";
import { smsSaglayiciBilgisi } from "@/lib/sms-saglayici-bilgi";
import { smsKurumunuGetir, smsSeviyeKapsamdaMi, type SmsErisimi } from "@/lib/sms-erisim";
import { SMS_ICERIK_SINIRI, smsIcerigiTemizle } from "@/lib/sms-mesaj";
import { smsAlicilariCoz } from "@/lib/sms-veri";
import { telefonlariHazirla } from "@/lib/sms-telefon";
import { sinifSiraKarsilastir } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Istemci = SupabaseClient<any, "public", any>;

/** Tek gönderimde en çok benzersiz alıcı. */
export const SMS_ENCOK_ALICI = 1000;
/** Kişi başına saatlik gönderim sayısı (yanlışlıkla/kötüye kullanımı sınırlar). */
export const SMS_SAATLIK_GONDERIM = 20;
const ZAMANLAMA_EN_ERKEN_MS = 5 * 60_000;
const ZAMANLAMA_EN_GEC_MS = 30 * 24 * 3600_000;

export interface SmsGonderimGirdisi {
  erisim: SmsErisimi;
  icerik: string;
  sinifIdleri: string[];
  /** Verilirse yalnız bu öğrenciler (sınıf seçimiyle kesişen). */
  ogrenciIdleri: string[] | null;
  zaman: Date | null;
}

export interface SmsGonderimSonucu {
  durum: "gonderildi" | "zamanlandi";
  aliciSayisi: number;
  gecersizSayisi: number;
  tekrarSayisi: number;
}

function hedefOzeti(siniflar: { seviye: string; sube: string }[], ogrenciSecimli: boolean): string {
  const adlar = siniflar.map((s) => `${s.seviye}-${s.sube}`);
  const metin = adlar.length > 6 ? `${adlar.slice(0, 6).join(", ")} +${adlar.length - 6} sınıf` : adlar.join(", ");
  return `${ogrenciSecimli ? "Seçili veliler: " : "Veliler: "}${metin}`.slice(0, 300);
}

type SmsAyarSatiri = { saglayici: string; kimlik_sifreli: string; secili_baslik: string | null };

interface SmsHazirligi {
  schoolId: string;
  icerik: string;
  baslik: string;
  ayar: SmsAyarSatiri;
  bilgi: NonNullable<ReturnType<typeof smsSaglayiciBilgisi>>;
  zaman: Date | null;
}

// Ortak ön denetim (veli ve mezun gönderimi): kurum modülü, içerik, bağlantı,
// başlık ve zamanlama. `alicidanOnce` içerikten sonra, bağlantıdan önce
// çağıranın kendi seçim denetimini yapar.
async function smsHazirla(
  admin: Istemci, schoolId: string, hamIcerik: string, zaman: Date | null, alicidanOnce: () => string | null,
): Promise<{ error: string } | { error: null; h: SmsHazirligi }> {
  const kurum = await smsKurumunuGetir(admin, schoolId);
  if (!kurum) return { error: "Kurum bulunamadı ya da erişime kapalı." };
  if (!kurum.modulAcik) return { error: "SMS modülü kurumunuz için kapalı. Kurum yetkilinizle görüşün." };

  const icerik = smsIcerigiTemizle(hamIcerik);
  if (!icerik) return { error: "Mesaj içeriği boş olamaz." };
  if ([...icerik].length > SMS_ICERIK_SINIRI) return { error: `Mesaj en fazla ${SMS_ICERIK_SINIRI} karakter olabilir.` };
  const secimHatasi = alicidanOnce();
  if (secimHatasi) return { error: secimHatasi };

  const { data: ayar } = await admin.from("kurum_sms_ayarlari")
    .select("saglayici, kimlik_sifreli, basliklar, secili_baslik").eq("school_id", schoolId).maybeSingle();
  const bilgi = smsSaglayiciBilgisi(ayar?.saglayici as string | undefined);
  if (!ayar || !bilgi) return { error: "Kurumun SMS bağlantısı henüz kurulmamış." };
  const baslik = ayar.secili_baslik as string | null;
  if (!baslik) return { error: "SMS başlığı bulunamadı. Bağlantı ayarlarından başlıkları yenileyin." };

  if (zaman) {
    if (!bilgi.zamanlama) return { error: `${bilgi.ad} için ileri tarihli gönderim desteklenmiyor.` };
    const fark = zaman.getTime() - Date.now();
    if (!Number.isFinite(fark) || fark < ZAMANLAMA_EN_ERKEN_MS) return { error: "Zamanlama en az 5 dakika sonrası için olmalı." };
    if (fark > ZAMANLAMA_EN_GEC_MS) return { error: "Zamanlama en fazla 30 gün sonrası için yapılabilir." };
  }
  return { error: null, h: { schoolId, icerik, baslik, ayar: ayar as SmsAyarSatiri, bilgi, zaman } };
}

// Hazırlanmış mesajı numaralara gönderir: hız sınırı, yinelenen gönderim,
// alıcı sınırı, sağlayıcıya parça parça gönderim ve geçmiş kaydı (numarasız).
async function smsNumaralaraGonder(admin: Istemci, h: SmsHazirligi, g: {
  userId: string; numaralar: string[]; gecersiz: number; tekrar: number; aliciTuru: "veli" | "mezun"; hedefOzeti: string;
}): Promise<{ error: string } | { error: null; sonuc: SmsGonderimSonucu }> {
  const saatOnce = new Date(Date.now() - 3600_000).toISOString();
  const [{ count: saatlik }, { data: sonGonderim }] = await Promise.all([
    admin.from("sms_gonderimleri").select("id", { count: "exact", head: true }).eq("gonderen_id", g.userId).gte("created_at", saatOnce),
    admin.from("sms_gonderimleri").select("icerik, hedef_ozeti, created_at").eq("gonderen_id", g.userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if ((saatlik ?? 0) >= SMS_SAATLIK_GONDERIM) return { error: "Saatlik gönderim sınırına ulaştınız. Biraz sonra tekrar deneyin." };
  // Çift tıklama/yenileme: aynı içerik aynı hedefe son dakika içinde gitmişse reddet.
  if (sonGonderim && sonGonderim.icerik === h.icerik && sonGonderim.hedef_ozeti === g.hedefOzeti
    && Date.now() - new Date(sonGonderim.created_at as string).getTime() < 60_000) {
    return { error: "Bu mesaj az önce zaten gönderildi." };
  }
  if (g.numaralar.length > SMS_ENCOK_ALICI) return { error: `Tek seferde en çok ${SMS_ENCOK_ALICI} alıcıya gönderilebilir (şu an ${g.numaralar.length}). Seçimi daraltın.` };

  let kimlik: Record<string, string>;
  try { kimlik = smsKimlikCoz(h.ayar.kimlik_sifreli); } catch {
    return { error: "SMS bağlantısı okunamadı; bağlantı bilgilerini yeniden kaydedin." };
  }

  const saglayici = smsSaglayicisi(h.bilgi.kod);
  const isIdleri: string[] = [];
  let hata: string | null = null;
  let gonderilen = 0;
  for (let i = 0; i < g.numaralar.length; i += SMS_PARCA_BOYUTU) {
    const parca = g.numaralar.slice(i, i + SMS_PARCA_BOYUTU);
    try {
      const s = await saglayici.gonder(kimlik, { baslik: h.baslik, mesaj: h.icerik, numaralar: parca, zaman: h.zaman });
      if (s.isId) isIdleri.push(s.isId);
      gonderilen += parca.length;
    } catch (e) {
      hata = e instanceof SmsHatasi ? e.message : "Beklenmeyen bir hata oluştu.";
      break;
    }
  }

  const durum = hata === null ? (h.zaman ? "zamanlandi" : "gonderildi") : gonderilen > 0 ? "kismen" : "hata";
  const { error: kayitHatasi } = await admin.from("sms_gonderimleri").insert({
    school_id: h.schoolId, gonderen_id: g.userId, saglayici: h.bilgi.kod, baslik: h.baslik, icerik: h.icerik,
    alici_turu: g.aliciTuru, hedef_ozeti: g.hedefOzeti, alici_sayisi: gonderilen, gecersiz_sayisi: g.gecersiz,
    durum, zamanlanmis_at: h.zaman ? h.zaman.toISOString() : null,
    saglayici_is_id: isIdleri.join(",").slice(0, 200) || null, hata,
  });
  // Gönderim sağlayıcıda yapılmış olabilir; geçmiş yazılamadıysa sessiz geçmeyiz.
  if (kayitHatasi) console.error("SMS geçmişi yazılamadı:", kayitHatasi.message);

  if (hata !== null) {
    return { error: gonderilen > 0 ? `${gonderilen} alıcıya gönderildi, kalanı gönderilemedi: ${hata}` : hata };
  }
  return { error: null, sonuc: { durum: h.zaman ? "zamanlandi" : "gonderildi", aliciSayisi: gonderilen, gecersizSayisi: g.gecersiz, tekrarSayisi: g.tekrar } };
}

export async function smsGonder(admin: Istemci, g: SmsGonderimGirdisi): Promise<{ error: string } | { error: null; sonuc: SmsGonderimSonucu }> {
  const hazirlik = await smsHazirla(admin, g.erisim.schoolId, g.icerik, g.zaman, () => {
    if (g.sinifIdleri.length === 0) return "En az bir sınıf seçin.";
    if (g.erisim.sinifDuzeyleri !== null && g.erisim.sinifDuzeyleri.length === 0) return "Size henüz sorumlu olduğunuz sınıf düzeyi atanmamış.";
    return null;
  });
  if (hazirlik.error !== null) return hazirlik;

  // Sınıflar kişinin kapsamıyla ve kurumla kesiştirilir.
  const { data: sinifSatirlari } = await admin.from("classes").select("id, seviye, sube").eq("school_id", g.erisim.schoolId).in("id", g.sinifIdleri);
  const izinli = ((sinifSatirlari ?? []) as { id: string; seviye: string; sube: string }[])
    .filter((s) => smsSeviyeKapsamdaMi(g.erisim.sinifDuzeyleri, s.seviye))
    .sort(sinifSiraKarsilastir);
  if (izinli.length !== new Set(g.sinifIdleri).size) return { error: "Seçilen sınıflardan bazılarına SMS gönderme yetkiniz yok." };

  let ogrenciler = await smsAlicilariCoz(admin, g.erisim.schoolId, izinli.map((s) => s.id));
  if (g.ogrenciIdleri !== null) {
    const secili = new Set(g.ogrenciIdleri);
    ogrenciler = ogrenciler.filter((o) => secili.has(o.id));
  }
  if (ogrenciler.length === 0) return { error: "Seçimde öğrenci yok." };

  const goruldu = new Set<string>();
  let gecersiz = 0;
  let tekrar = 0;
  for (const o of ogrenciler) {
    if (!o.telefon) { gecersiz++; continue; }
    if (goruldu.has(o.telefon)) { tekrar++; continue; }
    goruldu.add(o.telefon);
  }
  const numaralar = [...goruldu];
  if (numaralar.length === 0) return { error: "Seçilen öğrencilerin hiçbirinde geçerli bir veli telefonu yok." };

  return smsNumaralaraGonder(admin, hazirlik.h, {
    userId: g.erisim.userId, numaralar, gecersiz, tekrar, aliciTuru: "veli", hedefOzeti: hedefOzeti(izinli, g.ogrenciIdleri !== null),
  });
}

export interface SmsMezunGirdisi {
  schoolId: string;
  userId: string;
  icerik: string;
  /** Seçilen mezunların kayıtlı telefonları (905XXXXXXXXX ya da null). */
  telefonlar: (string | null)[];
  hedefOzeti: string;
  zaman: Date | null;
}

// Mezun Takip modülünden gönderim (migration 0184): alıcılar sınıf değil,
// çağıranın yetkisiyle süzülmüş mezun kayıtları.
export async function smsMezunlaraGonder(admin: Istemci, g: SmsMezunGirdisi): Promise<{ error: string } | { error: null; sonuc: SmsGonderimSonucu }> {
  const hazirlik = await smsHazirla(admin, g.schoolId, g.icerik, g.zaman, () => (g.telefonlar.length === 0 ? "En az bir mezun seçin." : null));
  if (hazirlik.error !== null) return hazirlik;
  const { numaralar, gecersiz, tekrar } = telefonlariHazirla(g.telefonlar);
  if (numaralar.length === 0) return { error: "Seçilen mezunların hiçbirinde geçerli bir telefon yok." };
  return smsNumaralaraGonder(admin, hazirlik.h, {
    userId: g.userId, numaralar, gecersiz, tekrar, aliciTuru: "mezun", hedefOzeti: g.hedefOzeti.slice(0, 300),
  });
}
