import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GirisKarsilamaSayfasi } from "@/components/GirisKarsilamaSayfasi";

// Kullanıcı isteği (27.08.2026): "/" artık girişten önce sade bir karşılama
// sayfası gösteriyor (kopilotrehberlik.com/auth'tan ilham alındı) — oturumu
// olan kullanıcı hâlâ doğrudan panele düşüyor, davranış onlar için değişmedi.
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return <GirisKarsilamaSayfasi />;
}
