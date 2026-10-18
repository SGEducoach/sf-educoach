"use server";

// Yoklama akışı (kullanıcı isteği 18.10.2026, Faz 3, migration 0164).
// Öğretmen yoklama listesini yurt sorumlusu müdür yardımcısına gönderir;
// ona "Yoklamalar alındı" bildirimi gider. Müdür yardımcısı (ve müdür)
// gelen listeleri açar, ekleme yapar, kartı kendisi paylaşır.
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { bildirimGonder } from "@/lib/bildirim-gonder";
import { pushGonderProfile } from "@/lib/push-send";
import { mudurYardimcisiUyeligiGetir, yurtSorumlulari } from "@/lib/mudur-yardimcisi";
import { YURT_SABLONLARI, grupEtiketi, ogretmeninGrubu, type OgrenciCinsiyeti, type YurtListeTuru } from "@/lib/yurt-listesi";

export interface YoklamaSatiri { anahtar: string; ad: string; okulNo: string; sinif: string; not: string }
export interface GelenYoklama {
  id: string; tur: YurtListeTuru; grup: OgrenciCinsiyeti; tarih: string; alanlar: Record<string, string>;
  ogrenciler: YoklamaSatiri[]; hazirlayanAdi: string; createdAt: string;
}

const kirp = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

async function oturum() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const admin = createAdminClient();
  const [{ data: profil }, { data: ogretmen }] = await Promise.all([
    admin.from("profiles").select("role, ad").eq("id", user.id).maybeSingle(),
    admin.from("teachers").select("school_id, cinsiyet").eq("id", user.id).maybeSingle(),
  ]);
  return { admin, user, profil, ogretmen: ogretmen as { school_id: string; cinsiyet?: string | null } | null };
}

export async function yoklamaGonder(girdi: {
  tur: string; grup: string; alanlar: Record<string, string>; ogrenciler: YoklamaSatiri[];
}): Promise<{ error: string | null; aliciSayisi: number }> {
  const { admin, user, profil, ogretmen } = await oturum();
  if (!ogretmen?.school_id || (profil?.role !== "ogretmen" && profil?.role !== "mudur")) return { error: "Bu işlem öğretmenlere açıktır.", aliciSayisi: 0 };
  const sablon = YURT_SABLONLARI.find((s) => s.anahtar === girdi.tur);
  if (!sablon) return { error: "Geçersiz liste türü.", aliciSayisi: 0 };
  if (girdi.grup !== "kiz" && girdi.grup !== "erkek") return { error: "Geçersiz grup.", aliciSayisi: 0 };
  const grup = girdi.grup as OgrenciCinsiyeti;
  const { data: okul } = await admin.from("schools").select("yurtlu").eq("id", ogretmen.school_id).maybeSingle();
  if (!okul?.yurtlu) return { error: "Kurumunuzda yurt yok.", aliciSayisi: 0 };

  // Kadın öğretmen kız, erkek öğretmen erkek öğrencilerin listesini gönderir;
  // müdür ve yurt sorumlusu müdür yardımcısı iki grubu da gönderebilir.
  const idare = profil.role === "ogretmen" ? await mudurYardimcisiUyeligiGetir(admin, user.id) : null;
  if (profil.role === "ogretmen" && !idare?.yurt && ogretmeninGrubu((ogretmen.cinsiyet as "kadin" | "erkek" | null) ?? null) !== grup) {
    return { error: "Bu grubun listesini gönderme yetkiniz yok.", aliciSayisi: 0 };
  }

  if (!Array.isArray(girdi.ogrenciler) || girdi.ogrenciler.length > 300) return { error: "Liste geçersiz.", aliciSayisi: 0 };
  const ogrenciler = girdi.ogrenciler.map((o) => ({ anahtar: kirp(o.anahtar, 60), ad: kirp(o.ad, 80), okulNo: kirp(o.okulNo, 10), sinif: kirp(o.sinif, 10), not: kirp(o.not, 40) }));
  const alanlar = Object.fromEntries(sablon.alanlar.map((a) => [a.anahtar, kirp(girdi.alanlar?.[a.anahtar], 10)]));
  if (sablon.anahtar === "aksam-yoklamasi") alanlar.ekOgretmen = kirp(girdi.alanlar?.ekOgretmen, 80);
  const tarihHam = alanlar.tarih || alanlar.cikisTarihi || "";
  const tarih = /^\d{4}-\d{2}-\d{2}$/.test(tarihHam) ? tarihHam : new Date().toISOString().slice(0, 10);

  const alicilar = (await yurtSorumlulari(admin, ogretmen.school_id)).filter((id) => id !== user.id);
  if (alicilar.length === 0) return { error: "Kurumda yurt sorumlusu müdür yardımcısı atanmamış. Yoklamayı WhatsApp'tan paylaşın.", aliciSayisi: 0 };

  const hazirlayanAdi = profil.ad ?? "Öğretmen";
  const { error } = await admin.from("yurt_yoklamalari").insert({
    school_id: ogretmen.school_id, tur: sablon.anahtar, grup, tarih, alanlar, ogrenciler, hazirlayan_id: user.id, hazirlayan_adi: hazirlayanAdi,
  });
  if (error) return { error: "Yoklama kaydedilemedi (veritabanı güncellemesi bekleniyor olabilir).", aliciSayisi: 0 };

  const baslik = "Yoklamalar alındı";
  const mesaj = `${hazirlayanAdi} — ${sablon.ad} (${grupEtiketi(grup)}): ${ogrenciler.length ? `${ogrenciler.length} öğrenci` : "eksik yok"}. Duyurular > WhatsApp Duyuruları > Gelen Yoklamalar.`;
  await Promise.all(alicilar.map(async (id) => {
    await bildirimGonder(admin, id, "yoklama", baslik, mesaj);
    await pushGonderProfile(admin, id, baslik, mesaj);
  }));
  return { error: null, aliciSayisi: alicilar.length };
}

// Yurt sorumlusu müdür yardımcısı ve müdür: son 7 günün gelen yoklamaları.
export async function gelenYoklamalar(): Promise<{ error: string | null; yoklamalar: GelenYoklama[] }> {
  const { admin, user, profil, ogretmen } = await oturum();
  if (!ogretmen?.school_id) return { error: "Kurum bulunamadı.", yoklamalar: [] };
  const yetkili = profil?.role === "mudur" || (profil?.role === "ogretmen" && (await mudurYardimcisiUyeligiGetir(admin, user.id))?.yurt);
  if (!yetkili) return { error: "Gelen yoklamalar yurt sorumlusu müdür yardımcısına açıktır.", yoklamalar: [] };
  const sinir = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const { data, error } = await admin.from("yurt_yoklamalari")
    .select("id, tur, grup, tarih, alanlar, ogrenciler, hazirlayan_adi, created_at")
    .eq("school_id", ogretmen.school_id).gte("tarih", sinir)
    .order("tarih", { ascending: false }).order("created_at", { ascending: false }).limit(100);
  if (error) return { error: "Gelen yoklamalar okunamadı (veritabanı güncellemesi bekleniyor olabilir).", yoklamalar: [] };
  type Row = { id: string; tur: YurtListeTuru; grup: OgrenciCinsiyeti; tarih: string; alanlar: Record<string, string>; ogrenciler: YoklamaSatiri[]; hazirlayan_adi: string | null; created_at: string };
  return {
    error: null,
    yoklamalar: ((data ?? []) as Row[]).map((r) => ({
      id: r.id, tur: r.tur, grup: r.grup, tarih: r.tarih, alanlar: r.alanlar ?? {}, ogrenciler: r.ogrenciler ?? [],
      hazirlayanAdi: r.hazirlayan_adi ?? "Öğretmen", createdAt: r.created_at,
    })),
  };
}
