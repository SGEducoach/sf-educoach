"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { moderatorKurumKonulariGetir, moderatorKurumKonusuEkle, moderatorKurumKonusuSil, type ModeratorKurumKonusu } from "@/app/moderator/actions";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import { BG0, BG1, BORDER, BORDER_STRONG, BLUSH, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

const DERSLER = [...new Set(MUFREDAT_KONULARI.map((k) => k.ders))].sort((a, b) => a.localeCompare(b, "tr"));

export function ModeratorKurumKonulari({ baslangic, ortakBaslangic, ilkHata }: { baslangic: ModeratorKurumKonusu[]; ortakBaslangic: { ders: string; ustKonu: string; altBaslik: string }[]; ilkHata: string | null }) {
  const [konular, setKonular] = useState(baslangic);
  const [ortakKonular, setOrtakKonular] = useState(ortakBaslangic);
  const [ders, setDers] = useState(DERSLER[0] ?? "");
  const [ustKonu, setUstKonu] = useState(MUFREDAT_KONULARI.find((k) => k.ders === DERSLER[0])?.konu ?? "");
  const [altBaslik, setAltBaslik] = useState("");
  const [hata, setHata] = useState(ilkHata);
  const [pending, startTransition] = useTransition();

  async function yenile() {
    const sonuc = await moderatorKurumKonulariGetir();
    if (sonuc.error) setHata(sonuc.error);
    else { setKonular(sonuc.konular); setOrtakKonular(sonuc.ortakKonular); }
  }

  function ekle() {
    if (!ders || !ustKonu || !altBaslik.trim()) return;
    startTransition(async () => {
      setHata(null);
      const sonuc = await moderatorKurumKonusuEkle(ders, ustKonu, altBaslik);
      if (sonuc.error) return setHata(sonuc.error);
      setAltBaslik("");
      await yenile();
    });
  }

  function sil(konu: ModeratorKurumKonusu) {
    if (!window.confirm(`“${konu.altBaslik}” alt konusunu kurum listesinden kaldırmak istiyor musunuz?`)) return;
    startTransition(async () => {
      setHata(null);
      const sonuc = await moderatorKurumKonusuSil(konu.id);
      if (sonuc.error) return setHata(sonuc.error);
      await yenile();
    });
  }

  const ustBasliklar = MUFREDAT_KONULARI.filter((k) => k.ders === ders);
  const seviyeler = [...new Set(ustBasliklar.map((k) => k.seviye))];
  const gorunen = konular.filter((k) => k.ders === ders && k.ustKonu === ustKonu);
  return (
    <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h1 className="text-xl font-bold" style={{ color: TEXT }}>Kurumun alt konuları</h1>
      <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
        Eksik alt konuları ilgili üst başlığın altına ekleyin. Bunlar yalnızca kurumunuzdaki öğretmen ve öğrencilerin konu seçimlerinde görünür.
      </p>
      <label className="mt-5 block text-sm font-semibold" style={{ color: TEXT }} htmlFor="kurum-ders">Ders</label>
      <select id="kurum-ders" value={ders} onChange={(e) => {
        const yeniDers = e.target.value;
        setDers(yeniDers);
        setUstKonu(MUFREDAT_KONULARI.find((k) => k.ders === yeniDers)?.konu ?? "");
      }} className="mt-2 w-full rounded-xl px-3 py-2 text-sm" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        {DERSLER.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <label className="mt-4 block text-sm font-semibold" style={{ color: TEXT }} htmlFor="kurum-ust-konu">Seviye ve üst başlık</label>
      <select id="kurum-ust-konu" value={ustKonu} onChange={(e) => setUstKonu(e.target.value)}
        className="mt-2 w-full rounded-xl px-3 py-2 text-sm" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        {seviyeler.map((seviye) => (
          <optgroup key={seviye} label={seviye}>
            {ustBasliklar.filter((k) => k.seviye === seviye).map((k) => <option key={`${seviye}|${k.konu}`} value={k.konu}>{k.konu}</option>)}
          </optgroup>
        ))}
      </select>
      <div className="mt-4 flex flex-wrap gap-2">
        <input value={altBaslik} onChange={(e) => setAltBaslik(e.target.value)} maxLength={120}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ekle(); } }}
          aria-label="Yeni alt konu" placeholder="Eksik alt konuyu yazın" className="min-w-[220px] flex-1 rounded-xl px-3 py-2 text-sm"
          style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
        <button type="button" onClick={ekle} disabled={pending || !altBaslik.trim()}
          className="sfec-btn inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50"
          style={{ background: MINT, color: MINT_ON }}><Plus size={16} /> Alt konu ekle</button>
      </div>
      {hata && <p role="alert" className="mt-3 text-sm" style={{ color: BLUSH }}>{hata}</p>}
      <div className="mt-6">
        <h2 className="text-sm font-bold" style={{ color: TEXT }}>Mevcut ortak alt konular</h2>
        <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
          {ortakKonular.filter((k) => k.ders === ders && k.ustKonu === ustKonu).map((k) => k.altBaslik).join(" · ") || "Bu başlık altında ortak alt konu yok."}
        </p>
      </div>
      <div className="mt-6">
        <h2 className="text-sm font-bold" style={{ color: TEXT }}>Bu üst başlığa eklenenler ({gorunen.length})</h2>
        {gorunen.length === 0 ? <p className="mt-2 text-sm" style={{ color: TEXT_MUTED }}>Kurumunuz henüz alt konu eklemedi.</p> : (
          <ul className="mt-2 space-y-2">
            {gorunen.map((k) => <li key={k.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2"
              style={{ background: BG0, border: `1px solid ${BORDER}` }}>
              <span className="text-sm" style={{ color: TEXT }}>{k.altBaslik}</span>
              <button type="button" onClick={() => sil(k)} disabled={pending} aria-label={`${k.altBaslik} alt konusunu sil`}
                className="rounded-lg p-2 disabled:opacity-50" style={{ color: BLUSH }}><Trash2 size={16} /></button>
            </li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
