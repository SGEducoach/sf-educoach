import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { RozetGoruntulemePaneli } from "@/components/dashboard/RozetGoruntulemePaneli";
import { YonetimNavigasyonu } from "@/components/dashboard/YonetimNavigasyonu";
import { kurumRozetGorunumuGetir } from "@/lib/rozet-gorunumu";
import type { UserRole } from "@/lib/types";

export default async function ModeratorRozetlerPage({ searchParams }: {
  searchParams: Promise<{ sinif?: string; ogrenci?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profil }, { data: yetki }] = await Promise.all([
    supabase.from("profiles").select("ad, role").eq("id", user.id).maybeSingle(),
    supabase.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!profil || !yetki) redirect("/dashboard");
  const params = await searchParams;
  const gorunum = await kurumRozetGorunumuGetir(yetki.school_id, params.ogrenci, params.sinif);

  return (
    <div className="flex min-h-screen flex-col">
      <Header ad={profil.ad} role={profil.role as UserRole} moderatorMu rolEtiketi="Moderatör" mobilNavigasyon={false} />
      <main className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-5 px-4 py-7 pb-24 sm:px-6">
        <YonetimNavigasyonu tur="moderator" aktif="rozetler" />
        <RozetGoruntulemePaneli gorunum={gorunum} action="/moderator/rozetler" kapsam={`${gorunum.kurumAdi ?? "Kurum"} · Yalnız yetkili olduğunuz kurum ve seçilen sınıf`} />
      </main>
    </div>
  );
}
