"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface DuyuruGecmisiSatiri {
  id:string; baslik:string; mesaj:string; createdAt:string; gonderenAdi:string; gonderenRol:string;
  kurumAdi:string; hedef:string; aliciSayisi:number; silindi:boolean; silinebilir:boolean;
}

// Kullanıcı isteği (03.09.2026): Duyuru Geçmişi ARTIK YALNIZCA ADMİN'E ait —
// müdür ve okul moderatörü bu ekranı hiç görmüyor (menüden de kaldırıldı,
// bkz. dashboard-navigation.ts ve YonetimNavigasyonu.tsx). Yetki kontrolü
// menüyle sınırlı bırakılmadı: doğrudan URL'den ya da eski bir bağlantıdan
// gelen istekler de burada reddediliyor.
async function yetki(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
 const admin=createAdminClient(); const {data:p}=await admin.from("profiles").select("role").eq("id",user.id).single();
 if(p?.role!=="admin")return null;
 return{user,admin};
}

export async function duyuruGecmisiGetir():Promise<{error:string|null;yonetici:boolean;duyurular:DuyuruGecmisiSatiri[]}>{
 const y=await yetki(); if(!y)return{error:"Bu bölümü görüntüleme yetkiniz yok.",yonetici:false,duyurular:[]};
 const q=y.admin.from("duyurular").select("id,baslik,mesaj,created_at,gonderen_adi,gonderen_rol,hedef,alici_sayisi,silindi_at,school_id,schools(ad)").order("created_at",{ascending:false}).limit(500);
 const {data,error}=await q; if(error)return{error:error.message,yonetici:true,duyurular:[]};
 const ids=(data??[]).map(d=>d.id); const sayac=new Map<string,number>();
 if(ids.length){const{data:a}=await y.admin.from("duyuru_aliciler").select("duyuru_id").in("duyuru_id",ids);for(const x of a??[])sayac.set(x.duyuru_id,(sayac.get(x.duyuru_id)??0)+1)}
 return{error:null,yonetici:true,duyurular:(data??[]).map(d=>({id:d.id,baslik:d.baslik,mesaj:d.mesaj,createdAt:d.created_at,gonderenAdi:d.gonderen_adi??"Sistem",gonderenRol:d.gonderen_rol??"sistem",kurumAdi:(d.schools as unknown as {ad:string}|null)?.ad??(d.school_id?"Kurum":"Tüm kurumlar"),hedef:d.hedef??"Belirtilmemiş",aliciSayisi:d.alici_sayisi||sayac.get(d.id)||0,silindi:!!d.silindi_at,silinebilir:!d.silindi_at}))};
}

export async function duyuruGecmistenKaldir(id:string){
 const y=await yetki();if(!y)return{error:"Duyuruyu yalnızca admin kaldırabilir."};
 const{data:d}=await y.admin.from("duyurular").select("id,silindi_at,alici_sayisi").eq("id",id).maybeSingle();if(!d)return{error:"Duyuru bulunamadı."};if(d.silindi_at)return{error:null};
 const{count}=await y.admin.from("duyuru_aliciler").select("*",{count:"exact",head:true}).eq("duyuru_id",id);
 const{error}=await y.admin.from("duyurular").update({silindi_at:new Date().toISOString(),silen_id:y.user.id,alici_sayisi:d.alici_sayisi||count||0}).eq("id",id);if(error)return{error:error.message};
 await y.admin.from("duyuru_aliciler").delete().eq("duyuru_id",id);
 revalidatePath("/yonetici/duyuru-gecmisi");
 return{error:null};
}
