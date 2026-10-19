"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { konuAdEslesmesiKaydet } from "@/app/yonetici/konu-ad-eslesme-actions";
import type { KonuAdIncelemeSatiri } from "@/app/yonetici/konu-ad-eslesme-actions";
import type { KonuHedefi } from "@/lib/konu-ad-eslesmesi";
import { BG0, BG1, BORDER, MINT, MINT_ON, SKY_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

export function KonuAdEslesmeYonetimi({ satirlar, hedefler, error }: {
  satirlar: KonuAdIncelemeSatiri[];
  hedefler: KonuHedefi[];
  error: string | null;
}) {
  const [ders, setDers] = useState("tum");
  const [durum, setDurum] = useState<"bekleyen" | "tum">("bekleyen");
  const [arama, setArama] = useState("");
  const [limit, setLimit] = useState(40);
  const dersler = [...new Set(satirlar.map((s) => s.ders))].sort((a, b) => a.localeCompare(b, "tr"));
  const bekleyen = satirlar.filter((s) => s.hedefKonu === null);
  const gorunen = useMemo(() => satirlar.filter((s) => (ders === "tum" || s.ders === ders)
    && (durum === "tum" || s.hedefKonu === null)
    && (!arama.trim() || `${s.ders} ${s.kaynakKonu}`.toLocaleLowerCase("tr-TR").includes(arama.trim().toLocaleLowerCase("tr-TR")))),
  [satirlar, ders, durum, arama]);

  return <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
    <h2 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Konu Adı Eşleştirme</h2>
    <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
      Lise konu çalışması ve soru çözümünde girilen adları Konu Hâkimiyeti alt konularına bağlayın.
      Yalnız birebir adlar kendiliğinden eşleşir; öneriler kontrol edilmeden uygulanmaz. Öğrencinin geçmiş kaydı değiştirilmez.
    </p>
    {error ? <p role="alert" className="mt-3 text-sm" style={{ color: TEXT }}>Veri alınamadı: {error}</p> : <>
      <p className="mt-3 rounded-xl p-2 text-xs" style={{ background: SKY_BG, color: TEXT }}>
        {satirlar.length} farklı adın {bekleyen.length} tanesi eşleşme bekliyor. Bunlar skor hesabına henüz katılmıyor.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <select aria-label="Ders filtresi" value={ders} onChange={(e) => { setDers(e.target.value); setLimit(40); }} className="rounded-xl px-3 py-2 text-xs" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>
          <option value="tum">Tüm dersler</option>{dersler.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Eşleşme durumu" value={durum} onChange={(e) => { setDurum(e.target.value as "bekleyen" | "tum"); setLimit(40); }} className="rounded-xl px-3 py-2 text-xs" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>
          <option value="bekleyen">Eşleşme bekleyenler</option><option value="tum">Tüm kayıtlar</option>
        </select>
        <input aria-label="Konu adı ara" value={arama} onChange={(e) => { setArama(e.target.value); setLimit(40); }} placeholder="Konu adı ara" className="rounded-xl px-3 py-2 text-xs" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }} />
      </div>
      <div className="mt-4 flex flex-col gap-2">
        {gorunen.slice(0, limit).map((s) => <EslesmeSatiri key={`${s.ders}|${s.kaynakKonu}`} satir={s} hedefler={hedefler.filter((h) => h.ders === s.ders)} />)}
        {gorunen.length === 0 && <p className="text-xs" style={{ color: TEXT_MUTED }}>Bu filtrede konu yok.</p>}
      </div>
      {gorunen.length > limit && <button type="button" onClick={() => setLimit((n) => n + 40)} className="sfec-btn mt-3 rounded-xl px-3 py-2 text-xs" style={{ background: SKY_BG, color: TEXT }}>40 kayıt daha göster ({gorunen.length - limit} kaldı)</button>}
    </>}
  </div>;
}

function EslesmeSatiri({ satir, hedefler }: { satir: KonuAdIncelemeSatiri; hedefler: KonuHedefi[] }) {
  const router = useRouter();
  const [hedef, setHedef] = useState(satir.hedefKonu ?? "");
  const [pending, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedildi, setKaydedildi] = useState(false);
  function kaydet() {
    setHata(null);
    startTransition(async () => {
      const sonuc = await konuAdEslesmesiKaydet({ ders: satir.ders, kaynakKonu: satir.kaynakKonu, hedefKonu: hedef });
      if (sonuc.error) { setHata(sonuc.error); return; }
      setKaydedildi(true);
      router.refresh();
    });
  }
  return <div className="rounded-2xl p-3" style={{ background: BG0, border: `1px solid ${BORDER}` }}>
    <p className="text-xs font-bold" style={{ color: TEXT }}>{satir.ders} · {satir.kaynakKonu}</p>
    <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>
      {satir.calismaSayisi} konu çalışması · {satir.soruSayisi} soru çözümü
      {satir.hedefKonu && ` · Eşleşen: ${satir.hedefKonu}`}
    </p>
    {satir.oneriler.length > 0 && <div className="mt-2 flex flex-wrap gap-1">
      <span className="text-[11px]" style={{ color: TEXT_MUTED }}>Adaylar:</span>
      {satir.oneriler.map((o) => <button type="button" key={o.konu} onClick={() => setHedef(o.konu)} className="sfec-btn rounded-lg px-2 py-1 text-[11px]" style={{ background: SKY_BG, color: TEXT }}>{o.etiket}</button>)}
    </div>}
    <div className="mt-2 flex flex-wrap gap-2">
      <select aria-label={`${satir.ders} ${satir.kaynakKonu} hedef konusu`} value={hedef} onChange={(e) => { setHedef(e.target.value); setKaydedildi(false); }} className="min-w-0 flex-1 rounded-xl px-2 py-2 text-xs" style={{ background: BG1, color: TEXT, border: `1px solid ${BORDER}` }}>
        <option value="">Alt konu seçin</option>
        {hedefler.map((h) => <option key={h.konu} value={h.konu}>{h.ustKonu === h.konu ? h.konu : `${h.ustKonu} › ${h.konu}`}</option>)}
      </select>
      <button type="button" disabled={pending || !hedef || hedef === satir.hedefKonu} onClick={kaydet} className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>{pending ? "Kaydediliyor" : "Eşleştir"}</button>
    </div>
    {hata && <p role="alert" className="mt-2 text-xs" style={{ color: TEXT }}>{hata}</p>}
    {kaydedildi && <p role="status" className="mt-2 text-xs" style={{ color: MINT }}>Eşleşme kaydedildi.</p>}
  </div>;
}
