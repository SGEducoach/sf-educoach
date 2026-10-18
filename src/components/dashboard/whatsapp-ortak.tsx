"use client";

// WhatsApp kart stüdyolarının ortak parçaları: görsel yükleme, indirme/
// paylaşma, fotoğraf seçici, önizleme. Duyuru ve yurt listesi stüdyoları
// (WhatsappDuyuruStudyosu, YurtListeStudyosu) birlikte kullanır.
import { useState } from "react";
import { BG0, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

export const FOTO_KOKU = "/duyuru-fotograflari/";
export type FotoSecimi = "hazir" | "kendi" | "yok";

const gorselOnbellegi = new Map<string, Promise<HTMLImageElement | null>>();
export function gorselYukle(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const hazir = gorselOnbellegi.get(src);
  if (hazir) return hazir;
  const soz = new Promise<HTMLImageElement | null>((coz) => {
    const img = new Image();
    img.onload = () => coz(img);
    img.onerror = () => coz(null);
    img.src = src;
  });
  gorselOnbellegi.set(src, soz);
  return soz;
}

export async function yaziTipi(): Promise<string> {
  const aile = getComputedStyle(document.body).fontFamily || "sans-serif";
  try { await Promise.all([document.fonts.load(`900 40px ${aile}`), document.fonts.load(`700 24px ${aile}`), document.fonts.load(`600 28px ${aile}`)]); } catch { /* yedek yazı tipi */ }
  return aile;
}

export function blobOl(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((coz) => canvas.toBlob(coz, "image/png"));
}

export function dosyaAdiTemizle(s: string): string {
  return s.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9ğüşıöç]+/g, "-").replace(/^-|-$/g, "") || "kart";
}

export async function indirVeyaPaylas(canvas: HTMLCanvasElement, ad: string, paylas: boolean): Promise<boolean> {
  const blob = await blobOl(canvas);
  if (!blob) return false;
  if (paylas) {
    try { await navigator.share({ files: [new File([blob], ad, { type: "image/png" })] }); return true; } catch { return false; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

export function SablonDugmesi({ ad, foto, renk, secili, sec }: { ad: string; foto: string; renk: string; secili: boolean; sec: () => void }) {
  return (
    <button type="button" onClick={sec} aria-pressed={secili}
      className="sfec-btn flex shrink-0 items-center gap-2.5 rounded-2xl py-1.5 pl-1.5 pr-3 text-left lg:w-full lg:pr-2"
      style={secili ? { background: MINT_BG, outline: `2px solid ${MINT}`, outlineOffset: -2 } : { background: BG1_ALT }}>
      <span aria-hidden="true" className="relative h-9 w-11 shrink-0 overflow-hidden rounded-xl" style={{ background: renk }}>
        {foto && <span className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url(${foto.startsWith("/") ? foto : FOTO_KOKU + foto})` }} />}
        <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: renk }} />
      </span>
      <span className="whitespace-nowrap text-xs font-bold leading-tight lg:whitespace-normal" style={{ color: secili ? TEXT : TEXT_MUTED }}>{ad}</span>
    </button>
  );
}

// Şablonun fotoğraf galerisi (admin ekler/siler) + kendi fotoğrafı + fotoğrafsız.
export function useFotoSecimi(fotolar: string[]) {
  const [secim, setSecim] = useState<FotoSecimi>(fotolar.length ? "hazir" : "yok");
  const [kendiFoto, setKendiFoto] = useState<string | null>(null);
  const [secilen, setSecilen] = useState(0);
  const kaynak = secim === "hazir" ? fotolar[Math.min(secilen, fotolar.length - 1)] ?? null : secim === "kendi" ? kendiFoto : null;
  const sifirla = () => { setSecim(fotolar.length ? "hazir" : "yok"); setSecilen(0); };
  return { fotolar, secim, setSecim, kendiFoto, setKendiFoto, secilen, setSecilen, kaynak, sifirla };
}
export type FotoSecimDurumu = ReturnType<typeof useFotoSecimi>;

export function FotoSecici({ durum }: { durum: FotoSecimDurumu }) {
  const { fotolar, secim, setSecim, kendiFoto, setKendiFoto, secilen, setSecilen } = durum;
  const secenekler = ([["hazir", fotolar.length > 1 ? `Hazır Fotoğraf (${fotolar.length})` : "Hazır Fotoğraf"], ["kendi", "Kendi Fotoğrafım"], ["yok", "Fotoğrafsız"]] as const)
    .filter(([d]) => d !== "hazir" || fotolar.length > 0);
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Fotoğraf</legend>
      {secim === "hazir" && fotolar.length > 1 && (
        <div className="mb-1 flex flex-wrap gap-1.5">
          {fotolar.map((f, i) => (
            <button key={f} type="button" onClick={() => setSecilen(i)} aria-pressed={secilen === i} aria-label={`Fotoğraf ${i + 1}`}
              className="h-12 w-16 overflow-hidden rounded-lg bg-cover bg-center"
              style={{ backgroundImage: `url(${f})`, outline: secilen === i ? `3px solid ${MINT}` : `1px solid ${BORDER_STRONG}`, outlineOffset: secilen === i ? 1 : 0 }} />
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {secenekler.map(([d, e]) => (
          <button key={d} type="button" onClick={() => setSecim(d)} aria-pressed={secim === d}
            className="sfec-btn rounded-full px-3 py-1.5 text-[11px] font-bold"
            style={secim === d ? { background: MINT, color: MINT_ON } : { background: BG1_ALT, color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
            {e}
          </button>
        ))}
      </div>
      {secim === "kendi" && (
        <label className="mt-1 flex flex-col gap-1 text-[11px]" style={{ color: TEXT_MUTED }}>
          <input type="file" accept="image/*" onChange={(e) => {
            const f = e.target.files?.[0];
            if (kendiFoto) URL.revokeObjectURL(kendiFoto);
            setKendiFoto(f ? URL.createObjectURL(f) : null);
          }} className="text-xs" style={{ color: TEXT }} />
          Fotoğraf yalnız bu kartta kullanılır, sisteme yüklenmez.
        </label>
      )}
    </fieldset>
  );
}

export function Alan({ id, etiket, children }: { id: string; etiket: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{etiket}</span>
      {children}
    </label>
  );
}

export const girdiStili = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };

export function Onizleme({ src, yukseklik = "auto" }: { src: string | null; yukseklik?: string }) {
  return src
    // eslint-disable-next-line @next/next/no-img-element -- canvas çıktısı (data URL)
    ? <img src={src} alt="Kart önizlemesi" className="w-full rounded-2xl" style={{ border: `1px solid ${BORDER}`, height: yukseklik }} />
    : <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl text-xs" style={{ background: BG1_ALT, color: TEXT_MUTED }}>Önizleme hazırlanıyor…</div>;
}
