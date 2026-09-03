"use client";
import { useState,useTransition } from "react";
import { Bell, Pencil, Trash2 } from "lucide-react";
import { anaSayfaDuyurusuKaydet, anaSayfaDuyurusuSil } from "@/app/yonetici/actions";
import type { AnaSayfaDuyurusu } from "@/lib/ana-sayfa-duyurulari";
import {BG0,BG1,BG1_ALT,BLUSH,BORDER,BORDER_STRONG,MINT,MINT_ON,TEXT,TEXT_MUTED} from "@/lib/theme";

export function AnaSayfaDuyuruYonetimi({baslangic}:{baslangic:AnaSayfaDuyurusu[]}){
 const [liste,setListe]=useState(baslangic),[id,setId]=useState<string|null>(null),[baslik,setBaslik]=useState(""),[icerik,setIcerik]=useState(""),[mesaj,setMesaj]=useState<string|null>(null),[pending,start]=useTransition();
 function temizle(){setId(null);setBaslik("");setIcerik("");}
 function duzenle(d:AnaSayfaDuyurusu){setId(d.id);setBaslik(d.baslik);setIcerik(d.icerik);setMesaj(null);}
 function kaydet(e:React.FormEvent){e.preventDefault();setMesaj(null);start(async()=>{const r=await anaSayfaDuyurusuKaydet({id,baslik,icerik});if(r.error)return setMesaj(r.error);setListe(r.duyurular);temizle();setMesaj("Duyuru kaydedildi.");});}
 function sil(d:AnaSayfaDuyurusu){if(!confirm(`“${d.baslik}” silinsin mi?`))return;start(async()=>{const r=await anaSayfaDuyurusuSil(d.id);if(r.error)return setMesaj(r.error);setListe(r.duyurular);if(id===d.id)temizle();setMesaj("Duyuru silindi.");});}
 return <div className="mt-4 rounded-3xl p-5" style={{background:BG1,border:`2px solid ${BORDER}`}}>
  <div className="flex items-center gap-2"><Bell size={16} color={MINT}/><h2 className="font-bold" style={{color:TEXT}}>Ana Sayfa Duyuruları</h2></div>
  <p className="mt-1 text-[11px]" style={{color:TEXT_MUTED}}>En fazla 6 duyuru tutulur. Yedincisi eklendiğinde tarihi en eski olan otomatik silinir.</p>
  <form onSubmit={kaydet} className="mt-3 flex flex-col gap-2.5 rounded-2xl p-4" style={{background:BG1_ALT,border:`2px solid ${BORDER_STRONG}`}}>
   <input aria-label="Duyuru başlığı" placeholder="Duyuru başlığı" value={baslik} onChange={e=>setBaslik(e.target.value.slice(0,120))} className="rounded-xl px-3 py-2 text-sm outline-none" style={{background:BG0,color:TEXT,border:`2px solid ${BORDER_STRONG}`}}/>
   <textarea aria-label="Duyuru içeriği" placeholder="Duyuru içeriği" value={icerik} onChange={e=>setIcerik(e.target.value.slice(0,2000))} rows={5} className="resize-y rounded-xl px-3 py-2 text-sm outline-none" style={{background:BG0,color:TEXT,border:`2px solid ${BORDER_STRONG}`}}/>
   <div className="flex flex-wrap gap-2"><button disabled={pending} className="rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60" style={{background:MINT,color:MINT_ON}}>{pending?"Kaydediliyor...":id?"Değişiklikleri kaydet":"Duyuru ekle"}</button>{id&&<button type="button" onClick={temizle} className="rounded-xl px-4 py-2 text-sm" style={{color:TEXT,border:`2px solid ${BORDER_STRONG}`}}>Vazgeç</button>}</div>
   {mesaj&&<p role="status" className="text-xs" style={{color:mesaj.includes("kaydedildi")||mesaj.includes("silindi")?MINT:BLUSH}}>{mesaj}</p>}
  </form>
  <div className="mt-3 space-y-2">{liste.map(d=><div key={d.id} className="flex items-center gap-3 rounded-xl p-3" style={{background:BG1_ALT,border:`2px solid ${BORDER_STRONG}`}}><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold" style={{color:TEXT}}>{d.baslik}</p><p className="truncate text-xs" style={{color:TEXT_MUTED}}>{d.icerik}</p></div><button title="Düzenle" aria-label={`${d.baslik} duyurusunu düzenle`} onClick={()=>duzenle(d)}><Pencil size={16} color={MINT}/></button><button title="Sil" aria-label={`${d.baslik} duyurusunu sil`} onClick={()=>sil(d)}><Trash2 size={16} color={BLUSH}/></button></div>)}</div>
 </div>;
}
