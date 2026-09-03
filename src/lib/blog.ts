import type { SupabaseClient } from "@supabase/supabase-js";

// SeFu Blog (03.09.2026 kullanıcı isteği) — amaç arama motoru görünürlüğü:
// her yazı /blog/<slug> adresinde ayrı bir sayfa, sitemap'e de oradan
// giriyor (bkz. src/app/sitemap.ts). Görsel deseni tg-deneme-ilanlari.ts
// ile aynı (public Supabase Storage bucket).
export interface BlogYazisi {
  id: string;
  slug: string;
  baslik: string;
  ozet: string;
  icerik: string;
  kapakGorseli: string | null;
  kapakAlt: string | null;
  yayinda: boolean;
  yayinTarihi: string | null;
  createdAt: string;
  updatedAt: string;
}

type BlogSatiri = {
  id: string; slug: string; baslik: string; ozet: string; icerik: string;
  kapak_gorseli: string | null; kapak_alt: string | null; yayinda: boolean; yayin_tarihi: string | null;
  created_at: string; updated_at: string;
};

const SUTUNLAR = "id, slug, baslik, ozet, icerik, kapak_gorseli, kapak_alt, yayinda, yayin_tarihi, created_at, updated_at";

function satiriCevir(r: BlogSatiri): BlogYazisi {
  return {
    id: r.id, slug: r.slug, baslik: r.baslik, ozet: r.ozet, icerik: r.icerik,
    kapakGorseli: r.kapak_gorseli, kapakAlt: r.kapak_alt, yayinda: r.yayinda, yayinTarihi: r.yayin_tarihi,
    createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

// Yayındaki yazılar, en yeni önce. Tablo henüz oluşturulmadıysa (migration
// çalıştırılmadan deploy edilirse) sayfa çökmesin diye sessizce boş döner —
// bu depoda yerleşik "yeni tabloya karşı nazik davran" deseni.
export async function blogYazilariniGetir(supabase: SupabaseClient): Promise<BlogYazisi[]> {
  const { data, error } = await supabase
    .from("blog_yazilari").select(SUTUNLAR)
    .eq("yayinda", true)
    .order("yayin_tarihi", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) { console.error("blog_yazilari okunamadı:", error.message); return []; }
  return ((data ?? []) as BlogSatiri[]).map(satiriCevir);
}

export async function blogYazisiGetir(supabase: SupabaseClient, slug: string): Promise<BlogYazisi | null> {
  const { data, error } = await supabase
    .from("blog_yazilari").select(SUTUNLAR)
    .eq("slug", slug).eq("yayinda", true).maybeSingle();
  if (error) { console.error("blog yazısı okunamadı:", error.message); return null; }
  return data ? satiriCevir(data as BlogSatiri) : null;
}

export function blogGorselUrl(dosyaYolu: string): string {
  const taban = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
  return `${taban}/storage/v1/object/public/blog/${dosyaYolu}`;
}

// Başlıktan URL'ye uygun slug üretir: Türkçe harfleri latin karşılığına
// çevirir (Google için okunur URL), kalanı tireler.
const TURKCE_HARFLER: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", â: "a", î: "i", û: "u",
};

export function slugUret(baslik: string): string {
  return baslik
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüâîû]/g, (h) => TURKCE_HARFLER[h] ?? h)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function tarihFormatla(tarih: string | null): string {
  if (!tarih) return "";
  return new Date(tarih).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
