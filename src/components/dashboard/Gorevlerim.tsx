"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, BookOpen, PenLine, ClipboardList, X, Clock } from "lucide-react";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, PEACH, PEACH_BG, BLUSH, BLUSH_BG, TEXT, TEXT_MUTED } from "@/lib/theme";
import { GOREV_TURU_ETIKET, GOREV_DURUMU_ETIKET } from "@/lib/types";
import type { GorevTuru, GorevDurumu, AytAlan } from "@/lib/types";
import { KonuCalismaForm, SoruCozumuForm, DenemeForm } from "@/components/dashboard/OgrenciVeriGirisi";

export interface GorevSatiri {
  atamaId: string;
  tur: GorevTuru;
  ders: string;
  konu: string | null;
  hedefSoruSayisi: number | null;
  hedefDakika: number | null;
  tarih: string;
  sonTarih: string;
  baslangicSaat: string | null;
  bitisSaat: string | null;
  aciklama: string | null;
  durum: GorevDurumu;
}

const TUR_IKON: Record<GorevTuru, typeof BookOpen> = { konu: BookOpen, soru: PenLine, deneme: ClipboardList };
const DURUM_RENK: Record<GorevDurumu, { bg: string; renk: string }> = {
  bekliyor: { bg: PEACH_BG, renk: PEACH },
  tamamlandi: { bg: MINT_BG, renk: MINT },
  tamamlanmadi: { bg: BLUSH_BG, renk: BLUSH },
};

function gunAdi(tarihISO: string) {
  return new Date(`${tarihISO}T00:00:00`).toLocaleDateString("tr-TR", { weekday: "short" });
}
function gunSayisi(tarihISO: string) {
  return new Date(`${tarihISO}T00:00:00`).getDate();
}
function bugununTarihi() {
  return new Date().toISOString().slice(0, 10);
}

// Haftalık görev takvimi — mobilde tek günlük kart listesi + üstte yatay
// kaydırılabilir gün şeridi (7 sütunlu masaüstü tablo yerine, dar ekranda da
// aynı, tek bir düzen). Görev tamamlama, AYRI bir form değil — ilgili mevcut
// veri giriş formu (Konu/Soru/Deneme) bir modal içinde açılıp gorevAtamaId
// ile ilişkilendiriliyor; böylece rozet/analiz sistemleri görev kaynaklı
// girişleri de otomatik sayıyor (bkz. yenilikler_1.txt §5, Faz 3 planı).
export function Gorevlerim({ gorevler, haftaBaslangic, aytAlan, dokuzOnMu, dersListesi, konuOnerileri, konuSayaclari }: {
  gorevler: GorevSatiri[];
  haftaBaslangic: string;
  aytAlan: AytAlan;
  dokuzOnMu: boolean;
  dersListesi: string[];
  konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
  konuSayaclari?: Record<string, { tamamlanan: number; toplam: number }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gunler = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${haftaBaslangic}T00:00:00`);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const bugun = bugununTarihi();
  const [seciliGun, setSeciliGun] = useState(gunler.includes(bugun) ? bugun : gunler[0]);
  const [acikGorev, setAcikGorev] = useState<GorevSatiri | null>(null);

  const gunlukGorevSayisi = new Map<string, number>();
  for (const g of gorevler) gunlukGorevSayisi.set(g.tarih, (gunlukGorevSayisi.get(g.tarih) ?? 0) + 1);

  function haftaGuncelle(haftaISO: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("hafta", haftaISO);
    router.push(`/dashboard?${params.toString()}`);
  }

  function haftaDegistir(yon: -1 | 1) {
    const d = new Date(`${haftaBaslangic}T00:00:00`);
    d.setDate(d.getDate() + yon * 7);
    haftaGuncelle(d.toISOString().slice(0, 10));
  }

  const gunGorevleri = gorevler.filter((g) => g.tarih === seciliGun);

  return (
    <div className="sfec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center justify-between mb-4">
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Görevlerim</span>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => haftaDegistir(-1)} title="Önceki hafta"
            className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
            <ChevronLeft size={14} color={TEXT_MUTED} />
          </button>
          <button type="button" onClick={() => { haftaGuncelle(bugun); setSeciliGun(bugun); }}
            className="sfec-btn text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: BG1_ALT, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            Bugün
          </button>
          <button type="button" onClick={() => haftaDegistir(1)} title="Sonraki hafta"
            className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
            <ChevronRight size={14} color={TEXT_MUTED} />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
        {gunler.map((g) => {
          const secili = g === seciliGun;
          const sayisi = gunlukGorevSayisi.get(g) ?? 0;
          return (
            <button key={g} type="button" onClick={() => setSeciliGun(g)}
              className="sfec-btn shrink-0 flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 min-w-[52px]"
              style={{
                background: secili ? MINT : g === bugun ? MINT_BG : BG1_ALT,
                color: secili ? MINT_ON : TEXT,
                border: `2px solid ${secili ? MINT : BORDER_STRONG}`,
              }}>
              <span className="text-[10px] font-semibold uppercase">{gunAdi(g)}</span>
              <span className="text-sm font-bold">{gunSayisi(g)}</span>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: sayisi > 0 ? (secili ? MINT_ON : PEACH) : "transparent" }} />
            </button>
          );
        })}
      </div>

      {gunGorevleri.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-6 text-center">Bu gün için görev yok.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {gunGorevleri.map((g) => {
            const Icon = TUR_IKON[g.tur];
            const renk = DURUM_RENK[g.durum];
            const hedefMetni = g.tur === "soru" && g.hedefSoruSayisi ? `${g.hedefSoruSayisi} soru`
              : g.tur === "konu" && g.hedefDakika ? `${g.hedefDakika} dk`
              : null;
            return (
              <div key={g.atamaId} className="rounded-2xl p-3.5 flex items-start justify-between gap-3 flex-wrap" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: renk.bg }}>
                    <Icon size={14} color={renk.renk} />
                  </div>
                  <div className="min-w-0">
                    <div style={{ color: TEXT }} className="text-sm font-bold">{GOREV_TURU_ETIKET[g.tur]} · {g.ders}</div>
                    {g.konu && <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">{g.konu}</div>}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {hedefMetni && <span style={{ color: TEXT_MUTED }} className="text-[11px]">🎯 {hedefMetni}</span>}
                      {g.baslangicSaat && (
                        <span style={{ color: TEXT_MUTED }} className="text-[11px] flex items-center gap-0.5">
                          <Clock size={10} /> {g.baslangicSaat.slice(0, 5)}{g.bitisSaat ? `–${g.bitisSaat.slice(0, 5)}` : ""}
                        </span>
                      )}
                    </div>
                    {g.aciklama && <div style={{ color: TEXT_MUTED }} className="text-[11px] mt-1 italic">{g.aciklama}</div>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: renk.bg, color: renk.renk }}>{GOREV_DURUMU_ETIKET[g.durum]}</span>
                  {g.durum === "bekliyor" && (
                    <button type="button" onClick={() => setAcikGorev(g)}
                      className="sfec-btn text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: MINT, color: MINT_ON }}>
                      Tamamla
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {acikGorev && createPortal(
        <GorevTamamlamaModal
          gorev={acikGorev}
          aytAlan={aytAlan}
          dokuzOnMu={dokuzOnMu}
          dersListesi={dersListesi}
          konuOnerileri={konuOnerileri}
          konuSayaclari={konuSayaclari}
          onKapat={() => setAcikGorev(null)}
        />,
        document.body,
      )}
    </div>
  );
}

function GorevTamamlamaModal({ gorev, aytAlan, dokuzOnMu, dersListesi, konuOnerileri, konuSayaclari, onKapat }: {
  gorev: GorevSatiri;
  aytAlan: AytAlan;
  dokuzOnMu: boolean;
  dersListesi: string[];
  konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
  konuSayaclari?: Record<string, { tamamlanan: number; toplam: number }>;
  onKapat: () => void;
}) {
  const [basari, setBasari] = useState<string | null>(null);

  function basariGoster(mesaj: string) {
    setBasari(mesaj);
    setTimeout(onKapat, 1200);
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4"
      style={{ background: "rgba(0,0,0,0.55)" }} onClick={onKapat}>
      <div className="sfec-fade w-full max-w-md rounded-3xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: BG1, border: `2px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">{GOREV_TURU_ETIKET[gorev.tur]} görevini tamamla</span>
          <button type="button" onClick={onKapat} className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <X size={13} color={TEXT_MUTED} />
          </button>
        </div>
        {basari ? (
          <div style={{ color: MINT }} className="text-sm font-semibold py-6 text-center">✓ {basari}</div>
        ) : gorev.tur === "konu" ? (
          <KonuCalismaForm dersListesi={dersListesi} konuOnerileri={konuOnerileri} konuSayaclari={konuSayaclari}
            prefillDers={gorev.ders} prefillKonu={gorev.konu ?? undefined} gorevAtamaId={gorev.atamaId}
            onBasari={(m) => basariGoster(m)} />
        ) : gorev.tur === "soru" ? (
          <SoruCozumuForm dersListesi={dersListesi} konuOnerileri={konuOnerileri}
            prefillDers={gorev.ders} prefillKonu={gorev.konu ?? undefined} gorevAtamaId={gorev.atamaId}
            onBasari={(m) => basariGoster(m)} />
        ) : (
          <DenemeForm aytAlan={aytAlan} dokuzOnMu={dokuzOnMu} gorevAtamaId={gorev.atamaId}
            onBasari={(m) => basariGoster(m)} />
        )}
      </div>
    </div>
  );
}
