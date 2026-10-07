"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  rehberSinifAtamalariGetir, rehberSinifAtamasiKaydet,
  rehberlikServisiAdaylariGetir, rehberlikServisineEkle, rehberlikServisindenCikar,
} from "@/app/moderator/rehber-sinif-actions";
import { BG1, BG1_ALT, BORDER, BLUSH, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Rehberlik Servisi (migration 0144): rehberlik okulda artık bir BRANŞ değil,
// ayrı bir birim. Bu yüzden branş listesinden "Rehber Öğretmen" kalktı ve
// rehber yapmanın TEK yolu burası — servise üye eklemek. Üyeler okuldaki
// sayılarına göre kademeleri (5-12) aralarında paylaşır.

type Rehber = { id: string; ad: string; seviyeler: string[] };
type Aday = { id: string; ad: string; brans: string };

export function RehberSinifAtamalari({ schoolId }: { schoolId?: string }) {
  const [rehberler, setRehberler] = useState<Rehber[]>([]);
  const [adaylar, setAdaylar] = useState<Aday[]>([]);
  const [seviyeler, setSeviyeler] = useState<string[]>([]);
  const [secilenAday, setSecilenAday] = useState<string>("");
  const [hata, setHata] = useState<string | null>(null);
  // Yüklenme durumu TÜRETİLİYOR — effect içinde setState lint kuralına
  // (react-hooks/set-state-in-effect) takılmasın ve kurum değişince
  // kendiliğinden yeniden yüklensin.
  const [yuklenen, setYuklenen] = useState<{ id?: string } | null>(null);
  const [kaydedilen, setKaydedilen] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Veri ÇEKME ile durum YAZMA ayrı: setState'i effect gövdesinde değil
  // .then() içinde çağırmak react-hooks/set-state-in-effect kuralının şartı.
  const veriGetir = useCallback(async () => {
    const [atamalar, adaySonucu] = await Promise.all([
      rehberSinifAtamalariGetir(schoolId),
      rehberlikServisiAdaylariGetir(schoolId),
    ]);
    return { atamalar, adaySonucu };
  }, [schoolId]);

  const uygula = useCallback((v: Awaited<ReturnType<typeof veriGetir>>) => {
    setHata(v.atamalar.error ?? v.adaySonucu.error);
    setSeviyeler(v.atamalar.seviyeler);
    setRehberler(v.atamalar.rehberler);
    setAdaylar(v.adaySonucu.adaylar);
    setSecilenAday("");
  }, []);

  const yukleniyor = yuklenen === null || yuklenen.id !== schoolId;

  useEffect(() => {
    let iptal = false;
    void veriGetir()
      .then((v) => { if (!iptal) uygula(v); })
      .catch(() => { if (!iptal) setHata("Rehberlik Servisi yüklenemedi. Sayfayı yenileyip tekrar deneyin."); })
      .finally(() => { if (!iptal) setYuklenen({ id: schoolId }); });
    return () => { iptal = true; };
  }, [veriGetir, uygula, schoolId]);

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

  function servisDegistir(islem: "ekle" | "cikar", teacherId: string) {
    setHata(null);
    setKaydedilen(null);
    startTransition(async () => {
      try {
        const sonuc = islem === "ekle"
          ? await rehberlikServisineEkle(teacherId, schoolId)
          : await rehberlikServisindenCikar(teacherId, schoolId);
        if (sonuc.error) setHata(sonuc.error);
        else uygula(await veriGetir());
      } catch {
        setHata(islem === "ekle" ? "Öğretmen servise eklenemedi. Tekrar deneyin." : "Öğretmen servisten çıkarılamadı. Tekrar deneyin.");
      }
    });
  }

  return <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
    <h2 className="text-sm font-bold" style={{ color: TEXT }}>Rehberlik Servisi</h2>
    <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
      Rehberlik bir branş değil, okulun ayrı bir birimidir. Buraya eklediğiniz öğretmen rehber yetkisi kazanır.
      Birden fazla rehber varsa kademeleri aralarında paylaştırın — örneğin birine 5-8, diğerine 9-12; ya da birine 9 ve 11, diğerine 10 ve 12.
      Düzey seçilmezse rehber hiçbir öğrenciyi göremez.
    </p>
    {hata && <p role="alert" className="mt-3 text-xs" style={{ color: BLUSH }}>{hata}</p>}

    {yukleniyor ? <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>Yükleniyor…</p> : <>
      {rehberler.length === 0
        ? <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>Bu kurumun Rehberlik Servisi&apos;nde henüz kimse yok. Aşağıdan bir öğretmen ekleyin.</p>
        : <div className="mt-4 space-y-3">{rehberler.map((r) => <div key={r.id} className="rounded-2xl p-3" style={{ background: BG1_ALT }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold" style={{ color: TEXT }}>{r.ad}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => kaydet(r)} disabled={pending} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>Kaydet</button>
                <button type="button" onClick={() => servisDegistir("cikar", r.id)} disabled={pending} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ color: BLUSH, border: `1px solid ${BORDER}` }}>Servisten çıkar</button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">{seviyeler.map((seviye) => <label key={seviye} className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs" style={{ color: TEXT, border: `1px solid ${BORDER}` }}>
              <input type="checkbox" checked={r.seviyeler.includes(seviye)} disabled={pending} onChange={() => degistir(r.id, seviye)} />
              {seviye}. sınıf
            </label>)}</div>
            {r.seviyeler.length === 0 && <p className="mt-2 text-xs" style={{ color: BLUSH }}>Düzey atanmadı — bu rehber hiçbir öğrenciyi görmüyor.</p>}
            {kaydedilen === r.id && <p role="status" className="mt-2 text-xs" style={{ color: MINT }}>Atama kaydedildi.</p>}
          </div>)}</div>}

      <div className="mt-4 rounded-2xl p-3" style={{ background: BG1_ALT }}>
        <label htmlFor="rehber-aday" className="text-xs font-bold" style={{ color: TEXT }}>Servise öğretmen ekle</label>
        {adaylar.length === 0
          ? <p className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>Eklenebilecek başka öğretmen yok.</p>
          : <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                id="rehber-aday" value={secilenAday} disabled={pending}
                onChange={(e) => setSecilenAday(e.target.value)}
                className="rounded-full px-3 py-1.5 text-xs"
                style={{ background: BG1, color: TEXT, border: `1px solid ${BORDER}` }}
              >
                <option value="">Öğretmen seçin…</option>
                {adaylar.map((a) => <option key={a.id} value={a.id}>{a.ad} · {a.brans}</option>)}
              </select>
              <button
                type="button" disabled={pending || !secilenAday}
                onClick={() => servisDegistir("ekle", secilenAday)}
                className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                style={{ background: MINT, color: MINT_ON }}
              >Ekle</button>
            </div>}
      </div>
    </>}
  </section>;
}
