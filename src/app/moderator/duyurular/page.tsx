import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {Header} from "@/components/dashboard/Header";
import {YonetimNavigasyonu} from "@/components/dashboard/YonetimNavigasyonu";
import {DuyuruGecmisi} from "@/components/dashboard/DuyuruGecmisi";
import type {UserRole} from "@/lib/types";
export default async function ModeratorDuyurularPage(){
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const[{data:profil},{data:yetki}]=await Promise.all([supabase.from("profiles").select("ad,role").eq("id",user.id).maybeSingle(),supabase.from("school_moderators").select("school_id").eq("profile_id",user.id).maybeSingle()]);if(!profil||!yetki)redirect("/dashboard");
 return <div className="flex min-h-screen flex-col"><Header ad={profil.ad} role={profil.role as UserRole} moderatorMu rolEtiketi="Moderatör" mobilNavigasyon={false}/><main className="mx-auto flex w-full max-w-[100rem] flex-1 flex-col gap-5 px-4 py-7 pb-24 sm:px-6"><YonetimNavigasyonu tur="moderator" aktif="duyurular"/><DuyuruGecmisi/></main></div>
}
