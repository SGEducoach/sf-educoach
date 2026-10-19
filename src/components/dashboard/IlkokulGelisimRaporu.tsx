import { ArrowDownRight, ArrowUpRight, Printer, Sprout } from "lucide-react";
import { GELISIM_DUZEYLERI, ayEtiketi, gelisimOzeti } from "@/lib/ilkokul-gelisim";
import type { IlkokulOgrenciRaporu } from "@/lib/ilkokul-gelisim-sorgu";
import { DUZEY_RENK } from "@/components/dashboard/ilkokul-renkler";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, PEACH, TEXT, TEXT_MUTED } from "@/lib/theme";

// İlkokul gelişim raporunun salt okunur görünümü (16.10.2026; MEB uyumu
// 19.10.2026): veli ana sayfası ve öğretmenin öğrenci sayfası. Son işaretli
// ay ve bir önceki işaretli aya göre değişim; MEB dersleri ve kurum
// değerlendirmesi ayrı; sınıf öğretmeni ve rehberlik notları. Dönem sonu
// raporu ayrı sayfada yazdırılır.

export function IlkokulGelisimRaporu({ rapor, ogrenciAdi, raporBaglantisi = true }: { rapor: IlkokulOgrenciRaporu; ogrenciAdi?: string; raporBaglantisi?: boolean }) {
  const ozet = gelisimOzeti(rapor.kayitlar, rapor.seviye);
  const sonAyNotlari = ozet.sonAy ? rapor.notlar.filter((n) => n.ay === ozet.sonAy) : [];
  const bolumler = [
    { baslik: "Dersler", satirlar: ozet.satirlar.filter((s) => s.bolum === "ders") },
    { baslik: "Kurum Değerlendirmesi", satirlar: ozet.satirlar.filter((s) => s.bolum === "kurum") },
  ];

  return (
    <section className="sfec-fade rounded-3xl p-5 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        {raporBaglantisi && (
          <a href={`/dashboard/gelisim-raporu?ogrenci=${rapor.studentId}`} target="_blank" rel="noopener"
            className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold print:hidden"
            style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
            <Printer size={13} aria-hidden="true" /> Dönem Sonu Gelişim Raporu
          </a>
        )}
      </div>

      {ozet.sonAy && bolumler.map((b) => b.satirlar.length > 0 && (
        <div key={b.baslik} className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{b.baslik}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {b.satirlar.map((s) => {
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
        </div>
      ))}

      {rapor.etkinlikler.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Katıldığı sosyal etkinlikler</p>
          <ul className="flex flex-col gap-1.5">
            {rapor.etkinlikler.map((e, i) => (
              <li key={`${e.tarih}-${i}`} className="rounded-2xl px-4 py-2.5" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
                <p className="text-sm font-semibold" style={{ color: TEXT }}>
                  {e.ad} <span className="text-xs font-normal" style={{ color: TEXT_MUTED }}>· {e.tarih.split("-").reverse().join(".")}</span>
                </p>
                {e.aciklama && <p className="text-xs" style={{ color: TEXT_MUTED }}>{e.aciklama}</p>}
              </li>
            ))}
          </ul>
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
