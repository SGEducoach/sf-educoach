// SMS uzunluğu tahmini. Kesin parça sayısını sağlayıcı belirler (Türkçe
// karakter kodlaması sağlayıcıya göre değişir); ekranda "yaklaşık" gösterilir.

export const SMS_ICERIK_SINIRI = 600;

// GSM 03.38 temel + genişletme tablosu (genişletme karakterleri 2 yer tutar).
const GSM_TEMEL = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_GENISLETME = "^{}\\[~]|€\f";

export interface SmsUzunlugu {
  karakter: number;
  /** true: Türkçe ş, ğ, ı gibi GSM dışı karakter var, Unicode (kısa parça) sayılır. */
  unicode: boolean;
  parca: number;
  parcaBasinaKarakter: number;
}

export function smsUzunlugu(metin: string): SmsUzunlugu {
  let birim = 0;
  let unicode = false;
  for (const k of metin) {
    if (GSM_TEMEL.includes(k)) birim += 1;
    else if (GSM_GENISLETME.includes(k)) birim += 2;
    else { unicode = true; break; }
  }
  if (unicode) {
    const karakter = [...metin].length;
    const tek = karakter <= 70;
    return { karakter, unicode: true, parca: karakter === 0 ? 0 : tek ? 1 : Math.ceil(karakter / 67), parcaBasinaKarakter: tek ? 70 : 67 };
  }
  const tek = birim <= 160;
  return { karakter: birim, unicode: false, parca: birim === 0 ? 0 : tek ? 1 : Math.ceil(birim / 153), parcaBasinaKarakter: tek ? 160 : 153 };
}

/** Kullanıcı içeriğini temizler: baş/son boşluk, kontrol karakterleri. */
export function smsIcerigiTemizle(metin: string): string {
  return metin.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n/g, "\n").trim();
}
