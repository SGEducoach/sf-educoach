import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { ModeratorPanel } from "@/components/moderator/ModeratorPanel";
import { moderatorKullanicilariGetir } from "@/app/moderator/actions";
import type { UserRole } from "@/lib/types";

export default async function ModeratorPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profil }, { data: yetki }] = await Promise.all([
    supabase.from("profiles").select("ad, role").eq("id", user.id).single(),
    supabase.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle(),
  ]);
  if (!profil || !yetki) redirect("/dashboard");
  const veri = await moderatorKullanicilariGetir();
  return <div className="flex min-h-screen flex-col"><Header ad={profil.ad} role={profil.role as UserRole} moderatorMu rolEtiketi="Moderatör" mobilNavigasyon={false}/><main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 pb-24 sm:px-6"><ModeratorPanel {...veri}/></main></div>;
}
