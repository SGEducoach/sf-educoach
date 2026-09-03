"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DuyuruGecmisiSatiri {
  id:string; baslik:string; mesaj:string; createdAt:string; gonderenAdi:string; gonderenRol:string;
  kurumAdi:string; hedef:string; aliciSayisi:number; silindi:boolean; silinebilir:boolean;
}

async function yetki(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
 const admin=createAdminClient(); const {data:p}=await admin.from("profiles").select("role").eq("id",user.id).single();
 if(p?.role==="admin")return{user,admin,tur:"admin" as const,schoolId:null};
 const [{data:t},{data:m}]=await Promise.all([
  admin.from("teachers").select("school_id").eq("id",user.id).maybeSingle(),
  admin.from("school_moderators").select("school_id").eq("profile_id",user.id).maybeSingle(),
 ]);
 if(m)return{user,admin,tur:"kurum" as const,schoolId:m.school_id as string};
 if(t && p?.role==="mudur")return{user,admin,tur:"kurum" as const,schoolId:t.school_id as string};
 return null;
}

export async function duyuruGecmisiGetir():Promise<{error:string|null;yonetici:boolean;duyurular:DuyuruGecmisiSatiri[]}>{
 const y=await yetki(); if(!y)return{error:"Bu bölümü görüntüleme yetkiniz yok.",yonetici:false,duyurular:[]};
 let q=y.admin.from("duyurular").select("id,baslik,mesaj,created_at,gonderen_adi,gonderen_rol,hedef,alici_sayisi,silindi_at,school_id,schools(ad)").order("created_at",{ascending:false}).limit(500);
 if(y.tur==="kurum"){
  const{data:kurumKullanicilari}=await y.admin.from("teachers").select("id").eq("school_id",y.schoolId!);
  const gonderenIdleri=(kurumKullanicilari??[]).map(k=>k.id);
  if(!gonderenIdleri.length)return{error:null,yonetici:false,duyurular:[]};
  q=q.eq("school_id",y.schoolId!).in("gonderen_id",gonderenIdleri).is("silindi_at",null);
 }
 const {data,error}=await q; if(error)return{error:error.message,yonetici:y.tur==="admin",duyurular:[]};
 const ids=(data??[]).map(d=>d.id); const sayac=new Map<string,number>();
 if(ids.length){const{data:a}=await y.admin.from("duyuru_aliciler").select("duyuru_id").in("duyuru_id",ids);for(const x of a??[])sayac.set(x.duyuru_id,(sayac.get(x.duyuru_id)??0)+1)}
 return{error:null,yonetici:y.tur==="admin",duyurular:(data??[]).map(d=>({id:d.id,baslik:d.baslik,mesaj:d.mesaj,createdAt:d.created_at,gonderenAdi:d.gonderen_adi??"Sistem",gonderenRol:d.gonderen_rol??"sistem",kurumAdi:(d.schools as unknown as {ad:string}|null)?.ad??(d.school_id?"Kurum":"Tüm kurumlar"),hedef:d.hedef??"Belirtilmemiş",aliciSayisi:d.alici_sayisi||sayac.get(d.id)||0,silindi:!!d.silindi_at,silinebilir:y.tur==="admin"&&!d.silindi_at}))};
}

export async function duyuruGecmistenKaldir(id:string){
 const y=await yetki();if(!y||y.tur!=="admin")return{error:"Duyuruyu yalnızca admin kaldırabilir."};
 const{data:d}=await y.admin.from("duyurular").select("id,silindi_at,alici_sayisi").eq("id",id).maybeSingle();if(!d)return{error:"Duyuru bulunamadı."};if(d.silindi_at)return{error:null};
 const{count}=await y.admin.from("duyuru_aliciler").select("*",{count:"exact",head:true}).eq("duyuru_id",id);
 const{error}=await y.admin.from("duyurular").update({silindi_at:new Date().toISOString(),silen_id:y.user.id,alici_sayisi:d.alici_sayisi||count||0}).eq("id",id);if(error)return{error:error.message};
 await y.admin.from("duyuru_aliciler").delete().eq("duyuru_id",id);
 revalidatePath("/dashboard/duyuru-gecmisi");revalidatePath("/yonetici/duyuru-gecmisi");revalidatePath("/moderator/duyurular");
 return{error:null};
}
