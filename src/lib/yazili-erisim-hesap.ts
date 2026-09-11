// Yazılı analizi "dürüstlük engeli" — saf kurallar (kullanıcı kararı
// 11.09.2026). Analiz, sistemi yalnızca yazılı analizi için kullanan değil,
// öğrencisinin takibini SeFu Koç'ta düzenli yapan öğretmene açık:
//   * son 7 günde en az 3 farklı gün panele giriş,
//   * bu dönem en az 10 görev,
//   * bu dönem en az 10 farklı öğrencinin profilini görüntüleme.
// Giriş/profil sayımı sıfırdan başladığı için engel 2 haftalık ölçüm
// süresinden sonra devreye girer. Veriyi okuyan taraf: yazili-erisim.ts.

export const YAZILI_ENGEL_BASLANGIC = "2026-09-25";

export const YAZILI_ESIKLERI = { aktifGun7: 3, gorevDonem: 10, profilDonem: 10 } as const;

// Kullanıcının kendi ifadesi ("bu ifade yeterli") — eşik sayıları bilerek
// gösterilmiyor.
export const YAZILI_KILIT_MESAJI =
  "Sistemi kullanma yetkiniz yoktur. SeFu Koç yazılı analizi, öğrencisinin takibini düzenli yapan öğretmenler içindir.";

export function yaziliOlcumMesaji(engelBaslangic: string): string {
  const [yil, ay, gun] = engelBaslangic.split("-");
  return `${gun}.${ay}.${yil} tarihinden itibaren SeFu Koç yazılı analizi, öğrencisinin takibini düzenli yapan öğretmenlere açık olacaktır.`;
}

export interface YaziliErisim {
  izinli: boolean;
  olcumDonemi: boolean;
  engelBaslangic: string;
}

export interface TakipOlcumu {
  aktifGun7: number; // son 7 günde panele girilen farklı gün
  gorevDonem: number; // bu dönem verilen görev
  profilDonem: number; // bu dönem profili görüntülenen farklı öğrenci
}

export function olcumDonemiMi(bugun: string): boolean {
  return bugun < YAZILI_ENGEL_BASLANGIC;
}

export function erisimKarari(olcum: TakipOlcumu): boolean {
  return (
    olcum.aktifGun7 >= YAZILI_ESIKLERI.aktifGun7 &&
    olcum.gorevDonem >= YAZILI_ESIKLERI.gorevDonem &&
    olcum.profilDonem >= YAZILI_ESIKLERI.profilDonem
  );
}

// 1. dönem Eylül–Ocak (başlangıç 1 Eylül), 2. dönem Şubat–Ağustos (1 Şubat)
// — yazili-rapor-hesap.ts donemNo ile aynı bölünme.
export function donemBaslangici(bugun: string): string {
  const [yil, ay] = bugun.split("-").map(Number);
  if (ay >= 9) return `${yil}-09-01`;
  if (ay === 1) return `${yil - 1}-09-01`;
  return `${yil}-02-01`;
}

export function gunEkle(tarih: string, gun: number): string {
  const d = new Date(`${tarih}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + gun);
  return d.toISOString().slice(0, 10);
}

// Bugün dahil son 7 gün: bugün ve önceki 6 gün.
export function yediGunPenceresiBaslangici(bugun: string): string {
  return gunEkle(bugun, -6);
}

export function istanbulBugun(simdi: Date = new Date()): string {
  return simdi.toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
}
