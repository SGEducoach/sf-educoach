"use client";

// Müdür yardımcısı atamaları (kullanıcı kararı 18.10.2026, migration 0163):
// kurumdaki bir öğretmen müdür yardımcısı yapılır; sorumlu olduğu sınıf
// düzeyleri ve yurtlu okulda yurt sorumluluğu buradan verilir. Admin ve
// kurum müdürü/moderatörü kullanır.
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  mudurYardimcilariGetir, mudurYardimcisiAta, mudurYardimcisiKaldir, mudurYardimcisiKaydet, type MudurYardimcisiListesi,
} from "@/app/moderator/mudur-yardimcisi-actions";
import { BG1, BG1_ALT, BORDER, BLUSH, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

type Uye = MudurYardimcisiListesi["uyeler"][number];

export function MudurYardimcisiAtamalari({ schoolId }: { schoolId?: string }) {
  const [veri, setVeri] = useState<MudurYardimcisiListesi | null>(null);
  const [uyeler, setUyeler] = useState<Uye[]>([]);
  const [secilenAday, setSecilenAday] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [kaydedilen, setKaydedilen] = useState<string | null>(null);
  const [yuklenen, setYuklenen] = useState<{ id?: string } | null>(null);
  const [pending, start] = useTransition();

  const uygula = useCallback((v: MudurYardimcisiListesi) => {
    setVeri(v);
    setUyeler(v.uyeler);
    setHata(v.error);
    setSecilenAday("");
  }, []);

  useEffect(() => {
    let iptal = false;
    void mudurYardimcilariGetir(schoolId)
      .then((v) => { if (!iptal) uygula(v); })
      .catch(() => { if (!iptal) setHata("Müdür yardımcıları yüklenemedi."); })
      .finally(() => { if (!iptal) setYuklenen({ id: schoolId }); });
    return () => { iptal = true; };
  }, [schoolId, uygula]);

  const yukleniyor = yuklenen === null || yuklenen.id !== schoolId;

  function degistir(id: string, f: (u: Uye) => Uye) {
    setKaydedilen(null);
    setUyeler((o) => o.map((u) => (u.id === id ? f(u) : u)));
  }

  function islem(is: () => Promise<{ error: string | null }>, sonra?: () => void) {
    setHata(null);
    start(async () => {
      try {
        const r = await is();
        if (r.error) { setHata(r.error); return; }
        sonra?.();
        uygula(await mudurYardimcilariGetir(schoolId));
      } catch { setHata("İşlem tamamlanamadı. Tekrar deneyin."); }
    });
  }

  return (
    <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 className="text-sm font-bold" style={{ color: TEXT }}>Müdür Yardımcıları</h2>
      <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
        Kurumdaki bir öğretmeni müdür yardımcısı yapın ve sorumlu olduğu sınıf düzeylerini seçin. Öğretmen girişiyle öğretmen paneline,
        İdare girişiyle müdür yardımcısı paneline girer. Yurtlu okulda &quot;Yurt&quot; sorumluluğu verilen müdür yardımcısı yurt öğrencilerini izler ve yoklamaları alır.
      </p>
      {hata && <p role="alert" className="mt-3 text-xs" style={{ color: BLUSH }}>{hata}</p>}
      {yukleniyor ? <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>Yükleniyor…</p> : veri && !veri.error && <>
        {uyeler.length === 0
          ? <p className="mt-4 text-xs" style={{ color: TEXT_MUTED }}>Henüz müdür yardımcısı atanmadı.</p>
          : <div className="mt-4 space-y-3">{uyeler.map((u) => (
              <div key={u.id} className="rounded-2xl p-3" style={{ background: BG1_ALT }}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: TEXT }}>{u.ad}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" disabled={pending} onClick={() => islem(() => mudurYardimcisiKaydet(u.id, u.seviyeler, u.yurt, schoolId), () => setKaydedilen(u.id))}
                      className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>Kaydet</button>
                    <button type="button" disabled={pending} onClick={() => { if (window.confirm(`${u.ad} müdür yardımcılığından alınsın mı?`)) islem(() => mudurYardimcisiKaldir(u.id, schoolId)); }}
                      className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ color: BLUSH, border: `1px solid ${BORDER}` }}>Görevden al</button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {veri.seviyeler.map((s) => (
                    <label key={s} className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs" style={{ color: TEXT, border: `1px solid ${BORDER}` }}>
                      <input type="checkbox" checked={u.seviyeler.includes(s)} disabled={pending}
                        onChange={() => degistir(u.id, (x) => ({ ...x, seviyeler: x.seviyeler.includes(s) ? x.seviyeler.filter((y) => y !== s) : [...x.seviyeler, s] }))} />
                      {s}. sınıf
                    </label>
                  ))}
                  {veri.yurtlu && (
                    <label className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold" style={{ color: TEXT, border: `1px solid ${BORDER}` }}>
                      <input type="checkbox" checked={u.yurt} disabled={pending} onChange={() => degistir(u.id, (x) => ({ ...x, yurt: !x.yurt }))} />
                      Yurt
                    </label>
                  )}
                </div>
                {u.seviyeler.length === 0 && !u.yurt && <p className="mt-2 text-xs" style={{ color: BLUSH }}>Sorumluluk seçilmedi — bu müdür yardımcısı hiçbir öğrenciyi görmüyor.</p>}
                {kaydedilen === u.id && <p role="status" className="mt-2 text-xs" style={{ color: MINT }}>Kaydedildi.</p>}
              </div>
            ))}</div>}
        <div className="mt-4 rounded-2xl p-3" style={{ background: BG1_ALT }}>
          <label htmlFor="mdryrd-aday" className="text-xs font-bold" style={{ color: TEXT }}>Öğretmeni müdür yardımcısı yap</label>
          {veri.adaylar.length === 0
            ? <p className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>Eklenebilecek başka öğretmen yok.</p>
            : <div className="mt-2 flex flex-wrap items-center gap-2">
                <select id="mdryrd-aday" value={secilenAday} disabled={pending} onChange={(e) => setSecilenAday(e.target.value)}
                  className="rounded-full px-3 py-1.5 text-xs" style={{ background: BG1, color: TEXT, border: `1px solid ${BORDER}` }}>
                  <option value="">Öğretmen seçin…</option>
                  {veri.adaylar.map((a) => <option key={a.id} value={a.id}>{a.ad} · {a.brans}</option>)}
                </select>
                <button type="button" disabled={pending || !secilenAday} onClick={() => islem(() => mudurYardimcisiAta(secilenAday, schoolId))}
                  className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>Ata</button>
              </div>}
        </div>
      </>}
    </section>
  );
}
