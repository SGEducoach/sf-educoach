import { ArrowDownRight, ArrowUpRight, Sprout } from "lucide-react";
import { GELISIM_DUZEYLERI, ayEtiketi, gelisimOzeti } from "@/lib/ilkokul-gelisim";
import type { GelisimDuzeyi } from "@/lib/ilkokul-gelisim";
import type { IlkokulOgrenciRaporu } from "@/lib/ilkokul-gelisim-sorgu";
import { BG0, BG1, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, PEACH, PEACH_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

// İlkokul gelişim raporunun salt okunur görünümü (16.10.2026): veli ana
// sayfası ve öğretmenin öğrenci sayfası. Son işaretli ay ve bir önceki
// işaretli aya göre değişim; sınıf öğretmeni ve rehberlik notları.

const DUZEY_RENK: Record<GelisimDuzeyi, { arka: string; yazi: string }> = {
  gelistirilmeli: { arka: PEACH_BG, yazi: PEACH },
  gelisiyor: { arka: BUTTER_BG, yazi: BUTTER },
  basarili: { arka: MINT_BG, yazi: MINT },
};

export function IlkokulGelisimRaporu({ rapor, ogrenciAdi }: { rapor: IlkokulOgrenciRaporu; ogrenciAdi?: string }) {
  const ozet = gelisimOzeti(rapor.kayitlar);
  const sonAyNotlari = ozet.sonAy ? rapor.notlar.filter((n) => n.ay === ozet.sonAy) : [];

  return (
    <section className="sfec-fade rounded-3xl p-5 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
          <Sprout size={16} color={MINT} />
        </div>
        <div>
          <h2 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
            Gelişim Raporu{ogrenciAdi ? ` — ${ogrenciAdi}` : ""}
          </h2>
          <p className="text-xs" style={{ color: TEXT_MUTED }}>
            {ozet.sonAy ? `${ayEtiketi(ozet.sonAy)} değerlendirmesi${ozet.oncekiAy ? `, ${ayEtiketi(ozet.oncekiAy)} ile karşılaştırmalı` : ""}` : "Öğretmen bu ayın değerlendirmesini henüz girmedi."}
          </p>
        </div>
      </div>

      {ozet.sonAy && (
        <div className="grid gap-2 sm:grid-cols-2">
          {ozet.satirlar.map((s) => {
            const renk = s.duzey ? DUZEY_RENK[s.duzey] : null;
            return (
              <div key={s.kalem} className="flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
                <span className="text-sm font-semibold" style={{ color: TEXT }}>{s.ad}</span>
                <span className="flex items-center gap-1.5">
                  {s.degisim === "yukseldi" && <ArrowUpRight size={14} color={MINT} aria-label="geçen aya göre yükseldi" />}
                  {s.degisim === "dustu" && <ArrowDownRight size={14} color={PEACH} aria-label="geçen aya göre düştü" />}
                  {s.duzey
                    ? <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: renk!.arka, color: renk!.yazi }}>{GELISIM_DUZEYLERI.find((d) => d.anahtar === s.duzey)?.ad}</span>
                    : <span className="text-xs" style={{ color: TEXT_MUTED }}>Bu ay işaretlenmedi</span>}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {sonAyNotlari.length > 0 && (
        <div className="flex flex-col gap-2">
          {sonAyNotlari.map((n) => (
            <div key={n.tur} className="rounded-2xl px-4 py-3" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
              <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
                {n.tur === "ogretmen" ? "Sınıf öğretmeninin notu" : "Rehberlik servisinin notu"}
              </p>
              <p className="mt-1 text-sm whitespace-pre-line" style={{ color: TEXT }}>{n.metin}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
