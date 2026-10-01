"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ClipboardList, GraduationCap } from "lucide-react";
import { BOLUM_ACIKLAMA, BOLUM_ETIKET, ORTAOKUL_BOLUMLERI } from "@/lib/ortaokul-bolum";
import type { OrtaokulBolum } from "@/lib/ortaokul-bolum";
import { YETERLILIK_DURUMLARI, YETERLILIK_ETIKET, destekGerekenler, yeterlilikOzeti } from "@/lib/ortaokul-yeterlilik";
import type { TemaYeterliligi, YeterlilikDurumu } from "@/lib/ortaokul-yeterlilik";
import type { DersSecenegi } from "@/lib/ortaokul-bolum-sorgu";
import { ortaokulYeterlilikKaydet } from "@/app/dashboard/ortaokul-bolum-actions";
import { gorevVer } from "@/app/dashboard/gorev-actions";
import {
  BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, MINT_ON,
  PEACH, PEACH_BG, SKY, SKY_BG, TEXT, TEXT_MUTED,
} from "@/lib/theme";

// Öğretmenin "Konu Yeterliliği" ekranı — Maarif | LGS (kullanıcı kararı
// 01.10.2026):
//   Maarif → 5-8 bütün sınıflarda konulardaki yeterliliğe karar verir.
//   LGS    → hem ödev verir hem yeterlilik kararı verir.
//
// Karar YALNIZ burada verilir; öğrencinin ekranında aynı bilgi salt okunur.

const DURUM_RENK: Record<YeterlilikDurumu, { arka: string; yazi: string }> = {
  baslamadi: { arka: BG1_ALT, yazi: TEXT_MUTED },
  ogreniyor: { arka: SKY_BG, yazi: SKY },
  biraz_pratik: { arka: BUTTER_BG, yazi: BUTTER },
  saglamlastirdi: { arka: MINT_BG, yazi: MINT },
  // "Tekrar zamanı" akademik bir eksik — kırmızı DEĞİL, sıcak nötr (§21.2).
  tekrar_zamani: { arka: PEACH_BG, yazi: PEACH },
};

export interface YeterlilikOgrencisi {
  id: string;
  ad: string;
  sinif: string | null;
}

export function OrtaokulYeterlilik({
  bolum, ogrenciler, seciliOgrenci, dersler, seciliDers, satirlar, bugun,
}: {
  bolum: OrtaokulBolum;
  ogrenciler: YeterlilikOgrencisi[];
  seciliOgrenci: YeterlilikOgrencisi | null;
  dersler: DersSecenegi[];
  seciliDers: DersSecenegi | null;
  satirlar: TemaYeterliligi[];
  bugun: string;
}) {
  const ozet = yeterlilikOzeti(satirlar);
  const destek = destekGerekenler(satirlar);
  const yol = (p: { bolum?: string; ogrenci?: string; ders?: string }) => {
    const u = new URLSearchParams({
      kisim: p.bolum ?? bolum,
      ...(p.ogrenci ?? seciliOgrenci?.id ? { ogrenci: p.ogrenci ?? seciliOgrenci!.id } : {}),
      ...(p.ders ?? seciliDers?.id ? { ders: p.ders ?? seciliDers!.id } : {}),
    });
    return `/dashboard/ortaokul-yeterlilik?${u.toString()}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
            <GraduationCap size={16} color={MINT} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Konu Yeterliliği</h1>
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

        {ogrenciler.length === 0 ? (
          <p className="mt-3 text-xs" style={{ color: TEXT_MUTED }}>
            Ortaokul sınıflarında öğrenci bulunamadı.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="flex min-w-[170px] flex-1 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Öğrenci</span>
              <SecimBagi deger={seciliOgrenci?.id ?? ""} secenekler={ogrenciler.map((o) => ({
                deger: o.id, etiket: o.sinif ? `${o.ad} · ${o.sinif}` : o.ad, href: yol({ ogrenci: o.id }),
              }))} />
            </label>
            {dersler.length > 0 && (
              <label className="flex min-w-[170px] flex-1 flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Ders</span>
                <SecimBagi deger={seciliDers?.id ?? ""} secenekler={dersler.map((d) => ({
                  deger: d.id, etiket: d.ad, href: yol({ ders: d.id }),
                }))} />
              </label>
            )}
          </div>
        )}

        {satirlar.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: TEXT_MUTED }}>
            <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: MINT_BG, color: MINT }}>
              {ozet.kararli} / {ozet.toplam} karar verildi
            </span>
            {ozet.bekleyen > 0 && <span>{ozet.bekleyen} konu bekliyor</span>}
          </div>
        )}
      </div>

      {destek.length > 0 && (
        <section className="rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <h2 className="text-sm font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Destek gereken konular</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {destek.map((s) => (
              <span key={s.temaId} className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: DURUM_RENK[s.durum!].arka, color: DURUM_RENK[s.durum!].yazi }}>
                {s.temaAdi}
              </span>
            ))}
          </div>
        </section>
      )}

      {seciliOgrenci && seciliDers && satirlar.map((s) => (
        <TemaSatiri key={s.temaId} satir={s} bolum={bolum} studentId={seciliOgrenci.id}
          dersAdi={seciliDers.ad} bugun={bugun} />
      ))}

      {seciliOgrenci && seciliDers && satirlar.length === 0 && (
        <div className="rounded-3xl p-6" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>Bu derste konu kaydı yok.</p>
        </div>
      )}
    </div>
  );
}

// Sunucu tarafı seçim: <select> yerine bağlantılar — ekran sunucuda
// çiziliyor, seçim adres satırında taşınıyor.
function SecimBagi({ deger, secenekler }: { deger: string; secenekler: { deger: string; etiket: string; href: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {secenekler.map((s) => (
        <Link key={s.deger} href={s.href}
          className="sfec-btn rounded-xl px-3 py-1.5 text-xs font-semibold"
          style={{
            background: deger === s.deger ? MINT_BG : BG0,
            color: TEXT,
            border: `2px solid ${deger === s.deger ? MINT : BORDER_STRONG}`,
          }}>
          {s.etiket}
        </Link>
      ))}
    </div>
  );
}

function TemaSatiri({ satir, bolum, studentId, dersAdi, bugun }: {
  satir: TemaYeterliligi; bolum: OrtaokulBolum; studentId: string; dersAdi: string; bugun: string;
}) {
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function kararVer(durum: YeterlilikDurumu) {
    setHata(null); setBilgi(null);
    startTransition(async () => {
      const res = await ortaokulYeterlilikKaydet({ studentId, temaId: satir.temaId, bolum, durum });
      if (res.error) return setHata(res.error);
      setBilgi(`Kaydedildi: ${YETERLILIK_ETIKET[durum]}`);
    });
  }

  // LGS sekmesinde ödev de verilebiliyor (kullanıcı kararı). Mevcut görev
  // altyapısı yeniden yazılmıyor, `gorevVer` aynen kullanılıyor.
  function odevVer() {
    setHata(null); setBilgi(null);
    startTransition(async () => {
      const res = await gorevVer({
        studentIds: [studentId], tur: "konu", ders: dersAdi, konu: satir.temaAdi, tarih: bugun,
      });
      if (res?.error) return setHata(res.error);
      setBilgi("Ödev verildi.");
    });
  }

  return (
    <div className="rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold" style={{ color: TEXT }}>{satir.temaAdi}</span>
        {satir.durum
          ? <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: DURUM_RENK[satir.durum].arka, color: DURUM_RENK[satir.durum].yazi }}>
              {YETERLILIK_ETIKET[satir.durum]}
            </span>
          : <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: BG1_ALT, color: TEXT_MUTED }}>
              Karar verilmedi
            </span>}
      </div>

      {satir.kararVerenAdi && (
        <p className="mt-1 text-[10px]" style={{ color: TEXT_MUTED }}>Karar: {satir.kararVerenAdi}</p>
      )}

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {YETERLILIK_DURUMLARI.map((d) => (
          <button key={d} type="button" disabled={pending} onClick={() => kararVer(d)}
            className="sfec-btn rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-60"
            style={{
              background: satir.durum === d ? DURUM_RENK[d].arka : BG0,
              color: satir.durum === d ? DURUM_RENK[d].yazi : TEXT,
              border: `2px solid ${satir.durum === d ? DURUM_RENK[d].yazi : BORDER_STRONG}`,
            }}>
            {YETERLILIK_ETIKET[d]}
          </button>
        ))}
      </div>

      {bolum === "lgs" && (
        <button type="button" disabled={pending} onClick={odevVer}
          className="sfec-btn mt-2.5 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold disabled:opacity-60"
          style={{ background: MINT_BG, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
          <ClipboardList size={12} color={MINT} /> Bu konudan ödev ver
        </button>
      )}

      {hata && <p className="mt-2 text-[11px] font-semibold" style={{ color: BLUSH }}>{hata}</p>}
      {bilgi && <p className="mt-2 text-[11px] font-semibold" style={{ color: MINT }}>{bilgi}</p>}
    </div>
  );
}
