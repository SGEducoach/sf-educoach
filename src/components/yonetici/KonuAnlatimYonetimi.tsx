"use client";

import { useState, useTransition } from "react";
import { Search, BookOpen, RefreshCw, Save, ChevronDown, ChevronUp } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { konuAnlatimlariAra, konuAnlatimiDetay, konuAnlatimiGuncelle, konuAnlatimiYenidenUret, type KonuAnlatimiSatiri } from "@/app/yonetici/actions";

// 190+ üretilmiş konu anlatımı içeriğini tek tek gözden geçirip
// düzenleyebilmek/yeniden üretebilmek için — arama tetiklemeli (tümünü
// listelemek yerine), KullaniciArama ile aynı desen.
export function KonuAnlatimYonetimi() {
  const [sorgu, setSorgu] = useState("");
  const [satirlar, setSatirlar] = useState<KonuAnlatimiSatiri[]>([]);
  const [aramaYapildi, setAramaYapildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [acikId, setAcikId] = useState<string | null>(null);

  function ara(q: string) {
    setHata(null);
    if (q.trim().length < 2) { setSatirlar([]); setAramaYapildi(false); return; }
    startTransition(async () => {
      const res = await konuAnlatimlariAra(q);
      if (res.error) return setHata(res.error);
      setSatirlar(res.satirlar);
      setAramaYapildi(true);
    });
  }

  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
          <BookOpen size={13} color={LILAC} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Konu özetleri</span>
      </div>

      <div className="relative mb-3">
        <Search size={14} color={TEXT_MUTED} className="absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={sorgu}
          onChange={(e) => { setSorgu(e.target.value); ara(e.target.value); }}
          placeholder="Ders veya konu ile ara (en az 2 karakter)..."
          className="text-sm pl-9 pr-3 py-2 rounded-xl outline-none w-full"
          style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
        />
      </div>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold mb-2">{hata}</div>}

      {pending ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Aranıyor...</p>
      ) : aramaYapildi && satirlar.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Sonuç bulunamadı.</p>
      ) : satirlar.length > 0 ? (
        <div className="flex flex-col gap-2">
          {satirlar.map((s) => (
            <KonuSatiri key={s.id} satir={s} acik={acikId === s.id} onToggle={() => setAcikId(acikId === s.id ? null : s.id)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function KonuSatiri({ satir, acik, onToggle }: { satir: KonuAnlatimiSatiri; acik: boolean; onToggle: () => void }) {
  const [icerik, setIcerik] = useState<string | null>(null);
  const [duzenlemeMetni, setDuzenlemeMetni] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [kaydetPending, startKaydetTransition] = useTransition();
  const [uretPending, startUretTransition] = useTransition();

  function ac() {
    onToggle();
    if (!acik && icerik === null) {
      setYukleniyor(true);
      konuAnlatimiDetay(satir.id).then((res) => {
        setYukleniyor(false);
        if (res.error) return setHata(res.error);
        setIcerik(res.icerik);
        setDuzenlemeMetni(res.icerik ?? "");
      });
    }
  }

  function kaydet() {
    setHata(null);
    startKaydetTransition(async () => {
      const res = await konuAnlatimiGuncelle(satir.id, duzenlemeMetni);
      if (res.error) return setHata(res.error);
      setIcerik(duzenlemeMetni.trim());
    });
  }

  function yenidenUret() {
    if (!window.confirm(`"${satir.konu}" için içerik AI ile yeniden üretilsin mi? Mevcut içeriğin üzerine yazılacak.`)) return;
    setHata(null);
    startUretTransition(async () => {
      const res = await konuAnlatimiYenidenUret(satir.id);
      if (res.error) return setHata(res.error);
      setIcerik(res.icerik);
      setDuzenlemeMetni(res.icerik ?? "");
    });
  }

  return (
    <div className="rounded-xl px-3.5 py-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      {/* Kullanıcı bulgusu (29.08.2026): "konu özetlerinde konunun üzerine
          gelince aktifleşen konu çerçeve dışına taşıyor" — global .sfec-btn
          hover'ı (transform: scale(1.04)) bu satırın kendi rounded-xl
          çerçevesini taşırıyordu (satır w-full, kendi kartını dolduruyor).
          Bilinçli olarak sfec-btn kaldırıldı, taşırmayan düz bir hover
          rengiyle değiştirildi. */}
      <button type="button" onClick={ac}
        className="w-full flex items-center justify-between gap-2 text-left rounded-lg transition-colors hover:bg-white/5">
        <div>
          <div style={{ color: TEXT }} className="text-sm font-semibold">
            {satir.konu} {satir.seviye && <span style={{ color: LILAC }} className="text-[10px] font-bold ml-1">{satir.seviye}</span>}
          </div>
          <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">{satir.ders}</div>
        </div>
        {acik ? <ChevronUp size={16} color={TEXT_MUTED} /> : <ChevronDown size={16} color={TEXT_MUTED} />}
      </button>

      {acik && (
        <div className="mt-3 flex flex-col gap-2">
          {yukleniyor ? (
            <p style={{ color: TEXT_MUTED }} className="text-xs py-2 text-center">Yükleniyor...</p>
          ) : (
            <>
              <textarea
                value={duzenlemeMetni}
                onChange={(e) => setDuzenlemeMetni(e.target.value)}
                rows={10}
                className="text-xs px-3 py-2.5 rounded-xl outline-none resize-y leading-relaxed"
                style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
              />
              {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
              <div className="flex items-center gap-2">
                <button type="button" onClick={kaydet} disabled={kaydetPending || duzenlemeMetni.trim() === icerik}
                  className="sfec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60"
                  style={{ background: MINT, color: MINT_ON }}>
                  <Save size={12} /> {kaydetPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
                <button type="button" onClick={yenidenUret} disabled={uretPending}
                  className="sfec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60"
                  style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
                  <RefreshCw size={12} /> {uretPending ? "Üretiliyor..." : "AI ile yeniden üret"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
