"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trophy, BookOpen, PenLine, ClipboardList, BookText, X } from "lucide-react";
import type { RozetSeviye } from "@/lib/types";
import { ROZET_SEVIYE_ETIKET, dokuzOnSinifMi } from "@/lib/types";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { SeFuLogo } from "@/components/SeFuWordmark";

// Rozet sistemi v2: 3 bağımsız kategori (konu/soru/deneme) + bunlardan
// türetilen "genel" (SEFU KOÇ) rozeti. Hepsi CANLI durum — kalıcı değil,
// öğrenci pas geçtiğinde seviye düşebilir. Kazanım/düşüş mantığı tamamen
// DB'de (ogrenci_rozet_durumu RPC, her dashboard yüklemesinde tazeleniyor);
// burada sadece görüntüleniyor.

const SEVIYE_EMOJI: Record<RozetSeviye, string> = { yok: "—", bronz: "🥉", gumus: "🥈", altin: "🥇" };

const KATEGORI_META = {
  konu: { ad: "Konu Çalışma", Icon: BookOpen, renk: MINT },
  soru: { ad: "Soru Çözümü", Icon: PenLine, renk: "#8FC6FF" },
  deneme: { ad: "Deneme", Icon: ClipboardList, renk: "#FFB199" },
} as const;

export interface RozetDurum {
  konu: RozetSeviye;
  soru: RozetSeviye;
  deneme: RozetSeviye;
  genel: RozetSeviye;
}

export interface OyunEtiketiSayaclari {
  konu: number;
  soru: number;
  deneme: number;
}

type EtiketKategorisi = keyof OyunEtiketiSayaclari;

interface OyunEtiketi {
  ad: string;
  emoji: string;
  hedef: number;
}

const OYUN_KATEGORILERI: Record<EtiketKategorisi, { ad: string; birim: string; renk: string }> = {
  konu: { ad: "Konu tayfası", birim: "konu çalışması", renk: "var(--sfec-oyun-konu)" },
  soru: { ad: "Soru tayfası", birim: "çözülmüş soru", renk: "var(--sfec-oyun-soru)" },
  deneme: { ad: "Deneme tayfası", birim: "deneme", renk: "var(--sfec-oyun-deneme)" },
};

// 21 eğlence etiketi: her veri türüne eşit 7 kademe. Mevcut bronz/gümüş/
// altın sistemiyle bağlantılı değildir; yalnızca tüm zamanlardaki girişleri
// oyunlaştırır. Eşikler yükseldikçe kartın doluluk ve renk yoğunluğu artar.
const OYUN_ETIKETLERI: Record<EtiketKategorisi, OyunEtiketi[]> = {
  konu: [
    { ad: "Not Koklayıcısı", emoji: "🕵️", hedef: 5 },
    { ad: "Sayfa Kemirgeni", emoji: "🐹", hedef: 15 },
    { ad: "Konu Korsanı", emoji: "🏴‍☠️", hedef: 30 },
    { ad: "Müfredat Madencisi", emoji: "⛏️", hedef: 50 },
    { ad: "Bilgi Blenderı", emoji: "🌪️", hedef: 80 },
    { ad: "Konu Canavarı", emoji: "👾", hedef: 120 },
    { ad: "Ansiklopediyle Akraba", emoji: "🧠", hedef: 200 },
  ],
  soru: [
    { ad: "Şık Avcısı", emoji: "🎯", hedef: 20 },
    { ad: "Kalem Isıtan", emoji: "✏️", hedef: 100 },
    { ad: "Test Tazısı", emoji: "🐕", hedef: 250 },
    { ad: "Soru Öğütücü", emoji: "⚙️", hedef: 500 },
    { ad: "Optik Ninja", emoji: "🥷", hedef: 1000 },
    { ad: "Şıkların Efendisi", emoji: "👑", hedef: 2000 },
    { ad: "Soru Galaksisi Fatihi", emoji: "🚀", hedef: 5000 },
  ],
  deneme: [
    { ad: "Kronometre Çırağı", emoji: "⏱️", hedef: 3 },
    { ad: "Optik Form Cambazı", emoji: "🤹", hedef: 10 },
    { ad: "Deneme Korsanı", emoji: "🦜", hedef: 20 },
    { ad: "Net Peşinde Koşan", emoji: "🏃", hedef: 35 },
    { ad: "Sınav Maratoncusu", emoji: "🏅", hedef: 50 },
    { ad: "Deneme Delisi", emoji: "🤪", hedef: 75 },
    { ad: "Yüzlük Deneme Efsanesi", emoji: "💯", hedef: 100 },
  ],
};

function RozetKurallariModal({ onKapat, dokuzOnMu }: { onKapat: () => void; dokuzOnMu: boolean }) {
  useEffect(() => {
    const oncekiTasima = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const escapeIleKapat = (event: KeyboardEvent) => {
      if (event.key === "Escape") onKapat();
    };
    document.addEventListener("keydown", escapeIleKapat);

    return () => {
      document.body.style.overflow = oncekiTasima;
      document.removeEventListener("keydown", escapeIleKapat);
    };
  }, [onKapat]);

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-start justify-center px-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:items-center sm:px-4 sm:py-8"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      onClick={onKapat}>
      <div className="sfec-fade relative grid w-full max-w-sm grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-3xl"
        style={{ background: BG1, border: `2px solid ${BORDER}`, height: "calc(100dvh - max(24px, env(safe-area-inset-top) + env(safe-area-inset-bottom)))", maxHeight: 860 }}
        onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onKapat}
          className="sfec-btn absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <X size={13} color={TEXT_MUTED} />
        </button>
        <div className="flex shrink-0 items-center gap-2 px-5 pb-3 pt-5 pr-14">
          <BookText size={16} color={MINT} />
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Rozet kuralları</span>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto overscroll-contain px-5 pb-4">
        <div className="rounded-2xl p-3.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: MINT }} className="text-xs font-bold mb-1">📖 Konu Çalışma</div>
          <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
            Her gün ayrı bir &ldquo;aktif gün&rdquo; sayılır. Geriye dönük en fazla <strong>3 gün</strong> önceye kadar girebilirsin — daha uzun bir boşluk olursa seri sıfırlanır (Duolingo mantığı). Kayan 30 günde: <strong>15 gün Bronz · 20 gün Gümüş · 30 gün Altın</strong>.
          </p>
        </div>

        <div className="rounded-2xl p-3.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: "#8FC6FF" }} className="text-xs font-bold mb-1">✏️ Soru Çözümü</div>
          <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
            TYT&apos;nin 5 çekirdek dersinde (Türkçe, Matematik, Fizik, Kimya, Biyoloji) <strong>her birinde ayrı ayrı</strong> son 3 günün toplamına bakılır — en düşük ders eşiği geçmeden seviye atlanmaz. Geriye dönük en fazla <strong>3 gün</strong>. Ders başına: <strong>20+ Bronz · 30+ Gümüş · 50+ Altın</strong>.
          </p>
        </div>

        <div className="rounded-2xl p-3.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: "#FFB199" }} className="text-xs font-bold mb-1">📋 Deneme</div>
          {dokuzOnMu ? (
            <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
              9 ve 10. sınıfta Branş Denemesi sayılır — kayan 30 günde (aylık) toplam deneme sayısı. Geriye dönük en fazla <strong>7 gün</strong>. <strong>1+ Bronz · 2+ Gümüş · 3+ Altın</strong>.
            </p>
          ) : (
            <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
              Kayan 30 günde toplam deneme sayısı. Geriye dönük en fazla <strong>7 gün</strong>. <strong>3+ Bronz · 4+ Gümüş · 8+ Altın</strong>.
            </p>
          )}
        </div>

        <div className="rounded-2xl p-3.5" style={{ background: "rgba(255,196,107,0.1)", border: "1px solid rgba(255,196,107,0.3)" }}>
          <div className="mb-1 flex items-center gap-2">
            <span aria-hidden="true">🏆</span>
            <SeFuLogo className="h-6 w-auto max-w-24 object-left" />
          </div>
          <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
            Yukarıdaki 3 kategoriden kaçı Altın seviyesindeyse: <strong>1 kategori Altın → Bronz · 2 kategori Altın → Gümüş · 3 kategori Altın → Altın</strong>.
          </p>
        </div>

        <p style={{ color: TEXT_MUTED }} className="text-[10px] leading-relaxed italic">
          Not: Rozetler kalıcı değil — düzenli girişi kesersen seviye düşebilir/sıfırlanabilir.
        </p>
        </div>

        <div className="relative z-20 shrink-0 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-3" style={{ background: BG1, borderTop: `2px solid ${BORDER}` }}>
          <button type="button" onClick={onKapat}
            className="sfec-btn w-full rounded-xl py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>
            Anladım
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function OyunEtiketiKarti({ etiket, sayac, kategori }: { etiket: OyunEtiketi; sayac: number; kategori: EtiketKategorisi }) {
  const meta = OYUN_KATEGORILERI[kategori];
  const ilerleme = Math.min(100, Math.round((sayac / etiket.hedef) * 100));
  const acildi = sayac >= etiket.hedef;
  const renkYogunlugu = Math.round(7 + ilerleme * 0.25);

  return (
    <div className="rounded-2xl p-3.5 transition-[background,border-color] duration-300"
      aria-label={`${etiket.ad}: ${sayac}/${etiket.hedef} ${meta.birim}`}
      style={{
        background: `color-mix(in srgb, ${meta.renk} ${renkYogunlugu}%, var(--sfec-bg1))`,
        border: `1px solid color-mix(in srgb, ${meta.renk} ${20 + Math.round(ilerleme * 0.55)}%, var(--sfec-border))`,
      }}>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
          style={{
            background: `color-mix(in srgb, ${meta.renk} ${12 + Math.round(ilerleme * 0.38)}%, transparent)`,
            filter: acildi ? "none" : `grayscale(${Math.max(0, 75 - ilerleme)}%)`,
          }} aria-hidden="true">
          {etiket.emoji}
        </div>
        <div className="min-w-0 flex-1 text-right">
          <div className="text-sm font-extrabold leading-tight" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
            {etiket.ad}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: acildi ? meta.renk : TEXT_MUTED }}>
            {acildi ? "Açıldı" : `${sayac.toLocaleString("tr-TR")} / ${etiket.hedef.toLocaleString("tr-TR")}`}
          </div>
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: `color-mix(in srgb, ${meta.renk} 10%, var(--sfec-bg0))` }}>
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${ilerleme}%`, background: meta.renk }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[9px] font-semibold" style={{ color: TEXT_MUTED }}>
        <span>{meta.birim}</span>
        <span>%{ilerleme}</span>
      </div>
    </div>
  );
}

export function Rozetlerim({ durum, oyunSayaclari, sinifSeviyesi }: {
  durum: RozetDurum;
  oyunSayaclari: OyunEtiketiSayaclari;
  sinifSeviyesi?: string | null;
}) {
  const [kurallarAcik, setKurallarAcik] = useState(false);
  const dokuzOnMu = dokuzOnSinifMi(sinifSeviyesi);
  const kazanilanEtiketSayisi = (Object.keys(OYUN_ETIKETLERI) as EtiketKategorisi[])
    .reduce((toplam, kategori) => toplam + OYUN_ETIKETLERI[kategori].filter((etiket) => oyunSayaclari[kategori] >= etiket.hedef).length, 0);

  return (
    <div className="sfec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,196,107,0.15)" }}>
            <Trophy size={13} color="#FFC46B" />
          </div>
          <div>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="block text-[15px] font-bold">Rozetlerim</span>
            <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Disiplin rozetleri + 21 oyun etiketi</span>
          </div>
        </div>
        <button type="button" onClick={() => setKurallarAcik(true)} title="Rozet kuralları"
          className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER_STRONG}` }}>
          <BookText size={13} color={TEXT_MUTED} />
        </button>
      </div>

      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: TEXT_MUTED }}>Disiplin rozetleri</div>

      {/* SEFU KOÇ — en belirgin, en dikkat çekici olan */}
      <div className="rounded-2xl p-4 mb-3 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, rgba(255,196,107,0.18), rgba(255,196,107,0.05))", border: `1px solid rgba(255,196,107,0.35)` }}>
        <span className="text-3xl">{durum.genel === "yok" ? "🏆" : SEVIYE_EMOJI[durum.genel]}</span>
        <div className="flex flex-col">
          <span className="flex items-center gap-2">
            <SeFuLogo className="h-7 w-auto max-w-28 object-left" />
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-sm font-bold">{ROZET_SEVIYE_ETIKET[durum.genel]}</span>
          </span>
          <span style={{ color: TEXT_MUTED }} className="text-[11px]">3 kategorinin üçünde de altına ulaşınca kazanılır</span>
        </div>
      </div>

      {/* Kategori rozetleri — birbirine eşit değerde, ayrı görsellikte */}
      <div className="grid grid-cols-3 gap-2.5">
        {(Object.keys(KATEGORI_META) as (keyof typeof KATEGORI_META)[]).map((k) => {
          const meta = KATEGORI_META[k];
          const seviye = durum[k];
          const Icon = meta.Icon;
          return (
            <div key={k} className="rounded-2xl p-3 flex flex-col items-center gap-1 text-center"
              style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}`, opacity: seviye === "yok" ? 0.55 : 1 }}>
              <Icon size={14} color={meta.renk} />
              <span className="text-lg">{SEVIYE_EMOJI[seviye]}</span>
              <span style={{ color: TEXT }} className="text-[10px] font-bold leading-tight">{meta.ad}</span>
              <span style={{ color: seviye === "yok" ? TEXT_MUTED : MINT }} className="text-[9px] font-semibold">{ROZET_SEVIYE_ETIKET[seviye]}</span>
            </div>
          );
        })}
      </div>

      <section className="mt-7" aria-labelledby="oyun-etiketleri-baslik">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-2xl p-4"
          style={{ background: BG0, border: `1px solid ${BORDER}` }}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: TEXT_MUTED }}>Rozetlerden bağımsız · tamamen eğlencelik</div>
            <h2 id="oyun-etiketleri-baslik" className="mt-1 text-xl font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
              Oyun etiketleri
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
              7 konu + 7 soru + 7 deneme etiketi. Giriş yaptıkça renkleri koyulaşır; hedefe ulaşınca tamamen açılır.
            </p>
          </div>
          <div className="rounded-full px-3.5 py-2 text-xs font-extrabold" style={{ background: MINT, color: MINT_ON }}>
            {kazanilanEtiketSayisi} / 21 açıldı
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {(Object.keys(OYUN_ETIKETLERI) as EtiketKategorisi[]).map((kategori) => {
            const meta = OYUN_KATEGORILERI[kategori];
            return (
              <div key={kategori} className="rounded-3xl p-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
                <div className="mb-3 flex items-center justify-between gap-2 px-1">
                  <div>
                    <h3 className="text-sm font-extrabold" style={{ color: meta.renk, fontFamily: "var(--font-baloo)" }}>{meta.ad}</h3>
                    <p className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>7 farklı kademe</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ color: meta.renk, background: `color-mix(in srgb, ${meta.renk} 12%, transparent)` }}>
                    {oyunSayaclari[kategori].toLocaleString("tr-TR")} {meta.birim}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {OYUN_ETIKETLERI[kategori].map((etiket) => (
                    <OyunEtiketiKarti key={etiket.ad} etiket={etiket} sayac={oyunSayaclari[kategori]} kategori={kategori} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {kurallarAcik && <RozetKurallariModal onKapat={() => setKurallarAcik(false)} dokuzOnMu={dokuzOnMu} />}
    </div>
  );
}
