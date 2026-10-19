import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { KonuDurumuBolumu } from "@/components/dashboard/KonuDurumuBolumu";
import { ModeratorNavigasyonu } from "@/components/moderator/ModeratorNavigasyonu";
import { konuDurumuKapsamlari } from "@/lib/konu-durumu-verisi";
import type { UserRole } from "@/lib/types";
import { kurumErisimiKapaliMi, kurumModuluAcikMi, type KurumModulYetkileri } from "@/lib/kurum-yetkileri";

// Konu Durumu (17.10.2026, eski Konu Haritası) — moderatörün kurum geneli
// görünümü. /moderator/rozetler'in aynı iskeleti (auth-gate + Header +
// ModeratorNavigasyonu deseni). Öğrenci sayfaları öğretmen panelinde
// olduğu için adlar burada bağlantısız gösterilir.
export default async function ModeratorKonuHaritasiPage({ searchParams }: { searchParams: Promise<{ kapsam?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profil }, { data: yetki }, params] = await Promise.all([
    supabase.from("profiles").select("ad, role").eq("id", user.id).maybeSingle(),
    supabase.from("school_moderators").select("school_id, schools(tur, aktif, manuel_aktif, kullanim_bitis_tarihi, modul_yetkileri)").eq("profile_id", user.id).maybeSingle(),
    searchParams,
  ]);
  if (!profil || !yetki) redirect("/dashboard");
  const okul = yetki.schools as unknown as { tur: string; aktif: boolean; manuel_aktif: boolean; kullanim_bitis_tarihi: string | null; modul_yetkileri: KurumModulYetkileri } | null;
  if (!okul || kurumErisimiKapaliMi({ aktif: okul.aktif, manuelAktif: okul.manuel_aktif, kullanimBitisTarihi: okul.kullanim_bitis_tarihi }) || !kurumModuluAcikMi(okul.modul_yetkileri, "konular")) redirect("/dashboard");

  const { data: siniflar } = await supabase.from("classes").select("id, seviye, sube").eq("school_id", yetki.school_id);
  const kapsamlar = konuDurumuKapsamlari({ tur: "okul-geneli", siniflar: (siniflar ?? []) as { id: string; seviye: string; sube: string }[] });

  return (
    <div className="flex min-h-screen flex-col">
      <Header ad={profil.ad} role={profil.role as UserRole} moderatorMu rolEtiketi="Moderatör" mobilNavigasyon={false} />
      <main className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-5 px-4 py-7 pb-24 sm:px-6">
        <ModeratorNavigasyonu aktif="konu-haritasi" denemeAcik={["dershane", "okul"].includes(okul.tur) && kurumModuluAcikMi(okul.modul_yetkileri, "denemeler")} modulYetkileri={okul.modul_yetkileri} />
        <KonuDurumuBolumu schoolId={yetki.school_id} kapsamlar={kapsamlar} seciliAnahtar={params.kapsam} ogrenciLinki={false} />
      </main>
    </div>
  );
}
