import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { ModeratorNavigasyonu } from "@/components/moderator/ModeratorNavigasyonu";
import { ModeratorKurumKonulari } from "@/components/moderator/ModeratorKurumKonulari";
import { moderatorKurumKonulariGetir } from "@/app/moderator/actions";
import type { UserRole } from "@/lib/types";

export default async function ModeratorKurumKonulariPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profil }, { data: yetki }] = await Promise.all([
    supabase.from("profiles").select("ad, role").eq("id", user.id).maybeSingle(),
    supabase.from("school_moderators").select("school_id, schools(tur, grup_kapasitesi)").eq("profile_id", user.id).maybeSingle(),
  ]);
  const okul = yetki?.schools as unknown as { grup_kapasitesi: number | null } | null;
  if (!profil || !yetki || okul?.grup_kapasitesi != null) redirect("/dashboard");
  const veri = await moderatorKurumKonulariGetir();

  return (
    <div className="flex min-h-screen flex-col">
      <Header ad={profil.ad} role={profil.role as UserRole} moderatorMu rolEtiketi="Moderatör" mobilNavigasyon={false} />
      <main id="ana-icerik" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-7 pb-24 sm:px-6">
        <ModeratorNavigasyonu aktif="kurum-konulari" dershane={(yetki.schools as unknown as { tur: string } | null)?.tur === "dershane"} />
        <ModeratorKurumKonulari baslangic={veri.konular} ortakBaslangic={veri.ortakKonular} ilkHata={veri.error} />
      </main>
    </div>
  );
}
