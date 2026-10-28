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

export async function smsGonder(admin: Istemci, g: SmsGonderimGirdisi): Promise<{ error: string } | { error: null; sonuc: SmsGonderimSonucu }> {
  const kurum = await smsKurumunuGetir(admin, g.erisim.schoolId);
  if (!kurum) return { error: "Kurum bulunamadı ya da erişime kapalı." };
  if (!kurum.modulAcik) return { error: "SMS modülü kurumunuz için kapalı. Kurum yetkilinizle görüşün." };

  const icerik = smsIcerigiTemizle(g.icerik);
  if (!icerik) return { error: "Mesaj içeriği boş olamaz." };
  if ([...icerik].length > SMS_ICERIK_SINIRI) return { error: `Mesaj en fazla ${SMS_ICERIK_SINIRI} karakter olabilir.` };

  if (g.sinifIdleri.length === 0) return { error: "En az bir sınıf seçin." };
  if (g.erisim.sinifDuzeyleri !== null && g.erisim.sinifDuzeyleri.length === 0) {
    return { error: "Size henüz sorumlu olduğunuz sınıf düzeyi atanmamış." };
  }

  const { data: ayar } = await admin.from("kurum_sms_ayarlari")
    .select("saglayici, kimlik_sifreli, basliklar, secili_baslik").eq("school_id", g.erisim.schoolId).maybeSingle();
  const bilgi = smsSaglayiciBilgisi(ayar?.saglayici as string | undefined);
  if (!ayar || !bilgi) return { error: "Kurumun SMS bağlantısı henüz kurulmamış." };
  const baslik = ayar.secili_baslik as string | null;
  if (!baslik) return { error: "SMS başlığı bulunamadı. Bağlantı ayarlarından başlıkları yenileyin." };

  if (g.zaman) {
    if (!bilgi.zamanlama) return { error: `${bilgi.ad} için ileri tarihli gönderim desteklenmiyor.` };
    const fark = g.zaman.getTime() - Date.now();
    if (!Number.isFinite(fark) || fark < ZAMANLAMA_EN_ERKEN_MS) return { error: "Zamanlama en az 5 dakika sonrası için olmalı." };
    if (fark > ZAMANLAMA_EN_GEC_MS) return { error: "Zamanlama en fazla 30 gün sonrası için yapılabilir." };
  }

  // Sınıflar kişinin kapsamıyla ve kurumla kesiştirilir.
  const { data: sinifSatirlari } = await admin.from("classes").select("id, seviye, sube").eq("school_id", g.erisim.schoolId).in("id", g.sinifIdleri);
  const izinli = ((sinifSatirlari ?? []) as { id: string; seviye: string; sube: string }[])
    .filter((s) => smsSeviyeKapsamdaMi(g.erisim.sinifDuzeyleri, s.seviye))
    .sort(sinifSiraKarsilastir);
  if (izinli.length !== new Set(g.sinifIdleri).size) return { error: "Seçilen sınıflardan bazılarına SMS gönderme yetkiniz yok." };

  const saatOnce = new Date(Date.now() - 3600_000).toISOString();
  const [{ count: saatlik }, { data: sonGonderim }] = await Promise.all([
    admin.from("sms_gonderimleri").select("id", { count: "exact", head: true }).eq("gonderen_id", g.erisim.userId).gte("created_at", saatOnce),
    admin.from("sms_gonderimleri").select("icerik, hedef_ozeti, created_at").eq("gonderen_id", g.erisim.userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if ((saatlik ?? 0) >= SMS_SAATLIK_GONDERIM) return { error: "Saatlik gönderim sınırına ulaştınız. Biraz sonra tekrar deneyin." };

  const ozet = hedefOzeti(izinli, g.ogrenciIdleri !== null);
  // Çift tıklama/yenileme: aynı içerik aynı hedefe son dakika içinde gitmişse reddet.
  if (sonGonderim && sonGonderim.icerik === icerik && sonGonderim.hedef_ozeti === ozet
    && Date.now() - new Date(sonGonderim.created_at as string).getTime() < 60_000) {
    return { error: "Bu mesaj az önce zaten gönderildi." };
  }

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
  if (numaralar.length > SMS_ENCOK_ALICI) return { error: `Tek seferde en çok ${SMS_ENCOK_ALICI} alıcıya gönderilebilir (şu an ${numaralar.length}). Sınıf seçimini daraltın.` };

  let kimlik: Record<string, string>;
  try { kimlik = smsKimlikCoz(ayar.kimlik_sifreli as string); } catch {
    return { error: "SMS bağlantısı okunamadı; bağlantı bilgilerini yeniden kaydedin." };
  }

  const saglayici = smsSaglayicisi(bilgi.kod);
  const isIdleri: string[] = [];
  let hata: string | null = null;
  let gonderilen = 0;
  for (let i = 0; i < numaralar.length; i += SMS_PARCA_BOYUTU) {
    const parca = numaralar.slice(i, i + SMS_PARCA_BOYUTU);
    try {
      const s = await saglayici.gonder(kimlik, { baslik, mesaj: icerik, numaralar: parca, zaman: g.zaman });
      if (s.isId) isIdleri.push(s.isId);
      gonderilen += parca.length;
    } catch (e) {
      hata = e instanceof SmsHatasi ? e.message : "Beklenmeyen bir hata oluştu.";
      break;
    }
  }

  const durum = hata === null ? (g.zaman ? "zamanlandi" : "gonderildi") : gonderilen > 0 ? "kismen" : "hata";
  const { error: kayitHatasi } = await admin.from("sms_gonderimleri").insert({
    school_id: g.erisim.schoolId, gonderen_id: g.erisim.userId, saglayici: bilgi.kod, baslik, icerik,
    alici_turu: "veli", hedef_ozeti: ozet, alici_sayisi: gonderilen, gecersiz_sayisi: gecersiz,
    durum, zamanlanmis_at: g.zaman ? g.zaman.toISOString() : null,
    saglayici_is_id: isIdleri.join(",").slice(0, 200) || null, hata,
  });
  // Gönderim sağlayıcıda yapılmış olabilir; geçmiş yazılamadıysa sessiz geçmeyiz.
  if (kayitHatasi) console.error("SMS geçmişi yazılamadı:", kayitHatasi.message);

  if (hata !== null) {
    return { error: gonderilen > 0 ? `${gonderilen} alıcıya gönderildi, kalanı gönderilemedi: ${hata}` : hata };
  }
  return { error: null, sonuc: { durum: g.zaman ? "zamanlandi" : "gonderildi", aliciSayisi: gonderilen, gecersizSayisi: gecersiz, tekrarSayisi: tekrar } };
}
