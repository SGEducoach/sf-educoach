"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, ListTree, Plus, Trash2 } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import {
  mufredatDersleriGetir, mufredatUstBasliklariGetir, mufredatAltKonularGetir,
  mufredatAltKonuEkle, mufredatAltKonuSil,
  type MufredatUstBaslikSatiri, type MufredatAltKonuSatiri,
} from "@/app/yonetici/actions";

// Faz K4 — 9./10./11. sınıf müfredat üst başlık → alt başlık hiyerarşisi.
// Üst başlıklar statik (MUFREDAT_KONULARI'ndeki mevcut konular — Türkçe
// hariç, bkz. mufredatDersleriGetir), alt başlıklar burada elle girilir.
// Boş başlıyor — içerik doldurma bu bileşenin işi değil, admin zamanla
// dolduracak (bkz. plan).
export function MufredatHiyerarsiYonetimi() {
  const [dersler, setDersler] = useState<string[]>([]);
  const [secilenDers, setSecilenDers] = useState("");
  const [satirlar, setSatirlar] = useState<MufredatUstBaslikSatiri[]>([]);
  const [acikKonu, setAcikKonu] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => { mufredatDersleriGetir().then((d) => { setDersler(d); if (d.length > 0) setSecilenDers(d[0]); }); });
  }, []);

  useEffect(() => {
    if (!secilenDers) return;
    startTransition(async () => {
      setHata(null);
      const res = await mufredatUstBasliklariGetir(secilenDers);
      if (res.error) return setHata(res.error);
      setSatirlar(res.satirlar);
    });
  }, [secilenDers]);

  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
          <ListTree size={13} color={LILAC} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Müfredat hiyerarşisi (9-10-11. sınıf)</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
        Her üst başlığın altına alt konu başlıkları ekleyin — öğrenciler konu girişinde önce üst başlığı, alt başlık girilmişse sonra onu seçer. Türkçe bu listede yok (bütün seviyelerde düz TYT müfredatı kullanılıyor).
      </p>

      <select value={secilenDers} onChange={(e) => setSecilenDers(e.target.value)}
        className="text-sm px-3 py-2 rounded-xl outline-none w-full mb-3"
        style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
        {dersler.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold mb-2">{hata}</div>}

      {pending ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Yükleniyor...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {satirlar.map((s) => (
            <UstBaslikSatiri key={s.konu} satir={s}
              acik={acikKonu === s.konu} onToggle={() => setAcikKonu(acikKonu === s.konu ? null : s.konu)} />
          ))}
        </div>
      )}
    </div>
  );
}

function UstBaslikSatiri({ satir, acik, onToggle }: { satir: MufredatUstBaslikSatiri; acik: boolean; onToggle: () => void }) {
  const [altBasliklar, setAltBasliklar] = useState<MufredatAltKonuSatiri[]>([]);
  const [yeniAltBaslik, setYeniAltBaslik] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ac() {
    onToggle();
    if (!acik && altBasliklar.length === 0) {
      setYukleniyor(true);
      mufredatAltKonularGetir(satir.ders, satir.konu).then((res) => {
        setYukleniyor(false);
        if (res.error) return setHata(res.error);
        setAltBasliklar(res.satirlar);
      });
    }
  }

  function ekle() {
    const temiz = yeniAltBaslik.trim();
    if (!temiz) return;
    setHata(null);
    startTransition(async () => {
      const res = await mufredatAltKonuEkle(satir.ders, satir.konu, temiz);
      if (res.error) return setHata(res.error);
      setYeniAltBaslik("");
      const guncel = await mufredatAltKonularGetir(satir.ders, satir.konu);
      if (!guncel.error) setAltBasliklar(guncel.satirlar);
    });
  }

  function sil(id: string) {
    setHata(null);
    startTransition(async () => {
      const res = await mufredatAltKonuSil(id);
      if (res.error) return setHata(res.error);
      setAltBasliklar((liste) => liste.filter((a) => a.id !== id));
    });
  }

  return (
    <div className="rounded-xl px-3.5 py-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <button type="button" onClick={ac} className="sfec-btn w-full flex items-center justify-between gap-2 text-left">
        <div>
          <div style={{ color: TEXT }} className="text-sm font-semibold">
            {satir.konu} <span style={{ color: LILAC }} className="text-[10px] font-bold ml-1">{satir.seviye}</span>
          </div>
          <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">
            {satir.altBaslikSayisi > 0 ? `${satir.altBaslikSayisi} alt başlık` : "Alt başlık yok"}
          </div>
        </div>
        {acik ? <ChevronUp size={16} color={TEXT_MUTED} /> : <ChevronDown size={16} color={TEXT_MUTED} />}
      </button>

      {acik && (
        <div className="mt-3 flex flex-col gap-2">
          {yukleniyor ? (
            <p style={{ color: TEXT_MUTED }} className="text-xs py-2 text-center">Yükleniyor...</p>
          ) : (
            <>
              {altBasliklar.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5" style={{ background: BG0 }}>
                  <span style={{ color: TEXT }} className="text-xs">{a.altBaslik}</span>
                  <button type="button" disabled={pending} onClick={() => sil(a.id)} title="Sil" style={{ color: BLUSH }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {altBasliklar.length === 0 && (
                <p style={{ color: TEXT_MUTED }} className="text-xs">Henüz alt başlık eklenmedi.</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <input value={yeniAltBaslik} onChange={(e) => setYeniAltBaslik(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ekle(); } }}
                  placeholder="Yeni alt başlık..." className="min-w-0 flex-1 text-xs px-2.5 py-2 rounded-lg outline-none"
                  style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
                <button type="button" disabled={pending || !yeniAltBaslik.trim()} onClick={ekle}
                  className="sfec-btn flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-60"
                  style={{ background: MINT, color: MINT_ON }}>
                  <Plus size={12} /> Ekle
                </button>
              </div>
              {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
