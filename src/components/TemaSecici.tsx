"use client";

// Gece/gündüz modu (kullanıcı isteği 27.09.2026) — ilk tema <head>'deki
// TEMA_BETIGI ile boyamadan önce seçilir (parlama yok). Bu dosya:
//  - TemaDenetimi: otomatik moddayken 07:00 / 19:00 geçişini sayfa açıkken
//    uygular, başka sekmede değişen tercihi de yansıtır.
//  - TemaButonu: Otomatik → Gündüz → Gece döngüsü; tercih localStorage'da.
import { useEffect, useState } from "react";
import { Clock3, Moon, Sun } from "lucide-react";
import { BG1_ALT, BORDER, TEXT_MUTED } from "@/lib/theme";
import { modBelirle, simdikiSaatTR, TEMA_TERCIH_ANAHTARI, tercihOku, type TemaTercihi } from "@/lib/gunduz-gece";

const TEMA_OLAYI = "sfec-tema-degisti";

function kayitliTercih(): TemaTercihi {
  try { return tercihOku(localStorage.getItem(TEMA_TERCIH_ANAHTARI)); } catch { return "otomatik"; }
}

function temayiUygula() {
  document.documentElement.setAttribute("data-tema", modBelirle(kayitliTercih(), simdikiSaatTR()));
}

export function TemaDenetimi() {
  useEffect(() => {
    temayiUygula();
    const zamanlayici = window.setInterval(temayiUygula, 60_000);
    const depolama = (e: StorageEvent) => { if (e.key === TEMA_TERCIH_ANAHTARI) temayiUygula(); };
    window.addEventListener("storage", depolama);
    window.addEventListener(TEMA_OLAYI, temayiUygula);
    return () => {
      window.clearInterval(zamanlayici);
      window.removeEventListener("storage", depolama);
      window.removeEventListener(TEMA_OLAYI, temayiUygula);
    };
  }, []);
  return null;
}

const SONRAKI: Record<TemaTercihi, TemaTercihi> = { otomatik: "gunduz", gunduz: "gece", gece: "otomatik" };
const ETIKET: Record<TemaTercihi, string> = {
  otomatik: "Tema: Otomatik (07:00–19:00 gündüz)", gunduz: "Tema: Gündüz", gece: "Tema: Gece",
};

export function TemaButonu({ satir = false }: { satir?: boolean }) {
  const [tercih, setTercih] = useState<TemaTercihi>("otomatik");
  useEffect(() => {
    const kare = window.requestAnimationFrame(() => setTercih(kayitliTercih()));
    const guncelle = () => setTercih(kayitliTercih());
    window.addEventListener(TEMA_OLAYI, guncelle);
    return () => { window.cancelAnimationFrame(kare); window.removeEventListener(TEMA_OLAYI, guncelle); };
  }, []);
  const Ikon = tercih === "otomatik" ? Clock3 : tercih === "gunduz" ? Sun : Moon;

  function degistir() {
    const yeni = SONRAKI[tercih];
    try { localStorage.setItem(TEMA_TERCIH_ANAHTARI, yeni); } catch { /* gizli sekme vb. — yalnızca bu sayfada geçerli */ }
    setTercih(yeni);
    temayiUygula();
    window.dispatchEvent(new Event(TEMA_OLAYI));
  }

  if (satir) {
    return (
      <button type="button" onClick={degistir} aria-label={`${ETIKET[tercih]} — değiştir`}
        className="sfec-btn w-full flex items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-semibold">
        <span>Tema</span>
        <span className="flex items-center gap-1.5 text-[12px]" style={{ color: TEXT_MUTED }}>
          <Ikon size={15} aria-hidden="true" /> {tercih === "otomatik" ? "Otomatik" : tercih === "gunduz" ? "Gündüz" : "Gece"}
        </span>
      </button>
    );
  }
  return (
    <button type="button" onClick={degistir} title={`${ETIKET[tercih]} — değiştirmek için tıklayın`} aria-label={ETIKET[tercih]}
      className="sfec-btn flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-8 sm:w-8"
      style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
      <Ikon size={15} color={TEXT_MUTED} aria-hidden="true" />
    </button>
  );
}
