"use client";
import { useEffect, useId, useState } from "react";
import { Bell, X } from "lucide-react";
import type { AnaSayfaDuyurusu } from "@/lib/ana-sayfa-duyurulari";

const TURKUAZ="#14B8B0", LACIVERT="#0F2540", GRI="#5A6472";
export function AnaSayfaDuyurular({duyurular}:{duyurular:AnaSayfaDuyurusu[]}){
  const [aktif,setAktif]=useState(0), [acik,setAcik]=useState<AnaSayfaDuyurusu|null>(null);
  const baslikId=useId();
  useEffect(()=>{ if(duyurular.length<2)return; const z=setInterval(()=>setAktif(i=>(i+1)%duyurular.length),6000); return()=>clearInterval(z);},[duyurular.length]);
  useEffect(()=>{ if(!acik)return; const k=(e:KeyboardEvent)=>{if(e.key==="Escape")setAcik(null)}; addEventListener("keydown",k); return()=>removeEventListener("keydown",k);},[acik]);
  const d=duyurular[aktif%Math.max(1,duyurular.length)];
  return <section className="flex h-72 min-w-0 flex-col overflow-hidden rounded-3xl border border-[#DDE7EA] bg-[#F7FAFB] p-5 shadow-sm">
    <div className="flex items-center gap-2"><Bell size={16} color={TURKUAZ}/><h2 className="text-xs font-bold uppercase tracking-[.14em]" style={{color:TURKUAZ}}>Duyurular</h2></div>
    {d ? <button key={d.id} type="button" onClick={()=>setAcik(d)} className="sfec-tg-haber-gir my-auto min-h-0 w-full overflow-hidden rounded-2xl p-4 text-left hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2" style={{outlineColor:TURKUAZ}}>
      <p className="text-xs font-bold" style={{color:TURKUAZ}}>{new Date(d.createdAt).toLocaleDateString("tr-TR")}</p>
      <h3 className="mt-2 overflow-hidden text-lg font-extrabold" style={{color:LACIVERT,display:"-webkit-box",WebkitBoxOrient:"vertical",WebkitLineClamp:2}}>{d.baslik}</h3>
      <p className="mt-2 overflow-hidden text-sm leading-6" style={{color:GRI,display:"-webkit-box",WebkitBoxOrient:"vertical",WebkitLineClamp:3}}>{d.icerik}</p>
      <span className="mt-3 block text-xs font-bold" style={{color:TURKUAZ}}>Devamını oku</span>
    </button>:<p className="my-auto text-center text-sm" style={{color:GRI}}>Henüz duyuru yok.</p>}
    {duyurular.length>1&&<div className="flex justify-center gap-1.5">{duyurular.map((x,i)=><button key={x.id} onClick={()=>setAktif(i)} aria-label={`${i+1}. duyuruya git`} className="h-1.5 rounded-full" style={{width:i===aktif?16:6,background:i===aktif?TURKUAZ:"#D5DCE1"}}/>)}</div>}
    {acik&&<div className="fixed inset-0 z-[500] flex items-end justify-center bg-[#0F2540]/60 p-3 backdrop-blur-sm sm:items-center" onClick={()=>setAcik(null)}>
      <article role="dialog" aria-modal="true" aria-labelledby={baslikId} className="max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={e=>e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4"><h2 id={baslikId} className="text-xl font-extrabold" style={{color:LACIVERT}}>{acik.baslik}</h2><button aria-label="Kapat" onClick={()=>setAcik(null)}><X color={GRI}/></button></div>
        <p className="mt-2 text-xs font-bold" style={{color:TURKUAZ}}>{new Date(acik.createdAt).toLocaleDateString("tr-TR")}</p><p className="mt-5 whitespace-pre-line text-sm leading-7" style={{color:GRI}}>{acik.icerik}</p>
      </article></div>}
  </section>;
}
