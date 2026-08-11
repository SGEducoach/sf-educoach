"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { KeyRound, LayoutDashboard, Search, ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import { moderatorAktiflikDegistir, moderatorHesapSil, moderatorSifreSifirla, type ModeratorKullanici } from "@/app/moderator/actions";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

export function ModeratorPanel({ okulAdi, kullanicilar }: { okulAdi: string; kullanicilar: ModeratorKullanici[] }) {
  const SAYFA_BOYUTU = 50;
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [sekme, setSekme] = useState<"tumu" | ModeratorKullanici["kategori"]>("ogrenci");
  const [arama, setArama] = useState("");
  const [sinif, setSinif] = useState("tumu");
  const [sayfa, setSayfa] = useState(1);
  const siniflar = useMemo(() => [...new Set(kullanicilar.map((k) => k.sinif).filter((x): x is string => !!x))].sort(), [kullanicilar]);
  const sayilar = useMemo(() => ({
    tumu: kullanicilar.length,
    ogrenci: kullanicilar.filter((k) => k.kategori === "ogrenci").length,
    ogretmen: kullanicilar.filter((k) => k.kategori === "ogretmen").length,
    veli: kullanicilar.filter((k) => k.kategori === "veli").length,
  }), [kullanicilar]);
  const gosterilenler = useMemo(() => {
    const terim = arama.trim().toLocaleLowerCase("tr-TR");
    return kullanicilar.filter((k) =>
      (sekme === "tumu" || k.kategori === sekme)
      && (sinif === "tumu" || k.sinif === sinif)
      && (!terim || `${k.ad} ${k.detay}`.toLocaleLowerCase("tr-TR").includes(terim))
    );
  }, [arama, kullanicilar, sekme, sinif]);
  const toplamSayfa = Math.max(1, Math.ceil(gosterilenler.length / SAYFA_BOYUTU));
  const etkinSayfa = Math.min(sayfa, toplamSayfa);
  const sayfadakiler = useMemo(() => gosterilenler.slice((etkinSayfa - 1) * SAYFA_BOYUTU, etkinSayfa * SAYFA_BOYUTU), [etkinSayfa, gosterilenler]);
  const sekmeler = [
    { id: "ogrenci" as const, ad: "Öğrenciler" },
    { id: "ogretmen" as const, ad: "Öğretmenler" },
    { id: "veli" as const, ad: "Veliler" },
    { id: "tumu" as const, ad: "Tümü" },
  ];
  return <div className="flex flex-col gap-5">
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2"><ShieldCheck size={18} color={MINT} /><h1 style={{ color: TEXT }} className="font-bold">{okulAdi} Moderatör Paneli</h1></div>
      <p style={{ color: TEXT_MUTED }} className="mt-2 text-xs leading-relaxed">Yetkiniz yalnız bu okulun öğrenci, öğretmen, müdür ve bağlı velileriyle sınırlıdır. Başka okulların kayıtları görüntülenmez veya değiştirilemez.</p>
      <Link href="/dashboard" className="sgec-btn mt-4 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}><LayoutDashboard size={14}/>Ana sayfaya dön</Link>
    </div>
    {mesaj && <div className="rounded-xl p-3 text-xs font-bold" style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT, background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>{mesaj}</div>}
    <div className="rounded-3xl p-3 sm:p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sekmeler.map((s) => <button key={s.id} type="button" onClick={() => { setSekme(s.id); setSayfa(1); if (s.id === "veli") setSinif("tumu"); }} className="sgec-btn rounded-xl px-2 py-2.5 text-xs font-bold" style={{ background: sekme === s.id ? MINT : BG1_ALT, color: sekme === s.id ? "#18302f" : TEXT, border: `2px solid ${sekme === s.id ? MINT : BORDER_STRONG}` }}>{s.ad} ({sayilar[s.id]})</button>)}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_180px]">
        <label className="relative"><Search size={14} color={TEXT_MUTED} className="absolute left-3 top-1/2 -translate-y-1/2"/><input value={arama} onChange={(e) => { setArama(e.target.value); setSayfa(1); }} placeholder="İsim, okul no veya branş ara" className="w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}/></label>
        <select value={sinif} onChange={(e) => { setSinif(e.target.value); setSayfa(1); }} disabled={sekme === "veli"} className="rounded-xl px-3 py-2 text-sm outline-none disabled:opacity-50" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}><option value="tumu">Tüm sınıflar</option>{siniflar.map((s) => <option key={s} value={s}>{s}</option>)}</select>
      </div>
      <p style={{ color: TEXT_MUTED }} className="mt-3 text-xs font-semibold">Listelenen kişi: <strong style={{ color: TEXT }}>{gosterilenler.length}</strong></p>
    </div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {sayfadakiler.map(k => <div key={k.id} className="rounded-2xl p-3.5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div style={{ color: TEXT }} className="text-sm font-bold">{k.ad}</div><div style={{ color: TEXT_MUTED }} className="text-xs">{k.detay}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={pending} onClick={() => startTransition(async () => { const r = await moderatorSifreSifirla(k.id); setMesaj(r.error ? `Hata: ${r.error}` : `Geçici şifre (${k.ad}): ${r.sifre}`); })} className="sgec-btn flex-1 rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}><KeyRound className="mr-1 inline" size={12}/>Şifre sıfırla</button>
          <button disabled={pending} onClick={() => startTransition(async () => { const r = await moderatorAktiflikDegistir(k.id, !k.aktif); setMesaj(r.error ? `Hata: ${r.error}` : "İşlem tamamlandı."); })} className="sgec-btn flex-1 rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: k.aktif ? BLUSH : MINT, border: `2px solid ${BORDER_STRONG}` }}>{k.aktif ? <UserX className="mr-1 inline" size={12}/> : <UserCheck className="mr-1 inline" size={12}/>} {k.aktif ? "Pasifleştir" : "Aktifleştir"}</button>
          <button disabled={pending} onClick={() => { if (!window.confirm(`${k.ad} hesabı kalıcı olarak silinsin mi?`)) return; startTransition(async () => { const r = await moderatorHesapSil(k.id); setMesaj(r.error ? `Hata: ${r.error}` : "Hesap silindi."); }); }} className="sgec-btn rounded-lg px-3 py-2 text-[11px] font-bold" style={{ color: BLUSH, border: `2px solid ${BORDER_STRONG}` }}><Trash2 className="mr-1 inline" size={12}/>Sil</button>
        </div>
      </div>)}
      {gosterilenler.length === 0 && <div className="col-span-full rounded-2xl p-6 text-center text-sm" style={{ color: TEXT_MUTED, background: BG1, border: `2px solid ${BORDER}` }}>Bu filtrelere uygun kullanıcı bulunamadı.</div>}
    </div>
    {toplamSayfa > 1 && <nav aria-label="Kullanıcı listesi sayfaları" className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" disabled={sayfa === 1} onClick={() => setSayfa((s) => Math.max(1, s - 1))} className="sgec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40" style={{ color: TEXT, background: BG1, border: `2px solid ${BORDER_STRONG}` }}>Önceki</button>
      {Array.from({ length: toplamSayfa }, (_, i) => i + 1).map((no) => <button key={no} type="button" aria-current={sayfa === no ? "page" : undefined} onClick={() => setSayfa(no)} className="sgec-btn min-w-9 rounded-xl px-3 py-2 text-xs font-bold" style={{ color: sayfa === no ? "#18302f" : TEXT, background: sayfa === no ? MINT : BG1, border: `2px solid ${sayfa === no ? MINT : BORDER_STRONG}` }}>{no}</button>)}
      <button type="button" disabled={sayfa === toplamSayfa} onClick={() => setSayfa((s) => Math.min(toplamSayfa, s + 1))} className="sgec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40" style={{ color: TEXT, background: BG1, border: `2px solid ${BORDER_STRONG}` }}>Sonraki</button>
    </nav>}
  </div>;
}
