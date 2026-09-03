"use client";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap, School, Users, UserRoundCheck } from "lucide-react";
import { AnaSayfaSlider } from "@/components/AnaSayfaSlider";
import { AnaSayfaTgAkisi } from "@/components/AnaSayfaTgAkisi";
import { AnaSayfaDuyurular } from "@/components/AnaSayfaDuyurular";
import type { AnaSayfaSliderGorseli } from "@/lib/ana-sayfa";
import type { TgDenemeIlani } from "@/lib/tg-deneme-ilanlari";
import type { AnaSayfaDuyurusu } from "@/lib/ana-sayfa-duyurulari";

const LACIVERT="#0F2540",TURKUAZ="#14B8B0",BEYAZ="#FFF",GRI="#3F4B5A";
const roller=[
 {ad:"Öğrenci",Icon:GraduationCap,renk:"#2563EB",zemin:"#EFF6FF",metin:"Kimseyle yarışmadan, kendi hedefi ve gelişim hızına göre kişiye özel çalışma takibi."},
 {ad:"Öğretmen",Icon:UserRoundCheck,renk:"#7C3AED",zemin:"#F5F3FF",metin:"Öğrencilerin çalışma, soru ve deneme verilerini izleyerek doğru zamanda yönlendirme."},
 {ad:"Veli",Icon:Users,renk:"#C2410C",zemin:"#FFF7ED",metin:"Çocuğunu başkalarıyla kıyaslamadan, kişiye özel gelişimini ve öğretmen geri bildirimlerini güvenle takip."},
 {ad:"Müdür",Icon:School,renk:"#047857",zemin:"#ECFDF5",metin:"Okul veya dershane genelindeki akademik gelişimi, sınıfları ve koçluk sürecini tek yerden izleme."},
];
export function AnaSayfa({baslik,govde,sliderGecisSaniye,sliderGorselleri,tgIlanlar,duyurular}:{baslik:string;govde:string;sliderGecisSaniye:number;sliderGorselleri:AnaSayfaSliderGorseli[];tgIlanlar:TgDenemeIlani[];duyurular:AnaSayfaDuyurusu[]}){
 const paragraflar=govde.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean);
 return <div className="flex min-h-dvh flex-col" style={{background:BEYAZ}}>
  <header className="flex items-center justify-between px-5 py-4 sm:px-10"><Image src="/logo.png" alt="SeFu Koç" width={512} height={512} className="h-10 w-auto object-contain sm:h-12" priority/><Link href="/login" className="rounded-full px-6 py-2.5 text-sm font-bold" style={{background:TURKUAZ,color:BEYAZ}}>GİRİŞ YAP</Link></header>
  <AnaSayfaSlider gorseller={sliderGorselleri} gecisSaniye={sliderGecisSaniye}/>
  <main>
   <section className="mx-auto max-w-6xl px-5 pb-12 pt-10 sm:px-8 sm:pb-16 sm:pt-14">
    <h1 className="text-balance text-center text-3xl font-extrabold leading-tight sm:text-4xl" style={{color:LACIVERT,fontFamily:"var(--font-baloo)"}}>SeFu Koç YKS Hazırlık ve Öğrenci Takip Platformu&apos;na Hoş Geldiniz!</h1>
    <h2 className="mt-9 text-center text-2xl font-extrabold" style={{color:LACIVERT,fontFamily:"var(--font-baloo)"}}>İçeride neler var?</h2>
    <p className="mx-auto mt-3 max-w-3xl text-center text-base leading-7" style={{color:GRI}}>Okul ve dershanelerin kullanabildiği SeFu Koç; öğrenci, öğretmen, veli ve müdür rollerini aynı gelişim sürecinde buluşturan YKS hazırlık ve öğrenci takip platformudur.</p>
    <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{roller.map(({ad,Icon,renk,zemin,metin})=><article key={ad} className="flex flex-col items-center rounded-3xl p-5 text-center sm:items-start sm:text-left" style={{background:zemin,border:`1px solid ${renk}33`}}><div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{background:`${renk}18`}}><Icon color={renk}/></div><h3 className="mt-4 text-lg font-extrabold" style={{color:renk}}>{ad}</h3><p className="mt-2 text-sm leading-6" style={{color:GRI}}>{metin}</p></article>)}</div>
   </section>
   <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-14 sm:px-8 lg:grid-cols-2">
    <div className="min-h-72 overflow-hidden rounded-3xl border border-[#DDE7EA] bg-[#F7FAFB] p-5 shadow-sm"><AnaSayfaTgAkisi dbIlanlar={tgIlanlar}/></div>
    <AnaSayfaDuyurular duyurular={duyurular}/>
   </section>
   <section className="border-t border-[#E4E9EE] bg-[#F7FAFB]"><div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20"><h2 className="text-balance text-2xl font-extrabold leading-tight sm:text-3xl" style={{color:LACIVERT,fontFamily:"var(--font-baloo)"}}>{baslik}</h2><div className="mt-5 space-y-4">{paragraflar.map((p,i)=><p key={i} className="text-base leading-7 sm:text-lg" style={{color:GRI}}>{p}</p>)}</div></div></section>
  </main>
  <footer className="mt-auto px-5 py-6 text-center text-xs" style={{color:GRI}}>© {new Date().getFullYear()} www.sefukoc.com. Tüm hakları saklıdır.</footer>
 </div>;
}
