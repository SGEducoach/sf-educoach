import { BookOpen, ClipboardCheck, Clock } from "lucide-react";
import type { OrtaokulVeliRaporu } from "@/lib/ortaokul-veli-raporu";
import { YETERLILIK_ETIKET, yeterlilikDurumuCoz } from "@/lib/ortaokul-yeterlilik";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, BUTTER, MINT, MINT_BG, SKY, SKY_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Ortaokul velisinin raporu (O1, 08.10.2026). YKS'yi TAKLİT ETMİYOR:
// net trendi, TYT/AYT, hedef bölüm yok. Velinin gerçekten bilmek istediği
// üç şey var — ne kadar çalıştı, görevler ne oldu, öğretmen ne dedi.

function sureMetni(dakika: number): string {
  if (dakika < 60) return `${dakika} dk`;
  const saat = Math.floor(dakika / 60);
  const kalan = dakika % 60;
  return kalan === 0 ? `${saat} saat` : `${saat} saat ${kalan} dk`;
}

function Kart({ icon: Icon, etiket, deger, altYazi, renk, bg }: {
  icon: typeof Clock; etiket: string; deger: string; altYazi?: string; renk: string; bg: string;
}) {
  return (
    <div className="sfec-fade min-w-0 flex-1 rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="mb-3 flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: bg }}>
          <Icon size={14} color={renk} />
        </div>
        <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold uppercase tracking-wider">{etiket}</span>
      </div>
      <div style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[26px] font-bold leading-none">{deger}</div>
      {altYazi && <div style={{ color: TEXT_MUTED }} className="mt-1.5 text-xs">{altYazi}</div>}
    </div>
  );
}

export function VeliOrtaokulRaporu({ rapor, ogrenciAdi }: { rapor: OrtaokulVeliRaporu; ogrenciAdi?: string }) {
  if (!rapor.veriVarMi) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p className="text-sm" style={{ color: TEXT_MUTED }}>
          {ogrenciAdi ? `${ogrenciAdi} için` : "Çocuğunuz için"} henüz kayıt yok. Çalışma ve görev kayıtları girildikçe bu sayfa dolacak.
        </p>
      </div>
    );
  }

  const gorevYuzde = rapor.gorevVerilen > 0 ? Math.round((rapor.gorevTamamlanan / rapor.gorevVerilen) * 100) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Kart
          icon={Clock} etiket={`Son ${rapor.pencereGun} günde çalışma`}
          deger={sureMetni(rapor.toplamDakika)}
          altYazi={`${rapor.konuCalismasi} konu çalışması · ${rapor.soruCalismasi} soru çalışması`}
          renk={MINT} bg={MINT_BG}
        />
        <Kart
          icon={ClipboardCheck} etiket="Görevler"
          deger={gorevYuzde !== null ? `%${gorevYuzde}` : "—"}
          altYazi={`${rapor.gorevTamamlanan}/${rapor.gorevVerilen} tamamlandı${rapor.gorevBekleyen > 0 ? ` · ${rapor.gorevBekleyen} bekliyor` : ""}`}
          renk={SKY} bg={SKY_BG}
        />
        <Kart
          icon={BookOpen} etiket="Öğretmen değerlendirmesi"
          deger={String(rapor.kararlar.length)}
          altYazi={rapor.kararlar.length > 0 ? "temada karar verildi" : "Henüz karar girilmedi"}
          renk={MINT} bg={MINT_BG}
        />
      </div>

      {rapor.dersler.length > 0 && (
        <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="mb-1 block text-[15px] font-bold">
            Ders bazlı çalışma
          </span>
          <p className="mb-3 text-xs" style={{ color: TEXT_MUTED }}>
            Net, soru çalışmalarından hesaplanır; ortaokulda 3 yanlış 1 doğruyu götürür. Soru çalışması olmayan derste net gösterilmez.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr style={{ color: TEXT_MUTED }} className="text-[11px] uppercase tracking-wider">
                  <th className="pb-2 pr-3 font-semibold">Ders</th>
                  <th className="pb-2 pr-3 font-semibold">Süre</th>
                  <th className="pb-2 pr-3 font-semibold">Konu</th>
                  <th className="pb-2 pr-3 font-semibold">Soru</th>
                  <th className="pb-2 pr-3 font-semibold">D / Y / B</th>
                  <th className="pb-2 font-semibold">Net</th>
                </tr>
              </thead>
              <tbody>
                {rapor.dersler.map((d) => (
                  <tr key={d.ders} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td className="py-2 pr-3 text-sm font-semibold" style={{ color: TEXT }}>{d.ders}</td>
                    <td className="py-2 pr-3 text-xs" style={{ color: TEXT }}>{sureMetni(d.dakika)}</td>
                    <td className="py-2 pr-3 text-xs" style={{ color: TEXT_MUTED }}>{d.konuSayisi}</td>
                    <td className="py-2 pr-3 text-xs" style={{ color: TEXT_MUTED }}>{d.soruSayisi}</td>
                    <td className="py-2 pr-3 text-xs" style={{ color: TEXT_MUTED }}>
                      {d.soruSayisi > 0 ? `${d.dogru} / ${d.yanlis} / ${d.bos}` : "—"}
                    </td>
                    <td className="py-2 text-xs font-semibold" style={{ color: d.net === null ? TEXT_MUTED : TEXT }}>
                      {d.net ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {rapor.kararlar.length > 0 && (
        <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="mb-3 block text-[15px] font-bold">
            Öğretmenin tema değerlendirmeleri
          </span>
          <div className="flex flex-col gap-2">
            {rapor.kararlar.map((k, i) => {
              const durum = yeterlilikDurumuCoz(k.durum);
              return (
                <div key={i} className="rounded-2xl p-3" style={{ background: BG1_ALT }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold" style={{ color: TEXT }}>
                      {k.tema} <span className="text-[11px] font-normal" style={{ color: TEXT_MUTED }}>· {k.ders}</span>
                    </span>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{ color: TEXT, border: `1px solid ${BORDER_STRONG}` }}
                    >
                      {durum ? YETERLILIK_ETIKET[durum] : k.durum}
                    </span>
                  </div>
                  {k.aciklama && <p className="mt-1.5 text-xs" style={{ color: TEXT_MUTED }}>{k.aciklama}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <p className="text-[11px]" style={{ color: BUTTER }}>
        Bu rapor ortaokul içindir: üniversite sınavına (TYT/AYT) ait net trendi ve hedef bölüm bilgisi bilinçli olarak yer almaz.
      </p>
    </div>
  );
}
