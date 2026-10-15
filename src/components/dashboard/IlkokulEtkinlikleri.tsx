"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Plus, Trash2 } from "lucide-react";
import { ayEtiketi } from "@/lib/ilkokul-gelisim";
import type { IlkokulEtkinligi } from "@/lib/ilkokul-gelisim-sorgu";
import { ilkokulEtkinlikEkle, ilkokulEtkinlikSil } from "@/app/dashboard/ilkokul-actions";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// İlkokul sosyal etkinlik kaydı (16.10.2026). Öğretmen etkinliği ve
// katılanları girer; veli çocuğunun katıldıklarını görür. "Velilere bildir"
// işaretliyse katılanların velilerine duyuru da gider.
export function IlkokulEtkinlikleri({ classId, ay, ogrenciler, etkinlikler, duzenleyebilir, bugun }: {
  classId: string;
  ay: string;
  ogrenciler: { id: string; ad: string }[];
  etkinlikler: IlkokulEtkinligi[];
  duzenleyebilir: boolean;
  bugun: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [acik, setAcik] = useState(false);
  const [ad, setAd] = useState("");
  const [tarih, setTarih] = useState(bugun.slice(0, 7) === ay.slice(0, 7) ? bugun : ay);
  const [aciklama, setAciklama] = useState("");
  const [katilimcilar, setKatilimcilar] = useState<Set<string>>(() => new Set(ogrenciler.map((o) => o.id)));
  const [veliyeDuyur, setVeliyeDuyur] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  function ekle() {
    setHata(null);
    startTransition(async () => {
      const r = await ilkokulEtkinlikEkle({ classId, ad, tarih, aciklama, katilimcilar: [...katilimcilar], veliyeDuyur });
      if (r.error) return setHata(r.error);
      setAd(""); setAciklama(""); setAcik(false);
      router.refresh();
    });
  }

  function sil(id: string) {
    setHata(null);
    startTransition(async () => {
      const r = await ilkokulEtkinlikSil(id);
      if (r.error) return setHata(r.error);
      router.refresh();
    });
  }

  const adlar = new Map(ogrenciler.map((o) => [o.id, o.ad]));
  const alan = { background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` };

  return (
    <div className="rounded-3xl p-5 flex flex-col gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
            <PartyPopper size={16} color={MINT} />
          </div>
          <div>
            <h2 className="text-sm font-bold" style={{ color: TEXT }}>Sosyal etkinlikler — {ayEtiketi(ay)}</h2>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>Veli çocuğunun katıldığı etkinlikleri gelişim raporunun altında görür.</p>
          </div>
        </div>
        {duzenleyebilir && !acik && (
          <button type="button" onClick={() => setAcik(true)}
            className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"
            style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <Plus size={13} /> Etkinlik ekle
          </button>
        )}
      </div>

      {acik && (
        <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
          <div className="grid gap-2 sm:grid-cols-[1fr_11rem]">
            <input aria-label="Etkinlik adı" value={ad} onChange={(e) => setAd(e.target.value)} maxLength={150}
              placeholder="Ör. Bilim müzesi gezisi" className="rounded-xl px-3 py-2 text-sm outline-none" style={alan} />
            <input aria-label="Tarih" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm outline-none" style={alan} />
          </div>
          <textarea aria-label="Açıklama" value={aciklama} onChange={(e) => setAciklama(e.target.value)} maxLength={600} rows={2}
            placeholder="Kısa açıklama (isteğe bağlı, veliye görünür)" className="rounded-xl px-3 py-2 text-sm outline-none resize-y" style={alan} />
          <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: TEXT_MUTED }}>
            <span className="font-semibold" style={{ color: TEXT }}>Katılanlar ({katilimcilar.size}/{ogrenciler.length})</span>
            <button type="button" onClick={() => setKatilimcilar(new Set(ogrenciler.map((o) => o.id)))} className="underline">Hepsi</button>
            <button type="button" onClick={() => setKatilimcilar(new Set())} className="underline">Hiçbiri</button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ogrenciler.map((o) => {
              const secili = katilimcilar.has(o.id);
              return (
                <button key={o.id} type="button" aria-pressed={secili}
                  onClick={() => setKatilimcilar((s) => { const y = new Set(s); if (y.has(o.id)) y.delete(o.id); else y.add(o.id); return y; })}
                  className="sfec-btn rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: secili ? MINT : BG0, color: secili ? MINT_ON : TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
                  {o.ad}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
            <input type="checkbox" checked={veliyeDuyur} onChange={(e) => setVeliyeDuyur(e.target.checked)} />
            Katılanların velilerine duyuru olarak da bildir
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={ekle} disabled={pending}
              className="sfec-btn rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
              {pending ? "Kaydediliyor..." : "Etkinliği kaydet"}
            </button>
            <button type="button" onClick={() => setAcik(false)} className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold" style={{ color: TEXT_MUTED }}>Vazgeç</button>
          </div>
        </div>
      )}

      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}

      {etkinlikler.length === 0 ? (
        <p className="text-xs" style={{ color: TEXT_MUTED }}>Bu ay girilmiş etkinlik yok.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {etkinlikler.map((e) => (
            <li key={e.id} className="rounded-2xl px-4 py-3 flex items-start justify-between gap-3" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: TEXT }}>{e.ad} <span className="text-xs font-normal" style={{ color: TEXT_MUTED }}>· {e.tarih.split("-").reverse().join(".")}</span></p>
                {e.aciklama && <p className="text-xs" style={{ color: TEXT_MUTED }}>{e.aciklama}</p>}
                <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>
                  {e.katilimcilar.length === ogrenciler.length ? "Sınıfın tamamı katıldı" : `${e.katilimcilar.length} öğrenci: ${e.katilimcilar.map((id) => adlar.get(id) ?? "?").join(", ")}`}
                </p>
              </div>
              {duzenleyebilir && (
                <button type="button" onClick={() => sil(e.id)} disabled={pending} aria-label={`${e.ad} etkinliğini sil`}
                  className="sfec-btn shrink-0 rounded-lg p-1.5" style={{ color: BLUSH }}>
                  <Trash2 size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
