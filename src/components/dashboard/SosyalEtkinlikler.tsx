"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { CalendarCheck2, Pencil, Trash2, Trophy, Users, X } from "lucide-react";
import {
  sosyalEtkinlikleriGetir, yarismaEkle, yarismaGuncelle, yarismaSil,
  type AtanabilirOgretmen, type SosyalEtkinlik, type YarismaTuru,
} from "@/app/dashboard/yarisma-actions";
import { BG0, BG1, BORDER, BORDER_STRONG, BLUSH, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

const TURLER: { id: YarismaTuru; ad: string }[] = [
  { id: "proje", ad: "Proje" }, { id: "yarisma", ad: "Yarışma" }, { id: "program", ad: "Program" }, { id: "diger", ad: "Diğer" },
];
const tarihYaz = (tarih: string) => new Date(`${tarih}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

export function SosyalEtkinlikler({ okumaOnayi = true }: { okumaOnayi?: boolean }) {
  const [liste, setListe] = useState<SosyalEtkinlik[]>([]);
  const [ogretmenler, setOgretmenler] = useState<AtanabilirOgretmen[]>([]);
  const [atamaYapabilir, setAtamaYapabilir] = useState(false);
  const [secili, setSecili] = useState<string[]>([]);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [duzenlenenId, setDuzenlenenId] = useState<string | null>(null);
  const [isim, setIsim] = useState("");
  const [tur, setTur] = useState<YarismaTuru>("program");
  const [tarih, setTarih] = useState("");
  const [son, setSon] = useState("");

  const yukle = useCallback(async () => {
    const sonuc = await sosyalEtkinlikleriGetir();
    setListe(sonuc.etkinlikler);
    setOgretmenler(sonuc.ogretmenler);
    setAtamaYapabilir(sonuc.atamaYapabilir);
    setMesaj(sonuc.error);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void yukle(); }, [yukle]);

  function formuTemizle() {
    setDuzenlenenId(null); setIsim(""); setTur("program"); setTarih(""); setSon(""); setSecili([]);
  }
  function duzenle(etkinlik: SosyalEtkinlik) {
    setDuzenlenenId(etkinlik.id); setIsim(etkinlik.isim); setTur(etkinlik.tur);
    setTarih(etkinlik.tarih); setSon(etkinlik.sonBasvuruTarihi ?? ""); setSecili(etkinlik.atananOgretmenIds);
    setMesaj(null);
    requestAnimationFrame(() => document.getElementById("sosyal-gorev-formu")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
  function sec(id: string) { setSecili((onceki) => onceki.includes(id) ? onceki.filter((x) => x !== id) : [...onceki, id]); }
  function kaydet(event: React.FormEvent) {
    event.preventDefault();
    start(async () => {
      const girdi = { isim, tur, tarih, sonBasvuruTarihi: son || undefined, teacherIds: secili };
      const sonuc = duzenlenenId ? await yarismaGuncelle(duzenlenenId, girdi) : await yarismaEkle(girdi);
      setMesaj(sonuc.error ?? (duzenlenenId ? "Görev güncellendi." : "Görev atandı ve öğretmenlere bildirim gönderildi."));
      if (!sonuc.error) { formuTemizle(); await yukle(); }
    });
  }
  function sil(id: string) {
    if (!confirm("Bu görev silinsin mi?")) return;
    start(async () => {
      const sonuc = await yarismaSil(id);
      setMesaj(sonuc.error ?? "Görev silindi.");
      if (!sonuc.error) { if (duzenlenenId === id) formuTemizle(); await yukle(); }
    });
  }

  return <div className="space-y-5">
    <section className="rounded-2xl p-4" style={{ background: BG0, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2"><Trophy size={18} color={MINT} /><h2 className="text-lg font-extrabold" style={{ color: TEXT }}>Görevler</h2></div>
      <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>Okulun sosyal etkinlik, proje, program ve yarışma görevleri. Atanan görevler onay beklemeden öğretmenin takvimine eklenir.</p>
    </section>

    <section>
      <h3 className="mb-3 font-extrabold" style={{ color: TEXT }}>{okumaOnayi ? "Görevleriniz" : "Kurum görevleri"}</h3>
      <div className="sfec-liste">
        {liste.map((etkinlik) => <GorevKarti key={etkinlik.id} etkinlik={etkinlik} pending={pending} onDuzenle={etkinlik.duzenlenebilir ? () => duzenle(etkinlik) : undefined} onSil={etkinlik.silinebilir ? () => sil(etkinlik.id) : undefined} />)}
        {!liste.length && <p className="rounded-2xl p-4 text-sm" style={{ background: BG0, color: TEXT_MUTED }}>Henüz atanmış görev yok.</p>}
      </div>
    </section>

    <form id="sosyal-gorev-formu" onSubmit={kaydet} className="rounded-2xl p-4 sm:p-5" style={{ background: BG0, border: `1px solid ${duzenlenenId ? MINT : BORDER}` }}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-extrabold" style={{ color: TEXT }}>{duzenlenenId ? "Görevi güncelle" : "Yeni görev ekle"}</h3>
        {duzenlenenId && <button type="button" onClick={formuTemizle} className="flex items-center gap-1 text-xs font-bold" style={{ color: TEXT_MUTED }}><X size={14} />Vazgeç</button>}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Alan ad="Görev adı"><input required minLength={2} value={isim} onChange={(e) => setIsim(e.target.value)} /></Alan>
        <Alan ad="Görev türü"><select value={tur} onChange={(e) => setTur(e.target.value as YarismaTuru)}>{TURLER.map((secenek) => <option key={secenek.id} value={secenek.id}>{secenek.ad}</option>)}</select></Alan>
        <Alan ad="Görev tarihi"><input required type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} /></Alan>
        <Alan ad="Son başvuru tarihi (isteğe bağlı)"><input type="date" value={son} onChange={(e) => setSon(e.target.value)} /></Alan>
      </div>
      {atamaYapabilir && <div className="mt-4 rounded-2xl p-3" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: TEXT }}><Users size={14} color={MINT} />Görevlendirilecek öğretmenler</span>
          <button type="button" onClick={() => setSecili(secili.length === ogretmenler.length ? [] : ogretmenler.map((o) => o.id))} className="text-[11px] font-bold" style={{ color: MINT }}>{secili.length === ogretmenler.length ? "Seçimi kaldır" : "Tümünü seç"}</button>
        </div>
        <div className="sfec-liste">{ogretmenler.map((ogretmen) => <label key={ogretmen.id} className="sfec-liste-satiri flex cursor-pointer items-center gap-2 px-2 py-3 text-sm" style={{ background: secili.includes(ogretmen.id) ? MINT_BG : "transparent", color: TEXT }}><input type="checkbox" checked={secili.includes(ogretmen.id)} onChange={() => sec(ogretmen.id)} /><span className="min-w-0"><strong>{ogretmen.ad}</strong><span className="block truncate text-[10px]" style={{ color: TEXT_MUTED }}>{ogretmen.brans}</span></span></label>)}</div>
        {!ogretmenler.length && <p className="text-xs" style={{ color: TEXT_MUTED }}>Atanabilecek öğretmen bulunamadı.</p>}
      </div>}
      <button disabled={pending || (atamaYapabilir && !secili.length)} className="mt-4 rounded-full px-5 py-2 text-sm font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>{pending ? "Kaydediliyor..." : duzenlenenId ? "Güncelle" : atamaYapabilir ? "Seçilen öğretmenlere ata" : "Görevi ekle"}</button>
    </form>
    {mesaj && <p role="status" className="text-sm font-semibold" style={{ color: mesaj.toLocaleLowerCase("tr").includes("hata") || mesaj.toLocaleLowerCase("tr").includes("geçersiz") ? BLUSH : MINT }}>{mesaj}</p>}
  </div>;
}

function Alan({ ad, children }: { ad: string; children: ReactNode }) {
  return <label className="flex flex-col gap-1"><span className="text-xs font-bold" style={{ color: TEXT_MUTED }}>{ad}</span><div className="[&_input]:w-full [&_select]:w-full [&_input]:rounded-xl [&_select]:rounded-xl [&_input]:border-2 [&_select]:border-2 [&_input]:px-3 [&_select]:px-3 [&_input]:py-2.5 [&_select]:py-2.5 [&_input]:text-sm [&_select]:text-sm [&_input]:outline-none [&_select]:outline-none" style={{ color: TEXT }}>{children}</div></label>;
}
function GorevKarti({ etkinlik, pending, onDuzenle, onSil }: { etkinlik: SosyalEtkinlik; pending: boolean; onDuzenle?: () => void; onSil?: () => void }) {
  const turEtiketi = etkinlik.tur === "yarisma" ? "Yarışma" : etkinlik.tur === "proje" ? "Proje" : etkinlik.tur === "program" ? "Program" : "Diğer";
  return <article className="sfec-liste-satiri px-2 py-3" style={{ opacity: etkinlik.aktif ? 1 : .62 }}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: MINT }}>{turEtiketi}</div><h3 className="break-words font-bold" style={{ color: TEXT }}>{etkinlik.isim}</h3><p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>{tarihYaz(etkinlik.tarih)}{etkinlik.sonBasvuruTarihi ? ` · Son başvuru: ${tarihYaz(etkinlik.sonBasvuruTarihi)}` : ""} · {etkinlik.ekleyenAd}{!etkinlik.aktif ? " · Tarihi geçti" : ""}</p>{etkinlik.atananlar.length > 0 && <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>Atananlar: {etkinlik.atananlar.join(", ")}</p>}</div><div className="flex items-center gap-2"><span className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: MINT_BG, color: MINT }}><CalendarCheck2 size={13} />Ajandada</span>{onDuzenle && <button disabled={pending} onClick={onDuzenle} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold" style={{ border: `1px solid ${BORDER_STRONG}`, color: TEXT }}><Pencil size={13} />Güncelle</button>}{onSil && <button disabled={pending} aria-label="Sil" onClick={onSil} className="grid h-8 w-8 place-items-center rounded-full" style={{ border: `1px solid ${BORDER_STRONG}` }}><Trash2 size={14} color={BLUSH} /></button>}</div></div></article>;
}
