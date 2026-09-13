import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushGonderProfile } from "@/lib/push-send";

const SEVIYE_ETIKET: Record<string, string> = { bronz: "Bronz 🥉", gumus: "Gümüş 🥈", altin: "Altın 🥇" };
const KATEGORI_ETIKET: Record<string, string> = { konu: "Konu Çalışma", soru: "Soru Çözümü", deneme: "Deneme" };

// Her başarılı veri girişinden sonra çağrılır: rozet_kontrol_et RPC'si
// (security definer) 4 kategorinin (konu/soru/deneme/genel) güncel
// seviyesini hesaplayıp önceki bilinen seviyeyle karşılaştırıyor, sadece
// YÜKSELENLERİ "kategori:seviye" formatında döndürüyor — biz burada bunu
// parse edip bağlı veli(ler)e kategoriye özel push bildirimi gönderiyoruz.
// Öğrencinin kendi girişinde oturumlu client, dershane rehberinin öğrenci
// adına girişinde servis anahtarı gelir (RPC öğrenci oturumunda başka
// öğrenciyi reddeder; servis anahtarında auth.uid() boş, kontrol geçer).
export async function rozetKontrolVeBildir(supabase: SupabaseClient, studentId: string) {
  try {
    const { data: yukselenlerHam } = await supabase.rpc("rozet_kontrol_et", { p_student_id: studentId });
    const yukselenler = (yukselenlerHam as string[] | null) ?? [];
    if (yukselenler.length === 0) return;

    const [{ data: profile }, { data: veliler }] = await Promise.all([
      supabase.from("profiles").select("ad").eq("id", studentId).single(),
      supabase.from("parent_students").select("parent_id").eq("student_id", studentId),
    ]);
    const ad = profile?.ad ?? "Öğrenciniz";
    if (!veliler || veliler.length === 0) return;

    const admin = createAdminClient();
    for (const token of yukselenler) {
      const [kategori, seviye] = token.split(":");
      const seviyeEtiket = SEVIYE_ETIKET[seviye] ?? seviye;
      const baslik = kategori === "genel"
        ? `SEFU KOÇ ${seviyeEtiket} Rozeti Kazanıldı!`
        : `${KATEGORI_ETIKET[kategori] ?? kategori} — ${seviyeEtiket} Rozeti Kazanıldı!`;
      const govde = kategori === "genel"
        ? `${ad}, üç kategorinin de gerektirdiği seviyeye ulaşarak SEFU KOÇ ${seviyeEtiket} rozetini kazandı.`
        : `${ad}, ${KATEGORI_ETIKET[kategori] ?? kategori} kategorisinde ${seviyeEtiket} rozetine ulaştı.`;
      for (const v of veliler) await pushGonderProfile(admin, v.parent_id, baslik, govde);
    }
  } catch (e) {
    console.error("rozet kontrolü başarısız:", e);
  }
}
