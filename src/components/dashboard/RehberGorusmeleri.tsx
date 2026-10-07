"use client";

import { useMemo, useState, useTransition } from "react";
import { Lock, Trash2 } from "lucide-react";
import { gorusmeEkle, gorusmeSil } from "@/app/dashboard/gorusme-actions";
import {
  GORUSME_TURLERI, GORUSME_TURU_ETIKET, ICERIK_MAKS, gorusmeDogrula,
  type GorusmeKaydi, type GorusmeTuru,
} from "@/lib/gorusme";
import { BG1, BG1_ALT, BORDER, BLUSH, BLUSH_BG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Rehberlik görüşme kayıtları (Faz 4, migration 0145).
//
// Gizlilik RLS'te zorlanıyor; bu ekran onu yalnızca GÖRÜNÜR kılıyor —
// rehberin "bu not kimde kalıyor" sorusunu sormasına gerek olmamalı, o
// yüzden kilit uyarısı en üstte duruyor.

export interface GorusmeOgrencisi { id: string; ad: string; sinifAdi: string }

export function RehberGorusmeleri({ ogrenciler, kayitlar, seviyeler }: {
  ogrenciler: GorusmeOgrencisi[];
  kayitlar: GorusmeKaydi[];
  seviyeler: string[];
}) {
  const bugun = new Date().toISOString().slice(0, 10);
  const [ogrenciId, setOgrenciId] = useState("");
  const [tarih, setTarih] = useState(bugun);
  const [tur, setTur] = useState<GorusmeTuru>("bireysel");
  const [icerik, setIcerik] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);
  const [suzgec, setSuzgec] = useState("");
  const [pending, startTransition] = useTransition();

  const gorunen = useMemo(
    () => (suzgec ? kayitlar.filter((k) => k.studentId === suzgec) : kayitlar),
    [kayitlar, suzgec],
  );

  function kaydet() {
    setHata(null);
    setBasarili(false);
    if (!ogrenciId) { setHata("Öğrenci seçin."); return; }
    const dogrulama = gorusmeDogrula({ icerik, tur, tarih });
    if (dogrulama) { setHata(dogrulama); return; }
    startTransition(async () => {
      try {
        const sonuc = await gorusmeEkle({ studentId: ogrenciId, tarih, tur, icerik });
        if (sonuc.error) { setHata(sonuc.error); return; }
        setIcerik("");
        setBasarili(true);
      } catch {
        setHata("Görüşme kaydedilemedi. Tekrar deneyin.");
      }
    });
  }

  function sil(id: string) {
    setHata(null);
    startTransition(async () => {
      try {
        const sonuc = await gorusmeSil(id);
        if (sonuc.error) setHata(sonuc.error);
      } catch {
        setHata("Görüşme silinemedi. Tekrar deneyin.");
      }
    });
  }

  if (seviyeler.length === 0) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p className="text-sm" style={{ color: TEXT_MUTED }}>
          Henüz sorumlu olduğunuz sınıf düzeyi atanmadı. Kurum moderatörünüz Rehberlik Servisi ekranından atama yapmalı.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Görüşme Kayıtları</h2>
          <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: BLUSH_BG, color: BLUSH }}>
            <Lock size={11} /> Gizli
          </span>
        </div>
        <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
          Bu kayıtları yalnızca okulunuzun Rehberlik Servisi üyeleri, yalnızca kendi sorumlu oldukları sınıf düzeylerindeki öğrenciler için görebilir.
          Öğrenci, veli, branş öğretmeni ve müdür <strong style={{ color: TEXT }}>göremez</strong>. Düzenleme ve silme yalnızca notu yazana açıktır.
        </p>

        {hata && <p role="alert" className="mt-3 text-xs" style={{ color: BLUSH }}>{hata}</p>}
        {basarili && <p role="status" className="mt-3 text-xs" style={{ color: MINT }}>Görüşme kaydedildi.</p>}

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <select
              value={ogrenciId} onChange={(e) => setOgrenciId(e.target.value)} disabled={pending}
              aria-label="Öğrenci" className="rounded-full px-3 py-1.5 text-xs"
              style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER}`, maxWidth: 260 }}
            >
              <option value="">Öğrenci seçin…</option>
              {ogrenciler.map((o) => <option key={o.id} value={o.id}>{o.ad} · {o.sinifAdi}</option>)}
            </select>
            <select
              value={tur} onChange={(e) => setTur(e.target.value as GorusmeTuru)} disabled={pending}
              aria-label="Görüşme türü" className="rounded-full px-3 py-1.5 text-xs"
              style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER}` }}
            >
              {GORUSME_TURLERI.map((t) => <option key={t} value={t}>{GORUSME_TURU_ETIKET[t]}</option>)}
            </select>
            <input
              type="date" value={tarih} max={bugun} onChange={(e) => setTarih(e.target.value)} disabled={pending}
              aria-label="Görüşme tarihi" className="rounded-full px-3 py-1.5 text-xs"
              style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER}` }}
            />
          </div>
          <textarea
            value={icerik} onChange={(e) => setIcerik(e.target.value.slice(0, ICERIK_MAKS))}
            disabled={pending} rows={4} aria-label="Görüşme notu"
            placeholder="Görüşmenin özeti: ne konuşuldu, ne kararlaştırıldı, bir sonraki adım ne?"
            className="rounded-2xl p-3 text-sm outline-none"
            style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER}` }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{icerik.length}/{ICERIK_MAKS}</span>
            <button
              type="button" onClick={kaydet} disabled={pending}
              className="sfec-btn rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50"
              style={{ background: MINT, color: MINT_ON }}
            >Görüşmeyi kaydet</button>
          </div>
        </div>
      </section>

      <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-bold" style={{ color: TEXT }}>Geçmiş görüşmeler</h3>
          <select
            value={suzgec} onChange={(e) => setSuzgec(e.target.value)} aria-label="Öğrenciye göre süz"
            className="rounded-full px-3 py-1.5 text-xs"
            style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER}`, maxWidth: 240 }}
          >
            <option value="">Tüm öğrenciler ({kayitlar.length} kayıt)</option>
            {ogrenciler.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
          </select>
        </div>

        {gorunen.length === 0 ? (
          <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>
            {kayitlar.length === 0 ? "Henüz görüşme kaydı yok. Yukarıdan ilk kaydı ekleyebilirsiniz." : "Bu öğrenci için kayıt yok."}
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {gorunen.map((k) => (
              <article key={k.id} className="rounded-2xl p-3" style={{ background: BG1_ALT }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: TEXT }}>
                    {k.ogrenciAdi} <span className="text-[11px] font-normal" style={{ color: TEXT_MUTED }}>· {k.sinifAdi}</span>
                  </span>
                  <span className="flex items-center gap-2 text-[11px]" style={{ color: TEXT_MUTED }}>
                    {GORUSME_TURU_ETIKET[k.tur] ?? k.tur} · {k.tarih} · {k.rehberAdi}
                    {k.kendiNotuMu && (
                      <button
                        type="button" onClick={() => sil(k.id)} disabled={pending}
                        aria-label="Görüşmeyi sil" title="Görüşmeyi sil"
                        className="sfec-btn rounded-full p-1 disabled:opacity-50" style={{ color: BLUSH }}
                      ><Trash2 size={12} /></button>
                    )}
                  </span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-xs" style={{ color: TEXT }}>{k.icerik}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
