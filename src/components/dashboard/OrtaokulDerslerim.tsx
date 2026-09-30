"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { temaTuruEtiketi } from "@/lib/ortaokul-mufredat";
import type { OrtaokulDersi, OrtaokulTemasi } from "@/lib/ortaokul-mufredat";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Ortaokul "Derslerim" — Faz 1 (tasarım belgesi §7).
//
// Bilinçli sadelik: yüzde YOK, renk tek başına anlam taşımıyor, her kartta
// tek eylem var. Konu durumu (öğreniyorsun / sağlamlaştırdın) henüz
// hesaplanmıyor; bu ekran müfredatı görünür kılar, ilerleme sonraki dilimde
// eklenecek. Var olmayan bir bilgiyi "%0" diye göstermemek için hiç
// göstermiyoruz.
export function OrtaokulDerslerim({ dersler, secili, temalar }: {
  dersler: OrtaokulDersi[];
  secili: OrtaokulDersi | null;
  temalar: OrtaokulTemasi[];
}) {
  if (dersler.length === 0) {
    return (
      <div className="rounded-3xl p-6" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p className="text-sm" style={{ color: TEXT_MUTED }}>
          Sınıfın için ders listesi henüz hazır değil. Öğretmenine haber verebilirsin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
            <BookOpen size={16} color={MINT} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Derslerim</h2>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>Bir derse dokun, içindeki konuları gör.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {dersler.map((d) => {
            const acik = secili?.id === d.id;
            return (
              <a key={d.id} href={acik ? "/dashboard/ortaokul-dersler" : `/dashboard/ortaokul-dersler?ders=${d.id}`}
                className="sfec-btn flex items-center gap-3 rounded-2xl px-4 py-3 text-left"
                style={{
                  background: acik ? MINT_BG : BG1_ALT,
                  border: `2px solid ${acik ? MINT : BORDER_STRONG}`,
                }}>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold" style={{ color: TEXT }}>{d.ad}</div>
                  <div className="text-[11px]" style={{ color: TEXT_MUTED }}>
                    {d.temaSayisi} {temaTuruEtiketi(temalar[0]?.tur ?? "tema", true).toLocaleLowerCase("tr")} · {d.kazanimSayisi} öğrenme hedefi
                  </div>
                </div>
                {acik ? <ChevronDown size={16} color={MINT} /> : <ChevronRight size={16} color={TEXT_MUTED} />}
              </a>
            );
          })}
        </div>
      </div>

      {secili && <DersHaritasi ders={secili} temalar={temalar} />}
    </div>
  );
}

function DersHaritasi({ ders, temalar }: { ders: OrtaokulDersi; temalar: OrtaokulTemasi[] }) {
  const [acikTema, setAcikTema] = useState<string | null>(temalar[0]?.id ?? null);
  const tur = temalar[0]?.tur ?? "tema";

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h3 className="mb-1 text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{ders.ad}</h3>
      <p className="mb-3 text-xs" style={{ color: TEXT_MUTED }}>
        {temalar.length} {temaTuruEtiketi(tur, true).toLocaleLowerCase("tr")} · {ders.kazanimSayisi} öğrenme hedefi
      </p>

      <div className="flex flex-col gap-2">
        {temalar.map((t) => {
          const acik = acikTema === t.id;
          return (
            <div key={t.id} className="rounded-2xl" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
              <button type="button" onClick={() => setAcikTema(acik ? null : t.id)}
                className="sfec-btn flex w-full items-center gap-2 px-4 py-3 text-left">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold" style={{ color: TEXT }}>
                    {/* Kaynak programın özet tablosundan adı çıkmayan başlıklar
                        için kodu göstermek, boş bırakmaktan iyi. */}
                    {t.ad ?? t.kod}
                  </div>
                  <div className="text-[11px]" style={{ color: TEXT_MUTED }}>
                    {t.kazanimlar.length} öğrenme hedefi
                    {t.dersSaati !== null && <> · {t.dersSaati} ders saati</>}
                  </div>
                </div>
                {acik ? <ChevronDown size={15} color={TEXT_MUTED} /> : <ChevronRight size={15} color={TEXT_MUTED} />}
              </button>

              {acik && t.kazanimlar.length > 0 && (
                <ul className="flex flex-col gap-1.5 px-4 pb-3">
                  {t.kazanimlar.map((k) => (
                    <li key={k.id} className="rounded-xl px-3 py-2 text-xs leading-relaxed"
                      style={{ background: BG0, color: TEXT }}>
                      {k.metin}
                    </li>
                  ))}
                </ul>
              )}
              {acik && t.kazanimlar.length === 0 && (
                <p className="px-4 pb-3 text-[11px]" style={{ color: TEXT_MUTED }}>
                  Bu {temaTuruEtiketi(tur).toLocaleLowerCase("tr")} için ayrıntı listesi yok.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
