// Ödev mesaj kartı (kullanıcı isteği 18.10.2026): öğretmenin verdiği
// ödevlerden WhatsApp'ta paylaşılacak kartın İÇERİĞİ — saf, test edilebilir.
// Çizim tarayıcıda (MesajKartiOlusturucu.tsx); kart hiçbir yerde saklanmaz.
import { sinifSiraKarsilastir } from "@/lib/types";

export interface MesajKartiGorevi {
  id: string;
  tur: "konu" | "soru" | "deneme";
  ders: string;
  konu: string | null;
  hedefSoru: number | null;
  hedefDakika: number | null;
  tarih: string;
  sonTarih: string;
  aciklama: string | null;
  siniflar: string[]; // "11-A" gibi, sıralı
}

export interface MesajKartiOdevi {
  no: number;
  tur: MesajKartiGorevi["tur"];
  turEtiketi: string;
  baslik: string;
  hedef: string | null;
  tarih: string;
}

export interface MesajKartiIcerigi {
  ustBaslik: string;      // "11. Sınıflar"
  sinifSatiri: string;    // "11-A · 11-B · 11-C · 11-D"
  baslikOn: string;       // "Bu haftanın"
  baslikVurgu: string;    // "Türkçe" (tek ders) ya da ""
  baslikSon: string;      // "ödevleri"
  odevler: MesajKartiOdevi[];
  altSol: string;         // "Türkçe · Sedat Güler"
}

export const MESAJ_KARTI_EN_FAZLA = 4;
// Alt kutu (kullanıcı kararı 18.10.2026): başlık sabit, metni öğretmen kartı
// oluştururken o an yazar; boşsa kutu çizilmez.
export const OGRETMEN_NOTU_BASLIGI = "Öğretmen notu";
export const OGRETMEN_NOTU_EN_FAZLA = 260;

const TUR_ETIKETI: Record<MesajKartiGorevi["tur"], string> = { soru: "Soru çözümü", konu: "Konu çalışma", deneme: "Deneme" };

const tarihBicimi = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long", timeZone: "UTC" });
export function kartTarihi(iso: string): string {
  return tarihBicimi.format(new Date(`${iso}T12:00:00Z`));
}

// Hedef: sistemdeki hedef sayısı; yoksa açıklamadaki "30+" / "30 soru" gibi bir sayı.
function hedefMetni(g: MesajKartiGorevi): string | null {
  if (g.tur === "soru") {
    const sayi = g.hedefSoru ?? Number(/(\d{1,4})\s*(?:\+|soru)/i.exec(g.aciklama ?? "")?.[1] ?? NaN);
    return Number.isFinite(sayi) && sayi > 0 ? `En az ${sayi} soru` : null;
  }
  if (g.tur === "konu" && g.hedefDakika) return `${g.hedefDakika} dakika`;
  // Kısa açıklama ("Bu haftaki konumuz") hedef yerine geçer; uzunsa karta sığmaz.
  const aciklama = (g.aciklama ?? "").trim();
  return aciklama && aciklama.length <= 32 ? aciklama : null;
}

function tarihMetni(g: MesajKartiGorevi): string {
  if (g.tur === "konu" && g.tarih !== g.sonTarih) return `${kartTarihi(g.tarih)} – ${kartTarihi(g.sonTarih)}`;
  return `Son gün: ${kartTarihi(g.sonTarih)}`;
}

export function mesajKartiIcerigi(gorevler: MesajKartiGorevi[], ogretmenAdi: string | null): MesajKartiIcerigi {
  const secili = gorevler.slice(0, MESAJ_KARTI_EN_FAZLA);
  const sinifSet = new Map<string, { seviye: string; sube: string }>();
  for (const g of secili) for (const s of g.siniflar) {
    const [seviye, ...sube] = s.split("-");
    sinifSet.set(s, { seviye, sube: sube.join("-") });
  }
  const siniflar = [...sinifSet.values()].sort(sinifSiraKarsilastir);
  const seviyeler = [...new Set(siniflar.map((s) => s.seviye))];
  const ustBaslik = seviyeler.length === 1 ? `${seviyeler[0]}. Sınıflar` : seviyeler.length > 1 ? `${seviyeler.join(", ")}. Sınıflar` : "Ödevler";
  const sinifSatiri = siniflar.length <= 6
    ? siniflar.map((s) => `${s.seviye}-${s.sube}`).join(" · ")
    : `${siniflar.length} sınıf`;
  const dersler = [...new Set(secili.map((g) => g.ders))];
  const tekDers = dersler.length === 1 ? dersler[0] : "";
  return {
    ustBaslik, sinifSatiri,
    baslikOn: "Bu haftanın", baslikVurgu: tekDers, baslikSon: "ödevleri",
    odevler: secili.map((g, i) => ({
      no: i + 1, tur: g.tur, turEtiketi: TUR_ETIKETI[g.tur],
      baslik: g.konu?.trim() || g.ders, hedef: hedefMetni(g), tarih: tarihMetni(g),
    })),
    altSol: [tekDers, ogretmenAdi].filter(Boolean).join(" · "),
  };
}
