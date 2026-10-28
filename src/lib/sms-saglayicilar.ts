// Yalnız sunucuda: kurumun kendi SMS sağlayıcısına gerçek istekler.
// Sefu SMS paketi satmaz; kurum kendi hesabının bilgilerini girer, başlıklar
// ve (varsa) bakiye sağlayıcıdan çekilir, gönderim kurumun paketinden düşer.
//
// DOĞRULAMA DURUMU (28.10.2026): Verimor uç noktaları ve alanları resmi
// kullanım kılavuzundan (github.com/verimor/SMS-API) doğrulandı. Netgsm ve
// İleti Merkezi, bu oturumdan sağlayıcı belgelerine erişilemediği için
// yayımlanmış istemci kitaplıklarına ve bilinen belge biçimine göre yazıldı;
// gerçek bir hesapla bir kez denenmeden "çalışıyor" sayılmamalı.
import { SMS_SAGLAYICILARI, smsSaglayiciBilgisi, type SmsSaglayiciKodu } from "@/lib/sms-saglayici-bilgi";
import { telefonOnHane } from "@/lib/sms-telefon";

export type SmsKimlik = Record<string, string>;

/** Sağlayıcı kaynaklı, kullanıcıya gösterilebilir hata (kimlik bilgisi içermez). */
export class SmsHatasi extends Error {
  constructor(mesaj: string, readonly kalici = true) {
    super(mesaj);
    this.name = "SmsHatasi";
  }
}

export interface SmsDogrulamaSonucu {
  basliklar: string[];
  /** Okunabilir kalan paket bilgisi; sağlayıcı desteklemiyorsa null. */
  bakiye: string | null;
}

export interface SmsGonderimIstegi {
  baslik: string;
  mesaj: string;
  /** "905XXXXXXXXX" biçiminde, tekrarsız. */
  numaralar: string[];
  /** Verilirse sağlayıcının kendi zamanlayıcısıyla ileri tarihe bırakılır. */
  zaman?: Date | null;
}

export interface SmsGonderimSonucu {
  isId: string | null;
}

export interface SmsSaglayici {
  dogrula(kimlik: SmsKimlik): Promise<SmsDogrulamaSonucu>;
  gonder(kimlik: SmsKimlik, istek: SmsGonderimIstegi): Promise<SmsGonderimSonucu>;
}

/** Bir sağlayıcı isteğindeki en çok numara (büyük listeler parçalanır). */
export const SMS_PARCA_BOYUTU = 500;
const ZAMAN_ASIMI_MS = 20_000;

async function istek(url: string, init: RequestInit & { json?: unknown }): Promise<{ durum: number; metin: string }> {
  const { json, headers, ...kalan } = init;
  try {
    const yanit = await fetch(url, {
      ...kalan,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), Accept: "application/json, text/plain, */*", ...headers },
      body: json !== undefined ? JSON.stringify(json) : kalan.body,
      signal: AbortSignal.timeout(ZAMAN_ASIMI_MS),
      cache: "no-store",
    });
    return { durum: yanit.status, metin: await yanit.text() };
  } catch {
    // Ağ/zaman aşımı ayrıntısı URL ya da kimlik sızdırabilir; genel mesaj.
    throw new SmsHatasi("SMS sağlayıcısına ulaşılamadı. Biraz sonra tekrar deneyin.", false);
  }
}

function jsonCoz(metin: string): unknown {
  try { return JSON.parse(metin); } catch { return null; }
}

function alan(kimlik: SmsKimlik, ad: string): string {
  const v = (kimlik[ad] ?? "").trim();
  if (!v) throw new SmsHatasi("Sağlayıcı bilgileri eksik.");
  return v;
}

/** İstanbul saatiyle bileşenler (sunucu saat diliminden bağımsız). */
function istanbulParcalari(zaman: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(zaman).map((x) => [x.type, x.value]));
  return { y: p.year, mo: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second };
}

function benzersizBasliklar(liste: unknown): string[] {
  if (!Array.isArray(liste)) return [];
  return [...new Set(liste.map((b) => (typeof b === "string" ? b.trim() : "")).filter(Boolean))];
}

// ---------------------------------------------------------------- Verimor
const VERIMOR = "https://sms.verimor.com.tr/v2";

const verimor: SmsSaglayici = {
  async dogrula(kimlik) {
    const kullanici = alan(kimlik, "kullanici");
    const sifre = alan(kimlik, "sifre");
    const sorgu = new URLSearchParams({ username: kullanici, password: sifre }).toString();
    const baslik = await istek(`${VERIMOR}/headers?${sorgu}`, { method: "GET" });
    if (baslik.durum === 401) {
      throw new SmsHatasi(/IP/i.test(baslik.metin)
        ? "Verimor hesabınızda izinli IP tanımlı; Sefu sunucusunun adresi bu listede değil. Panelden IP kısıtını kaldırın."
        : "Verimor kullanıcı adı veya şifresi hatalı.");
    }
    if (baslik.durum !== 200) throw new SmsHatasi("Verimor başlıkları alınamadı.", baslik.durum >= 500);
    const basliklar = benzersizBasliklar(jsonCoz(baslik.metin));
    let bakiye: string | null = null;
    const b = await istek(`${VERIMOR}/balance?${sorgu}`, { method: "GET" }).catch(() => null);
    if (b?.durum === 200 && /^\s*\d+(?:[.,]\d+)?\s*$/.test(b.metin)) bakiye = `${b.metin.trim()} kredi`;
    return { basliklar, bakiye };
  },

  async gonder(kimlik, i) {
    const govde: Record<string, unknown> = {
      username: alan(kimlik, "kullanici"),
      password: alan(kimlik, "sifre"),
      source_addr: i.baslik,
      messages: [{ msg: i.mesaj, dest: i.numaralar.join(",") }],
    };
    if (i.zaman) {
      const t = istanbulParcalari(i.zaman);
      govde.send_at = `${t.y}-${t.mo}-${t.d} ${t.h}:${t.mi}:${t.s}`;
    }
    const yanit = await istek(`${VERIMOR}/send.json`, { method: "POST", json: govde });
    if (yanit.durum === 200) return { isId: yanit.metin.trim().replace(/"/g, "").slice(0, 60) || null };
    if (yanit.durum === 401) throw new SmsHatasi("Verimor kullanıcı adı veya şifresi hatalı.");
    if (yanit.durum === 429) throw new SmsHatasi("Verimor çok sık istek sınırına takıldı; biraz sonra deneyin.", false);
    const kod = yanit.metin.trim().replace(/"/g, "");
    throw new SmsHatasi(VERIMOR_HATALARI[kod] ?? "Verimor mesajı kabul etmedi.", yanit.durum >= 500);
  },
};

const VERIMOR_HATALARI: Record<string, string> = {
  INVALID_SOURCE_ADDRESS: "Başlık Verimor tarafından kabul edilmedi.",
  MISSING_MESSAGE: "Mesaj içeriği boş.",
  MESSAGE_TOO_LONG: "Mesaj çok uzun.",
  INVALID_DELIVERY_TIME: "Zamanlama tarihi geçersiz ya da geçmişte.",
  INVALID_DESTINATION_ADDRESS: "Geçersiz telefon numarası içeren alıcı var.",
  MUKERRER_RAPORLAMA: "Aynı SMS son 24 saat içinde zaten gönderilmiş.",
  INSUFFICIENT_CREDITS: "Verimor paketinizde yeterli kredi yok.",
  FORBIDDEN_MESSAGE: "Mesaj Verimor tarafından yasaklı ifade nedeniyle reddedildi.",
  NUMERIC_SOURCE_ADDRESS_NOT_ALLOWED: "Sayısal başlıklar API üzerinden kullanılamaz.",
  MESSAGE_COUNT_LIMIT_EXCEEDED: "Tek istekte izin verilen mesaj sayısı aşıldı.",
};

// ----------------------------------------------------------------- Netgsm
const NETGSM = "https://api.netgsm.com.tr/sms/rest/v2";

function netgsmYetki(kimlik: SmsKimlik) {
  const kullanici = alan(kimlik, "kullanici");
  const sifre = alan(kimlik, "sifre");
  return { Authorization: `Basic ${Buffer.from(`${kullanici}:${sifre}`).toString("base64")}` };
}

const NETGSM_HATALARI: Record<string, string> = {
  "20": "Mesaj metni hatalı ya da çok uzun.",
  "30": "Netgsm kullanıcı kodu/şifresi hatalı veya API erişim yetkisi yok.",
  "40": "Başlık Netgsm hesabınızda tanımlı değil.",
  "41": "Başlık Netgsm hesabınızda tanımlı değil.",
  "50": "Netgsm İYS kontrolü bu gönderime izin vermedi.",
  "51": "Netgsm İYS kontrolü bu gönderime izin vermedi.",
  "70": "Netgsm istek parametreleri hatalı.",
  "80": "Netgsm gönderim sınırına ulaşıldı; biraz sonra deneyin.",
  "85": "Netgsm tekrar eden gönderimi engelledi (aynı numaraya kısa sürede aynı mesaj).",
};

const netgsm: SmsSaglayici = {
  async dogrula(kimlik) {
    const yetki = netgsmYetki(kimlik);
    const yanit = await istek(`${NETGSM}/msgheader`, { method: "GET", headers: yetki });
    if (yanit.durum === 401 || yanit.durum === 403) throw new SmsHatasi(NETGSM_HATALARI["30"]);
    const veri = jsonCoz(yanit.metin) as { code?: string | number; msgheaders?: unknown } | null;
    if (yanit.durum !== 200 || !veri) throw new SmsHatasi("Netgsm başlıkları alınamadı.", yanit.durum >= 500);
    const kod = String(veri.code ?? "");
    if (kod && kod !== "00") throw new SmsHatasi(NETGSM_HATALARI[kod] ?? "Netgsm başlıkları alınamadı.");
    return { basliklar: benzersizBasliklar(veri.msgheaders), bakiye: null };
  },

  async gonder(kimlik, i) {
    const yetki = netgsmYetki(kimlik);
    const govde: Record<string, unknown> = {
      msgheader: i.baslik,
      messages: i.numaralar.map((n) => ({ msg: i.mesaj, no: telefonOnHane(n) })),
      encoding: "TR",
      // Okul/kurum bilgilendirmesi: ticari (İYS'li) gönderim değil.
      iysfilter: "0",
    };
    if (i.zaman) {
      const t = istanbulParcalari(i.zaman);
      govde.startdate = `${t.d}${t.mo}${t.y}${t.h}${t.mi}`;
    }
    const yanit = await istek(`${NETGSM}/send`, { method: "POST", headers: yetki, json: govde });
    const veri = jsonCoz(yanit.metin) as { code?: string | number; jobid?: string | number } | null;
    if (yanit.durum === 401 || yanit.durum === 403) throw new SmsHatasi(NETGSM_HATALARI["30"]);
    const kod = String(veri?.code ?? "");
    if (yanit.durum === 200 && kod === "00") return { isId: veri?.jobid != null ? String(veri.jobid).slice(0, 60) : null };
    throw new SmsHatasi(NETGSM_HATALARI[kod] ?? "Netgsm mesajı kabul etmedi.", yanit.durum >= 500 || kod === "100");
  },
};

// ----------------------------------------------------------- İleti Merkezi
const ILETIMERKEZI = "https://api.iletimerkezi.com/v1";

function iletiYetki(kimlik: SmsKimlik) {
  return { key: alan(kimlik, "anahtar"), hash: alan(kimlik, "hash") };
}

function iletiDurumu(veri: unknown): { kod: number; mesaj: string } | null {
  const durum = (veri as { response?: { status?: { code?: string | number; message?: string } } } | null)?.response?.status;
  if (!durum) return null;
  return { kod: Number(durum.code), mesaj: String(durum.message ?? "") };
}

function iletiHata(d: { kod: number; mesaj: string } | null, durumKodu: number): SmsHatasi {
  if (durumKodu === 401 || d?.kod === 401) return new SmsHatasi("İleti Merkezi API anahtarı/hash hatalı ya da panelde API erişimine izin verilmemiş.");
  if (d?.kod === 450) return new SmsHatasi("Başlık İleti Merkezi hesabınızda tanımlı değil.");
  if (d?.kod === 454) return new SmsHatasi("Mesaj içeriği boş.");
  if (d?.kod === 455) return new SmsHatasi("Alıcı numarası eksik.");
  if (d?.kod === 456) return new SmsHatasi("Geçersiz telefon numarası içeren alıcı var.");
  if (d?.kod === 457) return new SmsHatasi("Zamanlama tarihi geçersiz.");
  if (d?.kod === 400) return new SmsHatasi("İleti Merkezi isteği geçersiz bulundu.");
  return new SmsHatasi("İleti Merkezi isteği kabul etmedi.", durumKodu >= 500);
}

const iletimerkezi: SmsSaglayici = {
  async dogrula(kimlik) {
    const authentication = iletiYetki(kimlik);
    const govde = { request: { authentication } };
    const yanit = await istek(`${ILETIMERKEZI}/get-sender/json`, { method: "POST", json: govde });
    const veri = jsonCoz(yanit.metin);
    const durum = iletiDurumu(veri);
    if (yanit.durum !== 200 || durum?.kod !== 200) throw iletiHata(durum, yanit.durum);
    const gonderen = (veri as { response?: { senders?: { sender?: unknown } } }).response?.senders?.sender;
    const basliklar = benzersizBasliklar(Array.isArray(gonderen) ? gonderen : gonderen ? [gonderen] : []);

    let bakiye: string | null = null;
    const b = await istek(`${ILETIMERKEZI}/get-balance/json`, { method: "POST", json: govde }).catch(() => null);
    const bv = b ? (jsonCoz(b.metin) as { response?: { balance?: { sms?: string | number; amount?: string | number } } } | null) : null;
    const sms = bv?.response?.balance?.sms;
    if (sms !== undefined && sms !== null && sms !== "") bakiye = `${sms} SMS`;
    else if (bv?.response?.balance?.amount !== undefined) bakiye = `${bv.response.balance.amount} TL`;
    return { basliklar, bakiye };
  },

  async gonder(kimlik, i) {
    if (i.zaman) throw new SmsHatasi("İleti Merkezi için ileri tarihli gönderim henüz desteklenmiyor.");
    const govde = {
      request: {
        authentication: iletiYetki(kimlik),
        order: {
          sender: i.baslik,
          message: { text: i.mesaj, receipents: { number: i.numaralar } },
        },
      },
    };
    const yanit = await istek(`${ILETIMERKEZI}/send-sms/json`, { method: "POST", json: govde });
    const veri = jsonCoz(yanit.metin);
    const durum = iletiDurumu(veri);
    if (yanit.durum === 200 && durum?.kod === 200) {
      const id = (veri as { response?: { order?: { id?: string | number } } }).response?.order?.id;
      return { isId: id != null ? String(id).slice(0, 60) : null };
    }
    throw iletiHata(durum, yanit.durum);
  },
};

// --------------------------------------------------------------------- ortak
const KAYIT: Record<SmsSaglayiciKodu, SmsSaglayici> = { netgsm, iletimerkezi, verimor };

export function smsSaglayicisi(kod: string): SmsSaglayici {
  const bilgi = smsSaglayiciBilgisi(kod);
  if (!bilgi) throw new SmsHatasi("Bilinmeyen SMS sağlayıcısı.");
  return KAYIT[bilgi.kod];
}

/** Formdan gelen kimliği yalnız tanımlı alanlara indirger ve doğrular. */
export function smsKimliginiTemizle(kod: string, ham: Record<string, unknown>): SmsKimlik | null {
  const bilgi = SMS_SAGLAYICILARI.find((s) => s.kod === kod);
  if (!bilgi) return null;
  const kimlik: SmsKimlik = {};
  for (const a of bilgi.alanlar) {
    const v = typeof ham[a.anahtar] === "string" ? (ham[a.anahtar] as string).trim() : "";
    if (!v || v.length > 200) return null;
    kimlik[a.anahtar] = v;
  }
  return kimlik;
}
