import Link from "next/link";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import type { GecikmisIs, GunGecmisi } from "@/lib/veri-gecmisi";
import { haftaninPazartesisi } from "@/lib/oto-program";
import { BG0, BG1, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Kullanıcı isteği (23.09.2026): öğrenci "günü geçti, işleyemiyorum" sanıyor.
// Ana sayfada hem dün ne girdiğini hem geçmiş günlerde tamamlanmamış işlerini
// görüyor; işe tıklayınca o günün programına gidiyor ve oradan tamamlıyor.

const TUR_ETIKET: Record<string, string> = { konu: "Konu çalışma", soru: "Soru çözümü", deneme: "Deneme" };

function gunYaz(tarih: string) {
  return new Date(`${tarih}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", weekday: "long" });
}

export function GecikmisIslerKarti({ dun, gecikmisler }: { dun: GunGecmisi | null; gecikmisler: GecikmisIs[] }) {
  if (!dun && gecikmisler.length === 0) return null;

  return (
    <section className="sfec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      {dun && (
        <div className="mb-3">
          <h2 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Dün ne yaptın?</h2>
          {dun.kayitlar.length === 0 ? (
            <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
              Dün hiç kayıt girmemişsin. Yaptığın bir çalışma varsa Veri Girişi&apos;nde tarihi düne çekerek hâlâ girebilirsin.
            </p>
          ) : (
            <>
              <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
                {[dun.konuDakika > 0 ? `${dun.konuDakika} dk çalışma` : null, dun.soru > 0 ? `${dun.soru} soru` : null, dun.denemeSayisi > 0 ? `${dun.denemeSayisi} deneme` : null]
                  .filter(Boolean).join(" · ")}
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {dun.kayitlar.slice(0, 3).map((k) => (
                  <li key={`${k.tur}-${k.id}`} className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
                    <CheckCircle2 size={12} color={MINT} /> <span className="truncate">{k.baslik}</span>
                    <span className="shrink-0" style={{ color: TEXT_MUTED }}>{k.detay}</span>
                  </li>
                ))}
              </ul>
              {dun.kayitlar.length > 3 && (
                <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>ve {dun.kayitlar.length - 3} kayıt daha</p>
              )}
            </>
          )}
          <Link href="/dashboard/veri-girisi" className="mt-2 inline-block text-xs font-bold" style={{ color: MINT }}>
            Bu hafta ne yaptım? →
          </Link>
        </div>
      )}

      {gecikmisler.length > 0 && (
        <div className="rounded-2xl p-3" style={{ background: BUTTER_BG, border: `1px solid ${BORDER}` }}>
          <h3 className="flex items-center gap-1.5 text-sm font-bold" style={{ color: BUTTER }}>
            <CalendarClock size={14} /> Geçmiş günlerden {gecikmisler.length} tamamlanmamış iş
          </h3>
          <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
            Günü geçse de tamamlayabilirsin: işe tıkla, o günün programı açılsın, &quot;Tamamla&quot; de. Tarih otomatik o gün olarak kaydedilir (en fazla 7 gün geriye).
          </p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {gecikmisler.slice(0, 5).map((g) => (
              <li key={g.atamaId}>
                <Link href={`/dashboard/planlar?hafta=${haftaninPazartesisi(g.tarih)}`}
                  className="sfec-btn flex items-center justify-between gap-2 rounded-xl px-3 py-2"
                  style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold" style={{ color: TEXT }}>
                      {TUR_ETIKET[g.tur] ?? g.tur} · {g.ders}{g.konu ? ` · ${g.konu}` : ""}
                    </span>
                    <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{gunYaz(g.tarih)}</span>
                  </span>
                  <span className="shrink-0 rounded-full px-2 py-1 text-[10px] font-bold" style={{ background: MINT_BG, color: MINT }}>Tamamla</span>
                </Link>
              </li>
            ))}
          </ul>
          {gecikmisler.length > 5 && (
            <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>ve {gecikmisler.length - 5} iş daha</p>
          )}
        </div>
      )}
    </section>
  );
}
