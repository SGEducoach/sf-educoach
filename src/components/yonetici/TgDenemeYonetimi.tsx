"use client";

import { useRef, useState, useTransition } from "react";
import { Archive, FileText, ImageIcon, Newspaper, Trash2 } from "lucide-react";
import { tgDenemeIlaniEkle, tgDenemeArsiviniGetir, tgDenemeIlaniSil } from "@/app/yonetici/actions";
import { tgDenemeDosyaUrl, type TgDenemeIlani } from "@/lib/tg-deneme-ilanlari";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// TG Denemeleri — Google Drive bypass planı (27.08.2026 kullanıcı isteği):
// admin panelinin Duyurular bölümünde, YoneticiDuyuruPaneli'nin yanında.
// Google Drive entegrasyonu (docs/tg-denemeleri-google-drive.md) yarım
// kalmıştı — bunun yerine tamamen bu ekrandan (dosya yükle + tarih/başlık/
// alt metin yaz) yönetilen bir akış. Tarih BİLEREK serbest metin (seçici
// değil) — "bazen aralık bazen tek tarih girmek gerekiyor" (27.08.2026).
// Arşiv, akıştaki ilk 20'nin ÖTESİNDEKİ (21.'den itibaren) kayıtları
// gösterir — bkz. tg-deneme-ilanlari.ts.
export function TgDenemeYonetimi() {
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [acik, setAcik] = useState(false);
  const [tarih, setTarih] = useState("");
  const [baslik, setBaslik] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [arsivAcik, setArsivAcik] = useState(false);
  const [arsiv, setArsiv] = useState<TgDenemeIlani[] | null>(null);
  const [arsivPending, startArsivTransition] = useTransition();
  const [silinenId, setSilinenId] = useState<string | null>(null);

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasari(null);
    const dosya = dosyaRef.current?.files?.[0];
    if (!dosya) return setHata("Bir PDF, JPEG veya PNG dosyası seçin.");
    if (!tarih.trim()) return setHata("Tarih gerekli.");
    if (!baslik.trim()) return setHata("Başlık gerekli.");

    const formData = new FormData();
    formData.set("dosya", dosya);
    formData.set("tarih", tarih.trim());
    formData.set("baslik", baslik.trim());
    formData.set("aciklama", aciklama.trim());

    startTransition(async () => {
      const res = await tgDenemeIlaniEkle(formData);
      if (res.error) return setHata(res.error);
      setBasari("Yayınlandı — TG Denemeleri akışında görünecek.");
      setTarih(""); setBaslik(""); setAciklama("");
      if (dosyaRef.current) dosyaRef.current.value = "";
      if (arsivAcik) setArsiv(null);
    });
  }

  function arsiviAcKapat() {
    const acilacak = !arsivAcik;
    setArsivAcik(acilacak);
    if (acilacak) {
      startArsivTransition(async () => {
        const res = await tgDenemeArsiviniGetir();
        setArsiv(res.error ? [] : res.ilanlar);
      });
    }
  }

  function arsivdenSil(id: string) {
    if (!window.confirm("Bu ilan kalıcı olarak silinsin mi?")) return;
    setSilinenId(id);
    startArsivTransition(async () => {
      const res = await tgDenemeIlaniSil(id);
      setSilinenId(null);
      if (res.error) return setHata(res.error);
      setArsiv((prev) => (prev ?? []).filter((i) => i.id !== id));
    });
  }

  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: MINT_BG }}>
            <Newspaper size={13} color={MINT} />
          </div>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">TG Denemeleri</span>
        </div>
        <button type="button" onClick={() => setAcik((v) => !v)}
          className="sfec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full"
          style={{ background: acik ? MINT : BG1_ALT, color: acik ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          {acik ? "Kapat" : "Yeni ilan ekle"}
        </button>
      </div>
      <p style={{ color: TEXT_MUTED }} className="mt-2 text-[11px] leading-relaxed">
        Akış en yeni 20 ilanı gösterir; 21. ilan eklendiğinde en eski ilan otomatik olarak arşive düşer (silinmez, aşağıdan erişilebilir).
      </p>

      {acik && (
        <form onSubmit={ekle} className="mt-4 flex flex-col gap-2.5 rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Afiş (PDF, JPEG veya PNG — en fazla 15MB)</span>
            <input ref={dosyaRef} type="file" accept="application/pdf,image/jpeg,image/png"
              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-xs file:font-bold"
              style={{ color: TEXT }} />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Tarih</span>
            <input value={tarih} onChange={(e) => setTarih(e.target.value.slice(0, 100))}
              placeholder="Örn. 29 Ağustos 2026 veya 18 Eylül 2026 - 14 Haziran 2027"
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Başlık</span>
            <input value={baslik} onChange={(e) => setBaslik(e.target.value.slice(0, 150))}
              placeholder="Örn. Ekim Ayı TYT Deneme Takvimi Yayınlandı"
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
            <span style={{ color: TEXT_MUTED }} className="text-[10px]">{baslik.length}/150</span>
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Alt metin (opsiyonel)</span>
            <textarea value={aciklama} onChange={(e) => setAciklama(e.target.value.slice(0, 500))} rows={3}
              placeholder="Örn. İşler Kitapevi şubelerinden deneme kitapçıklarını temin edebilirsiniz."
              className="text-sm px-3 py-2 rounded-xl outline-none resize-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
            <span style={{ color: TEXT_MUTED }} className="text-[10px]">{aciklama.length}/500</span>
          </label>
          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
          {basari && <div style={{ color: MINT }} className="text-xs font-semibold">{basari}</div>}
          <button type="submit" disabled={pending}
            className="sfec-btn self-start text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}>
            {pending ? "Yayınlanıyor..." : "Yayınla"}
          </button>
        </form>
      )}

      <div className="mt-3">
        <button type="button" onClick={arsiviAcKapat}
          className="sfec-btn flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full"
          style={{ background: arsivAcik ? MINT : "rgba(255,255,255,0.06)", color: arsivAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
          <Archive size={12} /> Arşiv
        </button>
        {arsivAcik && (
          <div className="mt-2 rounded-2xl p-3 max-h-72 overflow-y-auto flex flex-col gap-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
            {arsivPending && !arsiv && <p style={{ color: TEXT_MUTED }} className="text-xs text-center py-2">Yükleniyor...</p>}
            {arsiv?.length === 0 && <p style={{ color: TEXT_MUTED }} className="text-xs text-center py-2">Arşivde ilan yok.</p>}
            {arsiv?.map((i) => (
              <div key={i.id} className="flex items-center gap-2.5 rounded-xl p-2.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
                {i.dosyaTipi === "pdf" ? <FileText size={16} color={TEXT_MUTED} className="shrink-0" /> : <ImageIcon size={16} color={TEXT_MUTED} className="shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p style={{ color: TEXT }} className="text-xs font-bold leading-snug truncate">{i.baslik}</p>
                  {i.aciklama && <p style={{ color: TEXT_MUTED }} className="text-[11px] leading-snug truncate">{i.aciklama}</p>}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span style={{ color: TEXT_MUTED }} className="text-[10px]">{i.tarih}</span>
                    <a href={tgDenemeDosyaUrl(i.dosyaYolu)} target="_blank" rel="noopener noreferrer" style={{ color: MINT }} className="text-[10px] font-semibold underline">Dosyayı aç</a>
                  </div>
                </div>
                <button type="button" onClick={() => arsivdenSil(i.id)} disabled={silinenId === i.id}
                  className="sfec-btn shrink-0 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-60" style={{ border: `2px solid ${BORDER_STRONG}` }}>
                  <Trash2 size={13} color={BLUSH} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
