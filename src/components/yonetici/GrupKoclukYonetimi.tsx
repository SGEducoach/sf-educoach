"use client";

import { startTransition, useEffect, useState, useTransition } from "react";
import { Check, Copy, Pause, Play, Plus, UsersRound } from "lucide-react";
import { grupDondur, grupGuncelle, grupOlustur, gruplariGetir, type GrupSatiri } from "@/app/yonetici/grup-actions";
import { GRUP_KAPASITELERI } from "@/lib/grup-kocluk";
import { BG0, BG1, BG1_ALT, BLUSH, BLUSH_BG, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Grup Koçluk — Faz 2 (kullanıcı isteği ve kararları 18.09.2026): kurum
// dışı koçlar için grup açma ve yönetme. Grup = dershanenin alt türü; koç
// tek hesap (öğretmen + rehber kapsamı + moderatör). Bkz. grup-actions.ts.

const girdi = { background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` };

function tarihYaz(t: string) {
  return new Date(`${t}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}

function birYilSonrasi() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
}

export function GrupKoclukYonetimi() {
  const [gruplar, setGruplar] = useState<GrupSatiri[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [formAcik, setFormAcik] = useState(false);

  function yukle() {
    gruplariGetir().then((r) => {
      setHata(r.error);
      setGruplar(r.gruplar);
    });
  }
  useEffect(() => { startTransition(yukle); }, []);

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <UsersRound size={16} color={MINT} />
          <h2 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Grup Koçluk</h2>
        </div>
        <button type="button" onClick={() => setFormAcik((v) => !v)}
          className="sfec-btn flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ background: formAcik ? MINT : BG1_ALT, color: formAcik ? MINT_ON : TEXT, border: `1px solid ${BORDER_STRONG}` }}>
          <Plus size={13} /> Grup aç
        </button>
      </div>
      <p className="mb-3 text-xs" style={{ color: TEXT_MUTED }}>
        Kurum dışı koçlar için 5, 10, 15 ya da 20 öğrencilik gruplar. Kapasite yalnızca aktif öğrencileri sayar;
        bitiş tarihi geçen grup salt okunur olur.
      </p>

      {formAcik && <GrupAcFormu onDone={() => { setFormAcik(false); yukle(); }} />}
      {hata && <p className="my-2 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}

      {gruplar === null ? (
        <p className="py-3 text-center text-sm" style={{ color: TEXT_MUTED }}>Yükleniyor...</p>
      ) : gruplar.length === 0 ? (
        <p className="py-3 text-center text-sm" style={{ color: TEXT_MUTED }}>Henüz grup açılmadı.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {gruplar.map((g) => <GrupKarti key={g.id} grup={g} onDegisti={yukle} />)}
        </div>
      )}
    </div>
  );
}

function GrupAcFormu({ onDone }: { onDone: () => void }) {
  const [pending, startIslem] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ sifre: string; kod: string; email: string; grupAdi: string } | null>(null);
  const [f, setF] = useState({
    grupAdi: "", kocAd: "", kocEmail: "", kocTelefon: "", kapasite: 10, bitisTarihi: birYilSonrasi(), taahhut: false,
  });

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startIslem(async () => {
      const r = await grupOlustur(f);
      if (r.error || !r.sifre || !r.kod) return setHata(r.error ?? "Grup açılamadı.");
      setSonuc({ sifre: r.sifre, kod: r.kod, email: f.kocEmail.trim().toLowerCase(), grupAdi: f.grupAdi.trim() });
    });
  }

  if (sonuc) return <GrupAcildi {...sonuc} onDone={onDone} />;

  const alan = (etiket: string, cocuk: React.ReactNode) => (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{etiket}</span>
      {cocuk}
    </label>
  );

  return (
    <form onSubmit={gonder} className="mb-3 flex flex-col gap-3 rounded-2xl p-4" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
      <div className="grid gap-3 sm:grid-cols-2">
        {alan("Grup adı", <input required value={f.grupAdi} onChange={(e) => setF({ ...f, grupAdi: e.target.value })} placeholder="Ör. Yıldız YKS Grubu" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />)}
        {alan("Koçun adı soyadı", <input required value={f.kocAd} onChange={(e) => setF({ ...f, kocAd: e.target.value })} className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />)}
        {alan("Koçun e-postası (giriş adı)", <input required type="email" value={f.kocEmail} onChange={(e) => setF({ ...f, kocEmail: e.target.value })} className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />)}
        {alan("Koçun telefonu", <input required inputMode="numeric" value={f.kocTelefon} onChange={(e) => setF({ ...f, kocTelefon: e.target.value.replace(/\D/g, "") })} placeholder="5321234567" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />)}
        {alan("Kapasite (aktif öğrenci)", (
          <div className="flex gap-1.5">
            {GRUP_KAPASITELERI.map((k) => (
              <button key={k} type="button" onClick={() => setF({ ...f, kapasite: k })}
                className="sfec-btn flex-1 rounded-xl py-2 text-sm font-bold"
                style={{ background: f.kapasite === k ? MINT : BG0, color: f.kapasite === k ? MINT_ON : TEXT, border: `1px solid ${BORDER_STRONG}` }}>
                {k}
              </button>
            ))}
          </div>
        ))}
        {alan("Bitiş tarihi", <input required type="date" value={f.bitisTarihi} onChange={(e) => setF({ ...f, bitisTarihi: e.target.value })} className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />)}
      </div>
      <label className="flex items-start gap-2 text-xs" style={{ color: TEXT }}>
        <input type="checkbox" checked={f.taahhut} onChange={(e) => setF({ ...f, taahhut: e.target.checked })} className="mt-0.5" />
        <span>
          Koç, öğrencilerin kişisel verilerini yalnızca koçluk amacıyla işleyeceğini, üçüncü kişilerle paylaşmayacağını
          ve reşit olmayan öğrenciler için veli onayı alacağını taahhüt etti.
        </span>
      </label>
      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
      <button type="submit" disabled={pending}
        className="sfec-btn self-start rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Açılıyor..." : "Grubu aç ve koç hesabını oluştur"}
      </button>
    </form>
  );
}

// Geçici şifre YALNIZCA bir kez burada görünür; koça yönetici iletir.
function GrupAcildi({ sifre, kod, email, grupAdi, onDone }: { sifre: string; kod: string; email: string; grupAdi: string; onDone: () => void }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const metin = `SeFu Koç grup koçluk hesabınız açıldı.\nGrup: ${grupAdi}\nGrup kodu (öğrencileriniz girişte kullanacak): ${kod}\nGiriş: www.sefukoc.com/login → Öğretmen\nE-posta: ${email}\nGeçici şifre: ${sifre}\nİlk girişte kendi şifrenizi belirleyeceksiniz.`;
  return (
    <div className="mb-3 flex flex-col gap-2 rounded-2xl p-4" style={{ background: MINT_BG, border: `1px solid ${MINT}` }}>
      <p className="text-sm font-bold" style={{ color: TEXT }}>Grup açıldı. Aşağıdaki bilgileri koça iletin; geçici şifre bir daha gösterilmeyecek.</p>
      <pre className="whitespace-pre-wrap rounded-xl p-3 text-xs" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>{metin}</pre>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { navigator.clipboard?.writeText(metin).then(() => setKopyalandi(true)); }}
          className="sfec-btn flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>
          {kopyalandi ? <Check size={13} /> : <Copy size={13} />} {kopyalandi ? "Kopyalandı" : "Bilgileri kopyala"}
        </button>
        <button type="button" onClick={onDone} className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold" style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
          Tamam
        </button>
      </div>
    </div>
  );
}

function GrupKarti({ grup: g, onDegisti }: { grup: GrupSatiri; onDegisti: () => void }) {
  const [pending, startIslem] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [bitis, setBitis] = useState(g.bitisTarihi);

  const doluluk = g.aktifOgrenci / g.kapasite;
  const sureDoldu = g.kalanGun < 0;
  const durum = g.donduruldu
    ? { etiket: "Donduruldu", renk: BLUSH, zemin: BLUSH_BG }
    : sureDoldu
      ? { etiket: "Süresi doldu · salt okunur", renk: BUTTER, zemin: BUTTER_BG }
      : g.kalanGun <= 14
        ? { etiket: `${g.kalanGun} gün kaldı`, renk: BUTTER, zemin: BUTTER_BG }
        : { etiket: `${g.kalanGun} gün kaldı`, renk: MINT, zemin: MINT_BG };

  function islem(fn: () => Promise<{ error: string | null }>) {
    setHata(null);
    startIslem(async () => {
      const r = await fn();
      if (r.error) setHata(r.error); else onDegisti();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-extrabold" style={{ color: TEXT }}>{g.ad}</div>
          <div className="text-xs" style={{ color: TEXT_MUTED }}>
            Kod <span className="font-mono font-bold" style={{ color: TEXT }}>{g.kod}</span>
            {g.koc && <> · Koç: {g.koc.ad}{g.koc.email ? ` (${g.koc.email})` : ""}{g.koc.telefon ? ` · ${g.koc.telefon}` : ""}</>}
          </div>
        </div>
        <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: durum.zemin, color: durum.renk }}>{durum.etiket}</span>
      </div>

      <div>
        <div className="mb-1 flex justify-between text-xs" style={{ color: TEXT_MUTED }}>
          <span>Doluluk</span>
          <span className="font-bold tabular-nums" style={{ color: TEXT }}>{g.aktifOgrenci} / {g.kapasite}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full" style={{ background: BG0 }}>
          <div className="h-full rounded-full" style={{ width: `${Math.min(100, doluluk * 100)}%`, background: doluluk >= 1 ? BUTTER : MINT }} />
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Kapasite</span>
          <select value={g.kapasite} disabled={pending} onChange={(e) => islem(() => grupGuncelle({ id: g.id, kapasite: Number(e.target.value) }))}
            className="rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none" style={girdi}>
            {GRUP_KAPASITELERI.map((k) => <option key={k} value={k}>{k} öğrenci</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Bitiş ({tarihYaz(g.bitisTarihi)})</span>
          <div className="flex gap-1.5">
            <input type="date" value={bitis} disabled={pending} onChange={(e) => setBitis(e.target.value)}
              className="rounded-xl px-2.5 py-1.5 text-xs outline-none" style={girdi} />
            {bitis !== g.bitisTarihi && (
              <button type="button" disabled={pending} onClick={() => islem(() => grupGuncelle({ id: g.id, bitisTarihi: bitis }))}
                className="sfec-btn rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>
                Kaydet
              </button>
            )}
          </div>
        </label>
        <button type="button" disabled={pending}
          onClick={() => {
            const dondur = !g.donduruldu;
            if (dondur && !window.confirm(`"${g.ad}" dondurulsun mu? Koç ve öğrencileri siteye giremez; veriler korunur.`)) return;
            islem(() => grupDondur(g.id, dondur));
          }}
          className="sfec-btn ml-auto flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold"
          style={{ background: BG0, color: g.donduruldu ? MINT : BLUSH, border: `1px solid ${BORDER_STRONG}` }}>
          {g.donduruldu ? <><Play size={12} /> Grubu aç</> : <><Pause size={12} /> Dondur</>}
        </button>
      </div>
      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
    </div>
  );
}
