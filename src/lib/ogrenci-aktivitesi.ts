// Admin "Öğrenci Aktivitesi" bölümü (kullanıcı isteği, 26.09.2026) — üstte
// kurum bazlı üç kart (en çok veri giren / en çok aktif gün / en son kayıt
// olan), altta son 200 öğrenci hareketi. İşlem Geçmişi'nden (admin_audit_log,
// yönetici işlemleri) bağımsız. Saf modül — sorgular ogrenci-aktivitesi-verisi.ts'te.

export interface OgrenciOzeti {
  id: string;
  ad: string;
  sinif: string | null;
  kurum: string | null;
  kurumId: string | null;
  kayitZamani: string;
}

export type VeriTuru = "konu" | "soru" | "deneme";
export type HareketTuru = VeriTuru | "kayit" | "okul-yukleme";

export interface Hareket {
  anahtar: string;
  tur: HareketTuru;
  zaman: string;
  ogrenci: OgrenciOzeti | null;
  // Okul yüklemesinde öğrenci yok, kurum adı burada.
  kurum: string | null;
  ozet: string;
}

export interface HamKonu { id: string; student_id: string; ders: string; konu: string; sure_dakika: number; created_at: string }
export interface HamSoru { id: string; student_id: string; ders: string; dogru: number; yanlis: number; bos: number | null; created_at: string }
export interface HamDeneme { id: string; student_id: string; tur: string; yayinevi: string | null; kaynak: string; tarih: string; created_at: string; net: number | null }

// Tek bir PDF/Excel yüklemesi onlarca kaydı saniyeler içinde açar — aynı
// kurum + deneme için bu süre içindeki okul kayıtları tek harekete toplanır.
const TOPLU_YUKLEME_PENCERESI_MS = 30 * 60 * 1000;

// "26.09 12:04" — Türkiye saatiyle (sunucu UTC'de çalışsa da).
export function zamanGoster(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function tarihGoster(tarih: string): string {
  const [, a, g] = tarih.split("-");
  return `${g}.${a}`;
}

function sayiGoster(n: number): string {
  return n.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
}

export function hareketleriOlustur(
  veri: { konular: HamKonu[]; sorular: HamSoru[]; denemeler: HamDeneme[]; kayitlar: OgrenciOzeti[] },
  ogrenciler: Map<string, OgrenciOzeti>,
  limit = 200,
): Hareket[] {
  const hareketler: Hareket[] = [];

  for (const k of veri.konular) {
    const ogrenci = ogrenciler.get(k.student_id);
    if (!ogrenci) continue;
    hareketler.push({
      anahtar: `konu-${k.id}`, tur: "konu", zaman: k.created_at, ogrenci, kurum: ogrenci.kurum,
      ozet: `konu çalışması girdi: ${k.ders} / ${k.konu} · ${k.sure_dakika} dk`,
    });
  }
  for (const s of veri.sorular) {
    const ogrenci = ogrenciler.get(s.student_id);
    if (!ogrenci) continue;
    hareketler.push({
      anahtar: `soru-${s.id}`, tur: "soru", zaman: s.created_at, ogrenci, kurum: ogrenci.kurum,
      ozet: `soru çözümü girdi: ${s.ders} · ${s.dogru} D / ${s.yanlis} Y${s.bos ? ` / ${s.bos} B` : ""}`,
    });
  }

  // Okul (öğretmen/PDF) kayıtları: kurum + tarih + tür + yayınevi ve 30 dk
  // pencereyle gruplanır.
  const okulGruplari: { anahtar: string; kurum: string | null; ilk: HamDeneme; sonZaman: number; ogrenciler: Set<string> }[] = [];
  const okulKayitlari = veri.denemeler.filter((d) => d.kaynak === "ogretmen")
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const d of okulKayitlari) {
    const ogrenci = ogrenciler.get(d.student_id);
    if (!ogrenci) continue;
    const anahtar = `${ogrenci.kurumId}|${d.tarih}|${d.tur}|${(d.yayinevi ?? "").toLocaleUpperCase("tr-TR")}`;
    const zaman = new Date(d.created_at).getTime();
    const grup = okulGruplari.find((g) => g.anahtar === anahtar && zaman - g.sonZaman <= TOPLU_YUKLEME_PENCERESI_MS);
    if (grup) {
      grup.sonZaman = zaman;
      grup.ogrenciler.add(d.student_id);
    } else {
      okulGruplari.push({ anahtar, kurum: ogrenci.kurum, ilk: d, sonZaman: zaman, ogrenciler: new Set([d.student_id]) });
    }
  }
  for (const g of okulGruplari) {
    hareketler.push({
      anahtar: `okul-${g.ilk.id}`, tur: "okul-yukleme", zaman: new Date(g.sonZaman).toISOString(), ogrenci: null, kurum: g.kurum,
      ozet: `${tarihGoster(g.ilk.tarih)} ${g.ilk.tur}${g.ilk.yayinevi ? ` ${g.ilk.yayinevi}` : ""} deneme sonuçları ${g.ogrenciler.size} öğrenciye yüklendi`,
    });
  }

  for (const d of veri.denemeler) {
    if (d.kaynak === "ogretmen") continue;
    const ogrenci = ogrenciler.get(d.student_id);
    if (!ogrenci) continue;
    hareketler.push({
      anahtar: `deneme-${d.id}`, tur: "deneme", zaman: d.created_at, ogrenci, kurum: ogrenci.kurum,
      ozet: `deneme girdi: ${tarihGoster(d.tarih)} ${d.tur}${d.yayinevi ? ` ${d.yayinevi}` : ""}${d.net !== null ? ` · ${sayiGoster(d.net)} net` : ""}`,
    });
  }
  for (const o of veri.kayitlar) {
    hareketler.push({ anahtar: `kayit-${o.id}`, tur: "kayit", zaman: o.kayitZamani, ogrenci: o, kurum: o.kurum, ozet: "kayıt oldu" });
  }

  return hareketler.sort((a, b) => b.zaman.localeCompare(a.zaman)).slice(0, limit);
}

export interface VeriSiralamaSatiri {
  ogrenci: OgrenciOzeti;
  toplam: number;
  konu: number;
  soru: number;
  deneme: number;
}

export function veriGirisSiralamasi(
  kayitlar: { studentId: string; tur: VeriTuru }[], ogrenciler: Map<string, OgrenciOzeti>, adet = 5,
): VeriSiralamaSatiri[] {
  const sayac = new Map<string, VeriSiralamaSatiri>();
  for (const k of kayitlar) {
    const ogrenci = ogrenciler.get(k.studentId);
    if (!ogrenci) continue;
    const satir = sayac.get(k.studentId) ?? { ogrenci, toplam: 0, konu: 0, soru: 0, deneme: 0 };
    satir.toplam++;
    satir[k.tur]++;
    sayac.set(k.studentId, satir);
  }
  return [...sayac.values()].sort((a, b) => b.toplam - a.toplam || a.ogrenci.ad.localeCompare(b.ogrenci.ad, "tr")).slice(0, adet);
}

export interface AktifGunSatiri {
  ogrenci: OgrenciOzeti;
  gunSayisi: number;
  sonGun: string;
}

export function aktifGunSiralamasi(
  gunler: { user_id: string; gun: string }[], ogrenciler: Map<string, OgrenciOzeti>, adet = 5,
): AktifGunSatiri[] {
  const sayac = new Map<string, AktifGunSatiri>();
  for (const g of gunler) {
    const ogrenci = ogrenciler.get(g.user_id);
    if (!ogrenci) continue;
    const satir = sayac.get(g.user_id) ?? { ogrenci, gunSayisi: 0, sonGun: g.gun };
    satir.gunSayisi++;
    if (g.gun > satir.sonGun) satir.sonGun = g.gun;
    sayac.set(g.user_id, satir);
  }
  return [...sayac.values()]
    .sort((a, b) => b.gunSayisi - a.gunSayisi || b.sonGun.localeCompare(a.sonGun) || a.ogrenci.ad.localeCompare(b.ogrenci.ad, "tr"))
    .slice(0, adet);
}
