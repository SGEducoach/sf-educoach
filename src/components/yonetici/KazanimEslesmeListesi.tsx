"use client";

// Deneme konu eşleştirme listesi (bkz. kazanim-eslesme-actions.ts). Her
// yayınevi konusu için müfredattan öneri önceden seçili gelir; yönetici tek
// tek ya da toplu onaylar. Onaylanan eşleşmeler Analiz Motoru'nun konu
// hakimiyeti "ölçüm" sinyaline deneme sonuçlarını ekler.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Sparkles, X } from "lucide-react";
import { kazanimEslesmeKaydet, kazanimEslesmeSil, type KazanimEslesmeVerisi, type KazanimEslesmeSatiri } from "@/app/yonetici/kazanim-eslesme-actions";
import { GUCLU_ONERI_ESIGI } from "@/lib/kazanim-konu-oneri";
import { BG0, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, MINT, MINT_ON, SKY, TEXT, TEXT_MUTED } from "@/lib/theme";

const TUMU = "";

function satirAnahtari(s: { ders: string; kazanimMetni: string }) {
  return `${s.ders}|${s.kazanimMetni}`;
}

export function KazanimEslesmeListesi({ veri }: { veri: KazanimEslesmeVerisi }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [yalnizBekleyen, setYalnizBekleyen] = useState(true);
  const [ders, setDers] = useState(TUMU);
  const [secimler, setSecimler] = useState<Record<string, string>>(() =>
    Object.fromEntries(veri.satirlar.map((s) => [satirAnahtari(s), s.mevcutKonu ?? s.oneri?.konu ?? ""])));

  const dersler = [...new Set(veri.satirlar.map((s) => s.ders))].sort((a, b) => a.localeCompare(b, "tr"));
  const gosterilen = veri.satirlar.filter((s) => (!yalnizBekleyen || s.mevcutKonu === null) && (ders === TUMU || s.ders === ders));
  const bekleyenSayisi = veri.satirlar.filter((s) => s.mevcutKonu === null).length;
  // Toplu kaydetme yalnızca güçlü önerilere açık — zayıf öneriler tek tek onaylanır.
  const topluKaydedilecekler = gosterilen.filter((s) => s.mevcutKonu === null && s.oneri
    && s.oneri.puan >= GUCLU_ONERI_ESIGI && secimler[satirAnahtari(s)] === s.oneri.konu);

  function kaydet(satirlar: KazanimEslesmeSatiri[]) {
    const kayitlar = satirlar
      .map((s) => ({ ders: s.ders, kazanimMetni: s.kazanimMetni, konu: secimler[satirAnahtari(s)] ?? "" }))
      .filter((k) => k.konu);
    if (kayitlar.length === 0) return;
    startTransition(async () => {
      const r = await kazanimEslesmeKaydet(kayitlar);
      setMesaj(r.error ? `Hata: ${r.error}` : `${r.kaydedilen} eşleşme kaydedildi.`);
      if (!r.error) router.refresh();
    });
  }

  function kaldir(s: KazanimEslesmeSatiri) {
    startTransition(async () => {
      const r = await kazanimEslesmeSil(s.ders, s.kazanimMetni);
      setMesaj(r.error ? `Hata: ${r.error}` : "Eşleşme kaldırıldı.");
      if (!r.error) router.refresh();
    });
  }

  const girdiStili = { border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={ders} onChange={(e) => setDers(e.target.value)} aria-label="Derse göre süz"
          className="text-xs px-3 py-2 rounded-xl outline-none" style={girdiStili}>
          <option value={TUMU}>Tüm dersler</option>
          {dersler.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <label className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: TEXT_MUTED }}>
          <input type="checkbox" checked={yalnizBekleyen} onChange={(e) => setYalnizBekleyen(e.target.checked)} />
          Yalnızca eşleşmemişler ({bekleyenSayisi})
        </label>
        <button type="button" disabled={pending || topluKaydedilecekler.length === 0} onClick={() => kaydet(topluKaydedilecekler)}
          className="sfec-btn ml-auto flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-50"
          style={{ background: MINT, color: MINT_ON }}>
          <Sparkles size={12} aria-hidden="true" /> Güçlü önerileri kaydet ({topluKaydedilecekler.length})
        </button>
      </div>
      {mesaj && <div style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT }} className="text-[11px] font-semibold">{mesaj}</div>}

      {gosterilen.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm">{yalnizBekleyen ? "Eşleşmemiş konu kalmadı." : "Gösterilecek konu yok."}</p>
      ) : gosterilen.map((s) => {
        const anahtar = satirAnahtari(s);
        const secili = secimler[anahtar] ?? "";
        const adaylar = veri.adaylar[s.ders] ?? [];
        return (
          <div key={anahtar} className="rounded-2xl p-3" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div style={{ color: TEXT }} className="text-sm font-semibold">{s.kazanimMetni}</div>
              <div style={{ color: TEXT_MUTED }} className="text-[11px] shrink-0">{s.ders} · {s.satirSayisi} sonuç</div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select value={secili} onChange={(e) => setSecimler((m) => ({ ...m, [anahtar]: e.target.value }))}
                aria-label={`${s.kazanimMetni} için müfredat konusu`}
                className="text-xs px-3 py-2 rounded-xl outline-none flex-1 min-w-[220px]" style={girdiStili}>
                <option value="">Müfredat konusu seçin…</option>
                {adaylar.map((a) => <option key={a.konu} value={a.konu}>{a.etiket}</option>)}
              </select>
              <button type="button" disabled={pending || !secili || secili === s.mevcutKonu} onClick={() => kaydet([s])}
                className="sfec-btn flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-50"
                style={{ background: MINT, color: MINT_ON }}>
                <Check size={12} aria-hidden="true" /> Kaydet
              </button>
              {s.mevcutKonu && (
                <button type="button" disabled={pending} onClick={() => kaldir(s)}
                  className="sfec-btn flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-bold"
                  style={{ color: BLUSH, border: `2px solid ${BORDER_STRONG}` }}>
                  <X size={12} aria-hidden="true" /> Kaldır
                </button>
              )}
            </div>
            <div className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>
              {s.mevcutKonu
                ? <>Eşleşmiş: <span style={{ color: MINT }} className="font-semibold">{s.mevcutKonu}</span></>
                : s.oneri
                  ? <>Öneri: <span style={{ color: SKY }} className="font-semibold">{s.oneri.konu}</span> (benzerlik %{Math.round(s.oneri.puan * 100)}{s.oneri.puan < GUCLU_ONERI_ESIGI ? " — zayıf, kontrol edin" : ""})</>
                  : s.zayifOneriler.length > 0
                    // Kullanıcı isteği (25.09.2026): eşik altındaki adaylar da
                    // gösterilsin — tıklayınca yalnızca seçiciye yazılır, kaydetmez.
                    ? <span className="flex flex-wrap items-center gap-1.5">
                        Benzeyen konular:
                        {s.zayifOneriler.map((o) => (
                          <button key={o.konu} type="button" onClick={() => setSecimler((m) => ({ ...m, [anahtar]: o.konu }))}
                            className="sfec-btn rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ color: SKY, border: `1px solid ${BORDER_STRONG}` }}>
                            {o.konu} <span style={{ color: TEXT_MUTED }}>%{Math.round(o.puan * 100)}</span>
                          </button>
                        ))}
                        <span>— doğruysa seçip kaydedin.</span>
                      </span>
                    : "Öneri yok — elle seçin."}
            </div>
          </div>
        );
      })}
    </div>
  );
}
