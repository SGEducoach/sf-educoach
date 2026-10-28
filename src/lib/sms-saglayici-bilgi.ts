// SMS sağlayıcılarının İSTEMCİYE de gösterilebilen tanımı (alan adları,
// yetenekler). Ağ çağrıları sunucu tarafında: bkz. sms-saglayicilar.ts.
// Kimlik bilgisini ne kurum yöneticisi ne Sefu satın alır/sağlar: kurum kendi
// sağlayıcısını seçer, bilgilerini girer, başlıkları sağlayıcıdan çekeriz.

export const SMS_SAGLAYICI_KODLARI = ["netgsm", "iletimerkezi", "verimor"] as const;
export type SmsSaglayiciKodu = (typeof SMS_SAGLAYICI_KODLARI)[number];

export interface SmsKimlikAlani {
  anahtar: string;
  etiket: string;
  /** Şifre gibi alanlar: ekranda gizli girilir, bir daha gösterilmez. */
  gizli: boolean;
  ipucu?: string;
}

export interface SmsSaglayiciBilgisi {
  kod: SmsSaglayiciKodu;
  ad: string;
  alanlar: SmsKimlikAlani[];
  /** İleri tarihli gönderim sağlayıcının kendi zamanlayıcısıyla yapılır. */
  zamanlama: boolean;
  /** Kalan paket bakiyesi sorgulanabiliyor mu. */
  bakiye: boolean;
  not?: string;
}

export const SMS_SAGLAYICILARI: SmsSaglayiciBilgisi[] = [
  {
    kod: "netgsm", ad: "Netgsm", zamanlama: true, bakiye: false,
    alanlar: [
      { anahtar: "kullanici", etiket: "Kullanıcı kodu", gizli: false, ipucu: "Netgsm abone numarası (850...)" },
      { anahtar: "sifre", etiket: "API şifresi", gizli: true },
    ],
    not: "Netgsm panelinde API kullanıcısı için gerekiyorsa IP kısıtını kaldırın.",
  },
  {
    kod: "iletimerkezi", ad: "İleti Merkezi", zamanlama: false, bakiye: true,
    alanlar: [
      { anahtar: "anahtar", etiket: "API anahtarı (key)", gizli: false },
      { anahtar: "hash", etiket: "API hash", gizli: true, ipucu: "Panel > Ayarlar > Güvenlik > API Erişimi. Paneldeki değeri olduğu gibi girin." },
    ],
    not: "Panelde “API erişimine izin ver” açık olmalıdır.",
  },
  {
    kod: "verimor", ad: "Verimor", zamanlama: true, bakiye: true,
    alanlar: [
      { anahtar: "kullanici", etiket: "Kullanıcı adı", gizli: false, ipucu: "12 haneli hesap numarası (90850...)" },
      { anahtar: "sifre", etiket: "API şifresi", gizli: true, ipucu: "Panel > SMS ayarlarında belirlenen API şifresi" },
    ],
    not: "Verimor hesabınızda izinli IP tanımlıysa Sefu sunucularının çıkış adresi bu listede olmayabilir; kısıtı kaldırın.",
  },
];

export function smsSaglayiciBilgisi(kod: string | null | undefined): SmsSaglayiciBilgisi | null {
  return SMS_SAGLAYICILARI.find((s) => s.kod === kod) ?? null;
}
