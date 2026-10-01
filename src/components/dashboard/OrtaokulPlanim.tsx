import Link from "next/link";
import { CheckCircle2, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import type { PlanGunu } from "@/lib/ortaokul-gorevler";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, PEACH, TEXT, TEXT_MUTED } from "@/lib/theme";

// Ortaokul "Planım" (tasarım belgesi §9).
//
// Faz 1'de SALT OKUNUR haftalık görünüm: haftanın işleri hangi güne düşüyor,
// hangi gün yoğun. Planı öğrencinin kendi düzenlemesi (§9.2 öneri motoru,
// mola ekleme, saat seçimi) Faz 1 kapsamında DEĞİL — burada söz verilmiyor.
//
// §8.3 iş yükü koruması: sınıf seviyesine göre günlük odak süresini aşan gün
// "yoğun" işaretlenir. Suçlayıcı değil bilgilendirici — öğrenci günü
// kendisi bölebilsin diye.

function sureMetni(dakika: number): string {
  if (dakika < 60) return `${dakika} dk`;
  const saat = Math.floor(dakika / 60);
  const kalan = dakika % 60;
  return kalan === 0 ? `${saat} saat` : `${saat} saat ${kalan} dk`;
}

export function OrtaokulPlanim({ gunler, mesaj, oncekiHref, sonrakiHref }: {
  gunler: PlanGunu[];
  mesaj: string;
  oncekiHref: string;
  sonrakiHref: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Planım</h1>
            <p className="mt-0.5 text-sm" style={{ color: TEXT_MUTED }}>{mesaj}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Link href={oncekiHref} aria-label="Önceki hafta"
              className="sfec-btn flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
              <ChevronLeft size={14} color={TEXT} />
            </Link>
            <Link href={sonrakiHref} aria-label="Sonraki hafta"
              className="sfec-btn flex h-8 w-8 items-center justify-center rounded-full"
              style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
              <ChevronRight size={14} color={TEXT} />
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {gunler.map((gun) => (
          <div key={gun.tarih} className="rounded-3xl p-4"
            style={{
              background: gun.bugunMu ? MINT_BG : BG1,
              border: `2px solid ${gun.bugunMu ? MINT : BORDER}`,
              opacity: gun.gecmisMi ? 0.72 : 1,
            }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
                {gun.gunAdi}{gun.bugunMu ? " · bugün" : ""}
              </span>
              <div className="flex items-center gap-1.5">
                {gun.toplamDakika > 0 && (
                  <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: BG1_ALT, color: TEXT_MUTED }}>
                    <Clock size={10} /> {sureMetni(gun.toplamDakika)}
                    {gun.suresiBilinmeyen > 0 ? " +" : ""}
                  </span>
                )}
                {gun.yogunMu && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={{ background: BUTTER_BG, color: BUTTER }}>Yoğun gün</span>
                )}
              </div>
            </div>

            {gun.gorevler.length === 0 ? (
              <p className="mt-1.5 text-[11px]" style={{ color: TEXT_MUTED }}>Bu güne planlanmış bir iş yok.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {gun.gorevler.map((k) => (
                  <li key={k.atamaId} className="flex items-start gap-2">
                    {k.durum === "tamamlandi"
                      ? <CheckCircle2 size={13} color={MINT} className="mt-0.5 shrink-0" />
                      : <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: k.durum === "gecikti" ? PEACH : TEXT_MUTED }} />}
                    <span className="min-w-0 text-xs" style={{ color: k.durum === "tamamlandi" ? TEXT_MUTED : TEXT }}>
                      <span className="font-bold">{k.ders}</span>
                      {" · "}{k.baslik}
                      {k.sureEtiketi && <span style={{ color: TEXT_MUTED }}> · {k.sureEtiketi}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Süresi bilinmeyen iş varsa toplam dakika EKSİK: "yoğun değil"
                damgasına güvenilmesin diye açıkça yazılıyor. */}
            {gun.suresiBilinmeyen > 0 && (
              <p className="mt-1.5 text-[10px]" style={{ color: TEXT_MUTED }}>
                {gun.suresiBilinmeyen} işin süresi belirtilmemiş, toplam bundan uzun olabilir.
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="px-1 text-[11px]" style={{ color: TEXT_MUTED }}>
        Görevleri bitirdiğini <Link href="/dashboard/gorevler" className="font-bold underline" style={{ color: TEXT }}>Görevlerim</Link> sayfasından işaretleyebilirsin.
      </p>
    </div>
  );
}
