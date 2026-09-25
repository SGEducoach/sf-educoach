"use client";

// Deneme konu analizi (kullanıcı isteği, 25.09.2026) — karneli deneme
// PDF'lerinden gelen konu dökümünü gösterir. İki kapsam:
//  - "ogrenci": tek öğrencinin en çok net kaybettiği konular + ders ders döküm
//  - "grup": sınıf/okul geneli (öğretmen/müdür) — aynı hesap, tüm öğrenciler
// Hesap sunucuda yapılıp (konuAnaliziOzetle) buraya özet olarak geliyor.
import { useState } from "react";
import { ChevronDown, ChevronUp, ClipboardList, TrendingDown, TrendingUp } from "lucide-react";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, BUTTER, MINT, SKY, SKY_BG, TEXT, TEXT_MUTED,
} from "@/lib/theme";
import type { KonuAnaliziOzeti, KonuSonucu } from "@/lib/deneme-konu-analizi";

const TUMU = "tumu";
const ONE_CIKAN_SAYISI = 8;

function basariRengi(basari: number): string {
  if (basari >= 75) return MINT;
  if (basari >= 50) return BUTTER;
  return BLUSH;
}

function tarihGoster(tarih: string): string {
  const [y, a, g] = tarih.split("-");
  return `${g}.${a}.${y}`;
}

function BasariCubugu({ basari }: { basari: number }) {
  return (
    <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: BORDER }} aria-hidden="true">
      <div className="h-full rounded-full" style={{ width: `${basari}%`, background: basariRengi(basari) }} />
    </div>
  );
}

function Gidisat({ konu }: { konu: KonuSonucu }) {
  if (konu.gecmis.length < 2) return null;
  const ilk = konu.gecmis[0].basari;
  const son = konu.gecmis[konu.gecmis.length - 1].basari;
  if (Math.abs(son - ilk) < 5) return null;
  const artti = son > ilk;
  const Icon = artti ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold" style={{ color: artti ? MINT : BLUSH }}
      title={konu.gecmis.map((g) => `${tarihGoster(g.tarih)}: %${g.basari}`).join(" · ")}>
      <Icon size={11} aria-hidden="true" /> %{ilk} → %{son}
    </span>
  );
}

function KonuSatiri({ konu, grup }: { konu: KonuSonucu; grup: boolean }) {
  return (
    <div className="flex flex-col gap-1 py-2" style={{ borderTop: `1px solid ${BORDER}` }}>
      <div className="flex items-baseline justify-between gap-2">
        <span style={{ color: TEXT }} className="text-sm font-semibold">{konu.konu}</span>
        <span style={{ color: basariRengi(konu.basari) }} className="text-sm font-bold shrink-0">%{konu.basari}</span>
      </div>
      <BasariCubugu basari={konu.basari} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]" style={{ color: TEXT_MUTED }}>
        <span>{konu.soru} soru · {konu.dogru} D · {konu.yanlis} Y · {konu.bos} B</span>
        <span>kayıp {konu.kayipNet.toLocaleString("tr-TR")} net</span>
        {grup && <span>{konu.ogrenciSayisi} öğrenci</span>}
        <Gidisat konu={konu} />
      </div>
    </div>
  );
}

function DersBolumu({ ders, konular, grup }: { ders: string; konular: KonuSonucu[]; grup: boolean }) {
  const [acik, setAcik] = useState(false);
  const soru = konular.reduce((t, k) => t + k.soru, 0);
  const dogru = konular.reduce((t, k) => t + k.dogru, 0);
  const basari = soru > 0 ? Math.round((dogru / soru) * 100) : 0;
  const siraliKonular = [...konular].sort((a, b) => a.basari - b.basari || b.soru - a.soru);
  return (
    <div className="rounded-2xl" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <button type="button" onClick={() => setAcik((a) => !a)} aria-expanded={acik}
        className="sfec-btn w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span style={{ color: TEXT }} className="text-sm font-bold">{ders}</span>
            <span style={{ color: basariRengi(basari) }} className="text-xs font-bold">%{basari}</span>
          </div>
          <div className="mt-1.5"><BasariCubugu basari={basari} /></div>
          <div style={{ color: TEXT_MUTED }} className="text-[11px] mt-1">{konular.length} konu · {soru} soru</div>
        </div>
        {acik ? <ChevronUp size={16} color={TEXT_MUTED} /> : <ChevronDown size={16} color={TEXT_MUTED} />}
      </button>
      {acik && <div className="px-4 pb-2">{siraliKonular.map((k) => <KonuSatiri key={k.anahtar} konu={k} grup={grup} />)}</div>}
    </div>
  );
}

export function DenemeKonuAnalizi({ ozet, kapsam, kapsamEtiketi, hata }: {
  ozet: KonuAnaliziOzeti; kapsam: "ogrenci" | "grup"; kapsamEtiketi?: string; hata?: string | null;
}) {
  const [secilen, setSecilen] = useState(TUMU);
  const grup = kapsam === "grup";
  const konular = secilen === TUMU ? ozet.tumu : (ozet.denemeBazli[secilen] ?? []);
  const oneCikanlar = konular.slice(0, ONE_CIKAN_SAYISI);
  const dersler = [...new Set(konular.map((k) => k.ders))];

  return (
    <div className="sfec-fade rounded-3xl p-6 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: SKY_BG }}>
            <ClipboardList size={13} color={SKY} aria-hidden="true" />
          </div>
          <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">
            Deneme konu analizi{kapsamEtiketi ? ` · ${kapsamEtiketi}` : ""}
          </h2>
        </div>
        {ozet.denemeler.length > 0 && (
          <select value={secilen} onChange={(e) => setSecilen(e.target.value)} aria-label="Deneme seç"
            className="text-xs px-3 py-1.5 rounded-xl outline-none"
            style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
            <option value={TUMU}>Tüm denemeler ({ozet.denemeler.length})</option>
            {ozet.denemeler.map((d) => (
              <option key={d.anahtar} value={d.anahtar}>
                {tarihGoster(d.tarih)} · {d.tur} · {d.yayinevi}{grup ? ` · ${d.ogrenciSayisi} öğr.` : ""}
              </option>
            ))}
          </select>
        )}
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
        {grup
          ? "Karneli deneme sonuçlarına göre öğrencilerin en çok net kaybettiği konular."
          : "Karneli deneme sonuçlarına göre en çok net kaybettiğin konular — tekrar için buradan başla."}
      </p>

      {hata ? (
        <p style={{ color: BLUSH }} className="text-sm font-semibold">Konu verisi alınamadı: {hata}</p>
      ) : konular.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-4 text-center">
          Henüz konu dökümü olan bir deneme yok. Deneme sonucu karneli PDF olarak yüklendiğinde konular burada görünür.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <section aria-label="En çok net kaybedilen konular">
            <h3 style={{ color: TEXT }} className="text-sm font-bold mb-1">En çok net kaybedilen {oneCikanlar.length} konu</h3>
            <div>
              {oneCikanlar.map((k) => (
                <div key={k.anahtar}>
                  <div style={{ color: TEXT_MUTED }} className="text-[10px] font-bold uppercase tracking-wide pt-2">{k.ders}</div>
                  <KonuSatiri konu={k} grup={grup} />
                </div>
              ))}
            </div>
          </section>
          <section aria-label="Ders ders konular" className="flex flex-col gap-2">
            <h3 style={{ color: TEXT }} className="text-sm font-bold">Ders ders</h3>
            {dersler.map((d) => <DersBolumu key={d} ders={d} konular={konular.filter((k) => k.ders === d)} grup={grup} />)}
          </section>
        </div>
      )}
    </div>
  );
}
