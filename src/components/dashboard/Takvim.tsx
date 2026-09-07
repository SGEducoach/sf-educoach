"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { CalendarDays, CalendarRange, ListTree, ChevronLeft, ChevronRight, Plus, Trash2, Trophy } from "lucide-react";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import { yarismaEkle, yarismaSil } from "@/app/dashboard/yarisma-actions";
import { createClient } from "@/lib/supabase/client";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, PEACH, PEACH_BG, SKY, SKY_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

type Gorunum = "gunluk" | "haftalik" | "aylik";

export interface TakvimEtkinligi {
  id: string;
  isim: string;
  tur: "proje" | "yarisma" | "program";
  tarih: string;
  sonBasvuruTarihi: string | null;
  ekleyenAd: string;
  okundu: boolean;
  kendiMi: boolean;
}

const TUR_ETIKET = { proje: "Proje", yarisma: "Yarışma", program: "Program" } as const;
const GUN_KISA = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function Takvim({ yurtNobetiSatirlari }: { yurtNobetiSatirlari?: any[] }) {
  const [gorunum, setGorunum] = useState<Gorunum>("gunluk");
  const [seciliGun, setSeciliGun] = useState(bugununTarihiTR());
  const [etkinlikler, setEtkinlikler] = useState<TakvimEtkinligi[]>([]);
  const [pending, startTransition] = useTransition();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: t } = await supabase.from("teachers").select("school_id").eq("id", user.id).maybeSingle();
      if (!t?.school_id) return;
      const { data: y } = await supabase.from("yarismalar")
        .select("id,isim,tur,tarih,son_basvuru_tarihi,teacher_id,profiles!yarismalar_teacher_id_fkey(ad)")
        .eq("school_id", t.school_id)
        .order("tarih", { ascending: true });
      const mapped: TakvimEtkinligi[] = (y ?? []).map((r: any) => ({
        id: r.id,
        isim: r.isim,
        tur: r.tur,
        tarih: r.tarih,
        sonBasvuruTarihi: r.son_basvuru_tarihi,
        ekleyenAd: r.profiles?.ad ?? "Bilinmiyor",
        okundu: false,
        kendiMi: r.teacher_id === user.id,
      }));
      setEtkinlikler(mapped);
    }
    load();
  }, []);

  const nobetTarihleri = useMemo(() => (yurtNobetiSatirlari ?? []).map((s: any) => s.tarih), [yurtNobetiSatirlari]);
  const nobetVarMi = (tarih: string) => nobetTarihleri.includes(tarih);

  const tarihtekiler = (tarih: string) => etkinlikler.filter(e => e.tarih === tarih || e.sonBasvuruTarihi === tarih);
  const haftaBas = useMemo(() => {
    const d = new Date(`${seciliGun}T12:00:00Z`);
    const gun = d.getUTCDay();
    return tarihEkle(seciliGun, gun === 0 ? -6 : 1 - gun);
  }, [seciliGun]);
  const haftaGunleri = useMemo(() => Array.from({ length: 7 }, (_, i) => tarihEkle(haftaBas, i)), [haftaBas]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1.5">
          {(["gunluk","haftalik","aylik"] as Gorunum[]).map(g => (
            <button key={g} onClick={()=>setGorunum(g)} className="sfec-btn text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: gorunum===g?MINT:BG1_ALT, color: gorunum===g?MINT_ON:TEXT_MUTED, border:`2px solid ${BORDER_STRONG}` }}>
              {g[0].toUpperCase()+g.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {gorunum==="gunluk" && (
        <div className="rounded-2xl p-3" style={{ background: BG0, border:`2px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-2">
            <button onClick={()=>setSeciliGun(tarihEkle(seciliGun,-1))} className="sfec-btn w-7 h-7 rounded-full" style={{ background: BG1_ALT, border:`2px solid ${BORDER_STRONG}` }}><ChevronLeft size={13}/></button>
            <span style={{ color: TEXT }} className="text-sm font-bold">{new Date(`${seciliGun}T12:00:00Z`).toLocaleDateString("tr-TR",{day:"numeric",month:"long",year:"numeric"})}</span>
            <button onClick={()=>setSeciliGun(tarihEkle(seciliGun,1))} className="sfec-btn w-7 h-7 rounded-full" style={{ background: BG1_ALT, border:`2px solid ${BORDER_STRONG}` }}><ChevronRight size={13}/></button>
          </div>
          {nobetVarMi(seciliGun) && <div className="mb-2 text-xs font-semibold" style={{ color: SKY }}>Yurt nöbeti</div>}
          <div className="flex flex-col gap-2">
            {tarihtekiler(seciliGun).length===0 ? <p style={{ color: TEXT_MUTED }} className="text-sm">Kayıt yok</p> : tarihtekiler(seciliGun).map(e=>(
              <div key={e.id} className="rounded-xl p-2" style={{ background: BG1_ALT, border:`2px solid ${BORDER}` }}>
                <div style={{ color: TEXT }} className="text-sm font-semibold">{e.isim} <span style={{ color: TEXT_MUTED }}>· {TUR_ETIKET[e.tur]}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      <EtkinlikEkleFormu />
    </div>
  );
}

function EtkinlikEkleFormu() {
  const [isim,setIsim]=useState("");
  const [tur,setTur]=useState<"proje"|"yarisma"|"program">("program");
  const [tarih,setTarih]=useState("");
  const [pending,startTransition]=useTransition();
  const [msg,setMsg]=useState<string|null>(null);
  return (
    <form onSubmit={(e)=>{e.preventDefault(); startTransition(async()=>{const r=await yarismaEkle({isim,tur,tarih}); setMsg(r.error??"Eklendi");})}} className="rounded-2xl p-4" style={{ background: BG1, border:`2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-2"><Trophy size={14} color={MINT}/><span style={{color:TEXT}} className="text-sm font-bold">Etkinlik ekle</span></div>
      <div className="grid gap-2">
        <input value={isim} onChange={e=>setIsim(e.target.value)} placeholder="Etkinlik adı" className="text-sm px-2.5 py-1.5 rounded-xl" style={{ background: BG1_ALT, color: TEXT, border:`2px solid ${BORDER_STRONG}` }}/>
        <select value={tur} onChange={e=>setTur(e.target.value as any)} className="text-sm px-2.5 py-1.5 rounded-xl" style={{ background: BG1_ALT, color: TEXT, border:`2px solid ${BORDER_STRONG}` }}>
          <option value="proje">Proje</option>
          <option value="yarisma">Yarışma</option>
          <option value="program">Program</option>
        </select>
        <input type="date" value={tarih} onChange={e=>setTarih(e.target.value)} className="text-sm px-2.5 py-1.5 rounded-xl" style={{ background: BG1_ALT, color: TEXT, border:`2px solid ${BORDER_STRONG}` }}/>
        <button disabled={pending||!isim||!tarih} className="sfec-btn text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: MINT, color: MINT_ON }}>{pending?"Ekleniyor":"Ekle"}</button>
        {msg && <span className="text-xs" style={{ color: PEACH }}>{msg}</span>}
      </div>
    </form>
  );
}
