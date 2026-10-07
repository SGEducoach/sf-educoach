"use client";

import { useState } from "react";
import { CalendarPlus, Info } from "lucide-react";
import { SefuOtoProgramModal } from "@/components/dashboard/SefuOtoProgramModal";
import type { ProgramAkibeti } from "@/app/dashboard/rehber-program-actions";
import { BG1, BG1_ALT, BORDER, BLUSH, BUTTER, MINT, MINT_ON, SKY, TEXT, TEXT_MUTED } from "@/lib/theme";

// Rehberin öğrenci programına desteği (migration 0146).
//
// İki şartı birden tutan tasarım, ekranda da açıkça yazılı:
//   * Öğrenci KISITLANMIYOR — program onun kendi programı, taşır da siler de.
//   * Rehberliğin etkinliği KÖRELMİYOR — rehber hazırladığı programın
//     akıbetini görüyor. "Silindi" bir başarısızlık işareti değil, bir
//     sonraki görüşmede konuşulacak veri; o yüzden yargı dili yok.

export interface ProgramOgrencisi { id: string; ad: string; sinifAdi: string }

function Sayac({ etiket, deger, renk }: { etiket: string; deger: number; renk: string }) {
  return (
    <span className="rounded-2xl px-2.5 py-1 text-[11px]" style={{ background: BG1 }}>
      <strong style={{ color: renk }}>{deger}</strong> <span style={{ color: TEXT_MUTED }}>{etiket}</span>
    </span>
  );
}

export function RehberProgramDestegi({ ogrenciler, akibetler, ilkHafta, seviyeler }: {
  ogrenciler: ProgramOgrencisi[];
  akibetler: ProgramAkibeti[];
  ilkHafta: string;
  seviyeler: string[];
}) {
  const [secilen, setSecilen] = useState("");
  const [modalAcik, setModalAcik] = useState(false);

  if (seviyeler.length === 0) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p className="text-sm" style={{ color: TEXT_MUTED }}>
          Henüz sorumlu olduğunuz sınıf düzeyi atanmadı. Kurum moderatörünüz Rehberlik Servisi ekranından atama yapmalı.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
          Öğrenciyle program hazırla
        </h2>
        <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
          Öğrenciyle oturup SeFu Oto Program sihirbazını birlikte geçin: günler, çalışma saatleri ve ders ağırlıkları seçilir,
          program önizlenir, onaylayınca öğrencinin haftasına yazılır.
        </p>

        <div className="mt-3 flex items-start gap-2 rounded-2xl p-3" style={{ background: BG1_ALT }}>
          <Info size={14} color={SKY} className="mt-0.5 shrink-0" />
          <p className="text-xs" style={{ color: TEXT_MUTED }}>
            Hazırladığınız program <strong style={{ color: TEXT }}>öğrencinin kendi programı olarak kalır</strong>: taşıyabilir,
            değiştirebilir, silebilir. Bilerek böyle — kilitlenen bir program koçluk değil dayatma olur ve öğrenciyi sistemden
            uzaklaştırır. Programın akıbetini aşağıdan izleyebilir, bir sonraki görüşmenizde bunu konuşabilirsiniz.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <select
            value={secilen} onChange={(e) => setSecilen(e.target.value)}
            aria-label="Öğrenci" className="rounded-full px-3 py-1.5 text-xs"
            style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER}`, maxWidth: 280 }}
          >
            <option value="">Öğrenci seçin…</option>
            {ogrenciler.map((o) => <option key={o.id} value={o.id}>{o.ad} · {o.sinifAdi}</option>)}
          </select>
          <button
            type="button" disabled={!secilen} onClick={() => setModalAcik(true)}
            className="sfec-btn flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50"
            style={{ background: MINT, color: MINT_ON }}
          >
            <CalendarPlus size={13} /> Program sihirbazını aç
          </button>
        </div>
      </section>

      <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h3 className="text-sm font-bold" style={{ color: TEXT }}>Hazırladığınız programların akıbeti</h3>
        {akibetler.length === 0 ? (
          <p className="mt-3 text-xs" style={{ color: TEXT_MUTED }}>
            Henüz öğrenci adına program hazırlamadınız. Yukarıdan bir öğrenci seçip başlayabilirsiniz.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {akibetler.map((a) => (
              <article key={a.programId} className="rounded-2xl p-3" style={{ background: BG1_ALT }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: TEXT }}>
                    {a.ogrenciAdi} <span className="text-[11px] font-normal" style={{ color: TEXT_MUTED }}>· {a.sinifAdi}</span>
                  </span>
                  <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{a.baslangic} → {a.bitis}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Sayac etiket="blok hazırlandı" deger={a.hazirlananBlok} renk={TEXT} />
                  <Sayac etiket="tamamlandı" deger={a.tamamlanan} renk={MINT} />
                  <Sayac etiket="bekliyor" deger={a.bekleyen} renk={SKY} />
                  {a.tamamlanmayan > 0 && <Sayac etiket="yapılmadı" deger={a.tamamlanmayan} renk={BUTTER} />}
                  {a.silinen > 0 && <Sayac etiket="öğrenci kaldırdı" deger={a.silinen} renk={BLUSH} />}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalAcik && secilen && (
        <SefuOtoProgramModal
          ilkHafta={ilkHafta}
          ogrenciId={secilen}
          onKapat={() => setModalAcik(false)}
        />
      )}
    </div>
  );
}
