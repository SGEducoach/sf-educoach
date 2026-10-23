// Rehber Takip Bildirimleri (kullanıcı kararı 20.10.2026): öğrenci takibinde
// rehberin bilmesi gereken durumlar tarihli kayıt olarak düşer; bildirim
// kutusuna GİTMEZ. Rehber kaydı "görüldü" ya da "ele alındı" diye kapatır.
//
// Bu dosya saf: hangi durumun olay sayılacağını belirler, veritabanına
// dokunmaz (bkz. rehber-takip-verisi.ts). Eşikler Kapsamım bayraklarıyla
// aynı gerekçeye dayanır (bkz. rehber-bayrak.ts).
//
// TEKİLLİK: her olayın bir `anahtar`ı var; aynı öğrencide aynı anahtar bir
// kez kaydedilir. Böylece olay her gün yeniden üretilse de çoğalmaz.
//   net / ders  -> deneme kimliği: her yeni deneme yeni olay olabilir.
//   sessizlik   -> son hareket tarihi: öğrenci dönüp yine susarsa yeni olay.
//   görev       -> ay: durum sürerse ayda bir hatırlatır.
import { GOREV_MIN_SAYI, GOREV_ORAN_ESIGI, SESSIZ_GUN } from "@/lib/rehber-bayrak";

export type TakipTuru = "net_dususu" | "net_yukselisi" | "ders_dususu" | "sessizlik" | "gorev_birikmesi";
export type TakipDurumu = "yeni" | "goruldu" | "ele_alindi";

export const TAKIP_TURU_ETIKET: Record<TakipTuru, string> = {
  net_dususu: "Ani Net Düşüşü",
  net_yukselisi: "Ani Net Yükselişi",
  ders_dususu: "Ders Bazında Düşüş",
  sessizlik: "Uzun Süre Sessizlik",
  gorev_birikmesi: "Biriken Görevler",
};

export const TAKIP_DURUMU_ETIKET: Record<TakipDurumu, string> = { yeni: "Yeni", goruldu: "Görüldü", ele_alindi: "Ele Alındı" };

// Toplam net: son deneme ile aynı türdeki önceki iki denemenin ortalaması.
export const NET_DEGISIM_ESIGI = 5;
// Ders: en az 3 net VE önceki ortalamanın en az %25'i kadar düşüş — küçük
// netli derste 1-2 netlik dalgalanma bildirim üretmesin.
export const DERS_DUSUS_ESIGI = 3;
export const DERS_DUSUS_ORANI = 0.25;
// Yalnız son 30 günün denemesi olay sayılır: ilk çalıştırmada geçmiş
// denemeler bildirim yığını oluşturmasın.
export const OLAY_PENCERESI_GUN = 30;
const ONCEKI_DENEME = 2;

export interface TakipDenemesi {
  id: string;
  tarih: string; // YYYY-MM-DD
  tur: string;   // TYT, AYT, BRANS, ...
  dersler: { ders: string; net: number }[];
}

export interface TakipGirdisi {
  bugun: string;
  denemeler: TakipDenemesi[];
  sonHareket: string | null;
  acikGorev: number;
  gorevToplam: number;
}

export interface DersDegisimi { ders: string; once: number; simdi: number; fark: number }

export interface TakipOlayi {
  tur: TakipTuru;
  anahtar: string;
  baslik: string;
  olayTarihi: string;
  ayrinti: Record<string, unknown>;
}

const yuvarla = (n: number) => Math.round(n * 10) / 10;
const ortalama = (l: number[]) => l.reduce((t, n) => t + n, 0) / l.length;
const sayiYaz = (n: number) => yuvarla(n).toLocaleString("tr-TR");
const netYaz = (n: number) => sayiYaz(Math.abs(n));

export function gunFarki(bugun: string, tarih: string): number {
  return Math.round((Date.parse(`${bugun}T12:00:00Z`) - Date.parse(`${tarih}T12:00:00Z`)) / 86_400_000);
}

export function tarihEkleGun(tarih: string, gun: number): string {
  return new Date(Date.parse(`${tarih}T12:00:00Z`) + gun * 86_400_000).toISOString().slice(0, 10);
}

// Aynı türdeki denemeler yeniden eskiye; son deneme önceki en fazla iki
// denemeyle kıyaslanır. Branş denemelerinde toplam net kıyaslanmaz (farklı
// dersler), yalnız ortak dersler.
function denemeOlaylari(bugun: string, denemeler: TakipDenemesi[]): TakipOlayi[] {
  const olaylar: TakipOlayi[] = [];
  const turlere = new Map<string, TakipDenemesi[]>();
  for (const d of denemeler) turlere.set(d.tur, [...(turlere.get(d.tur) ?? []), d]);

  for (const [tur, liste] of turlere) {
    const sirali = [...liste].sort((a, b) => b.tarih.localeCompare(a.tarih) || b.id.localeCompare(a.id));
    const [son, ...eskiler] = sirali;
    if (!son || gunFarki(bugun, son.tarih) > OLAY_PENCERESI_GUN || gunFarki(bugun, son.tarih) < 0) continue;
    const onceki = eskiler.filter((d) => d.tarih <= son.tarih).slice(0, ONCEKI_DENEME);
    if (onceki.length === 0) continue;

    // Ders değişimleri: dersin geçtiği önceki denemelerin ortalamasına göre.
    const dersler: DersDegisimi[] = [];
    for (const { ders, net } of son.dersler) {
      const gecmis = onceki.flatMap((d) => d.dersler.filter((x) => x.ders === ders).map((x) => x.net));
      if (gecmis.length === 0) continue;
      const once = ortalama(gecmis);
      dersler.push({ ders, once: yuvarla(once), simdi: yuvarla(net), fark: yuvarla(net - once) });
    }
    const dusenDersler = dersler
      .filter((d) => d.fark <= -DERS_DUSUS_ESIGI && -d.fark >= DERS_DUSUS_ORANI * Math.max(d.once, 1))
      .sort((a, b) => a.fark - b.fark);

    const ortak = { denemeId: son.id, denemeTuru: tur, denemeTarihi: son.tarih };
    if (tur !== "BRANS") {
      const toplam = (d: TakipDenemesi) => d.dersler.reduce((t, x) => t + x.net, 0);
      const simdi = toplam(son);
      const once = ortalama(onceki.map(toplam));
      const fark = simdi - once;
      if (Math.abs(fark) >= NET_DEGISIM_ESIGI) {
        const dusus = fark < 0;
        olaylar.push({
          tur: dusus ? "net_dususu" : "net_yukselisi",
          anahtar: `net:${son.id}`,
          baslik: `${tur} neti ${netYaz(fark)} ${dusus ? "düştü" : "yükseldi"} (${sayiYaz(once)} → ${sayiYaz(simdi)})`,
          olayTarihi: son.tarih,
          ayrinti: { ...ortak, once: yuvarla(once), simdi: yuvarla(simdi), fark: yuvarla(fark), dersler: dusus ? dusenDersler : dersler.filter((d) => d.fark > 0).sort((a, b) => b.fark - a.fark).slice(0, 4) },
        });
        continue; // Toplam düşüş zaten bildirildi; düşen dersler onun ayrıntısında.
      }
    }
    if (dusenDersler.length > 0) {
      olaylar.push({
        tur: "ders_dususu",
        anahtar: `ders:${son.id}`,
        baslik: `${tur} denemesinde ${dusenDersler.map((d) => `${d.ders} ${netYaz(d.fark)} net`).join(", ")} düştü`,
        olayTarihi: son.tarih,
        ayrinti: { ...ortak, dersler: dusenDersler },
      });
    }
  }
  return olaylar;
}

export function takipOlaylariniBul(g: TakipGirdisi): TakipOlayi[] {
  const olaylar = denemeOlaylari(g.bugun, g.denemeler);

  // Hiç verisi olmayan öğrenci burada sayılmaz; o Kapsamım'da "hiç veri
  // girmemiş" olarak görünür (ilk çalıştırmada kitlesel kayıt oluşmasın).
  if (g.sonHareket) {
    const gun = gunFarki(g.bugun, g.sonHareket);
    if (gun >= SESSIZ_GUN) {
      olaylar.push({
        tur: "sessizlik",
        anahtar: `sessiz:${g.sonHareket}`,
        baslik: `${gun} gündür hiç veri girmedi`,
        olayTarihi: tarihEkleGun(g.sonHareket, SESSIZ_GUN),
        ayrinti: { sonHareket: g.sonHareket, gun },
      });
    }
  }

  if (g.gorevToplam >= GOREV_MIN_SAYI && g.acikGorev / g.gorevToplam >= GOREV_ORAN_ESIGI) {
    olaylar.push({
      tur: "gorev_birikmesi",
      anahtar: `gorev:${g.bugun.slice(0, 7)}`,
      baslik: `${g.gorevToplam} görevinin ${g.acikGorev} tanesi açık (%${Math.round((g.acikGorev / g.gorevToplam) * 100)})`,
      olayTarihi: g.bugun,
      ayrinti: { acikGorev: g.acikGorev, gorevToplam: g.gorevToplam },
    });
  }
  return olaylar;
}

// --- Tarama zamanı (Faz 1 · Adım 1, 23.10.2026) ---------------------------
// Takip sayfası her açılışta tam kurum taraması yapıyordu; günlük cron
// (04:30 UTC) aynı işi yaptığı için açılış taraması yalnız son tarama bu
// süreden eskiyse çalışır. 26 saat: cron'un gecikmesine pay bırakır.
export const TARAMA_TAZELIK_SAAT = 26;

// Kapsamın kayıt anahtarı: null = kurumun tümü; aksi hâlde sıralı düzeyler.
export function taramaKapsamAnahtari(seviyeler: string[] | null): string {
  return seviyeler === null ? "tumu" : [...new Set(seviyeler)].sort().join(",");
}

// Bir tarama kaydı (kapsam anahtarıyla), istenen kapsamı tamamen içeriyor mu?
// Cron okulda düzeylerin birleşimini tarar; düzey alt kümesi olan rehber de
// o taramadan yararlanır.
export function taramaKapsamiIceriyor(kayitAnahtari: string, seviyeler: string[] | null): boolean {
  if (kayitAnahtari === "tumu") return true;
  if (seviyeler === null) return false;
  const kayit = new Set(kayitAnahtari.split(",").filter(Boolean));
  return seviyeler.every((s) => kayit.has(s));
}

// Uygun kayıtlar içinden en yeni tarama zamanı (ISO) ya da null.
export function sonTaramaZamani(kayitlar: { kapsam: string; son_tarama_at: string }[], seviyeler: string[] | null): string | null {
  let enYeni: string | null = null;
  for (const k of kayitlar) {
    if (!taramaKapsamiIceriyor(k.kapsam, seviyeler)) continue;
    if (!enYeni || Date.parse(k.son_tarama_at) > Date.parse(enYeni)) enYeni = k.son_tarama_at;
  }
  return enYeni;
}

export function taramaGerekliMi(sonTarama: string | null, simdi: Date = new Date()): boolean {
  if (!sonTarama) return true;
  const t = Date.parse(sonTarama);
  if (Number.isNaN(t)) return true;
  return simdi.getTime() - t >= TARAMA_TAZELIK_SAAT * 3600_000;
}
