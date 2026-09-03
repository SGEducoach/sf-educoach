"use client";

import { startTransition, useEffect, useState, useTransition } from "react";
import { Rss, Trash2, Eye, EyeOff, Save, X, ExternalLink } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { blogYazilariniYonetimIcinGetir, blogYazisiKaydet, blogYazisiYayinDurumu, blogYazisiSil } from "@/app/yonetici/blog-actions";
import { blogGorselUrl, tarihFormatla, type BlogYazisi } from "@/lib/blog";

// SeFu Blog yönetimi (03.09.2026). Taslak kaydedip sonra yayınlama akışı:
// "yayında" işaretlenmeden yazı public tarafta hiç görünmüyor.
export function BlogYonetimi() {
  const [yazilar, setYazilar] = useState<BlogYazisi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [duzenlenen, setDuzenlenen] = useState<BlogYazisi | null>(null);
  const [formAcik, setFormAcik] = useState(false);

  function yenile() {
    startTransition(() => {
      blogYazilariniYonetimIcinGetir().then((r) => {
        if (r.error) return setHata(r.error);
        setYazilar(r.yazilar);
      });
    });
  }
  useEffect(yenile, []);

  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(199,182,255,0.15)" }}>
          <Rss size={13} color={LILAC} />
        </div>
        <span className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>SeFu Blog</span>
        <a href="/blog" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>
          <ExternalLink size={11} /> Siteyi gör
        </a>
        <button type="button" onClick={() => { setDuzenlenen(null); setFormAcik((v) => !v); }}
          className="sfec-btn ml-auto rounded-full px-3.5 py-1.5 text-xs font-bold"
          style={{ background: formAcik && !duzenlenen ? BG0 : MINT, color: formAcik && !duzenlenen ? TEXT : MINT_ON, border: `2px solid ${BORDER_STRONG}` }}>
          {formAcik && !duzenlenen ? "Vazgeç" : "Yeni yazı"}
        </button>
      </div>

      {hata && <p className="mb-3 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}

      {formAcik && (
        <BlogFormu key={duzenlenen?.id ?? "yeni"} yazi={duzenlenen}
          onBitti={() => { setFormAcik(false); setDuzenlenen(null); yenile(); }} />
      )}

      {yazilar === null ? (
        <p className="py-3 text-center text-sm" style={{ color: TEXT_MUTED }}>Yükleniyor...</p>
      ) : yazilar.length === 0 ? (
        <p className="py-3 text-center text-sm" style={{ color: TEXT_MUTED }}>Henüz yazı yok. Sağ üstten &quot;Yeni yazı&quot; ile başlayın.</p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {yazilar.map((y) => (
            <YaziSatiri key={y.id} yazi={y}
              onDuzenle={() => { setDuzenlenen(y); setFormAcik(true); }}
              onDegisti={yenile} onHata={setHata} />
          ))}
        </div>
      )}
    </div>
  );
}

function YaziSatiri({ yazi, onDuzenle, onDegisti, onHata }: {
  yazi: BlogYazisi; onDuzenle: () => void; onDegisti: () => void; onHata: (m: string) => void;
}) {
  const [pending, startPending] = useTransition();

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl px-3.5 py-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      {yazi.kapakGorseli && (
        // eslint-disable-next-line @next/next/no-img-element -- yönetilen Supabase Storage görseli
        <img src={blogGorselUrl(yazi.kapakGorseli)} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold" style={{ color: TEXT }}>{yazi.baslik}</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ background: "rgba(255,255,255,0.06)", color: yazi.yayinda ? MINT : "#FFC46B" }}>
            {yazi.yayinda ? "Yayında" : "Taslak"}
          </span>
        </div>
        <div className="mt-0.5 text-xs" style={{ color: TEXT_MUTED }}>
          /blog/{yazi.slug}{yazi.yayinTarihi ? ` - ${tarihFormatla(yazi.yayinTarihi)}` : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button type="button" onClick={onDuzenle} disabled={pending}
          className="sfec-btn rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          Düzenle
        </button>
        <button type="button" disabled={pending}
          onClick={() => startPending(async () => {
            const r = await blogYazisiYayinDurumu(yazi.id, !yazi.yayinda);
            if (r.error) return onHata(r.error);
            onDegisti();
          })}
          className="sfec-btn flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold"
          style={{ background: yazi.yayinda ? BG0 : MINT, color: yazi.yayinda ? TEXT : MINT_ON, border: `2px solid ${BORDER_STRONG}` }}>
          {yazi.yayinda ? <><EyeOff size={11} /> Yayından kaldır</> : <><Eye size={11} /> Yayınla</>}
        </button>
        <button type="button" disabled={pending}
          onClick={() => {
            if (!window.confirm(`"${yazi.baslik}" silinsin mi? Bu işlem geri alınamaz.`)) return;
            startPending(async () => {
              const r = await blogYazisiSil(yazi.id);
              if (r.error) return onHata(r.error);
              onDegisti();
            });
          }}
          className="sfec-btn flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold"
          style={{ color: BLUSH, border: `2px solid ${BORDER_STRONG}` }}>
          <Trash2 size={11} /> Sil
        </button>
      </div>
    </div>
  );
}

function BlogFormu({ yazi, onBitti }: { yazi: BlogYazisi | null; onBitti: () => void }) {
  const [ozet, setOzet] = useState(yazi?.ozet ?? "");
  const [yayinda, setYayinda] = useState(yazi?.yayinda ?? false);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startPending] = useTransition();

  function gonder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setHata(null);
    const fd = new FormData(e.currentTarget);
    if (yazi) fd.set("id", yazi.id);
    fd.set("yayinda", String(yayinda));
    startPending(async () => {
      const r = await blogYazisiKaydet(fd);
      if (r.error) return setHata(r.error);
      onBitti();
    });
  }

  const etiket = "text-[10px] font-semibold uppercase tracking-wide";
  const girdi = "rounded-xl px-3 py-2 text-sm outline-none";
  const girdiStil = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };

  return (
    <form onSubmit={gonder} className="mb-4 flex flex-col gap-3 rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <label className="flex flex-col gap-1">
        <span className={etiket} style={{ color: TEXT_MUTED }}>Başlık</span>
        <input name="baslik" required defaultValue={yazi?.baslik ?? ""} className={girdi} style={girdiStil} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={etiket} style={{ color: TEXT_MUTED }}>Özet — Google sonucunda başlığın altında görünen açıklama (10-300 karakter)</span>
        <textarea name="ozet" required rows={2} value={ozet} onChange={(e) => setOzet(e.target.value)} className={`${girdi} resize-y`} style={girdiStil} />
        <span className="text-[10px]" style={{ color: ozet.length > 300 ? BLUSH : TEXT_MUTED }}>{ozet.length}/300</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className={etiket} style={{ color: TEXT_MUTED }}>İçerik — ## ara başlık, - liste, **kalın**, [bağlantı](adres) kullanabilirsiniz</span>
        <textarea name="icerik" required rows={14} defaultValue={yazi?.icerik ?? ""}
          className={`${girdi} resize-y font-mono text-xs leading-relaxed`} style={girdiStil} />
      </label>

      <label className="flex flex-col gap-1">
        <span className={etiket} style={{ color: TEXT_MUTED }}>Kapak görseli (JPEG/PNG/WebP, en fazla 5MB)</span>
        <input type="file" name="kapak" accept="image/jpeg,image/png,image/webp" className="text-xs" style={{ color: TEXT_MUTED }} />
      </label>

      <label className="flex cursor-pointer items-center gap-2">
        <input type="checkbox" checked={yayinda} onChange={(e) => setYayinda(e.target.checked)} />
        <span className="text-xs" style={{ color: TEXT }}>Yayında (işaretlemezseniz taslak olarak kaydedilir)</span>
      </label>

      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={pending}
          className="sfec-btn flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          <Save size={13} /> {pending ? "Kaydediliyor..." : yazi ? "Değişiklikleri kaydet" : "Yazıyı kaydet"}
        </button>
        <button type="button" onClick={onBitti} disabled={pending}
          className="sfec-btn flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          <X size={13} /> Vazgeç
        </button>
      </div>
    </form>
  );
}
