// İlkokul gelişim raporu (kullanıcı kararları 16.10.2026, migration 0157).
//
// İlkokul öğrencisi sisteme girmez; onu veli ve kurum izler. Rapor, her ay
// her kalem için üç düzeyden biri ve sınıf öğretmeni ile rehberlik
// servisinin birer kısa notundan oluşur. Kalemler 1-4. sınıfların hepsinde
// aynı (kullanıcı kararı). Saf modül — sorgular ilkokul-gelisim-sorgu.ts'te.

export const GELISIM_KALEMLERI = [
  { anahtar: "matematik", ad: "Matematik" },
  { anahtar: "turkce", ad: "Türkçe" },
  { anahtar: "hayat_bilgisi", ad: "Hayat Bilgisi" },
  { anahtar: "ingilizce", ad: "İngilizce" },
  { anahtar: "degerler", ad: "Değerler (Din Kültürü)" },
  { anahtar: "resim", ad: "Resim" },
  { anahtar: "muzik", ad: "Müzik" },
  { anahtar: "beden_egitimi", ad: "Beden Eğitimi" },
  { anahtar: "sosyal_etkinlik", ad: "Sosyal Etkinlik" },
  { anahtar: "rehberlik", ad: "Rehberlik" },
] as const;

export type GelisimKalemi = (typeof GELISIM_KALEMLERI)[number]["anahtar"];

export const GELISIM_DUZEYLERI = [
  { anahtar: "gelistirilmeli", ad: "Geliştirilmeli", kisa: "G" },
  { anahtar: "gelisiyor", ad: "Gelişiyor", kisa: "Gİ" },
  { anahtar: "basarili", ad: "Başarılı", kisa: "B" },
] as const;

export type GelisimDuzeyi = (typeof GELISIM_DUZEYLERI)[number]["anahtar"];
export type GelisimNotTuru = "ogretmen" | "rehberlik";

const KALEM_SETI = new Set<string>(GELISIM_KALEMLERI.map((k) => k.anahtar));
const DUZEY_SETI = new Set<string>(GELISIM_DUZEYLERI.map((d) => d.anahtar));

export function gelisimKalemiMi(x: unknown): x is GelisimKalemi {
  return typeof x === "string" && KALEM_SETI.has(x);
}

export function gelisimDuzeyiMi(x: unknown): x is GelisimDuzeyi {
  return typeof x === "string" && DUZEY_SETI.has(x);
}

export function kalemAdi(kalem: GelisimKalemi): string {
  return GELISIM_KALEMLERI.find((k) => k.anahtar === kalem)?.ad ?? kalem;
}

export function duzeyAdi(duzey: GelisimDuzeyi): string {
  return GELISIM_DUZEYLERI.find((d) => d.anahtar === duzey)?.ad ?? duzey;
}

// Düzeyin sırası: değişim yönünü (yükseldi / düştü) hesaplamak için.
export function duzeySirasi(duzey: GelisimDuzeyi): number {
  return GELISIM_DUZEYLERI.findIndex((d) => d.anahtar === duzey);
}

// ---- Kim neyi işaretler ----
//
// Rehberlik kalemini ve rehberlik notunu yalnız rehberlik servisi; diğer
// dokuz kalemi ve öğretmen notunu sınıf öğretmeni girer. Müdür ve kurum
// moderatörü (ve yönetici) hepsini düzeltebilir.
export type GelisimYetkisi = "sinif_ogretmeni" | "rehberlik" | "yonetim";

export function kalemiYazabilirMi(yetkiler: readonly GelisimYetkisi[], kalem: GelisimKalemi): boolean {
  if (yetkiler.includes("yonetim")) return true;
  if (kalem === "rehberlik") return yetkiler.includes("rehberlik");
  return yetkiler.includes("sinif_ogretmeni");
}

export function notuYazabilirMi(yetkiler: readonly GelisimYetkisi[], tur: GelisimNotTuru): boolean {
  if (yetkiler.includes("yonetim")) return true;
  return tur === "rehberlik" ? yetkiler.includes("rehberlik") : yetkiler.includes("sinif_ogretmeni");
}

// ---- Ay ----
//
// Rapor ayın 1'ine yazılır ("2026-10-01"). Saat dilimi kaymasın diye tarih
// metniyle çalışılıyor, Date nesnesiyle değil.
export function ayAnahtari(tarih: string): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(tarih.trim());
  if (!m) return null;
  const ay = Number(m[2]);
  if (ay < 1 || ay > 12) return null;
  return `${m[1]}-${m[2]}-01`;
}

export function oncekiAy(ay: string): string {
  const [y, a] = ay.split("-").map(Number);
  return a === 1 ? `${y - 1}-12-01` : `${y}-${String(a - 1).padStart(2, "0")}-01`;
}

const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];

export function ayEtiketi(ay: string): string {
  const [y, a] = ay.split("-").map(Number);
  return `${AY_ADLARI[a - 1] ?? "?"} ${y}`;
}

// ---- Veli ve öğretmen için özet ----

export interface GelisimKaydi {
  ay: string;
  kalem: GelisimKalemi;
  duzey: GelisimDuzeyi;
}

export interface GelisimOzetSatiri {
  kalem: GelisimKalemi;
  ad: string;
  duzey: GelisimDuzeyi | null;
  onceki: GelisimDuzeyi | null;
  degisim: "yukseldi" | "dustu" | "ayni" | null;
}

// En son işaretlenmiş ay ve bir önceki işaretli ayla karşılaştırma.
// Kayıt yoksa sonAy null döner.
export function gelisimOzeti(kayitlar: readonly GelisimKaydi[]): { sonAy: string | null; oncekiAy: string | null; satirlar: GelisimOzetSatiri[] } {
  const aylar = [...new Set(kayitlar.map((k) => k.ay))].sort().reverse();
  const sonAy = aylar[0] ?? null;
  const oncekiAyDegeri = aylar[1] ?? null;
  const bul = (ay: string | null, kalem: GelisimKalemi) =>
    ay ? kayitlar.find((k) => k.ay === ay && k.kalem === kalem)?.duzey ?? null : null;
  const satirlar = GELISIM_KALEMLERI.map(({ anahtar, ad }) => {
    const duzey = bul(sonAy, anahtar);
    const onceki = bul(oncekiAyDegeri, anahtar);
    let degisim: GelisimOzetSatiri["degisim"] = null;
    if (duzey && onceki) {
      const fark = duzeySirasi(duzey) - duzeySirasi(onceki);
      degisim = fark > 0 ? "yukseldi" : fark < 0 ? "dustu" : "ayni";
    }
    return { kalem: anahtar, ad, duzey, onceki, degisim };
  });
  return { sonAy, oncekiAy: oncekiAyDegeri, satirlar };
}

// ---- Veli davet kodu ----
//
// İlkokul öğrencisi giriş yapmadığı için bugünkü "kod öğrencinin mesaj
// kutusuna gider" akışı çalışmaz. Kod yönetici ya da moderatörün aldığı
// listeyle velilere dağıtılır; 30 gün geçerli (öğretmen onaylı akışta 48
// saat — liste okulda elden dağıtıldığı için daha uzun).
export const VELI_DAVET_GECERLILIK_GUN = 30;

// Veli telefonu 10-11 rakam olmalı (veri tabanı kısıtı); başka biçimler
// boş bırakılır, kayıt reddedilmez.
export function veliTelefonuTemizle(ham: string | null | undefined): string | null {
  const rakam = String(ham ?? "").replace(/\D/g, "");
  if (/^0?5\d{9}$/.test(rakam)) return rakam.length === 10 ? `0${rakam}` : rakam;
  return /^[0-9]{10,11}$/.test(rakam) ? rakam : null;
}
