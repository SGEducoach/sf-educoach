"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CalendarDays, FileUp, Plus, ShieldAlert, Trash2 } from "lucide-react";
import {
  dersProgramiPdfYukle, nobetleriGetir, okulNobetiKaydet, okulNobetiSil,
  yurtNobetiKaydet, yurtNobetiPdfYukle, yurtNobetiSil,
} from "@/app/dashboard/nobet-program-actions";
import type { NobetGorunumu, ProgramYuklemeOzeti, YurtNobetiYuklemeOzeti } from "@/lib/nobet-yukleme";
import { GUN_ETIKET, programGunleri } from "@/lib/ders-programi";
import type { DersProgramiGunu } from "@/lib/ders-programi";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Ders programı ve nöbet listesi yükleme (kullanıcı isteği 17.09.2026) —
// okulun MEB ders programı PDF'i ve yurt (belletmen) nöbet listesi site
// içinden yüklenir. Ders programı yüklendikten sonra elle değiştirilemez;
// nöbetler öğretmenler arasında değişebildiği için burada düzenlenebilir.
const GUNLER = programGunleri(true);

function Kutu({ baslik, ikon, children }: { baslik: string; ikon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: MINT_BG }}>{ikon}</div>
        <span className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{baslik}</span>
      </div>
      {children}
    </div>
  );
}

function Uyarilar({ uyarilar }: { uyarilar: string[] }) {
  if (uyarilar.length === 0) return null;
  return (
    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl p-2 text-[11px]" style={{ background: BG1_ALT, color: TEXT_MUTED }}>
      {uyarilar.map((u, i) => <li key={i}>• {u}</li>)}
    </ul>
  );
}

const girdiStili = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };

export function NobetProgramYukleme({ okulId, okulAdi }: { okulId: string; okulAdi: string }) {
  const [pending, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [programOzeti, setProgramOzeti] = useState<ProgramYuklemeOzeti | null>(null);
  const [yurtOzeti, setYurtOzeti] = useState<YurtNobetiYuklemeOzeti | null>(null);
  const [nobetler, setNobetler] = useState<NobetGorunumu | null>(null);
  const [bildir, setBildir] = useState(true);
  const programGirdisi = useRef<HTMLInputElement>(null);
  const yurtGirdisi = useRef<HTMLInputElement>(null);

  const [yeniOkulNobeti, setYeniOkulNobeti] = useState({ adSoyad: "", gun: "pazartesi" as DersProgramiGunu, yer: "" });
  const [yeniYurtNobeti, setYeniYurtNobeti] = useState({ adSoyad: "", tarih: "" });

  function nobetleriTazele() {
    startTransition(async () => {
      const r = await nobetleriGetir(okulId);
      if (r.error) setHata(r.error); else setNobetler(r.veri);
    });
  }

  useEffect(() => {
    let iptal = false;
    nobetleriGetir(okulId).then((r) => {
      if (iptal) return;
      if (r.error) setHata(r.error); else setNobetler(r.veri);
    });
    return () => { iptal = true; };
  }, [okulId]);

  function programYukle(dosya: File) {
    setHata(null);
    setProgramOzeti(null);
    const form = new FormData();
    form.set("okulId", okulId);
    form.set("dosya", dosya);
    startTransition(async () => {
      const r = await dersProgramiPdfYukle(form);
      if (r.error) setHata(r.error);
      else { setProgramOzeti(r.ozet); nobetleriTazele(); }
      if (programGirdisi.current) programGirdisi.current.value = "";
    });
  }

  function yurtYukle(dosya: File) {
    setHata(null);
    setYurtOzeti(null);
    const form = new FormData();
    form.set("okulId", okulId);
    form.set("dosya", dosya);
    form.set("bildir", bildir ? "evet" : "hayir");
    startTransition(async () => {
      const r = await yurtNobetiPdfYukle(form);
      if (r.error) setHata(r.error);
      else { setYurtOzeti(r.ozet); nobetleriTazele(); }
      if (yurtGirdisi.current) yurtGirdisi.current.value = "";
    });
  }

  function okulNobetiEkle() {
    setHata(null);
    startTransition(async () => {
      const r = await okulNobetiKaydet({ okulId, ...yeniOkulNobeti });
      if (r.error) return setHata(r.error);
      setYeniOkulNobeti({ adSoyad: "", gun: "pazartesi", yer: "" });
      nobetleriTazele();
    });
  }

  function okulNobetiGunDegistir(id: string, adSoyad: string, yer: string, gun: DersProgramiGunu) {
    setHata(null);
    startTransition(async () => {
      const r = await okulNobetiKaydet({ id, okulId, adSoyad, gun, yer });
      if (r.error) return setHata(r.error);
      nobetleriTazele();
    });
  }

  function yurtNobetiEkle() {
    setHata(null);
    startTransition(async () => {
      const r = await yurtNobetiKaydet({ okulId, ...yeniYurtNobeti });
      if (r.error) return setHata(r.error);
      setYeniYurtNobeti({ adSoyad: "", tarih: yeniYurtNobeti.tarih });
      nobetleriTazele();
    });
  }

  function yurtNobetiTarihDegistir(id: string, adSoyad: string, tarih: string) {
    setHata(null);
    startTransition(async () => {
      const r = await yurtNobetiKaydet({ id, okulId, adSoyad, tarih });
      if (r.error) return setHata(r.error);
      nobetleriTazele();
    });
  }

  function sil(tur: "okul" | "yurt", id: string, etiket: string) {
    if (!window.confirm(`${etiket} nöbeti silinsin mi?`)) return;
    setHata(null);
    startTransition(async () => {
      const r = tur === "okul" ? await okulNobetiSil(id, okulId) : await yurtNobetiSil(id, okulId);
      if (r.error) return setHata(r.error);
      nobetleriTazele();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs" style={{ color: TEXT_MUTED }}>
        <strong style={{ color: TEXT }}>{okulAdi}</strong> · Ders programı PDF&apos;i yüklendikten sonra program elle değiştirilemez;
        nöbetler aşağıdan eklenebilir, silinebilir, günü/tarihi değiştirilebilir.
      </p>

      {hata && (
        <div className="flex items-start gap-2 rounded-xl p-3 text-xs font-semibold" style={{ background: BLUSH, color: TEXT }}>
          <ShieldAlert size={14} /> {hata}
        </div>
      )}

      <Kutu baslik="Ders Programı PDF" ikon={<FileUp size={13} color={MINT} />}>
        <input ref={programGirdisi} type="file" accept="application/pdf" disabled={pending}
          onChange={(e) => { const d = e.target.files?.[0]; if (d) programYukle(d); }}
          className="w-full rounded-xl px-3 py-2 text-xs" style={girdiStili} />
        <p className="mt-2 text-[11px]" style={{ color: TEXT_MUTED }}>
          MEB öğretmen ders programı PDF&apos;i. Programın yanında yazan nöbet günü ve yeri de okunur.
          Hesabı olmayan öğretmenlerin programı bekletilir, üye oldukları anda yansır.
        </p>
        {programOzeti && (
          <div className="mt-3 rounded-xl p-3 text-xs font-semibold" style={{ background: MINT_BG, color: MINT_ON }}>
            {programOzeti.ogretmen} öğretmen okundu · {programOzeti.eslesen} hesaba yazıldı · {programOzeti.bekleyen} bekliyor ·
            {" "}{programOzeti.hucre} ders saati · {programOzeti.nobet} okul nöbeti
            <Uyarilar uyarilar={programOzeti.uyarilar} />
          </div>
        )}
      </Kutu>

      <Kutu baslik="Yurt (Belletmen) Nöbet Listesi PDF" ikon={<CalendarDays size={13} color={MINT} />}>
        <input ref={yurtGirdisi} type="file" accept="application/pdf" disabled={pending}
          onChange={(e) => { const d = e.target.files?.[0]; if (d) yurtYukle(d); }}
          className="w-full rounded-xl px-3 py-2 text-xs" style={girdiStili} />
        <label className="mt-2 flex items-center gap-2 text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>
          <input type="checkbox" checked={bildir} onChange={(e) => setBildir(e.target.checked)} />
          Listedeki öğretmenlere &quot;Bu ayın nöbet görevleri yüklendi&quot; bildirimi ve e-postası gönder
        </label>
        <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>
          Yalnızca listedeki tarih aralığı yenilenir; diğer dönemlerin nöbetleri korunur.
        </p>
        {yurtOzeti && (
          <div className="mt-3 rounded-xl p-3 text-xs font-semibold" style={{ background: MINT_BG, color: MINT_ON }}>
            {yurtOzeti.ilkTarih} – {yurtOzeti.sonTarih} · {yurtOzeti.gorev} görev · {yurtOzeti.ogretmen} öğretmen ·
            {" "}{yurtOzeti.eslesen} hesap eşleşti · {yurtOzeti.bildirilen} bildirim
            <Uyarilar uyarilar={yurtOzeti.uyarilar} />
          </div>
        )}
      </Kutu>

      <Kutu baslik="Okul Nöbetleri (haftalık)" ikon={<CalendarDays size={13} color={MINT} />}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input value={yeniOkulNobeti.adSoyad} onChange={(e) => setYeniOkulNobeti({ ...yeniOkulNobeti, adSoyad: e.target.value })}
            placeholder="Ad Soyad" className="min-w-[160px] flex-1 rounded-xl px-3 py-2 text-xs" style={girdiStili} />
          <select value={yeniOkulNobeti.gun} onChange={(e) => setYeniOkulNobeti({ ...yeniOkulNobeti, gun: e.target.value as DersProgramiGunu })}
            className="rounded-xl px-3 py-2 text-xs font-bold" style={girdiStili}>
            {GUNLER.map((g) => <option key={g} value={g}>{GUN_ETIKET[g]}</option>)}
          </select>
          <input value={yeniOkulNobeti.yer} onChange={(e) => setYeniOkulNobeti({ ...yeniOkulNobeti, yer: e.target.value })}
            placeholder="Nöbet yeri" className="min-w-[140px] flex-1 rounded-xl px-3 py-2 text-xs" style={girdiStili} />
          <button type="button" onClick={okulNobetiEkle} disabled={pending}
            className="sfec-btn flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold"
            style={{ background: MINT, color: MINT_ON }}>
            <Plus size={12} /> Ekle
          </button>
        </div>
        {nobetler && nobetler.okulNobetleri.length === 0 && <p className="text-xs" style={{ color: TEXT_MUTED }}>Kayıtlı okul nöbeti yok.</p>}
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {nobetler?.okulNobetleri.map((n) => (
            <div key={n.id} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: BG1_ALT }}>
              <span className="flex-1 font-semibold" style={{ color: TEXT }}>{n.adSoyad}{!n.bagli && <span style={{ color: TEXT_MUTED }}> (hesap yok)</span>}</span>
              <select value={n.gun} disabled={pending} onChange={(e) => okulNobetiGunDegistir(n.id, n.adSoyad, n.yer, e.target.value as DersProgramiGunu)}
                className="rounded-lg px-2 py-1 text-[11px] font-bold" style={girdiStili}>
                {GUNLER.map((g) => <option key={g} value={g}>{GUN_ETIKET[g]}</option>)}
              </select>
              <span style={{ color: TEXT_MUTED }}>{n.yer}</span>
              <button type="button" onClick={() => sil("okul", n.id, `${n.adSoyad} ${GUN_ETIKET[n.gun]}`)} disabled={pending}
                className="sfec-btn rounded-lg p-1" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }} title="Sil">
                <Trash2 size={12} color={TEXT_MUTED} />
              </button>
            </div>
          ))}
        </div>
      </Kutu>

      <Kutu baslik="Yurt Nöbeti Görevleri" ikon={<CalendarDays size={13} color={MINT} />}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <input value={yeniYurtNobeti.adSoyad} onChange={(e) => setYeniYurtNobeti({ ...yeniYurtNobeti, adSoyad: e.target.value })}
            placeholder="Ad Soyad" className="min-w-[160px] flex-1 rounded-xl px-3 py-2 text-xs" style={girdiStili} />
          <input type="date" value={yeniYurtNobeti.tarih} onChange={(e) => setYeniYurtNobeti({ ...yeniYurtNobeti, tarih: e.target.value })}
            className="rounded-xl px-3 py-2 text-xs font-bold" style={girdiStili} />
          <button type="button" onClick={yurtNobetiEkle} disabled={pending}
            className="sfec-btn flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold"
            style={{ background: MINT, color: MINT_ON }}>
            <Plus size={12} /> Ekle
          </button>
        </div>
        {nobetler && nobetler.yurtNobetleri.length === 0 && <p className="text-xs" style={{ color: TEXT_MUTED }}>Kayıtlı yurt nöbeti yok.</p>}
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {nobetler?.yurtNobetleri.map((n) => (
            <div key={n.id} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: BG1_ALT }}>
              <span className="flex-1 font-semibold" style={{ color: TEXT }}>{n.adSoyad}{!n.bagli && <span style={{ color: TEXT_MUTED }}> (hesap yok)</span>}</span>
              <input type="date" value={n.tarih} disabled={pending}
                onChange={(e) => e.target.value && yurtNobetiTarihDegistir(n.id, n.adSoyad, e.target.value)}
                className="rounded-lg px-2 py-1 text-[11px] font-bold" style={girdiStili} />
              <button type="button" onClick={() => sil("yurt", n.id, `${n.adSoyad} ${n.tarih}`)} disabled={pending}
                className="sfec-btn rounded-lg p-1" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }} title="Sil">
                <Trash2 size={12} color={TEXT_MUTED} />
              </button>
            </div>
          ))}
        </div>
      </Kutu>
    </div>
  );
}
