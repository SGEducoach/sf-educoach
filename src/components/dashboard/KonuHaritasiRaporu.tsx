"use client";

// Konu bilme/bilmeme göstergesi — "Konu Haritası" (Faz K3). Tek bileşen,
// iki modda kullanılıyor:
//  - "kendi": öğrencinin kendi zayıf konuları (eski ZayifKonular.tsx'in
//    mantığı — dosya geri gelmiyor ama davranışı burada yaşıyor).
//  - "rapor": sınıf/kurum bazlı agrege rapor (öğretmen/müdür-moderatör/
//    admin) — YapayZekaAnaliziPromosu'nun render edildiği yerlerin
//    yerini alıyor (kullanıcı kararı, bkz. plan).
// Bu SADECE deterministik/SQL istatistik — gerçek "yapay zeka" yorumu
// ayrı, sonraki bir faz (kapsam dışı, bkz. plan).
import { useState } from "react";
import { BarChart2, BookOpen, ChevronDown, ChevronUp, Loader2, Users } from "lucide-react";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, PEACH, PEACH_BG, MINT, BUTTER, SKY, SKY_BG, TEXT, TEXT_MUTED, BLUSH,
} from "@/lib/theme";
import { konuAnlatimiGetir } from "@/app/dashboard/veri-actions";
import { TAKIP_CEVABI_ETIKET } from "@/lib/types";
import type { OgrenciZayifKonu, KonuHaritasiSatiri } from "@/lib/konu-raporu";

function BosDurum({ mesaj }: { mesaj: string }) {
  return <p style={{ color: TEXT_MUTED }} className="text-sm py-6 text-center">{mesaj}</p>;
}

export function KonuHaritasiRaporu(
  props:
    | { mod: "kendi"; konular: OgrenciZayifKonu[] }
    | { mod: "rapor"; satirlar: KonuHaritasiSatiri[]; kapsamEtiketi: string; hata?: string | null },
) {
  if (props.mod === "kendi") return <KendiZayifKonulari konular={props.konular} />;
  return <ScopeRaporu satirlar={props.satirlar} kapsamEtiketi={props.kapsamEtiketi} hata={props.hata} />;
}

// ============ Öğrencinin kendi görünümü ============

function KendiZayifKonulari({ konular }: { konular: OgrenciZayifKonu[] }) {
  return (
    <div className="sfec-fade rounded-3xl p-6 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: PEACH_BG }}>
          <BookOpen size={13} color={PEACH} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Konuları biliyor muyum?</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
        &quot;Hedefe uzak&quot; işaretlediğin konular — üzerine tıklayıp yapay zeka destekli konu anlatımını okuyabilirsin.
      </p>
      {konular.length === 0 ? (
        <BosDurum mesaj="Şimdilik zayıf işaretlediğin bir konu yok — böyle devam! 🎉" />
      ) : (
        <div className="flex flex-col gap-2">
          {konular.map((k) => <KonuSatiri key={`${k.ders}-${k.konu}`} konu={k} />)}
        </div>
      )}
    </div>
  );
}

function KonuSatiri({ konu }: { konu: OgrenciZayifKonu }) {
  const [acik, setAcik] = useState(false);
  const [icerik, setIcerik] = useState<string | null>(null);
  const [seviye, setSeviye] = useState<string | null>(konu.seviye ?? null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  async function ac() {
    setAcik((a) => !a);
    if (icerik || yukleniyor) return;
    setYukleniyor(true);
    setHata(null);
    const res = await konuAnlatimiGetir(konu.ders, konu.konu);
    setYukleniyor(false);
    if (res.error) setHata(res.error);
    else { setIcerik(res.icerik); if (res.seviye) setSeviye(res.seviye); }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <button type="button" onClick={ac}
        className="sfec-btn w-full flex items-center justify-between px-4 py-3 text-left">
        <div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: TEXT }} className="text-sm font-semibold">{konu.konu}</span>
            {seviye && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: SKY_BG, color: SKY }}>{seviye}</span>
            )}
          </div>
          <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">{konu.ders}</div>
        </div>
        {yukleniyor ? <Loader2 size={16} color={TEXT_MUTED} className="animate-spin" /> : acik ? <ChevronUp size={16} color={TEXT_MUTED} /> : <ChevronDown size={16} color={TEXT_MUTED} />}
      </button>
      {acik && (
        <div className="px-4 pb-4">
          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
          {icerik && (
            <div style={{ color: TEXT_MUTED, borderTop: `2px solid ${BORDER_STRONG}` }} className="text-sm leading-relaxed whitespace-pre-line pt-3">
              {icerik}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ Sınıf/kurum bazlı agrege rapor ============

function ScopeRaporu({ satirlar, kapsamEtiketi, hata }: { satirlar: KonuHaritasiSatiri[]; kapsamEtiketi: string; hata?: string | null }) {
  return (
    <div className="sfec-fade rounded-3xl p-6 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: PEACH_BG }}>
          <BarChart2 size={13} color={PEACH} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Konu Haritası</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
        {kapsamEtiketi} genelinde öğrencilerin en çok zorlandığı konular — &quot;Konuya hakimiyet&quot; alanında &quot;Yetersiz&quot; işaretlenme oranına göre sıralı. Sonuçlar isimsizdir; en az 3 öğrencinin veri girdiği konular gösterilir.
      </p>
      {hata ? (
        <p style={{ color: BLUSH }} className="text-sm py-6 text-center">{hata}</p>
      ) : satirlar.length === 0 ? (
        <BosDurum mesaj="Henüz yeterli veri yok — en az 3 öğrencinin aynı konuda veri girmesi gerekiyor." />
      ) : (
        <div className="flex flex-col gap-2">
          {satirlar.map((s) => <KonuHaritasiSatirGorunumu key={`${s.ders}-${s.konu}`} satir={s} />)}
        </div>
      )}
    </div>
  );
}

function KonuHaritasiSatirGorunumu({ satir }: { satir: KonuHaritasiSatiri }) {
  const toplam = satir.uzakSayisi + satir.belirsizSayisi + satir.yakinSayisi;
  const uzakYuzde = toplam > 0 ? Math.round((satir.uzakSayisi / toplam) * 100) : 0;
  const belirsizYuzde = toplam > 0 ? Math.round((satir.belirsizSayisi / toplam) * 100) : 0;
  const yakinYuzde = Math.max(0, 100 - uzakYuzde - belirsizYuzde);

  return (
    <div className="rounded-2xl p-3.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <span style={{ color: TEXT }} className="text-sm font-semibold">{satir.konu}</span>
          <span style={{ color: TEXT_MUTED }} className="text-xs ml-1.5">· {satir.ders}</span>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: SKY_BG, color: SKY }}>
          <Users size={10} /> {satir.ogrenciSayisi} öğrenci
        </span>
      </div>
      {/* Yetersiz/Orta/Yeterli dağılım çubuğu — AnalizPaneli'ndeki hedefeYakinlikDagilimi
          çubuklarıyla aynı görsel dil (bkz. AnalizPaneli.tsx). */}
      <div className="mt-2.5 h-2 rounded-full overflow-hidden flex" style={{ background: BORDER }}>
        {uzakYuzde > 0 && <div style={{ width: `${uzakYuzde}%`, background: PEACH }} />}
        {belirsizYuzde > 0 && <div style={{ width: `${belirsizYuzde}%`, background: BUTTER }} />}
        {yakinYuzde > 0 && <div style={{ width: `${yakinYuzde}%`, background: MINT }} />}
      </div>
      <div style={{ color: TEXT_MUTED }} className="mt-1.5 text-[11px]">
        Yetersiz %{uzakYuzde} · Orta %{belirsizYuzde} · Yeterli %{yakinYuzde}
        {satir.enSikUzakTakipCevabi && (
          <> — &quot;Yetersiz&quot; diyenlerin çoğu: <strong style={{ color: TEXT }}>{TAKIP_CEVABI_ETIKET[satir.enSikUzakTakipCevabi]}</strong></>
        )}
      </div>
    </div>
  );
}
