// WhatsApp duyuru kartları (kullanıcı isteği 18.10.2026): müdür ve rehber
// öğretmen kurumun yuvarlak logosu ve konu fotoğrafıyla hazır duyuru
// kartları üretir. Bu dosya şablonları ve kartın İÇERİĞİNİ tanımlar — saf,
// test edilebilir. Çizim tarayıcıda (whatsapp-kart-cizim.ts); kart saklanmaz.
//
// SeFu markası yalnız sisteme giriş gerektiren duyuruda (deneme sonuçları)
// görünür; diğer bütün kartlar yalnız kurumun kimliğini taşır.

export type AlanTuru = "metin" | "tarih" | "saat" | "uzun";

export interface SablonAlani {
  anahtar: string;
  etiket: string;
  tur: AlanTuru;
  ornek?: string;      // yer tutucu
  varsayilan?: string; // forma dolu gelir
}

export interface KartSatiri { etiket: string; deger: string }

export interface KartIcerigi {
  baslik: string;
  altBaslik: string | null;
  satirlar: KartSatiri[];
  aciklamaBasligi: string | null;
  aciklama: string | null;
  girisGerekli: boolean;
}

export interface DuyuruSablonu {
  anahtar: string;
  ad: string;
  renk: string;   // vurgu rengi
  foto: string;   // hazır fotoğrafın dosya adı (/duyuru-fotograflari/…)
  alanlar: SablonAlani[];
  girisGerekli?: boolean;
  icerik: (d: Record<string, string>) => KartIcerigi;
}

const AY = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const GUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

// "2026-10-25" → "25 Ekim 2026 Pazar"; geçersizse olduğu gibi.
export function kartTarihi(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return iso.trim();
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12));
  return `${Number(m[3])} ${AY[Number(m[2]) - 1]} ${m[1]} ${GUN[d.getUTCDay()]}`;
}

const dolu = (s: string | undefined) => (s ?? "").trim();
function satirlar(...liste: [string, string | undefined, ((v: string) => string)?][]): KartSatiri[] {
  return liste
    .map(([etiket, deger, bicim]) => ({ etiket, deger: dolu(deger) ? (bicim ? bicim(dolu(deger)) : dolu(deger)) : "" }))
    .filter((s) => s.deger);
}
const yokSaBos = (s: string | undefined) => dolu(s) || null;

export const DUYURU_SABLONLARI: DuyuruSablonu[] = [
  {
    anahtar: "veli-toplantisi", ad: "Veli toplantısı", renk: "#1f4e9c", foto: "veli-toplantisi.jpg",
    alanlar: [
      { anahtar: "kapsam", etiket: "Kimler", tur: "metin", ornek: "12. sınıf velilerimiz" },
      { anahtar: "tarih", etiket: "Tarih", tur: "tarih" },
      { anahtar: "saat", etiket: "Saat", tur: "saat" },
      { anahtar: "yer", etiket: "Yer", tur: "metin", varsayilan: "Kurum toplantı salonu" },
      { anahtar: "gundem", etiket: "Gündem", tur: "uzun", ornek: "Deneme sonuçlarının değerlendirilmesi ve YKS takvimi" },
    ],
    icerik: (d) => ({
      baslik: "Veli Toplantısı", altBaslik: yokSaBos(d.kapsam),
      satirlar: satirlar(["Tarih", d.tarih, kartTarihi], ["Saat", d.saat], ["Yer", d.yer]),
      aciklamaBasligi: "Gündem", aciklama: yokSaBos(d.gundem), girisGerekli: false,
    }),
  },
  {
    anahtar: "deneme-ilani", ad: "Deneme sınavı ilanı", renk: "#d9661a", foto: "deneme-sinavi.jpg",
    alanlar: [
      { anahtar: "deneme", etiket: "Deneme adı", tur: "metin", ornek: "TYT Genel Deneme 3" },
      { anahtar: "kapsam", etiket: "Kimler", tur: "metin", ornek: "12. sınıflar ve mezunlar" },
      { anahtar: "tarih", etiket: "Tarih", tur: "tarih" },
      { anahtar: "saat", etiket: "Saat", tur: "saat" },
      { anahtar: "yer", etiket: "Yer", tur: "metin", varsayilan: "Kurum sınav salonları" },
      { anahtar: "not", etiket: "Hatırlatma", tur: "uzun", varsayilan: "Kimlik kartınızı, kurşun kalem ve silginizi getirmeyi unutmayın. Sınava 15 dakika önce gelin." },
    ],
    icerik: (d) => ({
      baslik: "Deneme Sınavı", altBaslik: yokSaBos(d.deneme),
      satirlar: satirlar(["Kimler", d.kapsam], ["Tarih", d.tarih, kartTarihi], ["Saat", d.saat], ["Yer", d.yer]),
      aciklamaBasligi: "Hatırlatma", aciklama: yokSaBos(d.not), girisGerekli: false,
    }),
  },
  {
    anahtar: "deneme-sonuc", ad: "Deneme sonuç ilanı", renk: "#0f8a6a", foto: "deneme-sonucu.jpg", girisGerekli: true,
    alanlar: [
      { anahtar: "deneme", etiket: "Deneme adı", tur: "metin", ornek: "TYT Genel Deneme 3" },
      { anahtar: "tarih", etiket: "Sınav tarihi", tur: "tarih" },
      { anahtar: "aciklama", etiket: "Açıklama", tur: "uzun", varsayilan: "Sonuçlarınızı ve konu analizinizi öğrenci ya da veli girişiyle görebilirsiniz. Sonuç görüşmesi için rehber öğretmeninizden randevu alabilirsiniz." },
    ],
    icerik: (d) => ({
      baslik: "Deneme Sonuçları Açıklandı", altBaslik: yokSaBos(d.deneme),
      satirlar: satirlar(["Sınav tarihi", d.tarih, kartTarihi]),
      aciklamaBasligi: null, aciklama: yokSaBos(d.aciklama), girisGerekli: true,
    }),
  },
  {
    anahtar: "ucret-hatirlatma", ad: "Ücret ödeme hatırlatması", renk: "#5b3fa0", foto: "odeme.jpg",
    alanlar: [
      { anahtar: "donem", etiket: "Dönem", tur: "metin", ornek: "Kasım ayı taksiti" },
      { anahtar: "sonTarih", etiket: "Son ödeme tarihi", tur: "tarih" },
      { anahtar: "odeme", etiket: "Ödeme yolları", tur: "metin", ornek: "Havale/EFT ya da kurumda nakit ve kartla" },
      { anahtar: "not", etiket: "Not", tur: "uzun", varsayilan: "Ödemesini yapmış velilerimiz bu mesajı dikkate almasın. Teşekkür ederiz." },
    ],
    icerik: (d) => ({
      baslik: "Ödeme Hatırlatması", altBaslik: yokSaBos(d.donem),
      satirlar: satirlar(["Son ödeme", d.sonTarih, kartTarihi], ["Ödeme", d.odeme]),
      aciklamaBasligi: null, aciklama: yokSaBos(d.not), girisGerekli: false,
    }),
  },
  {
    anahtar: "ders-iptali", ad: "Ders iptali / tatil", renk: "#b8323a", foto: "ders-iptali.jpg",
    alanlar: [
      { anahtar: "tarih", etiket: "Tarih", tur: "tarih" },
      { anahtar: "kapsam", etiket: "Kimler", tur: "metin", varsayilan: "Tüm sınıflar" },
      { anahtar: "sebep", etiket: "Sebep", tur: "metin", ornek: "Resmî tatil" },
      { anahtar: "telafi", etiket: "Telafi", tur: "uzun", ornek: "Dersler 2 Kasım Cumartesi aynı saatlerde telafi edilecektir." },
    ],
    icerik: (d) => ({
      baslik: "Dersler Yapılmayacak", altBaslik: yokSaBos(d.sebep),
      satirlar: satirlar(["Tarih", d.tarih, kartTarihi], ["Kimler", d.kapsam]),
      aciklamaBasligi: "Telafi", aciklama: yokSaBos(d.telafi), girisGerekli: false,
    }),
  },
  {
    anahtar: "program-degisikligi", ad: "Ders programı değişikliği", renk: "#2471a3", foto: "ders-programi.jpg",
    alanlar: [
      { anahtar: "kapsam", etiket: "Kimler", tur: "metin", ornek: "11-A ve 11-B" },
      { anahtar: "gecerlilik", etiket: "Geçerli olduğu tarih", tur: "tarih" },
      { anahtar: "degisiklik", etiket: "Değişiklik", tur: "uzun", ornek: "Salı günü matematik dersi 16:00'dan 17:30'a alınmıştır." },
    ],
    icerik: (d) => ({
      baslik: "Ders Programı Değişti", altBaslik: yokSaBos(d.kapsam),
      satirlar: satirlar(["Geçerli", d.gecerlilik, kartTarihi]),
      aciklamaBasligi: "Değişiklik", aciklama: yokSaBos(d.degisiklik), girisGerekli: false,
    }),
  },
  {
    anahtar: "etut", ad: "Etüt / ek ders", renk: "#138d75", foto: "etut.jpg",
    alanlar: [
      { anahtar: "ders", etiket: "Ders", tur: "metin", ornek: "Matematik soru çözüm etüdü" },
      { anahtar: "kapsam", etiket: "Kimler", tur: "metin", ornek: "12. sınıflar" },
      { anahtar: "gunSaat", etiket: "Gün ve saat", tur: "metin", ornek: "Her Salı 17:00–18:30" },
      { anahtar: "ogretmen", etiket: "Öğretmen", tur: "metin" },
      { anahtar: "yer", etiket: "Yer", tur: "metin" },
    ],
    icerik: (d) => ({
      baslik: "Etüt Programı", altBaslik: yokSaBos(d.ders),
      satirlar: satirlar(["Kimler", d.kapsam], ["Gün / saat", d.gunSaat], ["Öğretmen", d.ogretmen], ["Yer", d.yer]),
      aciklamaBasligi: null, aciklama: null, girisGerekli: false,
    }),
  },
  {
    anahtar: "seminer", ad: "Rehberlik semineri", renk: "#7d3c98", foto: "seminer.jpg",
    alanlar: [
      { anahtar: "konu", etiket: "Konu", tur: "metin", ornek: "Sınav kaygısıyla baş etme" },
      { anahtar: "konusmaci", etiket: "Konuşmacı", tur: "metin" },
      { anahtar: "kapsam", etiket: "Kimler", tur: "metin", ornek: "Öğrenciler ve velileri" },
      { anahtar: "tarih", etiket: "Tarih", tur: "tarih" },
      { anahtar: "saat", etiket: "Saat", tur: "saat" },
      { anahtar: "yer", etiket: "Yer", tur: "metin" },
    ],
    icerik: (d) => ({
      baslik: "Rehberlik Semineri", altBaslik: yokSaBos(d.konu),
      satirlar: satirlar(["Konuşmacı", d.konusmaci], ["Kimler", d.kapsam], ["Tarih", d.tarih, kartTarihi], ["Saat", d.saat], ["Yer", d.yer]),
      aciklamaBasligi: null, aciklama: null, girisGerekli: false,
    }),
  },
  {
    anahtar: "kayit", ad: "Kayıt dönemi", renk: "#c0590f", foto: "kayit.jpg",
    alanlar: [
      { anahtar: "donem", etiket: "Program", tur: "metin", ornek: "2027 YKS hazırlık programı" },
      { anahtar: "avantaj", etiket: "Avantaj", tur: "uzun", ornek: "Erken kayıtta %15 indirim ve ücretsiz seviye tespit sınavı" },
      { anahtar: "sonTarih", etiket: "Son tarih", tur: "tarih" },
      { anahtar: "iletisim", etiket: "İletişim", tur: "metin", ornek: "0 (344) 000 00 00" },
    ],
    icerik: (d) => ({
      baslik: "Kayıtlar Başladı", altBaslik: yokSaBos(d.donem),
      satirlar: satirlar(["Son tarih", d.sonTarih, kartTarihi], ["İletişim", d.iletisim]),
      aciklamaBasligi: null, aciklama: yokSaBos(d.avantaj), girisGerekli: false,
    }),
  },
  {
    anahtar: "tebrik", ad: "Başarı tebriği", renk: "#b7860b", foto: "tebrik.jpg",
    alanlar: [
      { anahtar: "ogrenci", etiket: "Öğrenci(ler)", tur: "metin", ornek: "Ayşe Yılmaz" },
      { anahtar: "basari", etiket: "Başarı", tur: "metin", ornek: "TYT denemesinde il 3.'sü" },
      { anahtar: "mesaj", etiket: "Mesaj", tur: "uzun", varsayilan: "Emeğin ve azmin için seni tebrik ediyor, başarılarının devamını diliyoruz." },
    ],
    icerik: (d) => ({
      baslik: "Tebrikler!", altBaslik: yokSaBos(d.ogrenci),
      satirlar: satirlar(["Başarı", d.basari]),
      aciklamaBasligi: null, aciklama: yokSaBos(d.mesaj), girisGerekli: false,
    }),
  },
  {
    anahtar: "ozel-gun", ad: "Bayram / özel gün", renk: "#c0392b", foto: "ozel-gun.jpg",
    alanlar: [
      { anahtar: "baslik", etiket: "Başlık", tur: "metin", varsayilan: "Cumhuriyet Bayramımız Kutlu Olsun" },
      { anahtar: "mesaj", etiket: "Mesaj", tur: "uzun", ornek: "Cumhuriyetimizin 103. yılını gururla kutluyoruz." },
    ],
    icerik: (d) => ({
      baslik: dolu(d.baslik) || "İyi Bayramlar", altBaslik: null, satirlar: [],
      aciklamaBasligi: null, aciklama: yokSaBos(d.mesaj), girisGerekli: false,
    }),
  },
  {
    anahtar: "genel", ad: "Genel duyuru", renk: "#34495e", foto: "genel.jpg",
    alanlar: [
      { anahtar: "baslik", etiket: "Başlık", tur: "metin", ornek: "Önemli Duyuru" },
      { anahtar: "altBaslik", etiket: "Alt başlık", tur: "metin" },
      { anahtar: "tarih", etiket: "Tarih (isteğe bağlı)", tur: "tarih" },
      { anahtar: "metin", etiket: "Duyuru metni", tur: "uzun" },
    ],
    icerik: (d) => ({
      baslik: dolu(d.baslik) || "Duyuru", altBaslik: yokSaBos(d.altBaslik),
      satirlar: satirlar(["Tarih", d.tarih, kartTarihi]),
      aciklamaBasligi: null, aciklama: yokSaBos(d.metin), girisGerekli: false,
    }),
  },
];

export function varsayilanDegerler(s: DuyuruSablonu): Record<string, string> {
  return Object.fromEntries(s.alanlar.map((a) => [a.anahtar, a.varsayilan ?? ""]));
}

// ---- Devamsızlık ----
// Veliye giden kart yalnız o çocuğun bilgisini taşır; toplu liste kurum
// içidir ve kartın üstünde bunu söyleyen şerit vardır (KVKK: bir öğrencinin
// devamsızlığı başka velilere gösterilmez — kullanıcı kararı 18.10.2026).
export const DEVAMSIZLIK_RENK = "#b8323a";
export const DEVAMSIZLIK_FOTO = "devamsizlik.jpg";
export const TOPLU_LISTE_SAYFA_SATIRI = 16;

export interface DevamsizOgrenci { id: string; ad: string; sinif: string | null; dersSaat: string }

export function devamsizlikVeliKarti(o: DevamsizOgrenci, tarih: string, not: string): KartIcerigi {
  const ders = o.dersSaat.trim();
  return {
    baslik: "Devamsızlık Bilgilendirmesi",
    altBaslik: "Sayın Velimiz",
    satirlar: satirlar(["Öğrenci", o.ad], ["Sınıf", o.sinif ?? undefined], ["Tarih", tarih, kartTarihi], ["Ders / saat", ders]),
    aciklamaBasligi: null,
    aciklama: dolu(not) || `Öğrenciniz ${o.ad}, ${kartTarihi(tarih)} tarihinde derse katılmamıştır${ders ? ` (${ders})` : ""}. Bilginize sunar, iyi günler dileriz.`,
    girisGerekli: false,
  };
}

export function topluListeSayfalari<T>(liste: T[], sayfaSatiri = TOPLU_LISTE_SAYFA_SATIRI): T[][] {
  const sayfalar: T[][] = [];
  for (let i = 0; i < liste.length; i += sayfaSatiri) sayfalar.push(liste.slice(i, i + sayfaSatiri));
  return sayfalar;
}
