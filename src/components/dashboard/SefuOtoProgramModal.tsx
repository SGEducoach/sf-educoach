"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown, ArrowLeftRight, ArrowUp, BrainCircuit, CalendarDays, Check, ChevronLeft, ChevronRight,
  Plus, RefreshCw, Sparkles, Trash2, X,
} from "lucide-react";
import { otoProgramHazirla, otoProgramUygula } from "@/app/dashboard/oto-program-actions";
import {
  CEYREK_SAATLER, DERS_AGIRLIGI_ETIKET, GUN_ADLARI,
  ayarHatasi, blokDakikasi, bloklariDogrula, dakikayiSaateCevir, gunEkle, gunlukYukUyarisi,
  haftaninPazartesisi, otoProgramOlustur,
} from "@/lib/oto-program";
import { saatAraligiSuresi, saatiDakikayaCevir } from "@/lib/saat-araligi";
import type {
  DersAgirligi, OtoProgramAyari, OtoProgramVerisi, Periyot, ProgramBlogu, ProgramKapsami,
} from "@/lib/oto-program";
import { bugununTarihiTR } from "@/lib/tarih";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, PEACH, PEACH_BG, BLUSH, BLUSH_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

const BASAMAKLAR = ["Dönem", "Gün ve saat", "Dersler", "Önizleme"];
const AGIRLIKLAR: DersAgirligi[] = ["agirlikli", "orta", "hafif"];
// Öğrencinin seçtiği periyot sınırları 15 dakikalıktır. SeFu'nun ürettiği
// 40 dakikalık çalışma + 10 dakikalık mola düzeni ise :40 ve :50 değerleri
// de oluşturur; önizlemede bu saatler kaybolmasın diye düzenleme 5 dakikadır.
const DUZENLEME_SAATLERI = Array.from({ length: 288 }, (_, i) => `${String(Math.floor(i / 12)).padStart(2, "0")}:${String((i % 12) * 5).padStart(2, "0")}`);

function tarihYaz(tarih: string) {
  return new Date(`${tarih}T12:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "short", weekday: "short", timeZone: "UTC" });
}

function varsayilanAyar(okulOgrencisi: boolean): OtoProgramAyari {
  return {
    gunler: [0, 1, 2, 3, 4],
    haftaIciPeriyotlari: okulOgrencisi
      ? [{ baslangic: "17:00", bitis: "19:00" }, { baslangic: "20:00", bitis: "22:00" }]
      : [{ baslangic: "10:00", bitis: "12:00" }, { baslangic: "17:00", bitis: "19:00" }],
    haftaSonuPeriyotlari: [{ baslangic: "10:00", bitis: "12:00" }],
    dersler: [],
  };
}

function Alan({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl p-3 ${className}`} style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>{children}</div>;
}

function Periyotlar({ baslik, periyotlar, onChange, okulUyarisi }: {
  baslik: string;
  periyotlar: Periyot[];
  onChange: (periyotlar: Periyot[]) => void;
  okulUyarisi?: boolean;
}) {
  const saatler = okulUyarisi ? CEYREK_SAATLER.filter((s) => s >= "16:00" || s < "07:00") : CEYREK_SAATLER;
  function degistir(index: number, alan: keyof Periyot, deger: string) {
    onChange(periyotlar.map((p, i) => i === index ? { ...p, [alan]: deger } : p));
  }
  return (
    <Alan>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-xs font-extrabold" style={{ color: TEXT }}>{baslik}</div>
          {okulUyarisi && <div className="mt-0.5 text-[10px]" style={{ color: TEXT_MUTED }}>07.00–16.00 okul saati kapalıdır.</div>}
        </div>
        {periyotlar.length < 3 && (
          <button type="button" onClick={() => onChange([...periyotlar, { baslangic: okulUyarisi ? "17:00" : "10:00", bitis: okulUyarisi ? "19:00" : "12:00" }])}
            className="sfec-btn inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ color: MINT, border: `1px solid ${MINT}` }}>
            <Plus size={11} /> Periyot
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {periyotlar.map((p, i) => (
          <div key={i} className="grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
            <span className="text-[10px] font-bold" style={{ color: TEXT_MUTED }}>{i + 1}.</span>
            <select aria-label={`${baslik} ${i + 1}. periyot başlangıcı`} value={p.baslangic} onChange={(e) => degistir(i, "baslangic", e.target.value)}
              className="min-w-0 rounded-xl px-2 py-2 text-xs outline-none" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
              {saatler.map((s) => <option key={s}>{s}</option>)}
            </select>
            <span className="text-xs" style={{ color: TEXT_MUTED }}>–</span>
            <select aria-label={`${baslik} ${i + 1}. periyot bitişi`} value={p.bitis} onChange={(e) => degistir(i, "bitis", e.target.value)}
              className="min-w-0 rounded-xl px-2 py-2 text-xs outline-none" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
              {saatler.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button type="button" title="Periyodu kaldır" onClick={() => onChange(periyotlar.filter((_, pi) => pi !== i))}
              className="sfec-btn flex h-8 w-8 items-center justify-center rounded-full" style={{ color: BLUSH, background: BLUSH_BG }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {periyotlar.length === 0 && <div className="py-2 text-center text-[11px]" style={{ color: TEXT_MUTED }}>Bu gün grubu için periyot eklenmedi.</div>}
      </div>
    </Alan>
  );
}

export function SefuOtoProgramModal({ ilkHafta, onKapat }: { ilkHafta: string; onKapat: () => void }) {
  const router = useRouter();
  const bugunPazartesi = haftaninPazartesisi(bugununTarihiTR());
  const guvenliIlkHafta = ilkHafta >= bugunPazartesi ? ilkHafta : bugunPazartesi;
  const [adim, setAdim] = useState(0);
  const [baslangicTarihi, setBaslangicTarihi] = useState(guvenliIlkHafta);
  const [kapsam, setKapsam] = useState<ProgramKapsami>("haftalik");
  const [veri, setVeri] = useState<OtoProgramVerisi | null>(null);
  const [ayar, setAyar] = useState<OtoProgramAyari>(() => varsayilanAyar(true));
  const [bloklar, setBloklar] = useState<ProgramBlogu[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const donemTarihleri = useMemo(() => Array.from({ length: kapsam === "aylik" ? 28 : 7 }, (_, i) => gunEkle(baslangicTarihi, i)), [baslangicTarihi, kapsam]);
  const toplamDakika = bloklar.reduce((t, b) => t + blokDakikasi(b), 0);
  const dersOzetleri = useMemo(() => {
    const sonuc = new Map<string, number>();
    for (const b of bloklar) sonuc.set(b.ders, (sonuc.get(b.ders) ?? 0) + blokDakikasi(b));
    return [...sonuc.entries()].sort((a, b) => b[1] - a[1]);
  }, [bloklar]);

  function veriHazirla(sonrakiAdim = 1, tasinacakAyar?: OtoProgramAyari) {
    setHata(null);
    startTransition(async () => {
      const sonuc = await otoProgramHazirla(baslangicTarihi, kapsam);
      if (sonuc.error || !sonuc.veri) return setHata(sonuc.error ?? "Program verisi alınamadı.");
      setVeri(sonuc.veri);
      if (tasinacakAyar) setAyar(tasinacakAyar);
      else if (!veri) setAyar(varsayilanAyar(sonuc.veri.okulOgrencisi));
      setAdim(sonrakiAdim);
    });
  }

  function ileri() {
    setHata(null);
    if (adim === 0) return veriHazirla(1);
    if (!veri) return setHata("Program verisi alınamadı.");
    const ayarSorunu = ayarHatasi(ayar, veri.okulOgrencisi, veri.dersListesi);
    if (adim === 1) {
      if (ayar.gunler.length === 0) return setHata("Çalışacağınız günleri seçin.");
      const zamanSorunu = ayarSorunu && !ayarSorunu.includes("ders") && !ayarSorunu.includes("Ders") ? ayarSorunu : null;
      if (zamanSorunu) return setHata(zamanSorunu);
      return setAdim(2);
    }
    if (adim === 2) {
      if (ayarSorunu) return setHata(ayarSorunu);
      const uretilen = otoProgramOlustur(veri, ayar);
      if (uretilen.length === 0) return setHata("Seçtiğiniz gün ve saatlerde uygun çalışma aralığı bulunamadı.");
      setBloklar(uretilen);
      return setAdim(3);
    }
  }

  function dersiSec(ders: string) {
    setAyar((onceki) => ({
      ...onceki,
      dersler: onceki.dersler.some((d) => d.ders === ders)
        ? onceki.dersler.filter((d) => d.ders !== ders)
        : [...onceki.dersler, { ders, agirlik: "orta" }],
    }));
  }

  function dersiTasi(index: number, yon: -1 | 1) {
    const hedef = index + yon;
    if (hedef < 0 || hedef >= ayar.dersler.length) return;
    const yeni = [...ayar.dersler];
    [yeni[index], yeni[hedef]] = [yeni[hedef], yeni[index]];
    setAyar({ ...ayar, dersler: yeni });
  }

  // "Sonraki haftaya/aya taşı": önceki programın ayarlarıyla, bittiği haftadan
  // sonraki dönem için program yeniden kurulur ve doğrudan önizlemeye geçilir.
  function sonrakiDonemeTasi() {
    const son = veri?.sonProgram;
    if (!son) return;
    const sonraki = gunEkle(haftaninPazartesisi(son.bitisTarihi), 7);
    const yeniBaslangic = sonraki < bugunPazartesi ? bugunPazartesi : sonraki;
    setHata(null);
    startTransition(async () => {
      const sonuc = await otoProgramHazirla(yeniBaslangic, son.kapsam);
      if (sonuc.error || !sonuc.veri) return setHata(sonuc.error ?? "Program verisi alınamadı.");
      const ayarSorunu = ayarHatasi(son.ayar, sonuc.veri.okulOgrencisi, sonuc.veri.dersListesi);
      if (ayarSorunu) return setHata(`Önceki program taşınamadı: ${ayarSorunu}`);
      const uretilen = otoProgramOlustur(sonuc.veri, son.ayar);
      if (uretilen.length === 0) return setHata("Önceki programın saatlerinde yeni dönemde uygun çalışma aralığı bulunamadı.");
      setBaslangicTarihi(yeniBaslangic);
      setKapsam(son.kapsam);
      setVeri(sonuc.veri);
      setAyar(son.ayar);
      setBloklar(uretilen);
      setAdim(3);
    });
  }

  // Elle düzeltmeler anında doğrulanır; kurala uymayan değişiklik uygulanmaz, nedeni gösterilir.
  function bloklariGuncelle(yeni: ProgramBlogu[]) {
    if (veri && yeni.length > 0) {
      const sorun = bloklariDogrula(yeni, veri);
      if (sorun) return setHata(sorun);
    }
    setHata(null);
    setBloklar(yeni);
  }

  function bloguDegistir(anahtar: string, yama: Partial<ProgramBlogu>) {
    bloklariGuncelle(bloklar.map((b) => b.anahtar === anahtar ? { ...b, ...yama } : b));
  }

  // Başlangıç değişince süre korunur, bitiş birlikte kayar.
  function baslangiciDegistir(blok: ProgramBlogu, baslangic: string) {
    const sure = saatAraligiSuresi(blok.baslangic, blok.bitis);
    const yeniBaslangic = saatiDakikayaCevir(baslangic);
    if (sure === null || yeniBaslangic === null) return bloguDegistir(blok.anahtar, { baslangic });
    bloguDegistir(blok.anahtar, { baslangic, bitis: dakikayiSaateCevir(yeniBaslangic + sure) });
  }

  function uygula() {
    if (!veri) return;
    const sorun = bloklariDogrula(bloklar, veri);
    if (sorun) return setHata(sorun);
    setHata(null);
    startTransition(async () => {
      const sonuc = await otoProgramUygula({ baslangicTarihi, kapsam, ayar, bloklar });
      if (sonuc.error) return setHata(sonuc.error);
      setBasari(`${sonuc.eklenen} çalışma programınıza yerleştirildi.`);
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-black/60 px-2 pt-4 sm:items-center sm:px-4" onClick={onKapat}>
      <div role="dialog" aria-modal="true" aria-labelledby="oto-program-baslik" onClick={(e) => e.stopPropagation()}
        className="sfec-fade flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
        style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <header className="flex items-start justify-between gap-3 border-b p-4 sm:p-5" style={{ borderColor: BORDER }}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: MINT_BG, color: MINT }}><BrainCircuit size={21} /></span>
            <div className="min-w-0">
              <h2 id="oto-program-baslik" className="text-base font-extrabold sm:text-lg" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>SeFu oto program yap</h2>
              <p className="text-[11px] sm:text-xs" style={{ color: TEXT_MUTED }}>Siz zamanı ve öncelikleri seçin; SeFu konu çalışmasını ve soru çözümünü dengeli yerleştirsin.</p>
            </div>
          </div>
          <button type="button" onClick={onKapat} aria-label="Kapat" className="sfec-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: BG1_ALT, color: TEXT_MUTED }}><X size={16} /></button>
        </header>

        <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: BORDER }}>
          <ol className="grid grid-cols-4 gap-1.5" aria-label="Program oluşturma adımları">
            {BASAMAKLAR.map((b, i) => (
              <li key={b} className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-2" style={{ background: i === adim ? MINT_BG : BG1_ALT, color: i <= adim ? MINT : TEXT_MUTED }}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold" style={{ background: i < adim ? MINT : BG0, color: i < adim ? MINT_ON : "inherit" }}>{i < adim ? <Check size={11} /> : i + 1}</span>
                <span className="hidden truncate text-[10px] font-bold sm:block">{b}</span>
              </li>
            ))}
          </ol>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {basari ? (
            <div className="mx-auto flex max-w-md flex-col items-center py-12 text-center">
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full" style={{ background: MINT_BG, color: MINT }}><Check size={30} /></span>
              <h3 className="text-lg font-extrabold" style={{ color: TEXT }}>{basari}</h3>
              <p className="mt-2 text-sm" style={{ color: TEXT_MUTED }}>Programı haftalık görünümden inceleyebilir ve çalışmalarınızı tamamladıkça işaretleyebilirsiniz.</p>
              <button type="button" onClick={onKapat} className="sfec-btn mt-5 rounded-xl px-5 py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>Programa dön</button>
            </div>
          ) : adim === 0 ? (
            <div className="mx-auto grid max-w-2xl gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold" style={{ color: TEXT }}>Programın başlayacağı hafta</label>
                <select value={baslangicTarihi} onChange={(e) => { setBaslangicTarihi(e.target.value); setVeri(null); }} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
                  {Array.from({ length: 9 }, (_, i) => gunEkle(bugunPazartesi, i * 7)).map((tarih, i) => <option key={tarih} value={tarih}>{i === 0 ? "Bu hafta" : i === 1 ? "Sonraki hafta" : `${i} hafta sonra`} · {tarihYaz(tarih)}</option>)}
                </select>
              </div>
              <fieldset>
                <legend className="mb-1.5 text-xs font-bold" style={{ color: TEXT }}>Uygulama süresi</legend>
                <div className="grid grid-cols-2 gap-2">
                  {(["haftalik", "aylik"] as ProgramKapsami[]).map((k) => <button type="button" key={k} onClick={() => { setKapsam(k); setVeri(null); }} className="sfec-btn rounded-2xl p-3 text-left" style={{ background: kapsam === k ? MINT_BG : BG1_ALT, border: `2px solid ${kapsam === k ? MINT : BORDER_STRONG}`, color: TEXT }}><span className="block text-sm font-extrabold">{k === "haftalik" ? "Haftalık uygula" : "Aylık uygula"}</span><span className="mt-1 block text-[11px]" style={{ color: TEXT_MUTED }}>{k === "haftalik" ? "Seçilen haftayı planlar." : "Dört haftalık çalışma iskeletini kurar."}</span></button>)}
                </div>
              </fieldset>
              <Alan className="flex items-start gap-3"><Sparkles className="mt-0.5 shrink-0" size={17} color={PEACH} /><p className="text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>SeFu seçtiğiniz dersleri ağırlıklarına göre dağıtır, öğretmen ödevlerini boş saatlere yerleştirir ve aynı dersi tek güne yığmaz. Programı kaydetmeden önce bütün kalemleri değiştirebilirsiniz.</p></Alan>
            </div>
          ) : adim === 1 && veri ? (
            <div className="grid gap-4">
              {veri.sonProgram && <Alan className="flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-extrabold" style={{ color: TEXT }}>Önceki programınız</div><div className="text-[10px]" style={{ color: TEXT_MUTED }}>{veri.sonProgram.kapsam === "aylik" ? "Aylık" : "Haftalık"} program · {tarihYaz(veri.sonProgram.baslangicTarihi)} – {tarihYaz(veri.sonProgram.bitisTarihi)}</div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setAyar(veri.sonProgram!.ayar)} disabled={pending} className="sfec-btn rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-50" style={{ background: BG0, color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>Ayarları kullan</button><button type="button" onClick={sonrakiDonemeTasi} disabled={pending} className="sfec-btn rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-50" style={{ background: MINT_BG, color: MINT, border: `1px solid ${MINT}` }}>{veri.sonProgram.kapsam === "aylik" ? "Sonraki aya taşı" : "Sonraki haftaya taşı"}</button></div></Alan>}
              <fieldset>
                <legend className="mb-2 text-xs font-bold" style={{ color: TEXT }}>Çalışacağınız günler</legend>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                  {GUN_ADLARI.map((gun, i) => { const secili = ayar.gunler.includes(i); return <button type="button" key={gun} onClick={() => setAyar({ ...ayar, gunler: secili ? ayar.gunler.filter((g) => g !== i) : [...ayar.gunler, i].sort() })} className="sfec-btn rounded-xl px-1 py-2.5 text-[10px] font-extrabold" style={{ background: secili ? MINT : BG1_ALT, color: secili ? MINT_ON : TEXT, border: `1px solid ${secili ? MINT : BORDER_STRONG}` }}>{gun.slice(0, 3)}</button>; })}
                </div>
              </fieldset>
              <div className="grid gap-3 lg:grid-cols-2">
                <Periyotlar baslik="Hafta içi periyotları" periyotlar={ayar.haftaIciPeriyotlari} okulUyarisi={veri.okulOgrencisi} onChange={(p) => setAyar({ ...ayar, haftaIciPeriyotlari: p })} />
                <Periyotlar baslik="Hafta sonu periyotları" periyotlar={ayar.haftaSonuPeriyotlari} onChange={(p) => setAyar({ ...ayar, haftaSonuPeriyotlari: p })} />
              </div>
              <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Her periyot 40 dakikalık çalışma ve 10 dakikalık molalarla bölünür. En fazla üç periyot kullanabilirsiniz.</p>
            </div>
          ) : adim === 2 && veri ? (
            <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
              <div>
                <h3 className="mb-1 text-sm font-extrabold" style={{ color: TEXT }}>Ders havuzu</h3>
                <p className="mb-3 text-[11px]" style={{ color: TEXT_MUTED }}>Dersleri önem sıranıza göre seçin.</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                  {veri.dersListesi.map((ders) => { const secili = ayar.dersler.some((d) => d.ders === ders); return <button key={ders} type="button" onClick={() => dersiSec(ders)} className="sfec-btn flex items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-bold" style={{ background: secili ? MINT_BG : BG1_ALT, color: secili ? MINT : TEXT, border: `1px solid ${secili ? MINT : BORDER_STRONG}` }}><span className="flex h-4 w-4 shrink-0 items-center justify-center rounded" style={{ background: secili ? MINT : BG0, color: MINT_ON }}>{secili && <Check size={11} />}</span><span>{ders}</span></button>; })}
                </div>
              </div>
              <div>
                <h3 className="mb-1 text-sm font-extrabold" style={{ color: TEXT }}>Öncelik ve dağıtım ağırlığı</h3>
                <p className="mb-3 text-[11px]" style={{ color: TEXT_MUTED }}>Üstteki ders eşitlikte önce yerleşir. Dağılım oranı ağırlıklı/orta/hafif için 3/2/1’dir.</p>
                <div className="flex flex-col gap-2">
                  {ayar.dersler.map((d, i) => <Alan key={d.ders} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-extrabold" style={{ background: MINT_BG, color: MINT }}>{i + 1}</span><div className="min-w-0"><div className="truncate text-xs font-extrabold" style={{ color: TEXT }}>{d.ders}</div><div className="mt-1 flex gap-1">{AGIRLIKLAR.map((a) => <button type="button" key={a} onClick={() => setAyar({ ...ayar, dersler: ayar.dersler.map((x) => x.ders === d.ders ? { ...x, agirlik: a } : x) })} className="sfec-btn rounded-full px-2 py-1 text-[9px] font-bold" style={{ background: d.agirlik === a ? PEACH_BG : BG0, color: d.agirlik === a ? PEACH : TEXT_MUTED, border: `1px solid ${d.agirlik === a ? PEACH : BORDER}` }}>{DERS_AGIRLIGI_ETIKET[a]}</button>)}</div></div><div className="flex flex-col"><button type="button" aria-label="Yukarı taşı" disabled={i === 0} onClick={() => dersiTasi(i, -1)} className="sfec-btn p-1 disabled:opacity-20" style={{ color: TEXT_MUTED }}><ArrowUp size={13} /></button><button type="button" aria-label="Aşağı taşı" disabled={i === ayar.dersler.length - 1} onClick={() => dersiTasi(i, 1)} className="sfec-btn p-1 disabled:opacity-20" style={{ color: TEXT_MUTED }}><ArrowDown size={13} /></button></div></Alan>)}
                  {ayar.dersler.length === 0 && <Alan className="py-8 text-center text-xs"><span style={{ color: TEXT_MUTED }}>Sol taraftan en az bir ders seçin.</span></Alan>}
                </div>
              </div>
            </div>
          ) : adim === 3 && veri ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Alan><div className="text-[10px] font-bold" style={{ color: TEXT_MUTED }}>Çalışma</div><div className="mt-1 text-lg font-extrabold" style={{ color: TEXT }}>{bloklar.length}</div></Alan>
                <Alan><div className="text-[10px] font-bold" style={{ color: TEXT_MUTED }}>Toplam süre</div><div className="mt-1 text-lg font-extrabold" style={{ color: TEXT }}>{Math.floor(toplamDakika / 60)} sa {toplamDakika % 60} dk</div></Alan>
                <Alan><div className="text-[10px] font-bold" style={{ color: TEXT_MUTED }}>Çalışma / soru</div><div className="mt-1 text-lg font-extrabold" style={{ color: TEXT }}>{bloklar.filter((b) => b.tur === "konu").length} / {bloklar.filter((b) => b.tur === "soru").length}</div></Alan>
                <button type="button" onClick={() => setBloklar(otoProgramOlustur(veri, ayar))} className="sfec-btn flex items-center justify-center gap-1.5 rounded-2xl p-3 text-xs font-bold" style={{ background: PEACH_BG, color: PEACH, border: `1px solid ${PEACH}` }}><RefreshCw size={13} /> Yeniden dağıt</button>
              </div>
              {veri.degisecekKalemSayisi > 0 && <div className="rounded-xl px-3 py-2 text-[11px] font-semibold" style={{ background: PEACH_BG, color: PEACH }}>Bu dönemdeki {veri.degisecekKalemSayisi} bekleyen eski oto program kalemi, onayladığınız yeni programla değiştirilecek.</div>}
              <div className="flex flex-wrap gap-1.5">{dersOzetleri.map(([ders, dk]) => <span key={ders} className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: MINT_BG, color: MINT }}>{ders}: {dk} dk</span>)}</div>
              <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${BORDER}` }}>
                <table className="w-full min-w-[780px] border-collapse text-left">
                  <thead style={{ background: BG1_ALT, color: TEXT_MUTED }}><tr>{["Tarih", "Saat", "Tür", "Ders", "Konu (opsiyonel)", ""].map((h) => <th key={h} className="px-2 py-2 text-[10px] font-extrabold uppercase tracking-wide">{h}</th>)}</tr></thead>
                  <tbody>{bloklar.map((b) => {
                    const konuSecenekleri = [...new Set([...(veri.konuKuyruklari[b.ders] ?? []), ...(b.konu ? [b.konu] : [])])];
                    return <tr key={b.anahtar} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td className="p-2"><select value={b.tarih} onChange={(e) => bloguDegistir(b.anahtar, { tarih: e.target.value })} className="w-28 rounded-lg px-1.5 py-1.5 text-[10px] outline-none" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>{donemTarihleri.map((t) => <option key={t} value={t}>{tarihYaz(t)}</option>)}</select></td>
                    <td className="p-2"><div className="flex items-center gap-1"><select value={b.baslangic} onChange={(e) => baslangiciDegistir(b, e.target.value)} className="rounded-lg px-1 py-1.5 text-[10px] outline-none" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>{DUZENLEME_SAATLERI.map((s) => <option key={s}>{s}</option>)}</select><span style={{ color: TEXT_MUTED }}>–</span><select value={b.bitis} onChange={(e) => bloguDegistir(b.anahtar, { bitis: e.target.value })} className="rounded-lg px-1 py-1.5 text-[10px] outline-none" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>{DUZENLEME_SAATLERI.map((s) => <option key={s}>{s}</option>)}</select></div></td>
                    <td className="p-2"><button type="button" disabled={Boolean(b.atamaId)} title={b.atamaId ? "Öğretmen ödevinin türü değiştirilemez" : "Türü değiştir"} onClick={() => bloguDegistir(b.anahtar, { tur: b.tur === "konu" ? "soru" : "konu" })} className="sfec-btn inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-[9px] font-bold disabled:cursor-default" style={{ background: b.tur === "konu" ? MINT_BG : PEACH_BG, color: b.tur === "konu" ? MINT : PEACH }}>{b.tur === "konu" ? "Konu çalışması" : "Soru çözümü"}{!b.atamaId && <ArrowLeftRight size={9} />}</button></td>
                    <td className="p-2"><select disabled={Boolean(b.atamaId)} value={b.ders} onChange={(e) => bloguDegistir(b.anahtar, { ders: e.target.value, konu: null })} className="w-32 rounded-lg px-1.5 py-1.5 text-[10px] outline-none disabled:opacity-70" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>{veri.dersListesi.map((d) => <option key={d}>{d}</option>)}</select></td>
                    <td className="p-2"><select disabled={Boolean(b.atamaId)} value={b.konu ?? ""} onChange={(e) => bloguDegistir(b.anahtar, { konu: e.target.value || null })} className="w-44 rounded-lg px-1.5 py-1.5 text-[10px] outline-none disabled:opacity-70" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}><option value="">Konu seçme</option>{konuSecenekleri.map((konu) => <option key={konu} value={konu}>{konu}</option>)}</select></td>
                    <td className="p-2"><button type="button" title="Kalemi kaldır" onClick={() => bloklariGuncelle(bloklar.filter((x) => x.anahtar !== b.anahtar))} className="sfec-btn flex h-7 w-7 items-center justify-center rounded-full" style={{ background: BLUSH_BG, color: BLUSH }}><Trash2 size={12} /></button></td>
                  </tr>})}</tbody>
                </table>
              </div>
              {(() => { const gunler = new Map<string, number>(); for (const b of bloklar) gunler.set(b.tarih, (gunler.get(b.tarih) ?? 0) + blokDakikasi(b)); const uyari = [...gunler].map(([t, dk]) => gunlukYukUyarisi(t, dk, veri.okulOgrencisi)).find(Boolean); return uyari ? <div className="rounded-xl px-3 py-2 text-[11px]" style={{ background: PEACH_BG, color: PEACH }}>{uyari}</div> : null; })()}
            </div>
          ) : null}

          {hata && !basari && <div role="alert" className="mt-4 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: BLUSH_BG, color: BLUSH }}>{hata}</div>}
        </main>

        {!basari && <footer className="flex items-center justify-between gap-3 border-t p-4 sm:px-5" style={{ borderColor: BORDER }}>
          <button type="button" onClick={() => adim === 0 ? onKapat() : (setHata(null), setAdim((a) => a - 1))} disabled={pending} className="sfec-btn inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50" style={{ background: BG1_ALT, color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}><ChevronLeft size={13} /> {adim === 0 ? "Vazgeç" : "Geri"}</button>
          {adim < 3 ? <button type="button" onClick={ileri} disabled={pending} className="sfec-btn inline-flex items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>{pending ? "Hazırlanıyor..." : "Devam"} <ChevronRight size={13} /></button> : <button type="button" onClick={uygula} disabled={pending || bloklar.length === 0} className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}><CalendarDays size={14} /> {pending ? "Uygulanıyor..." : `${kapsam === "aylik" ? "Aylık" : "Haftalık"} programı onayla`}</button>}
        </footer>}
      </div>
    </div>
  );
}
