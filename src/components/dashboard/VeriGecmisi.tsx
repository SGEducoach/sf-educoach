import Link from "next/link";
import { BookOpen, CalendarRange, ChevronLeft, ChevronRight, ClipboardList, Target } from "lucide-react";
import type { GunGecmisi, VeriKaydiTuru } from "@/lib/veri-gecmisi";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, PEACH, TEXT, TEXT_MUTED } from "@/lib/theme";

// Öğrenci geri bildirimi (22.09.2026): "dün ne yapmışım göremiyorum."
// Veri Girişi ekranının üstünde, girilen kayıtların güne göre listesi.
// Salt okunur — silme/düzeltme yok (bkz. lib/veri-gecmisi.ts).

const IKON: Record<VeriKaydiTuru, typeof BookOpen> = { konu: BookOpen, soru: ClipboardList, deneme: Target };
const TUR_ETIKET: Record<VeriKaydiTuru, string> = { konu: "Konu", soru: "Soru", deneme: "Deneme" };

function gunBasligi(tarih: string, bugun: string, dun: string): string {
  const g = new Date(`${tarih}T12:00:00`);
  const uzun = g.toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
  if (tarih === bugun) return `Bugün · ${uzun}`;
  if (tarih === dun) return `Dün · ${uzun}`;
  return uzun;
}

export function VeriGecmisi({ gunler, bugun, dun, haftaOncesi, oncekiHref, sonrakiHref }: {
  gunler: GunGecmisi[];
  bugun: string;
  dun: string;
  // Kaçıncı hafta geriye bakılıyor (0 = bu hafta) — başlıktaki aralık yazısı için.
  haftaOncesi: number;
  oncekiHref: string;
  sonrakiHref: string | null;
}) {
  const toplamKayit = gunler.reduce((t, g) => t + g.kayitlar.length, 0);
  const ilk = gunler[gunler.length - 1]?.tarih;
  const son = gunler[0]?.tarih;
  const aralik = ilk && son
    ? `${new Date(`${ilk}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} – ${new Date(`${son}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`
    : "";

  return (
    <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
            <CalendarRange size={16} color={MINT} /> {haftaOncesi === 0 ? "Bu hafta ne yaptım?" : "Geçmiş kayıtlarım"}
          </h2>
          <p className="text-xs" style={{ color: TEXT_MUTED }}>{aralik} · {toplamKayit} kayıt</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link href={oncekiHref} title="Önceki 7 gün"
            className="sfec-btn flex h-8 w-8 items-center justify-center rounded-full" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
            <ChevronLeft size={15} color={TEXT_MUTED} />
          </Link>
          {sonrakiHref ? (
            <Link href={sonrakiHref} title="Sonraki 7 gün"
              className="sfec-btn flex h-8 w-8 items-center justify-center rounded-full" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
              <ChevronRight size={15} color={TEXT_MUTED} />
            </Link>
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full opacity-40" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
              <ChevronRight size={15} color={TEXT_MUTED} />
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {gunler.map((g) => (
          <div key={g.tarih} className="rounded-2xl px-4 py-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-bold" style={{ color: g.tarih === bugun ? MINT : TEXT }}>{gunBasligi(g.tarih, bugun, dun)}</span>
              <span className="text-xs tabular-nums" style={{ color: TEXT_MUTED }}>
                {g.kayitlar.length === 0
                  ? "kayıt yok"
                  : [g.konuDakika > 0 ? `${g.konuDakika} dk` : null, g.soru > 0 ? `${g.soru} soru` : null, g.denemeSayisi > 0 ? `${g.denemeSayisi} deneme` : null].filter(Boolean).join(" · ")}
              </span>
            </div>
            {g.kayitlar.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5">
                {g.kayitlar.map((k) => {
                  const Ikon = IKON[k.tur];
                  return (
                    <li key={`${k.tur}-${k.id}`} className="flex items-start gap-2 rounded-xl px-2.5 py-2" style={{ background: BG0, border: `1px solid ${BORDER}` }}>
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg" style={{ background: MINT_BG }}>
                        <Ikon size={12} color={MINT} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{TUR_ETIKET[k.tur]}</span>
                          <span className="text-sm font-semibold" style={{ color: TEXT }}>{k.baslik}</span>
                          {k.gorevden && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: MINT_BG, color: MINT }}>Görevden</span>}
                          {k.rehberGirdi && <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.06)", color: PEACH }}>Rehber girdi</span>}
                        </span>
                        <span className="block text-xs" style={{ color: TEXT_MUTED }}>{k.detay}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px]" style={{ color: TEXT_MUTED }}>
        Bu liste yalnızca gösterim içindir; kayıtlar silinemez. Yanlış girdiğin bir kayıt varsa öğretmenine ya da hata bildirimine yaz.
      </p>
    </section>
  );
}
