"use client";

import { DERS_SAATI_DILIMLERI, GUN_ETIKET } from "@/lib/ders-programi";
import type { DersProgramiGunu, DersProgramiSatiri } from "@/lib/ders-programi";
import { BG0, BG1_ALT, BORDER, BORDER_STRONG, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";
import { Plus, X } from "lucide-react";

// Öğretmen Ders Programı — gerçek MEB ders programı belgesinin (gün ×
// ders saati matrisi, hücrede sınıf üstte + ders altta) aynı yapısı
// (bkz. src/lib/ders-programi.ts yorumu). Salt-okunur (öğretmenin kendi
// Derslerim görünümü) VEYA düzenlenebilir (admin/dershane müdürü) modda
// çalışır — ikisi de aynı hücre yerleşimini kullanır ki görünüm tutarlı
// kalsın.
export function DersProgramiGrid({ gunler, satirlar, duzenlenebilir, onHucreTikla }: {
  gunler: DersProgramiGunu[];
  satirlar: DersProgramiSatiri[];
  duzenlenebilir?: boolean;
  onHucreTikla?: (gun: DersProgramiGunu, sira: number, mevcut: DersProgramiSatiri | null) => void;
}) {
  const harita = new Map<string, DersProgramiSatiri>();
  for (const s of satirlar) harita.set(`${s.gun}|${s.dersSaatiSira}`, s);

  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: `2px solid ${BORDER}` }}>
      <table className="w-full text-left" style={{ borderCollapse: "collapse", minWidth: `${120 + DERS_SAATI_DILIMLERI.length * 96}px` }}>
        <thead>
          <tr style={{ background: BG1_ALT }}>
            <th className="sticky left-0 px-3 py-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED, background: BG1_ALT, borderRight: `2px solid ${BORDER}` }}>
              Gün
            </th>
            {DERS_SAATI_DILIMLERI.map((d) => (
              <th key={d.sira} className="px-2 py-2 text-center text-[10px] font-bold" style={{ color: TEXT_MUTED, borderLeft: `1px solid ${BORDER}` }}>
                <div>({d.sira})</div>
                <div className="font-normal normal-case" style={{ color: TEXT_MUTED }}>{d.baslangic}–{d.bitis}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {gunler.map((gun) => (
            <tr key={gun}>
              <td className="sticky left-0 px-3 py-2 text-xs font-bold whitespace-nowrap" style={{ color: TEXT, background: BG0, borderRight: `2px solid ${BORDER}`, borderTop: `1px solid ${BORDER}` }}>
                {GUN_ETIKET[gun]}
              </td>
              {DERS_SAATI_DILIMLERI.map((d) => {
                const kayit = harita.get(`${gun}|${d.sira}`) ?? null;
                const tiklanabilir = duzenlenebilir && onHucreTikla;
                return (
                  <td key={d.sira} className="p-1 text-center align-middle" style={{ borderLeft: `1px solid ${BORDER}`, borderTop: `1px solid ${BORDER}`, minWidth: 92 }}>
                    {kayit ? (
                      <div className="group relative rounded-lg px-1.5 py-1" style={{ background: MINT_BG }}>
                        <div className="text-[11px] font-bold" style={{ color: TEXT }}>{kayit.sinifAdi}</div>
                        <div className="text-[10px]" style={{ color: TEXT_MUTED }}>{kayit.ders}</div>
                        {tiklanabilir && (
                          <button type="button" onClick={() => onHucreTikla(gun, d.sira, kayit)} title="Kaldır"
                            className="sfec-btn absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full"
                            style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
                            <X size={9} color={TEXT_MUTED} />
                          </button>
                        )}
                      </div>
                    ) : tiklanabilir ? (
                      <button type="button" onClick={() => onHucreTikla(gun, d.sira, null)} title="Ders ekle"
                        className="sfec-btn flex h-9 w-full items-center justify-center rounded-lg opacity-40 hover:opacity-100"
                        style={{ border: `1px dashed ${BORDER_STRONG}` }}>
                        <Plus size={11} color={TEXT_MUTED} />
                      </button>
                    ) : (
                      <div className="h-9" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
