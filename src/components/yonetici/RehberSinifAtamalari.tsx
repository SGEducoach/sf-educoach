"use client";

import { useEffect, useState, useTransition } from "react";
import { rehberSinifAtamalariGetir, rehberSinifAtamasiKaydet } from "@/app/moderator/rehber-sinif-actions";
import { BG1, BG1_ALT, BORDER, BLUSH, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

type Rehber = { id: string; ad: string; seviyeler: string[] };

export function RehberSinifAtamalari({ schoolId }: { schoolId?: string }) {
  const [rehberler, setRehberler] = useState<Rehber[]>([]);
  const [seviyeler, setSeviyeler] = useState<string[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [kaydedilen, setKaydedilen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let iptal = false;
    void rehberSinifAtamalariGetir(schoolId).then((sonuc) => {
      if (iptal) return;
      setHata(sonuc.error);
      setSeviyeler(sonuc.seviyeler);
      setRehberler(sonuc.rehberler);
      setYukleniyor(false);
    }).catch(() => {
      if (iptal) return;
      setHata("Atamalar yüklenemedi. Sayfayı yenileyip tekrar deneyin.");
      setYukleniyor(false);
    });
    return () => { iptal = true; };
  }, [schoolId]);

  function degistir(teacherId: string, seviye: string) {
    setKaydedilen(null);
    setRehberler((onceki) => onceki.map((r) => r.id === teacherId
      ? { ...r, seviyeler: r.seviyeler.includes(seviye) ? r.seviyeler.filter((s) => s !== seviye) : [...r.seviyeler, seviye] }
      : r));
  }

  function kaydet(rehber: Rehber) {
    setHata(null);
    startTransition(async () => {
      try {
        const sonuc = await rehberSinifAtamasiKaydet(rehber.id, rehber.seviyeler, schoolId);
        if (sonuc.error) setHata(sonuc.error);
        else setKaydedilen(rehber.id);
      } catch {
        setHata("Atama kaydedilemedi. Tekrar deneyin.");
      }
    });
  }

  return <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
    <h2 className="text-sm font-bold" style={{ color: TEXT }}>Rehber öğretmenlerin sınıf grupları</h2>
    <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>Her rehber için sorumlu olduğu düzeyleri seçin. Örneğin birine 9 ve 11, diğerine 10 ve 12. Seçim yapılmazsa rehber öğrencileri göremez veya onlar adına işlem yapamaz.</p>
    {hata && <p role="alert" className="mt-3 text-xs" style={{ color: BLUSH }}>{hata}</p>}
    {yukleniyor ? <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>Yükleniyor…</p>
      : rehberler.length === 0 ? <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>Bu kurumda Rehber Öğretmen branşında kayıtlı öğretmen yok.</p>
      : <div className="mt-4 space-y-3">{rehberler.map((r) => <div key={r.id} className="rounded-2xl p-3" style={{ background: BG1_ALT }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold" style={{ color: TEXT }}>{r.ad}</span>
            <button type="button" onClick={() => kaydet(r)} disabled={pending} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>Kaydet</button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">{seviyeler.map((seviye) => <label key={seviye} className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs" style={{ color: TEXT, border: `1px solid ${BORDER}` }}>
            <input type="checkbox" checked={r.seviyeler.includes(seviye)} disabled={pending} onChange={() => degistir(r.id, seviye)} />
            {seviye}. sınıf
          </label>)}</div>
          {kaydedilen === r.id && <p role="status" className="mt-2 text-xs" style={{ color: MINT }}>Atama kaydedildi.</p>}
        </div>)}</div>}
  </section>;
}
