import Link from "next/link";
import { LayoutGrid, Users } from "lucide-react";
import { BOLUM_ACIKLAMA, BOLUM_ETIKET, ORTAOKUL_BOLUMLERI } from "@/lib/ortaokul-bolum";
import type { OrtaokulBolum } from "@/lib/ortaokul-bolum";
import { YETERLILIK_DURUMLARI, YETERLILIK_ETIKET } from "@/lib/ortaokul-yeterlilik";
import type { YeterlilikDurumu } from "@/lib/ortaokul-yeterlilik";
import type { DersSecenegi } from "@/lib/ortaokul-bolum-sorgu";
import type { SinifTemaHaritasi } from "@/lib/ortaokul-sinif-haritasi";
import { kapsamKarari } from "@/lib/kapsam";
import {
  BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, MINT_ON,
  PEACH, PEACH_BG, SKY, SKY_BG, TEXT, TEXT_MUTED,
} from "@/lib/theme";

// Ortaokul SINIF tema haritası (Faz 2, 08.10.2026).
//
// "Konu Yeterliliği" tek öğrenci üzerinden çalışıyordu; 30 kişilik sınıfta
// öğretmen "hangi temada sınıfın yarısı zayıf?" sorusunu 30 öğrenciyi tek
// tek açmadan cevaplayamıyordu. Bu ekran o kesişen görünümü veriyor.
//
// Dil ortaokul panelinin ilkelerine bağlı: "başarısız" yok, süreç dili var,
// ve "karar verilmemiş" AYRI bir sütun — "başlamadı" ile aynı şey değil
// (öğretmen henüz bakmadı demektir).

const DURUM_RENK: Record<YeterlilikDurumu, { arka: string; yazi: string }> = {
  baslamadi: { arka: BG1_ALT, yazi: TEXT_MUTED },
  ogreniyor: { arka: SKY_BG, yazi: SKY },
  biraz_pratik: { arka: BUTTER_BG, yazi: BUTTER },
  saglamlastirdi: { arka: MINT_BG, yazi: MINT },
  // "Tekrar zamanı" akademik bir eksik — kırmızı DEĞİL, sıcak nötr (§21.2).
  tekrar_zamani: { arka: PEACH_BG, yazi: PEACH },
};

export interface SinifSecenegi { id: string; ad: string }

export function OrtaokulSinifHaritasi({
  bolum, siniflar, seciliSinifId, dersler, seciliDers, harita,
}: {
  bolum: OrtaokulBolum;
  siniflar: SinifSecenegi[];
  seciliSinifId: string;
  dersler: DersSecenegi[];
  seciliDers: DersSecenegi | null;
  harita: SinifTemaHaritasi | null;
}) {
  const yol = (p: { bolum?: string; sinif?: string; ders?: string }) => {
    const u = new URLSearchParams({
      kisim: p.bolum ?? bolum,
      sinif: p.sinif ?? seciliSinifId,
      ...(p.ders ?? seciliDers?.id ? { ders: p.ders ?? seciliDers!.id } : {}),
    });
    return `/dashboard/ortaokul-yeterlilik?${u.toString()}`;
  };

  // Kapsam dürüstlüğü (bkz. lib/kapsam.ts): öğretmen temaların çok azına
  // karar vermişse sınıf hakkında yorum yapılmamalı.
  const kapsam = harita
    ? kapsamKarari(harita.kararKapsami.verilen, harita.kararKapsami.toplam)
    : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
            <LayoutGrid size={16} color={MINT} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Sınıf Tema Haritası</h1>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>{BOLUM_ACIKLAMA[bolum]}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {ORTAOKUL_BOLUMLERI.map((b) => (
            <Link key={b} href={yol({ bolum: b })}
              className="sfec-btn rounded-full px-4 py-1.5 text-xs font-bold"
              style={{
                background: bolum === b ? MINT : BG0,
                color: bolum === b ? MINT_ON : TEXT,
                border: `2px solid ${bolum === b ? MINT : BORDER_STRONG}`,
              }}>
              {BOLUM_ETIKET[b]}
            </Link>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <label className="flex min-w-[150px] flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Sınıf</span>
            <div className="flex flex-wrap gap-1.5">
              {siniflar.map((s) => (
                <Link key={s.id} href={yol({ sinif: s.id })}
                  className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold"
                  style={{
                    background: s.id === seciliSinifId ? MINT : BG0,
                    color: s.id === seciliSinifId ? MINT_ON : TEXT,
                    border: `2px solid ${s.id === seciliSinifId ? MINT : BORDER_STRONG}`,
                  }}>
                  {s.ad}
                </Link>
              ))}
            </div>
          </label>
        </div>

        {dersler.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {dersler.map((d) => (
              <Link key={d.id} href={yol({ ders: d.id })}
                className="sfec-btn rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{
                  background: d.id === seciliDers?.id ? SKY_BG : BG0,
                  color: d.id === seciliDers?.id ? SKY : TEXT,
                  border: `2px solid ${d.id === seciliDers?.id ? SKY : BORDER_STRONG}`,
                }}>
                {d.ad}
              </Link>
            ))}
          </div>
        )}

        <Link href={`/dashboard/ortaokul-yeterlilik?kisim=${bolum}`}
          className="sfec-btn mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
          <Users size={13} /> Öğrenci görünümüne geç
        </Link>
      </div>

      {!harita || !seciliDers ? (
        <div className="rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            {siniflar.length === 0
              ? "Ortaokul sınıfı bulunamadı."
              : "Bu sınıf ve ders için tema bulunamadı."}
          </p>
        </div>
      ) : (
        <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
              {harita.sinifAdi} · {seciliDers.ad}
            </span>
            <span className="text-xs" style={{ color: TEXT_MUTED }}>
              {harita.ogrenciSayisi} öğrenci · {harita.satirlar.length} tema
            </span>
          </div>

          {kapsam && !kapsam.yeterli && (
            <p className="mt-2 text-xs" style={{ color: BUTTER }}>
              Henüz az sayıda karar girilmiş ({kapsam.etiket.replace("öğrenciden", "tema-öğrenci çiftinden")}) — sınıf
              hakkında genel bir yargı için erken.
            </p>
          )}

          <p className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>
            Temalar <strong style={{ color: TEXT }}>en çok destek gerekene</strong> göre sıralı.
            &quot;Karar verilmemiş&quot;, &quot;Henüz başlamadı&quot;dan farklıdır: henüz değerlendirme girilmemiş demektir.
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead>
                <tr style={{ color: TEXT_MUTED }} className="text-[10px] uppercase tracking-wider">
                  <th className="pb-2 pr-3 font-semibold">Tema</th>
                  {YETERLILIK_DURUMLARI.map((d) => (
                    <th key={d} className="pb-2 pr-2 text-center font-semibold">{YETERLILIK_ETIKET[d]}</th>
                  ))}
                  <th className="pb-2 pr-2 text-center font-semibold">Karar yok</th>
                  <th className="pb-2 text-center font-semibold">Çalışan</th>
                </tr>
              </thead>
              <tbody>
                {harita.satirlar.map((s) => (
                  <tr key={s.temaId} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td className="py-2 pr-3">
                      <span className="text-sm font-semibold" style={{ color: TEXT }}>{s.temaAdi}</span>
                      {s.destekGereken > 0 && (
                        <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: PEACH_BG, color: PEACH }}>
                          {s.destekGereken} destek
                        </span>
                      )}
                    </td>
                    {YETERLILIK_DURUMLARI.map((d) => {
                      const adet = s.durumSayilari[d];
                      return (
                        <td key={d} className="py-2 pr-2 text-center">
                          {adet === 0 ? (
                            <span className="text-xs" style={{ color: TEXT_MUTED }}>—</span>
                          ) : (
                            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-bold"
                              style={{ background: DURUM_RENK[d].arka, color: DURUM_RENK[d].yazi }}>
                              {adet}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 pr-2 text-center text-xs" style={{ color: s.kararVerilmemis > 0 ? TEXT : TEXT_MUTED }}>
                      {s.kararVerilmemis || "—"}
                    </td>
                    <td className="py-2 text-center text-xs" style={{ color: TEXT_MUTED }}>
                      {s.calisanOgrenci}/{s.ogrenciSayisi}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
