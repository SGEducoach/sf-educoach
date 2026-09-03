import type { SupabaseClient } from "@supabase/supabase-js";

export interface AnaSayfaDuyurusu { id:string; baslik:string; icerik:string; createdAt:string; updatedAt:string }

export async function anaSayfaDuyurulariniGetir(supabase: SupabaseClient): Promise<AnaSayfaDuyurusu[]> {
  const {data,error}=await supabase.from("ana_sayfa_duyurulari")
    .select("id, baslik, icerik, created_at, updated_at").order("created_at",{ascending:false}).limit(6);
  if(error){ console.error("ana_sayfa_duyurulari okunamadı:",error.message); return []; }
  return (data??[]).map(r=>({id:r.id,baslik:r.baslik,icerik:r.icerik,createdAt:r.created_at,updatedAt:r.updated_at}));
}
