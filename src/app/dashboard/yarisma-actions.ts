"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createAdminClient} from "@/lib/supabase/admin";

export type YarismaTuru="proje"|"yarisma"|"program";
export type AtanabilirOgretmen={id:string;ad:string;brans:string};
export type SosyalEtkinlik={id:string;isim:string;tur:YarismaTuru;tarih:string;sonBasvuruTarihi:string|null;ekleyenAd:string;okundu:boolean;kendiMi:boolean;silinebilir:boolean;aktif:boolean;atananlar:string[]};
type Yetki={admin:ReturnType<typeof createAdminClient>;user:{id:string};teacher:{school_id:string}|null;schoolId:string|null;yoneticiMi:boolean;error:string|null};

async function yetki():Promise<Yetki>{
 const supabase=await createClient();const{data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login");
 const admin=createAdminClient();const[{data:profil},{data:teacher},{data:moderator}]=await Promise.all([
  admin.from("profiles").select("role").eq("id",user.id).maybeSingle(),admin.from("teachers").select("school_id").eq("id",user.id).maybeSingle(),admin.from("school_moderators").select("school_id").eq("profile_id",user.id).maybeSingle()]);
 const schoolId=(teacher?.school_id??moderator?.school_id??null) as string|null,yoneticiMi=profil?.role==="mudur"||!!moderator;
 if(!schoolId)return{admin,user,teacher:null,schoolId:null,yoneticiMi,error:"Kurum kaydı bulunamadı."};
 const{data:okul}=await admin.from("schools").select("tur").eq("id",schoolId).maybeSingle();
 if(okul?.tur!=="okul"||!(profil?.role==="ogretmen"||profil?.role==="mudur"||moderator))return{admin,user,teacher,schoolId:null,yoneticiMi,error:"Bu bölüm yalnızca okul öğretmeni, müdürü ve moderatörüne açıktır."};
 return{admin,user,teacher,schoolId,yoneticiMi,error:null};
}
function yenile(){revalidatePath("/dashboard/takvim");revalidatePath("/dashboard/yarismalar");revalidatePath("/moderator")}

export async function sosyalEtkinlikleriGetir():Promise<{etkinlikler:SosyalEtkinlik[];ogretmenler:AtanabilirOgretmen[];atamaYapabilir:boolean;error:string|null}>{
 const k=await yetki();if(k.error||!k.schoolId)return{etkinlikler:[],ogretmenler:[],atamaYapabilir:false,error:k.error};
 const bugun=new Date().toISOString().slice(0,10);await k.admin.from("yarismalar").update({aktif:false}).eq("school_id",k.schoolId).eq("aktif",true).lt("tarih",bugun);
 const[{data:ham,error},{data:ogretmenHam}]=await Promise.all([
  k.admin.from("yarismalar").select("id,isim,tur,tarih,son_basvuru_tarihi,teacher_id,olusturan_id,aktif").eq("school_id",k.schoolId).order("tarih"),
  k.admin.from("teachers").select("id,brans,profiles!teachers_id_fkey(ad,role)").eq("school_id",k.schoolId)]);
 if(error)return{etkinlikler:[],ogretmenler:[],atamaYapabilir:k.yoneticiMi,error:error.message};
 type ORow={id:string;brans:string;profiles:{ad:string;role:string}|null};
 const ogretmenler=((ogretmenHam as unknown as ORow[])??[]).filter(o=>o.profiles?.role==="ogretmen").map(o=>({id:o.id,ad:o.profiles?.ad??"İsimsiz",brans:o.brans})).sort((a,b)=>a.ad.localeCompare(b.ad,"tr"));
 const tumIds=(ham??[]).map(x=>x.id);const{data:atamalar}=tumIds.length?await k.admin.from("yarisma_ogretmen_atamalari").select("yarisma_id,teacher_id").in("yarisma_id",tumIds):{data:[]};
 const atamaMap=new Map<string,string[]>();for(const a of atamalar??[])atamaMap.set(a.yarisma_id,[...(atamaMap.get(a.yarisma_id)??[]),a.teacher_id]);
 const gorunen=k.yoneticiMi?(ham??[]):(ham??[]).filter(x=>atamaMap.get(x.id)?.includes(k.user.id));
 const profilIds=gorunen.map(x=>x.olusturan_id??x.teacher_id).filter(Boolean) as string[];const{data:adlar}=profilIds.length?await k.admin.from("profiles").select("id,ad").in("id",profilIds):{data:[]};const adMap=new Map((adlar??[]).map(x=>[x.id,x.ad]));
 const{data:onaylar}=k.teacher?await k.admin.from("gorev_okuma_onaylari").select("etkinlik_id").eq("teacher_id",k.user.id).eq("okudum",true):{data:[]};const okunan=new Set((onaylar??[]).map(x=>x.etkinlik_id));const ogretmenMap=new Map(ogretmenler.map(o=>[o.id,o.ad]));
 return{etkinlikler:gorunen.map(x=>({id:x.id,isim:x.isim,tur:x.tur as YarismaTuru,tarih:x.tarih,sonBasvuruTarihi:x.son_basvuru_tarihi,ekleyenAd:adMap.get(x.olusturan_id??x.teacher_id)??"Kurum yönetimi",okundu:okunan.has(x.id),kendiMi:(x.olusturan_id??x.teacher_id)===k.user.id,silinebilir:k.yoneticiMi||(x.olusturan_id??x.teacher_id)===k.user.id,aktif:x.aktif,atananlar:(atamaMap.get(x.id)??[]).map(id=>ogretmenMap.get(id)??"Öğretmen")})),ogretmenler,atamaYapabilir:k.yoneticiMi,error:null};
}

export async function yarismaEkle(input:{isim:string;tur:YarismaTuru;tarih:string;sonBasvuruTarihi?:string;teacherIds?:string[]}){
 const k=await yetki();if(k.error||!k.schoolId)return{error:k.error};const isim=input.isim.trim();
 if(isim.length<2||isim.length>200)return{error:"Etkinlik adı 2-200 karakter olmalıdır."};if(!["proje","yarisma","program"].includes(input.tur))return{error:"Geçerli bir etkinlik türü seçin."};if(!/^\d{4}-\d{2}-\d{2}$/.test(input.tarih))return{error:"Geçerli bir etkinlik tarihi girin."};if(input.sonBasvuruTarihi&&!/^\d{4}-\d{2}-\d{2}$/.test(input.sonBasvuruTarihi))return{error:"Son başvuru tarihi geçersiz."};
 let teacherIds=k.yoneticiMi?[...new Set(input.teacherIds??[])]:k.teacher?[k.user.id]:[];if(!teacherIds.length)return{error:"En az bir öğretmen seçin."};
 const{data:uygunlar}=await k.admin.from("teachers").select("id").eq("school_id",k.schoolId).in("id",teacherIds);teacherIds=(uygunlar??[]).map(x=>x.id);if(!teacherIds.length)return{error:"Seçilen öğretmenler bu okula ait değil."};
 const{data:kayit,error}=await k.admin.from("yarismalar").insert({school_id:k.schoolId,teacher_id:k.teacher?k.user.id:null,olusturan_id:k.user.id,isim,tur:input.tur,tarih:input.tarih,son_basvuru_tarihi:input.sonBasvuruTarihi||null}).select("id").single();if(error||!kayit)return{error:error?.message??"Etkinlik oluşturulamadı."};
 const{error:atamaHatasi}=await k.admin.from("yarisma_ogretmen_atamalari").insert(teacherIds.map(teacher_id=>({yarisma_id:kayit.id,teacher_id,atayan_id:k.user.id})));if(atamaHatasi){await k.admin.from("yarismalar").delete().eq("id",kayit.id);return{error:atamaHatasi.message}}yenile();return{error:null};
}
export async function yarismaSil(id:string){const k=await yetki();if(k.error||!k.schoolId)return{error:k.error};if(!k.yoneticiMi){const{data:x}=await k.admin.from("yarismalar").select("olusturan_id,teacher_id").eq("id",id).eq("school_id",k.schoolId).maybeSingle();if(!x||(x.olusturan_id??x.teacher_id)!==k.user.id)return{error:"Yalnızca kendi eklediğiniz etkinliği silebilirsiniz."}}const{error}=await k.admin.from("yarismalar").delete().eq("id",id).eq("school_id",k.schoolId);yenile();return{error:error?.message??null}}
export async function etkinlikOkudum(id:string){const k=await yetki();if(k.error||!k.schoolId||!k.teacher)return{error:k.error??"Ajanda onayı yalnız öğretmenler içindir."};const{data:atama}=await k.admin.from("yarisma_ogretmen_atamalari").select("id,yarismalar!inner(school_id)").eq("yarisma_id",id).eq("teacher_id",k.user.id).maybeSingle();if(!atama)return{error:"Bu görev size atanmamış."};const{error}=await k.admin.from("gorev_okuma_onaylari").upsert({teacher_id:k.user.id,etkinlik_id:id,okudum:true,okunma_tarihi:new Date().toISOString()},{onConflict:"teacher_id,etkinlik_id"});yenile();return{error:error?.message??null}}
