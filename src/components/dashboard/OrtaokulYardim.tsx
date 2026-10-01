"use client";

import { useState, useTransition } from "react";
import { HandHeart, Trash2 } from "lucide-react";
import {
  YARDIM_DURUM_ACIKLAMA, YARDIM_DURUM_ETIKET, YARDIM_MESAJ_EN_FAZLA,
  dersIcinAcikIstekVarMi, geriAlinabilirMi,
} from "@/lib/ortaokul-yardim";
import type { YardimIstegi } from "@/lib/ortaokul-yardim";
import { yardimIstegiGeriAl, yardimIstegiGonder } from "@/app/dashboard/ortaokul-yardim-actions";
import {
  BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, BUTTER_BG, MINT, MINT_BG, MINT_ON,
  PEACH, PEACH_BG, TEXT, TEXT_MUTED,
} from "@/lib/theme";

// Ortaokul "Yardım İste" (tasarım belgesi §22.1).
//
// İki ürün kararı burada görünür:
//  1) Mesaj ZORUNLU DEĞİL — ders seç, gönder. Yazı yazma zorunluluğu çocuğu
//     yardım istemekten vazgeçiriyor (§2.2).
//  2) Yardım istemek bir BAŞARISIZLIK DEĞİL: metinlerde uyarı/alarm dili ve
//     kırmızı yok (§21.2); kırmızı yalnız sistem hatası satırında.

export interface YardimDersi {
  id: string;
  ad: string;
}

// Derslerim ekranindaki bir konudan gelindiginde ders ve konu onceden dolu
// gelir (?ders=&konu=) — ogrenci ayni secimi ikinci kez yapmasin.
export function OrtaokulYardim({ dersler, istekler, mesaj, hazirDersId, hazirKonu }: {
  dersler: YardimDersi[];
  istekler: YardimIstegi[];
  mesaj: string;
  hazirDersId?: string;
  hazirKonu?: string;
}) {
  const hazirDers = dersler.find((d) => d.id === hazirDersId) ?? null;
  const [seciliDers, setSeciliDers] = useState<string>(hazirDers?.id ?? "");
  // Konu adi mesaja onerilen bir baslangic olarak giriyor; ogrenci silebilir.
  const [not, setNot] = useState(hazirKonu && hazirDers ? `${hazirKonu} konusunda takıldım.` : "");
  const [hata, setHata] = useState<string | null>(null);
  const [uyari, setUyari] = useState<string | null>(null);
  const [gonderildi, setGonderildi] = useState(false);
  const [pending, startTransition] = useTransition();

  const ders = dersler.find((d) => d.id === seciliDers) ?? null;
  const dersAcik = ders ? dersIcinAcikIstekVarMi(ders.ad, istekler) : false;

  function gonder() {
    if (!ders) return setHata("Hangi ders için yardım istediğini seç.");
    setHata(null); setUyari(null); setGonderildi(false);
    startTransition(async () => {
      const res = await yardimIstegiGonder({ dersAdi: ders.ad, dersId: ders.id, mesaj: not });
      if (res.error) return setHata(res.error);
      setUyari(res.uyari ?? null);
      setGonderildi(true);
      setNot(""); setSeciliDers("");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: MINT_BG }}>
            <HandHeart size={14} color={MINT} />
          </div>
          <h1 className="text-lg font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Yardım İste</h1>
        </div>
        <p className="mt-1.5 text-sm" style={{ color: TEXT_MUTED }}>{mesaj}</p>
      </div>

      <div className="rounded-3xl p-5 flex flex-col gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Hangi ders?</span>
        <div className="flex flex-wrap gap-1.5">
          {dersler.map((d) => {
            const acik = dersIcinAcikIstekVarMi(d.ad, istekler);
            const secili = seciliDers === d.id;
            return (
              <button key={d.id} type="button" disabled={acik}
                onClick={() => { setSeciliDers(d.id); setGonderildi(false); setHata(null); }}
                title={acik ? "Bu ders için zaten açık bir isteğin var." : undefined}
                className="sfec-btn rounded-full px-3.5 py-1.5 text-xs font-bold disabled:opacity-45"
                style={{
                  background: secili ? MINT : BG0,
                  color: secili ? MINT_ON : TEXT,
                  border: `2px solid ${secili ? MINT : BORDER_STRONG}`,
                }}>
                {d.ad}
              </button>
            );
          })}
        </div>

        {dersAcik && (
          <p className="text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>
            Bu ders için zaten açık bir isteğin var. Öğretmenin yanıtlayınca tekrar isteyebilirsin.
          </p>
        )}

        {/* Mesaj isteğe bağlı: etiketi de bunu söylüyor. */}
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
            Anlatmak istersen (zorunlu değil)
          </span>
          <textarea value={not} onChange={(e) => setNot(e.target.value)} rows={3}
            maxLength={YARDIM_MESAJ_EN_FAZLA}
            placeholder="Nerede takıldığını yazabilirsin. Boş bırakman da olur."
            className="w-full resize-y rounded-2xl px-3 py-2 text-sm outline-none"
            style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          <span className="self-end text-[10px]" style={{ color: TEXT_MUTED }}>
            {not.length} / {YARDIM_MESAJ_EN_FAZLA}
          </span>
        </label>

        {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
        {uyari && (
          <p className="rounded-2xl px-3 py-2 text-[11px] font-semibold"
            style={{ background: BUTTER_BG, color: TEXT }}>{uyari}</p>
        )}
        {gonderildi && !uyari && (
          <p className="rounded-2xl px-3 py-2 text-[11px] font-semibold"
            style={{ background: MINT_BG, color: TEXT }}>İsteğin gönderildi. Öğretmenine haber verdik.</p>
        )}

        <button type="button" onClick={gonder} disabled={pending || !ders || dersAcik}
          className="sfec-btn self-start rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
          style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Gönderiliyor..." : "Yardım iste"}
        </button>
      </div>

      {istekler.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-sm font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>İsteklerin</h2>
          {istekler.map((i) => <IstekKarti key={i.id} istek={i} />)}
        </section>
      )}
    </div>
  );
}

function IstekKarti({ istek }: { istek: YardimIstegi }) {
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const kapandi = istek.durum === "cozuldu";

  function geriAl() {
    setHata(null);
    startTransition(async () => {
      const res = await yardimIstegiGeriAl(istek.id);
      if (res.error) setHata(res.error);
    });
  }

  return (
    <div className="rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: kapandi ? BG1_ALT : MINT_BG, color: kapandi ? TEXT_MUTED : MINT }}>
            {istek.dersAdi}
          </span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: kapandi ? BG1_ALT : PEACH_BG, color: kapandi ? TEXT_MUTED : PEACH }}>
            {YARDIM_DURUM_ETIKET[istek.durum]}
          </span>
        </div>
        {geriAlinabilirMi(istek.durum) && (
          <button type="button" onClick={geriAl} disabled={pending}
            className="sfec-btn flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-60"
            style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <Trash2 size={11} /> Geri al
          </button>
        )}
      </div>

      <p className="mt-1.5 text-[11px]" style={{ color: TEXT_MUTED }}>{YARDIM_DURUM_ACIKLAMA[istek.durum]}</p>

      {istek.kazanimMetni && (
        <p className="mt-1.5 text-xs" style={{ color: TEXT }}>{istek.kazanimMetni}</p>
      )}
      {istek.mesaj && (
        <p className="mt-1.5 rounded-2xl px-3 py-2 text-xs" style={{ background: BG1_ALT, color: TEXT }}>{istek.mesaj}</p>
      )}
      {istek.yanit && (
        <div className="mt-2 rounded-2xl px-3 py-2" style={{ background: MINT_BG }}>
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
            {istek.ilgilenenAdi ?? "Öğretmenin"}
          </span>
          <p className="mt-0.5 text-xs" style={{ color: TEXT }}>{istek.yanit}</p>
        </div>
      )}
      {hata && <p className="mt-1.5 text-[11px] font-semibold" style={{ color: BLUSH }}>{hata}</p>}
    </div>
  );
}
