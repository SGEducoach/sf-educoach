import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { ModeratorPanel } from "@/components/moderator/ModeratorPanel";
import { moderatorKullanicilariGetir } from "@/app/moderator/actions";
import type { UserRole } from "@/lib/types";
import { YonetimNavigasyonu } from "@/components/dashboard/YonetimNavigasyonu";

// ?okul=<schoolId>: admin'in /yonetici → "Moderatörler" listesinden bir
// okula tıklayıp o okulun moderatör panelini görüntülemesi için — sadece
// gerçekten admin rolündeki kullanıcı için işleme alınır (bkz.
// moderator/actions.ts requireModerator), aksi halde normal akış
// (kullanıcının kendi school_moderators satırı) çalışır.
export default async function ModeratorPage({ searchParams }: { searchParams: Promise<{ okul?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profil } = await supabase.from("profiles").select("ad, role").eq("id", user.id).single();
  if (!profil) redirect("/dashboard");

  const params = await searchParams;
  const adminGoruntuluyor = profil.role === "admin" && !!params.okul;

  if (!adminGoruntuluyor) {
    const { data: yetki } = await supabase.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle();
    if (!yetki) redirect("/dashboard");
  }

  const veri = await moderatorKullanicilariGetir(adminGoruntuluyor ? params.okul : undefined);
  return (
    <div className="flex min-h-screen flex-col">
      <Header ad={profil.ad} role={profil.role as UserRole} moderatorMu={!adminGoruntuluyor} rolEtiketi={adminGoruntuluyor ? undefined : "Moderatör"} mobilNavigasyon={false}
        geriDonusHref={adminGoruntuluyor ? "/yonetici/moderatorler" : "/dashboard"}
        geriDonusEtiketi={adminGoruntuluyor ? "Yönetim paneline dön" : "Ana sayfaya dön"}
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-7 pb-24 sm:px-6">
        {!adminGoruntuluyor && <YonetimNavigasyonu tur="moderator" aktif="panel"/>}
        <ModeratorPanel {...veri}
          schoolId={adminGoruntuluyor ? params.okul : undefined}
        />
      </main>
    </div>
  );
}
