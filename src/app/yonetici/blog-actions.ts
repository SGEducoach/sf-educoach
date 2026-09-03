"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugUret, type BlogYazisi } from "@/lib/blog";

// SeFu Blog yönetimi (03.09.2026 kullanıcı isteği). Dosya yükleme/temizleme
// deseni tgDenemeIlaniEkle ile aynı (bkz. actions.ts): storage'a yaz, kayıt
// başarısızsa yüklenen dosyayı geri al — yetim dosya bırakma.
const KAPAK_MAKS_MB = 5;

type AdminBaglami =
  | { ok: true; admin: ReturnType<typeof createAdminClient>; userId: string }
  | { ok: false; hata: string };

async function adminIstemcisi(): Promise<AdminBaglami> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, hata: "Oturum bulunamadı." };
  const admin = createAdminClient();
  const { data: profil } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profil?.role !== "admin") return { ok: false, hata: "Bu işlem yalnızca admin hesapları içindir." };
  return { ok: true, admin, userId: user.id };
}

type BlogSatiri = {
  id: string; slug: string; baslik: string; ozet: string; icerik: string;
  kapak_gorseli: string | null; yayinda: boolean; yayin_tarihi: string | null;
  created_at: string; updated_at: string;
};

// Admin listesi: taslaklar DAHİL (public sorgu yalnız yayındakileri görür).
export async function blogYazilariniYonetimIcinGetir(): Promise<{ error: string | null; yazilar: BlogYazisi[] }> {
  const ctx = await adminIstemcisi();
  if (!ctx.ok) return { error: ctx.hata, yazilar: [] };

  const { data, error } = await ctx.admin
    .from("blog_yazilari")
    .select("id, slug, baslik, ozet, icerik, kapak_gorseli, yayinda, yayin_tarihi, created_at, updated_at")
    .order("created_at", { ascending: false }).limit(200);
  if (error) return { error: error.message, yazilar: [] };

  const yazilar = ((data ?? []) as BlogSatiri[]).map((r) => ({
    id: r.id, slug: r.slug, baslik: r.baslik, ozet: r.ozet, icerik: r.icerik,
    kapakGorseli: r.kapak_gorseli, yayinda: r.yayinda, yayinTarihi: r.yayin_tarihi,
    createdAt: r.created_at, updatedAt: r.updated_at,
  }));
  return { error: null, yazilar };
}

// Aynı slug varsa sonuna -2, -3 ... ekleyerek benzersizleştirir (tablodaki
// unique kısıtına takılıp kullanıcıya ham Postgres hatası göstermemek için).
async function benzersizSlug(admin: ReturnType<typeof createAdminClient>, taban: string, haricId?: string): Promise<string> {
  for (let i = 1; i < 50; i++) {
    const aday = i === 1 ? taban : `${taban}-${i}`;
    let sorgu = admin.from("blog_yazilari").select("id").eq("slug", aday);
    if (haricId) sorgu = sorgu.neq("id", haricId);
    const { data } = await sorgu.maybeSingle();
    if (!data) return aday;
  }
  return `${taban}-${Date.now()}`;
}

// Kullanıcı isteği (03.09.2026): ilk yazının kapağı 1,9MB PNG'di — bu
// doğrudan Core Web Vitals'ı (LCP) düşürüyor ve arama sıralamasına
// yansıyor. Kapaklar artık yüklenirken otomatik WebP'ye çevriliyor ve
// en fazla KAPAK_MAKS_GENISLIK piksele küçültülüyor; yönetici tarafında
// ek bir işlem gerekmiyor. Dönüşüm başarısız olursa (sharp yoksa vb.)
// yükleme iptal edilmiyor, dosya olduğu gibi kaydediliyor.
const KAPAK_MAKS_GENISLIK = 1600;
const KAPAK_WEBP_KALITE = 80;

async function kapakYukle(admin: ReturnType<typeof createAdminClient>, dosya: File): Promise<{ yol?: string; hata?: string }> {
  const tipler: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const uzanti = tipler[dosya.type];
  if (!uzanti) return { hata: "Kapak görseli JPEG, PNG veya WebP olmalı." };
  if (dosya.size > KAPAK_MAKS_MB * 1024 * 1024) return { hata: `Kapak görseli en fazla ${KAPAK_MAKS_MB}MB olabilir.` };

  let buffer = Buffer.from(await dosya.arrayBuffer());
  let sonUzanti = uzanti;
  let icerikTipi = dosya.type;
  try {
    const sharp = (await import("sharp")).default;
    // rotate(): EXIF yönlendirmesini uygular, yoksa telefondan gelen
    // fotoğraflar yan dönük kaydediliyor.
    buffer = await sharp(buffer).rotate()
      .resize({ width: KAPAK_MAKS_GENISLIK, withoutEnlargement: true })
      .webp({ quality: KAPAK_WEBP_KALITE })
      .toBuffer();
    sonUzanti = "webp";
    icerikTipi = "image/webp";
  } catch (e) {
    console.warn("Blog kapağı WebP'ye çevrilemedi, orijinal yükleniyor:", e);
  }

  const yol = `${crypto.randomUUID()}.${sonUzanti}`;
  const { error } = await admin.storage.from("blog").upload(yol, buffer, { contentType: icerikTipi, upsert: false });
  if (error) return { hata: "Kapak görseli yüklenemedi: " + error.message };
  return { yol };
}

function alanlariDogrula(baslik: string, ozet: string, icerik: string): string | null {
  if (baslik.length < 3 || baslik.length > 200) return "Başlık 3-200 karakter olmalı.";
  if (ozet.length < 10 || ozet.length > 300) return "Özet 10-300 karakter olmalı (arama sonucunda görünen açıklama).";
  if (!icerik.trim()) return "İçerik boş olamaz.";
  if (icerik.length > 60000) return "İçerik çok uzun (en fazla 60.000 karakter).";
  return null;
}

export async function blogYazisiKaydet(formData: FormData): Promise<{ error: string | null }> {
  const ctx = await adminIstemcisi();
  if (!ctx.ok) return { error: ctx.hata };
  const { admin, userId } = ctx;

  const id = String(formData.get("id") ?? "").trim();
  const baslik = String(formData.get("baslik") ?? "").trim();
  const ozet = String(formData.get("ozet") ?? "").trim();
  const icerik = String(formData.get("icerik") ?? "").trim();
  const yayinda = formData.get("yayinda") === "true";
  const dosya = formData.get("kapak") as File | null;

  const dogrulama = alanlariDogrula(baslik, ozet, icerik);
  if (dogrulama) return { error: dogrulama };

  let kapakYolu: string | undefined;
  if (dosya && dosya.size > 0) {
    const sonuc = await kapakYukle(admin, dosya);
    if (sonuc.hata) return { error: sonuc.hata };
    kapakYolu = sonuc.yol;
  }

  const geriAl = async () => { if (kapakYolu) await admin.storage.from("blog").remove([kapakYolu]); };

  if (id) {
    const { data: mevcut } = await admin.from("blog_yazilari").select("slug, yayinda, yayin_tarihi, kapak_gorseli").eq("id", id).maybeSingle();
    if (!mevcut) { await geriAl(); return { error: "Yazı bulunamadı." }; }

    const guncelleme: Record<string, unknown> = { baslik, ozet, icerik, yayinda };
    if (kapakYolu) guncelleme.kapak_gorseli = kapakYolu;
    // İlk kez yayınlanıyorsa yayın tarihini şimdi damgala.
    if (yayinda && !mevcut.yayin_tarihi) guncelleme.yayin_tarihi = new Date().toISOString();

    const { error } = await admin.from("blog_yazilari").update(guncelleme).eq("id", id);
    if (error) { await geriAl(); return { error: error.message }; }
    // Eski kapak artık kullanılmıyorsa storage'dan temizle.
    if (kapakYolu && mevcut.kapak_gorseli) await admin.storage.from("blog").remove([mevcut.kapak_gorseli]);
  } else {
    const slug = await benzersizSlug(admin, slugUret(baslik) || "yazi");
    const { error } = await admin.from("blog_yazilari").insert({
      slug, baslik, ozet, icerik, yayinda,
      kapak_gorseli: kapakYolu ?? null,
      yayin_tarihi: yayinda ? new Date().toISOString() : null,
      olusturan_id: userId,
    });
    if (error) { await geriAl(); return { error: error.message }; }
  }

  yollariTazele();
  return { error: null };
}

export async function blogYazisiYayinDurumu(id: string, yayinda: boolean): Promise<{ error: string | null }> {
  const ctx = await adminIstemcisi();
  if (!ctx.ok) return { error: ctx.hata };

  const { data: mevcut } = await ctx.admin.from("blog_yazilari").select("yayin_tarihi").eq("id", id).maybeSingle();
  const guncelleme: Record<string, unknown> = { yayinda };
  if (yayinda && !mevcut?.yayin_tarihi) guncelleme.yayin_tarihi = new Date().toISOString();

  const { error } = await ctx.admin.from("blog_yazilari").update(guncelleme).eq("id", id);
  if (error) return { error: error.message };
  yollariTazele();
  return { error: null };
}

export async function blogYazisiSil(id: string): Promise<{ error: string | null }> {
  const ctx = await adminIstemcisi();
  if (!ctx.ok) return { error: ctx.hata };

  const { data: mevcut } = await ctx.admin.from("blog_yazilari").select("kapak_gorseli").eq("id", id).maybeSingle();
  const { error } = await ctx.admin.from("blog_yazilari").delete().eq("id", id);
  if (error) return { error: error.message };
  if (mevcut?.kapak_gorseli) await ctx.admin.storage.from("blog").remove([mevcut.kapak_gorseli]);
  yollariTazele();
  return { error: null };
}

// Yazı değişince hem liste hem sitemap tazelensin (ikisi de revalidate=3600).
function yollariTazele() {
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/yonetici/blog");
}
