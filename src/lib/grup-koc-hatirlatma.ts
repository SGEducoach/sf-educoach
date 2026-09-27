import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { REHBER_BRANSI } from "@/lib/rehberlik";
import { kocaBildir } from "@/lib/grup-koc-bildirim";
import { kalanGun } from "@/lib/grup-kocluk";

// Grup Koçluk denetimi (kullanıcı isteği 27.09.2026):
//   * hiç giriş yapmamış öğrenci varsa koça haftada bir hatırlatma,
//   * grubun bitişine 14/7/1 gün kala koça anlık uyarı (kullanıcı kararı:
//     süre uyarısı anlık gitsin), yöneticilere de bildirim.
// Günlük cron içinden çağrılır; aynı gün ikinci kez çalışsa bile mükerrer
// bildirim yazmaz (aynı başlıkla son 24 saatte kayıt varsa atlanır).

const UYARI_GUNLERI = [14, 7, 1];
const ILK_GIRIS_HATIRLATMA_GUN = 7;

async function dahaOnceGonderildiMi(admin: SupabaseClient, profileId: string, baslik: string, saat: number): Promise<boolean> {
  const esik = new Date(Date.now() - saat * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("bildirimler")
    .select("id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("baslik", baslik)
    .gte("created_at", esik);
  return (count ?? 0) > 0;
}

export async function grupKocHatirlatmalari(admin: SupabaseClient, bugun: string): Promise<string[]> {
  const detaylar: string[] = [];
  const { data: gruplar } = await admin
    .from("schools")
    .select("id, ad, grup_bitis_tarihi, aktif")
    .not("grup_kapasitesi", "is", null);
  const grupListesi = ((gruplar ?? []) as { id: string; ad: string; grup_bitis_tarihi: string; aktif: boolean | null }[])
    .filter((g) => g.aktif !== false);
  if (grupListesi.length === 0) return detaylar;

  const { data: kocSatirlari } = await admin
    .from("teachers")
    .select("id, school_id, school_moderators!inner(school_id)")
    .eq("brans", REHBER_BRANSI)
    .in("school_id", grupListesi.map((g) => g.id));
  const kocHaritasi = new Map<string, string>();
  for (const k of ((kocSatirlari ?? []) as unknown as { id: string; school_id: string }[])) {
    if (!kocHaritasi.has(k.school_id)) kocHaritasi.set(k.school_id, k.id);
  }

  let sureUyarisi = 0;
  let girisUyarisi = 0;
  for (const grup of grupListesi) {
    const kocId = kocHaritasi.get(grup.id);
    if (!kocId) continue;

    // 1) Süre uyarısı
    const kalan = kalanGun(grup.grup_bitis_tarihi, bugun);
    if (UYARI_GUNLERI.includes(kalan)) {
      const baslik = "Grubunun süresi doluyor";
      if (!await dahaOnceGonderildiMi(admin, kocId, baslik, 20)) {
        await kocaBildir(admin, kocId, baslik,
          `${grup.ad} grubunun süresinin dolmasına ${kalan} gün kaldı. Süre dolunca grup salt okunur olur; devam için SeFu Koç yönetimiyle görüş.`,
          { anlik: true });
        sureUyarisi++;
      }
    }

    // 2) Hiç giriş yapmamış öğrenciler (geçici şifre hâlâ duruyor)
    const esik = new Date(Date.now() - ILK_GIRIS_HATIRLATMA_GUN * 24 * 60 * 60 * 1000).toISOString();
    const { data: bekleyenler } = await admin
      .from("students")
      .select("id, created_at, profiles!students_id_fkey(ad, gecici_sifre, aktif)")
      .eq("school_id", grup.id)
      .lte("created_at", esik);
    type Satir = { id: string; profiles: { ad: string; gecici_sifre: boolean; aktif: boolean } | { ad: string; gecici_sifre: boolean; aktif: boolean }[] | null };
    const tek = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
    const girmeyenler = ((bekleyenler ?? []) as unknown as Satir[])
      .map((s) => tek(s.profiles))
      .filter((p): p is { ad: string; gecici_sifre: boolean; aktif: boolean } => !!p && p.gecici_sifre === true && p.aktif !== false);
    if (girmeyenler.length > 0) {
      const baslik = "Giriş yapmamış öğrencilerin var";
      if (!await dahaOnceGonderildiMi(admin, kocId, baslik, 7 * 24)) {
        const adlar = girmeyenler.slice(0, 5).map((p) => p.ad).join(", ");
        await kocaBildir(admin, kocId, baslik,
          `${girmeyenler.length} öğrenci bir haftadır hiç giriş yapmadı (${adlar}${girmeyenler.length > 5 ? " ve diğerleri" : ""}). Giriş bilgilerini tekrar iletmen ya da şifreyi yenilemen gerekebilir.`);
        girisUyarisi++;
      }
    }
  }

  if (sureUyarisi > 0) detaylar.push(`${sureUyarisi} koça grup süresi uyarısı gönderildi.`);
  if (girisUyarisi > 0) detaylar.push(`${girisUyarisi} koça giriş yapmayan öğrenci hatırlatması gönderildi.`);
  return detaylar;
}
