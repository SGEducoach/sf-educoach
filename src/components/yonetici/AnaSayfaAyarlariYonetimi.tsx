"use client";

import { useRef, useState, useTransition } from "react";
import { Home, ImageIcon, Trash2 } from "lucide-react";
import { anaSayfaAyarlariniGuncelle, anaSayfaSliderGorseliEkle, anaSayfaSliderGorselSil } from "@/app/yonetici/actions";
import { anaSayfaDosyaUrl, type AnaSayfaAyarlari, type AnaSayfaSliderGorseli } from "@/lib/ana-sayfa";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

const SLIDER_GECIS_MIN = 4;

// Ana Sayfa Ayarları (27.08.2026 kullanıcı isteği) — Site Ayarları
// bölümünün içinde ayrı bir kart. Admin buradan ana sayfadaki başlık/gövde
// metnini ve slider görsellerini/geçiş süresini yönetir.
export function AnaSayfaAyarlariYonetimi({ ayarlarBaslangic, gorsellerBaslangic }: {
  ayarlarBaslangic: AnaSayfaAyarlari; gorsellerBaslangic: AnaSayfaSliderGorseli[];
}) {
  const [baslik, setBaslik] = useState(ayarlarBaslangic.baslik);
  const [govde, setGovde] = useState(ayarlarBaslangic.govde);
  const [sliderGecisSaniye, setSliderGecisSaniye] = useState(String(ayarlarBaslangic.sliderGecisSaniye));
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [gorseller, setGorseller] = useState(gorsellerBaslangic);
  const gorselRef = useRef<HTMLInputElement>(null);
  const [gorselHata, setGorselHata] = useState<string | null>(null);
  const [gorselPending, startGorselTransition] = useTransition();
  const [silinenId, setSilinenId] = useState<string | null>(null);

  function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasari(null);
    const saniye = Number(sliderGecisSaniye);
    if (!baslik.trim()) return setHata("Başlık gerekli.");
    if (!Number.isInteger(saniye) || saniye < SLIDER_GECIS_MIN) return setHata(`Slider geçiş süresi en az ${SLIDER_GECIS_MIN} saniye olmalı.`);

    startTransition(async () => {
      const res = await anaSayfaAyarlariniGuncelle({ baslik: baslik.trim(), govde: govde.trim(), sliderGecisSaniye: saniye });
      if (res.error) return setHata(res.error);
      setBasari("Kaydedildi — ana sayfaya yansıdı.");
    });
  }

  function gorselYukle() {
    setGorselHata(null);
    const dosya = gorselRef.current?.files?.[0];
    if (!dosya) return setGorselHata("Bir görsel seçin.");
    const formData = new FormData();
    formData.set("dosya", dosya);
    startGorselTransition(async () => {
      const res = await anaSayfaSliderGorseliEkle(formData);
      if (res.error) return setGorselHata(res.error);
      if (gorselRef.current) gorselRef.current.value = "";
      // Basit/güvenilir: eklenen görselin id'sini bilmediğimiz için tam
      // listeyi yeniden çekmek yerine sayfa router.refresh'i beklemeden
      // sadece "başarı" mesajı gösterip kullanıcı Site Ayarları'na tekrar
      // girdiğinde (veya sayfa yenilendiğinde) güncel listeyi görür.
      setGorselHata(null);
      window.location.reload();
    });
  }

  function gorselSil(id: string) {
    if (!window.confirm("Bu slider görseli kalıcı olarak silinsin mi?")) return;
    setSilinenId(id);
    startGorselTransition(async () => {
      const res = await anaSayfaSliderGorselSil(id);
      setSilinenId(null);
      if (res.error) return setGorselHata(res.error);
      setGorseller((prev) => prev.filter((g) => g.id !== id));
    });
  }

  return (
    <div className="mt-4 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <Home size={16} color={TEXT_MUTED} />
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Ana Sayfa Ayarları</h2>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] mb-3">Ana sayfadaki (/) başlık, tanıtım metni ve slider bu bölümden yönetilir.</p>

      <form onSubmit={kaydet} className="flex flex-col gap-2.5 rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Başlık</span>
          <input value={baslik} onChange={(e) => setBaslik(e.target.value.slice(0, 200))}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Gövde metni</span>
          <textarea value={govde} onChange={(e) => setGovde(e.target.value.slice(0, 4000))} rows={10}
            className="text-sm px-3 py-2 rounded-xl outline-none resize-y font-mono" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          <span style={{ color: TEXT_MUTED }} className="text-[10px]">{govde.length}/4000 — paragraflar arasına boş satır bırakın</span>
        </label>
        <label className="flex flex-col gap-1 w-48">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Slider geçiş süresi (saniye)</span>
          <input type="number" min={SLIDER_GECIS_MIN} value={sliderGecisSaniye} onChange={(e) => setSliderGecisSaniye(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        {basari && <div style={{ color: MINT }} className="text-xs font-semibold">{basari}</div>}
        <button type="submit" disabled={pending}
          className="sfec-btn self-start text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-60"
          style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>

      <div className="mt-4">
        <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold uppercase tracking-wide mb-2 block">
          Slider görselleri ({gorseller.length})
        </span>
        <div className="flex flex-wrap gap-2 mb-3">
          {gorseller.map((g) => (
            <div key={g.id} className="relative w-28 h-20 rounded-xl overflow-hidden" style={{ border: `2px solid ${BORDER_STRONG}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- next/image harici Storage domainini reddediyor (bkz. TgDenemeleri.tsx) */}
              <img src={anaSayfaDosyaUrl(g.dosyaYolu)} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => gorselSil(g.id)} disabled={silinenId === g.id}
                className="sfec-btn absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-60"
                style={{ background: "rgba(0,0,0,0.55)" }}>
                <Trash2 size={12} color="#fff" />
              </button>
            </div>
          ))}
          {gorseller.length === 0 && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: TEXT_MUTED }}>
              <ImageIcon size={14} /> Henüz slider görseli yok.
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input ref={gorselRef} type="file" accept="image/jpeg,image/png,image/webp"
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-xs file:font-bold"
            style={{ color: TEXT }} />
          <button type="button" onClick={gorselYukle} disabled={gorselPending}
            className="sfec-btn text-xs font-bold px-3.5 py-2 rounded-xl disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}>
            {gorselPending ? "Yükleniyor..." : "Görsel ekle"}
          </button>
        </div>
        {gorselHata && <div style={{ color: BLUSH }} className="text-xs font-semibold mt-1.5">{gorselHata}</div>}
      </div>
    </div>
  );
}
