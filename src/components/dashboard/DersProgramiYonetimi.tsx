"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, X } from "lucide-react";
import { DersProgramiGrid } from "@/components/dashboard/DersProgramiGrid";
import { dersProgramiEkle, dersProgramiSil } from "@/app/dashboard/ders-programi-actions";
import { DERS_SAATI_DILIMLERI, GUN_ETIKET, programGunleri } from "@/lib/ders-programi";
import type { DersProgramiGunu, DersProgramiSatiri } from "@/lib/ders-programi";
import { BRANS_LISTESI } from "@/lib/types";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// Admin ve dershane müdürünün elle ders programı düzenlemesi (kullanıcı
// kararı, 2026-08-25) — DersProgramiGrid'i düzenlenebilir modda sarar,
// boş hücreye tıklayınca ekleme formu açılır, dolu hücrenin X'i siler.
export function DersProgramiYonetimi({ teacherId, dershaneMi, siniflar, satirlar }: {
  teacherId: string;
  dershaneMi: boolean;
  siniflar: { id: string; seviye: string; sube: string }[];
  satirlar: DersProgramiSatiri[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [acikHucre, setAcikHucre] = useState<{ gun: DersProgramiGunu; sira: number } | null>(null);
  const [classId, setClassId] = useState(siniflar[0]?.id ?? "");
  const [ders, setDers] = useState<string>(BRANS_LISTESI[0]);

  function hucreTikla(gun: DersProgramiGunu, sira: number, mevcut: DersProgramiSatiri | null) {
    setHata(null);
    if (mevcut) {
      if (!window.confirm(`${GUN_ETIKET[gun]} (${sira}). ders saatindeki ${mevcut.sinifAdi} / ${mevcut.ders} kaydı kaldırılsın mı?`)) return;
      startTransition(async () => {
        const r = await dersProgramiSil(mevcut.id);
        if (r.error) setHata(r.error); else router.refresh();
      });
      return;
    }
    setAcikHucre({ gun, sira });
  }

  function kaydet() {
    if (!acikHucre) return;
    if (!classId) return setHata("Sınıf seçin.");
    setHata(null);
    startTransition(async () => {
      const r = await dersProgramiEkle({ teacherId, gun: acikHucre.gun, dersSaatiSira: acikHucre.sira, classId, ders });
      if (r.error) setHata(r.error);
      else { setAcikHucre(null); router.refresh(); }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <DersProgramiGrid gunler={programGunleri(dershaneMi)} satirlar={satirlar} duzenlenebilir onHucreTikla={hucreTikla} />

      {acikHucre && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.55)" }} onClick={() => setAcikHucre(null)}>
          <div className="w-full max-w-sm rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock size={15} color={MINT} />
                <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-sm font-bold">
                  {GUN_ETIKET[acikHucre.gun]} · {DERS_SAATI_DILIMLERI[acikHucre.sira - 1].baslangic}–{DERS_SAATI_DILIMLERI[acikHucre.sira - 1].bitis}
                </span>
              </div>
              <button type="button" onClick={() => setAcikHucre(null)} className="sfec-btn flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                <X size={13} color={TEXT_MUTED} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Sınıf</span>
                <select value={classId} onChange={(e) => setClassId(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
                  {siniflar.length === 0 && <option value="">Önce bir şube oluşturun</option>}
                  {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ders</span>
                <select value={ders} onChange={(e) => setDers(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
                  {BRANS_LISTESI.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
              <button type="button" onClick={kaydet} disabled={pending || !classId}
                className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
                {pending ? "Ekleniyor..." : "Ekle"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
