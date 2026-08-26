"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { History, Megaphone, Send, Trash2, X } from "lucide-react";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, LILAC, LILAC_BG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import {
  adminDuyuruGonder, adminGonderilenDuyurularGetir, yoneticiAktifDuyuruGetir, yoneticiAktifDuyuruSil,
} from "@/app/yonetici/actions";
import type { GonderilenDuyuruSatiri } from "@/components/dashboard/DuyuruFormu";

const MIN_UZUNLUK = 10;
const MAKS_UZUNLUK = 500;

const SURE_SECENEKLERI: { deger: string; etiket: string }[] = [
  { deger: "", etiket: "Süresiz (elle kaldırana kadar)" },
  { deger: "1", etiket: "1 saat" },
  { deger: "6", etiket: "6 saat" },
  { deger: "24", etiket: "1 gün" },
  { deger: "72", etiket: "3 gün" },
  { deger: "168", etiket: "7 gün" },
];

// Kullanıcı isteği (26.08.2026): admin duyuru sistemi "Okullar & Duyuru"dan
// "Genel Bakış"ın en altına taşındı. Artık sadece öğrenci/veli mesaj
// kutusuna değil, TÜM kullanıcılara (rol fark etmeksizin) sitenin üstünde
// sabit bir şerit olarak da gösteriliyor (bkz. Header.tsx +
// src/lib/site-duyuru.ts), opsiyonel bir süre ve hedef kurum ("Tümü" veya
// belirli bir okul/dershane) seçilebiliyor.
export function YoneticiDuyuruPaneli({ okullar }: { okullar: { id: string; ad: string }[] }) {
  const [mesaj, setMesaj] = useState("");
  const [sureSecim, setSureSecim] = useState("");
  const [kurumId, setKurumId] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [onayAcik, setOnayAcik] = useState(false);
  const [pending, startTransition] = useTransition();

  const [aktifDuyuru, setAktifDuyuru] = useState<{ mesaj: string | null; bitis: string | null; kurumAdi: string | null; aktif: boolean } | null>(null);
  const [silPending, startSilTransition] = useTransition();

  const [gecmisAcik, setGecmisAcik] = useState(false);
  const [gecmis, setGecmis] = useState<GonderilenDuyuruSatiri[] | null>(null);
  const [gecmisPending, startGecmisTransition] = useTransition();

  function aktifDuyuruYukle() {
    yoneticiAktifDuyuruGetir().then(setAktifDuyuru);
  }
  useEffect(aktifDuyuruYukle, []);

  function gecmisiAcKapat() {
    const acilacak = !gecmisAcik;
    setGecmisAcik(acilacak);
    if (acilacak) {
      startGecmisTransition(async () => {
        const res = await adminGonderilenDuyurularGetir();
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
      const res = await adminDuyuruGonder(temiz, sureSecim ? Number(sureSecim) : null, kurumId || null);
      if (res.error) return setHata(res.error);
      setBasari(`Gönderildi — ${res.ogrenciSayisi} öğrenci, ${res.veliSayisi} veliye push bildirimi ulaştı; site geneli şerit de aktif.`);
      setMesaj("");
      setGecmis(null);
      aktifDuyuruYukle();
    });
  }

  function kaldirTikla() {
    if (!window.confirm("Site genelindeki yönetici duyurusu kaldırılsın mı?")) return;
    startSilTransition(async () => {
      const res = await yoneticiAktifDuyuruSil();
      if (res.error) return setHata(res.error);
      aktifDuyuruYukle();
    });
  }

  // Not: canlı "kalan X dakika" sayacı yerine bilerek sabit bitiş zamanı
  // gösteriliyor — render sırasında Date.now() gibi kararsız/impure bir
  // çağrı yapmamak için (bkz. react-hooks/purity kuralı).
  const kalanSureMetni = (bitis: string | null) => {
    if (!bitis) return "Süresiz — elle kaldırılana kadar aktif";
    return `Bitiş: ${new Date(bitis).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="sfec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: MINT_BG }}>
          <Megaphone size={13} color={MINT} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Yönetici Duyurusu</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] mb-3">
        Gönderilen duyuru öğrenci/veliye push bildirimi olarak gider ve AYRICA sitenin üstünde &ldquo;Yönetici Duyurusu:&rdquo; şeklinde
        tüm rollere (öğretmen/müdür dahil) sabit bir şerit olarak gösterilir.
      </p>

      {aktifDuyuru?.aktif && (
        <div className="mb-4 rounded-2xl p-3.5 flex items-start justify-between gap-3 flex-wrap" style={{ background: LILAC_BG, border: `2px solid ${BORDER_STRONG}` }}>
          <div className="min-w-0">
            <div style={{ color: LILAC }} className="text-xs font-bold mb-1">Şu an aktif</div>
            <p style={{ color: TEXT }} className="text-sm leading-relaxed">{aktifDuyuru.mesaj}</p>
            <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-1">
              Hedef: {aktifDuyuru.kurumAdi ?? "Tümü"} · {kalanSureMetni(aktifDuyuru.bitis)}
            </p>
          </div>
          <button type="button" onClick={kaldirTikla} disabled={silPending}
            className="sfec-btn shrink-0 flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-full disabled:opacity-60"
            style={{ color: BLUSH, border: `1px solid ${BLUSH}` }}>
            <Trash2 size={12} /> {silPending ? "Kaldırılıyor..." : "Kaldır"}
          </button>
        </div>
      )}

      <form onSubmit={gonderTikla} className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Hedef kurum</span>
            <select value={kurumId} onChange={(e) => setKurumId(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              <option value="">Tümü</option>
              {okullar.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Süre</span>
            <select value={sureSecim} onChange={(e) => setSureSecim(e.target.value)}
              className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              {SURE_SECENEKLERI.map((s) => <option key={s.deger} value={s.deger}>{s.etiket}</option>)}
            </select>
          </label>
        </div>
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

      {onayAcik && createPortal((
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4" style={{ background: "rgba(24,48,47,0.55)", backdropFilter: "blur(4px)" }} onClick={() => setOnayAcik(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="yonetici-duyuru-onay-baslik" className="relative w-full max-w-sm rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => setOnayAcik(false)} aria-label="Kapat" className="sfec-btn absolute right-4 top-4 h-8 w-8 rounded-full" style={{ border: `2px solid ${BORDER_STRONG}` }}><X size={14} color={TEXT_MUTED} className="m-auto" /></button>
            <h2 id="yonetici-duyuru-onay-baslik" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="pr-10 text-base font-bold">Duyuru gönderilsin mi?</h2>
            <p style={{ color: TEXT_MUTED }} className="mt-1 text-xs">Hedef: {okullar.find((o) => o.id === kurumId)?.ad ?? "Tümü"} · Süre: {SURE_SECENEKLERI.find((s) => s.deger === sureSecim)?.etiket}</p>
            <div className="my-4 max-h-40 overflow-y-auto rounded-2xl p-3 text-sm leading-relaxed" style={{ color: TEXT, background: BG0, border: `2px solid ${BORDER_STRONG}` }}>{mesaj.trim()}</div>
            <p style={{ color: BLUSH }} className="mb-4 text-[11px] font-semibold">Site genelinde şerit olarak görünecek ve öğrenci/velinin mesaj kutusuna eklenecek.</p>
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
