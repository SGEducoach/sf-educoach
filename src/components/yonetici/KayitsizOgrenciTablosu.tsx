"use client";

import { useMemo, useState } from "react";
import { BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED } from "@/lib/theme";
import { sinifSiraKarsilastir } from "@/lib/types";
import type { KayitsizOgrenciOzeti } from "@/lib/on-kayitli";
import { KayitsizYurtDugmesi } from "@/components/yonetici/KayitsizYurtDugmesi";

const TUMU = "";
const SEVIYE_ON_EKI = "seviye:";
const girdi = { border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT };

// "Sisteme kayıtlı değil" tablosu ve süzgeçleri (kullanıcı isteği 28.10.2026):
// önce sınıf düzeyi (9–12…), sonra şube; yurtlu kurumda yurt durumu.
export function KayitsizOgrenciTablosu({ schoolId, ogrenciler, yurtlu, yurtListeIdleri, yurtDuzenle }: {
  schoolId: string; ogrenciler: KayitsizOgrenciOzeti[]; yurtlu: boolean; yurtListeIdleri: string[]; yurtDuzenle: boolean;
}) {
  const [sinif, setSinif] = useState(TUMU);
  const [yurt, setYurt] = useState<"" | "yurt" | "degil">("");
  const yurtSeti = useMemo(() => new Set(yurtListeIdleri), [yurtListeIdleri]);

  const { seviyeler, subeler } = useMemo(() => {
    const m = new Map<string, { seviye: string; sube: string }>();
    for (const o of ogrenciler) {
      const [seviye, sube] = o.sinifAdi.split("-");
      if (seviye && sube) m.set(o.sinifAdi, { seviye, sube });
    }
    const sirali = [...m.entries()].sort((a, b) => sinifSiraKarsilastir(a[1], b[1]));
    return { seviyeler: [...new Set(sirali.map(([, s]) => s.seviye))], subeler: sirali.map(([ad]) => ad) };
  }, [ogrenciler]);

  const secilenSeviye = sinif.startsWith(SEVIYE_ON_EKI) ? sinif.slice(SEVIYE_ON_EKI.length) : null;
  const liste = ogrenciler.filter((o) =>
    (sinif === TUMU || (secilenSeviye ? o.sinifAdi.startsWith(`${secilenSeviye}-`) : o.sinifAdi === sinif))
    && (yurt === "" || (yurt === "yurt") === yurtSeti.has(o.listeId)));

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {subeler.length > 1 && (
          <select value={sinif} onChange={(e) => setSinif(e.target.value)} aria-label="Sınıf süz" className="rounded-xl px-3 py-1.5 text-xs outline-none" style={girdi}>
            <option value={TUMU}>Tüm sınıflar</option>
            {seviyeler.length > 1 && (
              <optgroup label="Sınıf düzeyi">
                {seviyeler.map((s) => <option key={s} value={`${SEVIYE_ON_EKI}${s}`}>{s}. Sınıflar</option>)}
              </optgroup>
            )}
            <optgroup label="Şube">
              {subeler.map((s) => <option key={s} value={s}>{s}</option>)}
            </optgroup>
          </select>
        )}
        {yurtlu && (
          <select value={yurt} onChange={(e) => setYurt(e.target.value as "" | "yurt" | "degil")} aria-label="Yurt durumu süz" className="rounded-xl px-3 py-1.5 text-xs outline-none" style={girdi}>
            <option value="">Yurt: hepsi</option>
            <option value="yurt">Yalnız yurt öğrencileri</option>
            <option value="degil">Yurtta olmayanlar</option>
          </select>
        )}
        <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{liste.length} öğrenci</span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr style={{ color: TEXT_MUTED }} className="text-[11px] uppercase tracking-wider">
              <th className="pb-1.5 pr-3 font-semibold">Öğrenci</th>
              <th className="pb-1.5 pr-3 font-semibold">Sınıf</th>
              <th className="pb-1.5 pr-3 font-semibold">Yüklü deneme</th>
              {yurtlu && <th className="pb-1.5 font-semibold">Yurt</th>}
            </tr>
          </thead>
          <tbody>
            {liste.length === 0 && (
              <tr><td colSpan={yurtlu ? 4 : 3} className="py-3 text-center text-xs" style={{ color: TEXT_MUTED }}>Bu süzgece uyan öğrenci yok.</td></tr>
            )}
            {liste.map((k) => (
              <tr key={k.listeId} style={{ borderTop: `1px solid ${BORDER}` }}>
                <td className="py-1.5 pr-3 text-sm font-semibold" style={{ color: TEXT }}>
                  {k.ad}{k.okulNo && <span className="ml-1.5 text-[11px] font-normal" style={{ color: TEXT_MUTED }}>#{k.okulNo}</span>}
                </td>
                <td className="py-1.5 pr-3 text-xs" style={{ color: TEXT_MUTED }}>{k.sinifAdi}</td>
                <td className="py-1.5 pr-3 text-xs" style={{ color: TEXT }}>
                  {k.denemeSayisi > 0
                    ? <>{k.sonNet} net <span style={{ color: TEXT_MUTED }}>· {k.denemeSayisi} deneme · son {k.sonDenemeTarihi}</span></>
                    : <span style={{ color: TEXT_MUTED }}>—</span>}
                </td>
                {yurtlu && (
                  <td className="py-1.5 text-xs" style={{ color: TEXT_MUTED }}>
                    {yurtDuzenle
                      ? <KayitsizYurtDugmesi schoolId={schoolId} listeId={k.listeId} yurtta={yurtSeti.has(k.listeId)} numarasiVar={!!k.okulNo && /^[0-9]{1,5}$/.test(k.okulNo)} />
                      : yurtSeti.has(k.listeId) ? <span style={{ color: TEXT }}>Yurt öğrencisi</span> : "—"}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
