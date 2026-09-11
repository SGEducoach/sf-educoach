import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  donemBaslangici, erisimKarari, istanbulBugun, olcumDonemiMi, yediGunPenceresiBaslangici,
  YAZILI_ENGEL_BASLANGIC, type YaziliErisim,
} from "@/lib/yazili-erisim-hesap";

// Yazılı analizi dürüstlük engeli — kararın veri tarafı (kurallar
// yazili-erisim-hesap.ts'te). Sayımlar servis anahtarıyla okunur: takip
// tablolarına öğretmenin hiçbir izni yok (bkz. migration 0097). Uygulandığı
// yerler: yaziliSinavOlustur, rapor sayfası, puan şablonu, Excel yükleme ve
// kaydedilen yazılılar listesi — hepsi sunucu tarafında.
export async function yaziliErisimi(teacherId: string): Promise<YaziliErisim> {
  const bugun = istanbulBugun();
  if (olcumDonemiMi(bugun)) return { izinli: true, olcumDonemi: true, engelBaslangic: YAZILI_ENGEL_BASLANGIC };

  const admin = createAdminClient();
  const donemBas = donemBaslangici(bugun);
  const [aktif, gorev, profil] = await Promise.all([
    admin.from("ogretmen_aktif_gunleri").select("gun", { count: "exact", head: true })
      .eq("teacher_id", teacherId).gte("gun", yediGunPenceresiBaslangici(bugun)),
    admin.from("gorevler").select("id", { count: "exact", head: true })
      .eq("olusturan_ogretmen_id", teacherId).gte("created_at", `${donemBas}T00:00:00+03:00`),
    admin.from("ogretmen_profil_goruntulemeleri").select("student_id")
      .eq("teacher_id", teacherId).gte("gun", donemBas),
  ]);

  // Sayılamıyorsa kapalı kalır — engelin amacı dürüstlük; hata loglanır.
  if (aktif.error || gorev.error || profil.error) {
    console.error("yazılı erişim sayımı başarısız:", aktif.error ?? gorev.error ?? profil.error);
    return { izinli: false, olcumDonemi: false, engelBaslangic: YAZILI_ENGEL_BASLANGIC };
  }

  const izinli = erisimKarari({
    aktifGun7: aktif.count ?? 0,
    gorevDonem: gorev.count ?? 0,
    profilDonem: new Set((profil.data ?? []).map((p) => p.student_id as string)).size,
  });
  return { izinli, olcumDonemi: false, engelBaslangic: YAZILI_ENGEL_BASLANGIC };
}
