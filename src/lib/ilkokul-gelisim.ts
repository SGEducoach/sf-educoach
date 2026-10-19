// İlkokul gelişim raporu (kullanıcı kararları 16.10.2026, migration 0157;
// MEB Maarif Modeli gelişim raporuna uyum 19.10.2026, migration 0167).
//
// İlkokul öğrencisi sisteme girmez; onu veli ve kurum izler. Dersler her ay
// MEB'in dört düzeyiyle (Geliştirilmeli / Yeterli / İyi / Çok İyi)
// işaretlenir; sosyal duygusal öğrenme becerileri dönemde bir kez
// değerlendirilir; dönem sonunda MEB biçiminde yazdırılabilir rapor çıkar.
// Saf modül — sorgular ilkokul-gelisim-sorgu.ts'te.
//
// Kaynak: MEB, İlkokul 1. Sınıf Gelişim Raporu Öğretmen Bilgilendirme
// Kılavuzu (2024-2025). Sınıflara göre dersler MEB Talim ve Terbiye
// Kurulunun 09/05/2025 tarihli 4 sayılı kararındaki İlköğretim Kurumları
// Haftalık Ders Çizelgesi'nden (zorunlu dersler, çizelgedeki sırayla;
// 19.10.2026). 2026-2027 için 23/09/2026 tarihli 115 sayılı karar
// geçerli; tablosuna erişilemedi, ilkokul ders listesinde değişiklik
// bildirilmedi.

export type GelisimBolumu = "ders" | "kurum";

export const GELISIM_KALEMLERI = [
  { anahtar: "turkce", ad: "Türkçe", bolum: "ders", siniflar: ["1", "2", "3", "4"] },
  { anahtar: "matematik", ad: "Matematik", bolum: "ders", siniflar: ["1", "2", "3", "4"] },
  { anahtar: "hayat_bilgisi", ad: "Hayat Bilgisi", bolum: "ders", siniflar: ["1", "2", "3"] },
  { anahtar: "fen_bilimleri", ad: "Fen Bilimleri", bolum: "ders", siniflar: ["3", "4"] },
  { anahtar: "sosyal_bilgiler", ad: "Sosyal Bilgiler", bolum: "ders", siniflar: ["4"] },
  { anahtar: "ingilizce", ad: "İngilizce", bolum: "ders", siniflar: ["2", "3", "4"] },
  { anahtar: "din_kulturu", ad: "Din Kültürü ve Ahlak Bilgisi", bolum: "ders", siniflar: ["4"] },
  { anahtar: "resim", ad: "Görsel Sanatlar", bolum: "ders", siniflar: ["1", "2", "3", "4"] },
  { anahtar: "muzik", ad: "Müzik", bolum: "ders", siniflar: ["1", "2", "3", "4"] },
  { anahtar: "beden_egitimi", ad: "Beden Eğitimi ve Oyun", bolum: "ders", siniflar: ["1", "2", "3", "4"] },
  { anahtar: "trafik_guvenligi", ad: "Trafik Güvenliği", bolum: "ders", siniflar: ["4"] },
  { anahtar: "insan_haklari", ad: "İnsan Hakları, Vatandaşlık ve Demokrasi", bolum: "ders", siniflar: ["4"] },
  // MEB raporunda yok; kurumun kendi değerlendirmesi (ayrı bölümde gösterilir).
  // 4. sınıfta yerini MEB'in Din Kültürü ve Ahlak Bilgisi dersi alır.
  { anahtar: "degerler", ad: "Değerler (Din Kültürü)", bolum: "kurum", siniflar: ["1", "2", "3"] },
  { anahtar: "sosyal_etkinlik", ad: "Sosyal Etkinlik", bolum: "kurum", siniflar: ["1", "2", "3", "4"] },
  { anahtar: "rehberlik", ad: "Rehberlik", bolum: "kurum", siniflar: ["1", "2", "3", "4"] },
] as const;

export type GelisimKalemi = (typeof GELISIM_KALEMLERI)[number]["anahtar"];
export type GelisimKalemTanimi = (typeof GELISIM_KALEMLERI)[number];

// Sınıf düzeyinin kalemleri (sıra korunur). Bilinmeyen düzeyde hepsi.
export function sinifKalemleri(seviye: string | null | undefined): GelisimKalemTanimi[] {
  return GELISIM_KALEMLERI.filter((k) => !seviye || (k.siniflar as readonly string[]).includes(seviye));
}

export const GELISIM_DUZEYLERI = [
  { anahtar: "gelistirilmeli", ad: "Geliştirilmeli", kisa: "G" },
  { anahtar: "yeterli", ad: "Yeterli", kisa: "Y" },
  { anahtar: "iyi", ad: "İyi", kisa: "İ" },
  { anahtar: "cok_iyi", ad: "Çok İyi", kisa: "Çİ" },
] as const;

export type GelisimDuzeyi = (typeof GELISIM_DUZEYLERI)[number]["anahtar"];
export type GelisimNotTuru = "ogretmen" | "rehberlik";

const KALEM_SETI = new Set<string>(GELISIM_KALEMLERI.map((k) => k.anahtar));
const DUZEY_SETI = new Set<string>(GELISIM_DUZEYLERI.map((d) => d.anahtar));

// Üç düzeyli eski ölçekten (migration 0157) okuma: 0167 uygulanana kadar
// kayıtlar eski adla gelebilir.
const ESKI_DUZEY: Record<string, GelisimDuzeyi> = { gelisiyor: "yeterli", basarili: "iyi" };
export function duzeyOku(x: unknown): GelisimDuzeyi | null {
  if (typeof x !== "string") return null;
  if (DUZEY_SETI.has(x)) return x as GelisimDuzeyi;
  return ESKI_DUZEY[x] ?? null;
}

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
// Kayıt yoksa sonAy null döner. Satırlar öğrencinin sınıf düzeyinin kalemleri.
export function gelisimOzeti(kayitlar: readonly GelisimKaydi[], seviye?: string | null): { sonAy: string | null; oncekiAy: string | null; satirlar: (GelisimOzetSatiri & { bolum: GelisimBolumu })[] } {
  const aylar = [...new Set(kayitlar.map((k) => k.ay))].sort().reverse();
  const sonAy = aylar[0] ?? null;
  const oncekiAyDegeri = aylar[1] ?? null;
  const bul = (ay: string | null, kalem: GelisimKalemi) =>
    ay ? kayitlar.find((k) => k.ay === ay && k.kalem === kalem)?.duzey ?? null : null;
  const satirlar = sinifKalemleri(seviye).map(({ anahtar, ad, bolum }) => {
    const duzey = bul(sonAy, anahtar);
    const onceki = bul(oncekiAyDegeri, anahtar);
    let degisim: GelisimOzetSatiri["degisim"] = null;
    if (duzey && onceki) {
      const fark = duzeySirasi(duzey) - duzeySirasi(onceki);
      degisim = fark > 0 ? "yukseldi" : fark < 0 ? "dustu" : "ayni";
    }
    return { kalem: anahtar, ad, bolum, duzey, onceki, degisim };
  });
  return { sonAy, oncekiAy: oncekiAyDegeri, satirlar };
}

// ---- Dönem ----
//
// Eğitim yılı Eylül'de başlar. 1. dönem Eylül–Ocak, 2. dönem Şubat–Ağustos
// (yaz ayları 2. döneme sayılır; okul kapalıyken kayıt girilmez).
export interface DonemBilgisi {
  egitimYili: string; // "2026-2027"
  donem: 1 | 2;
}

export function donemBilgisi(ay: string): DonemBilgisi {
  const [y, a] = ay.split("-").map(Number);
  if (a >= 9) return { egitimYili: `${y}-${y + 1}`, donem: 1 };
  if (a === 1) return { egitimYili: `${y - 1}-${y}`, donem: 1 };
  return { egitimYili: `${y - 1}-${y}`, donem: 2 };
}

export function donemGecerliMi(egitimYili: unknown, donem: unknown): boolean {
  if (typeof egitimYili !== "string" || (donem !== 1 && donem !== 2)) return false;
  const m = /^(\d{4})-(\d{4})$/.exec(egitimYili);
  return !!m && Number(m[2]) === Number(m[1]) + 1;
}

// Dönemin ayları ("YYYY-MM-01"), sıralı.
export function donemAylari({ egitimYili, donem }: DonemBilgisi): string[] {
  const bas = Number(egitimYili.slice(0, 4));
  const aylar = donem === 1
    ? [[bas, 9], [bas, 10], [bas, 11], [bas, 12], [bas + 1, 1]]
    : [[bas + 1, 2], [bas + 1, 3], [bas + 1, 4], [bas + 1, 5], [bas + 1, 6], [bas + 1, 7], [bas + 1, 8]];
  return aylar.map(([y, a]) => `${y}-${String(a).padStart(2, "0")}-01`);
}

export function donemEtiketi({ egitimYili, donem }: DonemBilgisi): string {
  return `${egitimYili} Eğitim Öğretim Yılı ${donem}. Dönem`;
}

// Dönemin ilk ayı: dönem seçicisi bağlantıları için.
export function donemIlkAyi(d: DonemBilgisi): string {
  return donemAylari(d)[0];
}

export function komsuDonem(d: DonemBilgisi, yon: -1 | 1): DonemBilgisi {
  const bas = Number(d.egitimYili.slice(0, 4));
  if (yon === 1) return d.donem === 1 ? { egitimYili: d.egitimYili, donem: 2 } : { egitimYili: `${bas + 1}-${bas + 2}`, donem: 1 };
  return d.donem === 2 ? { egitimYili: d.egitimYili, donem: 1 } : { egitimYili: `${bas - 1}-${bas}`, donem: 2 };
}

// Dönem sonu raporu: her kalem için dönem içinde en son işaretlenen düzey.
export function donemDersDuzeyleri(kayitlar: readonly GelisimKaydi[], d: DonemBilgisi): Map<GelisimKalemi, GelisimDuzeyi> {
  const aylar = new Set(donemAylari(d));
  const sonuc = new Map<GelisimKalemi, { ay: string; duzey: GelisimDuzeyi }>();
  for (const k of kayitlar) {
    if (!aylar.has(k.ay)) continue;
    const onceki = sonuc.get(k.kalem);
    if (!onceki || k.ay > onceki.ay) sonuc.set(k.kalem, { ay: k.ay, duzey: k.duzey });
  }
  return new Map([...sonuc].map(([kalem, v]) => [kalem, v.duzey]));
}

// ---- Sosyal duygusal öğrenme becerileri ----
//
// MEB kılavuzundaki 5 başlık ve göstergeleri (metinler kılavuzdaki gibi).
// Dönemde bir kez, sınıf öğretmeni değerlendirir.
export const SDO_BASLIKLARI = [
  {
    anahtar: "kt", ad: "Kendini Tanıma (Öz Farkındalık) ve Kendine Uyarlama (Öz Yansıtma)", gostergeler: [
      "İhtiyaçlarını (sosyal, duygusal veya akademik) tanımlar.",
      "Tüm duygularını tanıyarak rahatlıkla ifade eder.",
      "Düşüncelerini rahatlıkla ifade eder.",
      "Kişisel özelliklerinin (ilgileri, yetenekleri, kişilik özellikleri vb.) farkındadır.",
      "Güçlü yönlerinin farkındadır.",
    ],
  },
  {
    anahtar: "kd", ad: "Kendini Düzenleme (Öz Düzenleme) ve Uyum", gostergeler: [
      "Duygularını durumsal bağlama uygun biçimde ifade eder.",
      "Yoğun duygular (coşku, heyecan, öfke, hayal kırıklığı vb.) yaşadığında kendisini düzenler.",
      "Öğrenmeye isteklidir.",
      "Verilen görevi belirlenen sürede tamamlar.",
      "Akademik zorluklarla karşılaştığında çözüm yolları arar.",
      "Sosyal yaşamında zorluklarla karşılaştığında uygun baş etme yöntemlerini kullanır.",
    ],
  },
  {
    anahtar: "ib", ad: "İletişim ve İş Birliği", gostergeler: [
      "Başkaları ile olumlu ilişkiler kurar.",
      "Akranlarıyla iş birliği yapar.",
      "İstemediği ya da rahatsız olduğu durumlarda hayır diyebilir.",
      "İhtiyacı olduğunda yardım isteyebilir.",
      "İlişkilerde yaşadığı sorunları çözmek için çabalar.",
    ],
  },
  {
    anahtar: "kv", ad: "Karar Verme ve Esneklik", gostergeler: [
      "Yeni şeyler denemeyi sever.",
      "Okul ortamında karşılaştığı problemleri çözmek için sorumluluk alır.",
      "Farklı durumlara kolayca uyum sağlayabilir.",
      "Sınıf içi uygulamalarda adil olmaya duyarlıdır.",
      "Başkalarına zarar veren davranışlardan uzak durur.",
    ],
  },
  {
    anahtar: "sf", ad: "Sosyal Farkındalık", gostergeler: [
      "Başkalarına yardım eder.",
      "Bireysel farklılıklara (bedensel özellikler, düşünce, engellilik vb.) saygı duyar.",
      "Doğayı korumaya özen gösterir.",
      "Okulunu ve sınıfını temiz tutar.",
      "Okulun araç gereçlerini (etkileşimli tahta, sıra, masa, musluklar, çöp kutusu vb.) kullanırken özenlidir.",
    ],
  },
] as const;

// Gösterge anahtarı: başlık + sıra ("kt1" … "sf5").
export const SDO_GOSTERGELERI = SDO_BASLIKLARI.flatMap((b) => b.gostergeler.map((metin, i) => ({ anahtar: `${b.anahtar}${i + 1}`, baslik: b.anahtar, metin })));
export const SDO_GOSTERGE_SAYISI = SDO_GOSTERGELERI.length;

export const SDO_DUZEYLERI = [
  { anahtar: "dusuk", ad: "Düşük Düzeyde Yansıtıyor", kisa: "Düşük" },
  { anahtar: "orta", ad: "Orta Düzeyde Yansıtıyor", kisa: "Orta" },
  { anahtar: "yuksek", ad: "Yüksek Düzeyde Yansıtıyor", kisa: "Yüksek" },
  { anahtar: "cok_yuksek", ad: "Çok Yüksek Düzeyde Yansıtıyor", kisa: "Çok Yüksek" },
] as const;

export type SdoDuzeyi = (typeof SDO_DUZEYLERI)[number]["anahtar"];

const SDO_GOSTERGE_SETI = new Set<string>(SDO_GOSTERGELERI.map((g) => g.anahtar));
const SDO_DUZEY_SETI = new Set<string>(SDO_DUZEYLERI.map((d) => d.anahtar));

export function sdoGostergesiMi(x: unknown): x is string {
  return typeof x === "string" && SDO_GOSTERGE_SETI.has(x);
}

export function sdoDuzeyiMi(x: unknown): x is SdoDuzeyi {
  return typeof x === "string" && SDO_DUZEY_SETI.has(x);
}

// Sosyal duygusal değerlendirmeyi ve dönem görüşünü sınıf öğretmeni (ya da
// müdür/moderatör) yazar.
export function sdoYazabilirMi(yetkiler: readonly GelisimYetkisi[]): boolean {
  return yetkiler.includes("sinif_ogretmeni") || yetkiler.includes("yonetim");
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
