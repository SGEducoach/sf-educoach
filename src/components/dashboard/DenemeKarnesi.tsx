"use client";

// "Deneme karnem" (kullanıcı isteği, 25.09.2026) — karneli deneme PDF'inin
// 1. sayfası: puan ve sıralamalar, ders bazında sınıf/kurum/genel
// ortalamalarıyla karşılaştırma ve soru soru cevaplar.
import { useState } from "react";
import { Award } from "lucide-react";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, BUTTER_BG, MINT, PEACH, TEXT, TEXT_MUTED } from "@/lib/theme";
import type { DenemeKarnesi as DenemeKarnesiVerisi } from "@/lib/deneme-karnesi-verisi";
import type { KarneTestCevaplari } from "@/lib/karne-birinci-sayfa";

function tarihGoster(tarih: string): string {
  const [y, a, g] = tarih.split("-");
  return `${g}.${a}.${y}`;
}

function sayiGoster(n: number | null, basamak = 2): string {
  return n === null ? "—" : n.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: basamak });
}

const SIRA_ETIKETLERI = [["sinif", "Sınıf"], ["kurum", "Kurum"], ["ilce", "İlçe"], ["il", "İl"], ["genel", "Genel"]] as const;

function CevapIzgarasi({ test }: { test: KarneTestCevaplari }) {
  const dogru = test.sorular.filter((s) => s.durum === "dogru").length;
  const yanlis = test.sorular.filter((s) => s.durum === "yanlis").length;
  const bos = test.sorular.length - dogru - yanlis;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <span style={{ color: TEXT }} className="text-xs font-bold">{test.test}</span>
        <span style={{ color: TEXT_MUTED }} className="text-[11px]">{dogru} D · {yanlis} Y · {bos} B</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {test.sorular.map((s) => {
          const renk = s.durum === "dogru" ? MINT : s.durum === "yanlis" ? BLUSH : TEXT_MUTED;
          const aciklama = s.durum === "dogru" ? `${s.no}. soru: doğru (${s.anahtar})`
            : s.durum === "yanlis" ? `${s.no}. soru: yanlış — cevabın ${s.cevap}, doğrusu ${s.anahtar}`
              : `${s.no}. soru: boş — doğrusu ${s.anahtar}`;
          return (
            <span key={s.no} title={aciklama} aria-label={aciklama}
              className="w-8 h-8 rounded-lg flex flex-col items-center justify-center leading-none"
              style={{ border: `1.5px solid ${renk}`, color: renk, opacity: s.durum === "dogru" ? 0.75 : 1 }}>
              <span className="text-[8px]" style={{ color: TEXT_MUTED }}>{s.no}</span>
              <span className="text-[11px] font-bold">{s.durum === "bos" ? "–" : s.cevap}</span>
            </span>
          );
        })}
      </div>
      {yanlis + bos > 0 && (
        <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-1.5">
          {test.sorular.filter((s) => s.durum !== "dogru").map((s) => `${s.no}: ${s.cevap ?? "boş"} → ${s.anahtar}`).join(" · ")}
        </p>
      )}
    </div>
  );
}

export function DenemeKarnesi({ karneler }: { karneler: DenemeKarnesiVerisi[] }) {
  const [secilenId, setSecilenId] = useState(karneler[0]?.denemeId ?? "");
  if (karneler.length === 0) return null;
  const k = karneler.find((x) => x.denemeId === secilenId) ?? karneler[0];

  return (
    <div className="sfec-fade rounded-3xl p-6 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: BUTTER_BG }}>
            <Award size={13} color={PEACH} aria-hidden="true" />
          </div>
          <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Deneme karnesi</h2>
        </div>
        <select value={k.denemeId} onChange={(e) => setSecilenId(e.target.value)} aria-label="Deneme seç"
          className="text-xs px-3 py-1.5 rounded-xl outline-none"
          style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
          {karneler.map((x) => <option key={x.denemeId} value={x.denemeId}>{tarihGoster(x.tarih)} · {x.tur} · {x.yayinevi}</option>)}
        </select>
      </div>

      <div className="flex flex-col gap-5">
        {k.puanlar.map((p) => (
          <section key={p.tur} aria-label={`${p.tur} puanı ve sıralamalar`}>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span style={{ color: TEXT }} className="text-2xl font-bold">{sayiGoster(p.puan, 3)}</span>
              <span style={{ color: TEXT_MUTED }} className="text-xs">{p.tur} puanı · genel ortalama {sayiGoster(p.genelOrtalama, 3)}</span>
            </div>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2">
              {SIRA_ETIKETLERI.map(([alan, etiket]) => (
                <div key={alan} className="rounded-xl px-3 py-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
                  <div style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{etiket}</div>
                  <div style={{ color: TEXT }} className="text-sm font-bold">
                    {p.sira[alan] ?? "—"}<span style={{ color: TEXT_MUTED }} className="text-[11px] font-normal">{p.katilim?.[alan] ? ` / ${p.katilim[alan]}` : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {k.dersler.length > 0 && (
          <section aria-label="Ders ortalamaları">
            <h3 style={{ color: TEXT }} className="text-sm font-bold mb-2">Ortalamalarla karşılaştırma (net)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ color: TEXT_MUTED }} className="text-left">
                    <th className="font-semibold py-1 pr-2">Ders</th>
                    <th className="font-semibold py-1 px-2 text-right">Senin</th>
                    <th className="font-semibold py-1 px-2 text-right">Sınıf</th>
                    <th className="font-semibold py-1 px-2 text-right">Kurum</th>
                    <th className="font-semibold py-1 pl-2 text-right">Genel</th>
                  </tr>
                </thead>
                <tbody>
                  {k.dersler.map((d) => {
                    const toplamSatiri = /^TYT |^AYT /.test(d.ders);
                    const fark = d.sinifOrt === null ? null : d.net - d.sinifOrt;
                    return (
                      <tr key={d.ders} style={{ borderTop: `1px solid ${BORDER}`, color: TEXT }} className={toplamSatiri ? "font-bold" : ""}>
                        <td className="py-1.5 pr-2">{d.ders}</td>
                        <td className="py-1.5 px-2 text-right font-bold" style={{ color: fark === null ? TEXT : fark >= 0 ? MINT : BLUSH }}>{sayiGoster(d.net)}</td>
                        <td className="py-1.5 px-2 text-right" style={{ color: TEXT_MUTED }}>{sayiGoster(d.sinifOrt)}</td>
                        <td className="py-1.5 px-2 text-right" style={{ color: TEXT_MUTED }}>{sayiGoster(d.kurumOrt)}</td>
                        <td className="py-1.5 pl-2 text-right" style={{ color: TEXT_MUTED }}>{sayiGoster(d.genelOrt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-1">Kırmızı: sınıf ortalamasının altında</p>
          </section>
        )}

        {k.testler.length > 0 && (
          <section aria-label="Soru soru cevaplar" className="flex flex-col gap-4">
            <h3 style={{ color: TEXT }} className="text-sm font-bold">Soru soru cevaplar{k.testler[0].kitapcik ? ` · ${k.testler[0].kitapcik} kitapçığı` : ""}</h3>
            {k.testler.map((t) => <CevapIzgarasi key={t.test} test={t} />)}
          </section>
        )}
      </div>
    </div>
  );
}
