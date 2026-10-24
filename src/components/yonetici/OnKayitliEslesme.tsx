"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { onKayitliHesaplilaraAktar, onKayitliOnerileriOnayla, type OnKayitliOzeti } from "@/app/yonetici/on-kayitli-eslesme-actions";
import { ON_KAYIT_ETIKETI } from "@/lib/on-kayitli";
import { BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Ön kayıtlı (hesapsız) öğrenciler: yüklü denemeler okul listesindeki öğrenciye
// bağlanır, üye olunca hesabına aktarılır (migration 0179/0180). Burada
// yalnızca yönetici onayı gereken satırlar listelenir.
export function OnKayitliEslesme({ ozet }: { ozet: OnKayitliOzeti }) {
  const router = useRouter();
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (id: string) => setSecili((s) => {
    const yeni = new Set(s);
    if (yeni.has(id)) yeni.delete(id); else yeni.add(id);
    return yeni;
  });

  function onayla() {
    setHata(null); setMesaj(null);
    const secilenler = ozet.oneriler.filter((o) => secili.has(o.bekleyenId)).map((o) => ({ bekleyenId: o.bekleyenId, listeId: o.listeId }));
    startTransition(async () => {
      const r = await onKayitliOnerileriOnayla(secilenler);
      if (r.error) { setHata(r.error); return; }
      setMesaj(`${r.baglanan} satır listedeki öğrenciye bağlandı${r.aktarilan > 0 ? `, ${r.aktarilan} sonuç hesabı olan öğrencilere aktarıldı` : ""}.`);
      setSecili(new Set());
      router.refresh();
    });
  }

  function simdiAktar() {
    setHata(null); setMesaj(null);
    startTransition(async () => {
      const r = await onKayitliHesaplilaraAktar(ozet.schoolId);
      if (r.error) { setHata(r.error); return; }
      setMesaj(`${r.ogrenciSayisi} öğrenci için ${r.aktarilan} sonuç aktarıldı${r.atlanan > 0 ? `, ${r.atlanan} satır atlandı` : ""}.`);
      router.refresh();
    });
  }

  return (
    <div className="mb-4 rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: MINT_BG, color: MINT }}>{ON_KAYIT_ETIKETI}</span>
        <span className="text-sm font-bold" style={{ color: TEXT }}>{ozet.okulAdi}</span>
      </div>
      <ul className="mt-2 flex flex-col gap-1 text-xs" style={{ color: TEXT_MUTED }}>
        <li>
          <strong style={{ color: TEXT }}>{ozet.hesapsizBagliKisi}</strong> hesapsız öğrenciye bağlı <strong style={{ color: TEXT }}>{ozet.hesapsizBagliSatir}</strong> deneme sonucu var;
          öğrenci üye olunca ilk panel açılışında hesabına aktarılır.
        </li>
        {ozet.hesapliBekleyenSatir > 0 && (
          <li>
            Hesabı olan <strong style={{ color: TEXT }}>{ozet.hesapliBekleyenKisi}</strong> öğrenciye bağlı <strong style={{ color: TEXT }}>{ozet.hesapliBekleyenSatir}</strong> sonuç henüz aktarılmamış (öğrenci panele girince kendiliğinden aktarılır).{" "}
            <button type="button" disabled={pending} onClick={simdiAktar} className="sfec-btn rounded-full px-3 py-1 text-[11px] font-bold disabled:opacity-50" style={{ border: `2px solid ${BORDER_STRONG}`, color: TEXT }}>
              Şimdi aktar
            </button>
          </li>
        )}
      </ul>

      {ozet.oneriler.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-bold" style={{ color: TEXT }}>Onayınızı bekleyen eşleşmeler ({ozet.oneriler.length})</p>
          <p className="mt-0.5 text-[11px]" style={{ color: TEXT_MUTED }}>
            Numara tek başına yetmez: numara eşleşip ad ya da sınıf uyuşmayan satırlar ile numarası olmayıp adı listedekiyle tam aynı olan satırlar burada. Doğru olanları işaretleyin.
          </p>
          <div className="mt-2 max-h-72 overflow-y-auto">
            {ozet.oneriler.map((o) => (
              <label key={o.bekleyenId} className="flex cursor-pointer items-start gap-2 px-2 py-2 text-xs" style={{ borderBottom: `1px solid ${BORDER}` }}>
                <input type="checkbox" checked={secili.has(o.bekleyenId)} onChange={() => toggle(o.bekleyenId)} className="mt-0.5 h-4 w-4" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold" style={{ color: TEXT }}>
                    PDF: {o.adSoyadHam}{o.ogrenciNo !== null ? ` (${o.ogrenciNo})` : ""} → Liste: {o.listeAd}{o.listeNo ? ` (${o.listeNo})` : ""}{o.listeSeviyesi ? ` · ${o.listeSeviyesi}. sınıf` : ""}
                  </span>
                  <span className="block" style={{ color: TEXT_MUTED }}>
                    {o.deneme} · {o.tur === "numara" ? "numara eşleşiyor, ad/sınıf uyuşmuyor" : "numara yok, ad tam aynı"} · {o.hesabiVar ? "öğrencinin hesabı var" : ON_KAYIT_ETIKETI.toLowerCase()}
                  </span>
                </span>
              </label>
            ))}
          </div>
          <button type="button" disabled={pending || secili.size === 0} onClick={onayla}
            className="sfec-btn mt-3 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: "#fff" }}>
            Seçilenleri listedeki öğrenciye bağla ({secili.size})
          </button>
        </div>
      )}
      {mesaj && <p className="mt-2 text-xs font-semibold" style={{ color: MINT }}>{mesaj}</p>}
      {hata && <p className="mt-2 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
    </div>
  );
}
