"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { History, Megaphone, Send, X } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import type { DuyuruAliciTuru } from "@/lib/push-send";

const MAKS_UZUNLUK = 500;
const MIN_UZUNLUK = 10;

export interface KapsamSecenegi {
  deger: string;
  etiket: string;
}

export interface GonderilenDuyuruSatiri {
  id: string;
  baslik: string;
  mesaj: string;
  createdAt: string;
  aliciSayisi: number;
}

// Öğrenci + bağlı veliye push bildirimi olarak giden serbest metin duyuru.
// Kapsam (kime gideceği) tamamen server-side belirleniyor/doğrulanıyor —
// bu bileşen sadece mesajı (ve seçiliyse bir kapsam değerini) alıp verilen
// `gonder` action'ına iletiyor. kapsamSecenekleri verilmezse (öğretmen,
// admin) kapsam seçici hiç gösterilmiyor — o rollerde kapsam zaten sabit.
export function DuyuruFormu({
  baslik, aciklama, gonder, kapsamSecenekleri, aliciTuruSecilebilir = false, gecmisGetir,
}: {
  baslik: string;
  aciklama: string;
  gonder: (mesaj: string, kapsam?: string, aliciTuru?: DuyuruAliciTuru) => Promise<{ error: string | null; ogrenciSayisi: number; veliSayisi: number; kalanGunlukHak: number }>;
  kapsamSecenekleri?: KapsamSecenegi[];
  aliciTuruSecilebilir?: boolean;
  gecmisGetir?: () => Promise<{ error: string | null; duyurular: GonderilenDuyuruSatiri[] }>;
}) {
  const [mesaj, setMesaj] = useState("");
  const [kapsam, setKapsam] = useState(kapsamSecenekleri?.[0]?.deger ?? "");
  const [aliciTuru, setAliciTuru] = useState<DuyuruAliciTuru>("hepsi");
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [onayAcik, setOnayAcik] = useState(false);
  const [pending, startTransition] = useTransition();
  const [gecmisAcik, setGecmisAcik] = useState(false);
  const [gecmis, setGecmis] = useState<GonderilenDuyuruSatiri[] | null>(null);
  const [gecmisPending, startGecmisTransition] = useTransition();

  function gecmisiAcKapat() {
    const acilacak = !gecmisAcik;
    setGecmisAcik(acilacak);
    if (acilacak && gecmisGetir) {
      startGecmisTransition(async () => {
        const res = await gecmisGetir();
        setGecmis(res.error ? [] : res.duyurular);
      });
    }
  }

  function gonderTikla(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasari(null);
    const temiz = mesaj.trim();
    if (!temiz) return setHata("Duyuru boş olamaz.");
    if (temiz.length < MIN_UZUNLUK) return setHata(`Duyuru en az ${MIN_UZUNLUK} karakter olmalıdır.`);
    setOnayAcik(true);
  }

  function onaylaVeGonder() {
    const temiz = mesaj.trim();
    setOnayAcik(false);
    startTransition(async () => {
      const res = await gonder(temiz, kapsamSecenekleri ? kapsam : undefined, aliciTuruSecilebilir ? aliciTuru : undefined);
      if (res.error) return setHata(res.error);
      setBasari(`Gönderildi — ${res.ogrenciSayisi} öğrenci, ${res.veliSayisi} veliye ulaştı. Bugün için kalan hakkınız: ${res.kalanGunlukHak}.`);
      setMesaj("");
      setGecmis(null);
    });
  }

  return (
    <div className="sfec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: MINT_BG }}>
          <Megaphone size={13} color={MINT} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">{baslik}</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] mb-3">{aciklama}</p>
      <form onSubmit={gonderTikla} className="flex flex-col gap-2">
        {kapsamSecenekleri && kapsamSecenekleri.length > 0 && (
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Kime gitsin</span>
            <select value={kapsam} onChange={(e) => setKapsam(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              {kapsamSecenekleri.map((k) => <option key={k.deger} value={k.deger}>{k.etiket}</option>)}
            </select>
          </label>
        )}
        {aliciTuruSecilebilir && (
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Kimlere gönderilsin</span>
            <select value={aliciTuru} onChange={(e) => setAliciTuru(e.target.value as DuyuruAliciTuru)} className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              <option value="hepsi">Hepsi - öğrenci ve veliler</option>
              <option value="ogrenci">Sadece öğrenciler</option>
              <option value="veli">Sadece veliler</option>
            </select>
          </label>
        )}
        <textarea
          value={mesaj}
          onChange={(e) => setMesaj(e.target.value.slice(0, MAKS_UZUNLUK))}
          rows={2}
          placeholder="Örn. Sevgili öğrenciler, yarınki denemede başarılar dilerim."
          className="text-sm px-3 py-2 rounded-xl outline-none resize-none"
          style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
        />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span style={{ color: mesaj.trim().length > 0 && mesaj.trim().length < MIN_UZUNLUK ? BLUSH : TEXT_MUTED }} className="text-[10px]">En az {MIN_UZUNLUK} · {mesaj.length}/{MAKS_UZUNLUK}</span>
          <button type="submit" disabled={pending || mesaj.trim().length < MIN_UZUNLUK}
            className="sfec-btn flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full disabled:opacity-50"
            style={{ background: MINT, color: MINT_ON }}>
            <Send size={13} /> {pending ? "Gönderiliyor..." : "Duyuruyu gönder"}
          </button>
        </div>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        {basari && <div style={{ color: MINT }} className="text-xs font-semibold">{basari}</div>}
      </form>

      {gecmisGetir && (
        <div className="mt-3">
          <button type="button" onClick={gecmisiAcKapat}
            className="sfec-btn flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
            style={{ background: gecmisAcik ? MINT : "rgba(255,255,255,0.06)", color: gecmisAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            <History size={12} /> Gönderilen duyurular
          </button>
          {gecmisAcik && (
            <div className="mt-2 rounded-2xl p-3 max-h-56 overflow-y-auto flex flex-col gap-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
              {gecmisPending && <p style={{ color: TEXT_MUTED }} className="text-xs text-center py-2">Yükleniyor...</p>}
              {!gecmisPending && gecmis?.length === 0 && <p style={{ color: TEXT_MUTED }} className="text-xs text-center py-2">Henüz gönderilmiş duyuru yok.</p>}
              {!gecmisPending && gecmis?.map((d) => (
                <div key={d.id} className="rounded-xl p-2.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
                  <div className="flex items-center justify-between gap-2">
                    <span style={{ color: TEXT }} className="text-xs font-bold">{d.baslik}</span>
                    <span style={{ color: TEXT_MUTED }} className="text-[10px] shrink-0">{new Date(d.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-1 leading-relaxed">{d.mesaj}</p>
                  <span style={{ color: MINT }} className="text-[10px] font-semibold">{d.aliciSayisi} alıcıya ulaştı</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {onayAcik && createPortal((
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4" style={{ background: "rgba(24,48,47,0.55)", backdropFilter: "blur(4px)" }} onClick={() => setOnayAcik(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="duyuru-onay-baslik" className="relative w-full max-w-sm rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOnayAcik(false)} aria-label="Kapat" className="sfec-btn absolute right-4 top-4 h-8 w-8 rounded-full" style={{ border: `2px solid ${BORDER_STRONG}` }}><X size={14} color={TEXT_MUTED} className="m-auto" /></button>
            <h2 id="duyuru-onay-baslik" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="pr-10 text-base font-bold">Duyuru gönderilsin mi?</h2>
            <p style={{ color: TEXT_MUTED }} className="mt-1 text-xs">Kapsam: {kapsamSecenekleri?.find((secenek) => secenek.deger === kapsam)?.etiket ?? aciklama}</p>
            {aliciTuruSecilebilir && <p style={{ color: TEXT_MUTED }} className="mt-1 text-xs">Alıcılar: {aliciTuru === "hepsi" ? "Öğrenciler ve veliler" : aliciTuru === "ogrenci" ? "Sadece öğrenciler" : "Sadece veliler"}</p>}
            <div className="my-4 max-h-40 overflow-y-auto rounded-2xl p-3 text-sm leading-relaxed" style={{ color: TEXT, background: BG0, border: `2px solid ${BORDER_STRONG}` }}>{mesaj.trim()}</div>
            <p style={{ color: BLUSH }} className="mb-4 text-[11px] font-semibold">Gönderilen duyuru alıcıların mesaj kutusuna eklenir ve geri alınamaz.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOnayAcik(false)} className="sfec-btn flex-1 rounded-xl py-2.5 text-sm font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>Vazgeç</button>
              <button type="button" onClick={onaylaVeGonder} className="sfec-btn flex-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>Onayla ve gönder</button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}
