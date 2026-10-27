"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Save, Sprout } from "lucide-react";
import {
  CIKTI_DUZEYLERI, senaryoOzeti, ulkeGeneliMi, yaziliCiktilari, yaziliSenaryolari,
} from "@/lib/ortaokul-cikti";
import type { CiktiDersi, CiktiDuzeyi, CiktiKaydi, SenaryoCiktisi, YaziliNo } from "@/lib/ortaokul-cikti";
import { ortaokulCiktiKaydet } from "@/app/dashboard/ortaokul-cikti-actions";
import { DUZEY_RENK } from "@/components/dashboard/ilkokul-renkler";
import {
  BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, BUTTER_BG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED,
} from "@/lib/theme";

// 5-8. sınıf öğrenme çıktısı değerlendirmesi (kullanıcı isteği 27.10.2026).
// Gelişim Raporu bölümünde, ilkokul raporunun yanında: sınıf seçilince
// ilkokulda aylık ders tablosu, 5-8'de bu ekran açılır. Çıktılar MEB'in
// ortak yazılı senaryolarından gelir; branş öğretmeni kendi dersini,
// müdür/moderatör hepsini işaretler, danışman öğretmen ve rehberlik görür.

export interface CiktiSinifSecenegi {
  id: string;
  ad: string;
}

const anahtar = (studentId: string, yazili: YaziliNo, kod: string) => `${studentId}|${yazili}|${kod}`;
const kisa = (d: CiktiDuzeyi) => CIKTI_DUZEYLERI.find((x) => x.anahtar === d)?.kisa ?? "";

export function OrtaokulCiktiGirisi({
  siniflar, seciliSinifId, dersler, seciliDers, ciktilar, ogrenciler, kayitlar, donemEtiketi, kaynak,
}: {
  siniflar: CiktiSinifSecenegi[];
  seciliSinifId: string;
  dersler: { anahtar: CiktiDersi; ad: string; yazabilir: boolean }[];
  seciliDers: CiktiDersi;
  ciktilar: SenaryoCiktisi[];
  ogrenciler: { id: string; ad: string; okulNo: string }[];
  kayitlar: CiktiKaydi[];
  donemEtiketi: string;
  kaynak: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<{ tur: "ok" | "hata"; metin: string } | null>(null);
  const yazabilir = dersler.find((d) => d.anahtar === seciliDers)?.yazabilir ?? false;
  const [yazili, setYazili] = useState<YaziliNo>(() => (yaziliCiktilari(ciktilar, 1).length > 0 ? 1 : 2));
  const [senaryo, setSenaryo] = useState<number | null>(null);

  const kayitliDurum = useMemo(() => {
    const m = new Map<string, CiktiDuzeyi>();
    for (const k of kayitlar) m.set(anahtar(k.studentId, k.yazili, k.kod), k.duzey);
    return m;
  }, [kayitlar]);
  const [durum, setDurum] = useState<Map<string, CiktiDuzeyi | null>>(() => new Map(kayitliDurum));

  const senaryolar = yaziliSenaryolari(ciktilar, yazili);
  const ulkeGeneli = ulkeGeneliMi(ciktilar, yazili);
  const gorunen = yaziliCiktilari(ciktilar, yazili, senaryolar.includes(senaryo ?? -1) ? senaryo : null);

  // İki yazılıdaki değişiklikler birlikte kaydedilir.
  const degisenler = ([1, 2] as YaziliNo[]).flatMap((y) => yaziliCiktilari(ciktilar, y).flatMap((c) => ogrenciler
    .filter((o) => (durum.get(anahtar(o.id, y, c.kod)) ?? null) !== (kayitliDurum.get(anahtar(o.id, y, c.kod)) ?? null))
    .map((o) => ({ studentId: o.id, yazili: y, kod: c.kod, duzey: durum.get(anahtar(o.id, y, c.kod)) ?? null }))));

  function kaydet() {
    setMesaj(null);
    startTransition(async () => {
      const r = await ortaokulCiktiKaydet({ classId: seciliSinifId, ders: seciliDers, hucreler: degisenler });
      if (r.error) return setMesaj({ tur: "hata", metin: r.error });
      setMesaj({ tur: "ok", metin: "Değerlendirme kaydedildi." });
      router.refresh();
    });
  }

  // Sütundaki boş hücrelere aynı düzeyi verir (çoğu öğrenci aynı düzeydeyse hız için).
  function boslaraUygula(kod: string, duzey: CiktiDuzeyi) {
    setDurum((m) => {
      const yeni = new Map(m);
      for (const o of ogrenciler) if (!yeni.get(anahtar(o.id, yazili, kod))) yeni.set(anahtar(o.id, yazili, kod), duzey);
      return yeni;
    });
  }

  const cip = (aktif: boolean) => ({ background: aktif ? MINT : BG0, color: aktif ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` });
  const yol = (sinif: string, ders?: string) => `/dashboard/ilkokul-gelisim?sinif=${sinif}${ders ? `&ders=${ders}` : ""}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5 flex flex-col gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
            <Sprout size={16} color={MINT} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Gelişim Raporu · Öğrenme Çıktıları</h1>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>
              {donemEtiketi}. Öğrenme çıktıları MEB&apos;in ortak yazılı sınav senaryolarından gelir; her öğrenci her çıktı için MEB&apos;in dört düzeyiyle işaretlenir.
              {yazabilir ? "" : " Bu dersi yalnız görüntüleyebilirsiniz; işaretlemeyi dersin öğretmeni yapar."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {siniflar.map((s) => (
            <Link key={s.id} href={yol(s.id, seciliDers)} className="sfec-btn rounded-full px-4 py-1.5 text-xs font-bold" style={cip(s.id === seciliSinifId)}>{s.ad}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dersler.map((d) => (
            <Link key={d.anahtar} href={yol(seciliSinifId, d.anahtar)} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold" style={cip(d.anahtar === seciliDers)}>{d.ad}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([1, 2] as YaziliNo[]).map((y) => (
            <button key={y} type="button" onClick={() => { setYazili(y); setSenaryo(null); }} disabled={yaziliCiktilari(ciktilar, y).length === 0}
              className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-40" style={cip(y === yazili)}>
              {y}. Yazılı
            </button>
          ))}
          {senaryolar.length > 0 && (
            <label className="inline-flex items-center gap-1.5 text-xs" style={{ color: TEXT_MUTED }}>
              Okulun senaryosu
              <select value={senaryo ?? ""} onChange={(e) => setSenaryo(e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg px-2 py-1 text-xs font-bold outline-none" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
                <option value="">Tüm senaryolar</option>
                {senaryolar.map((s) => <option key={s} value={s}>Senaryo {s}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: TEXT_MUTED }}>
          {CIKTI_DUZEYLERI.map((d) => (
            <span key={d.anahtar} className="inline-flex items-center gap-1">
              <span className="rounded-md px-1.5 py-0.5 font-bold" style={{ background: DUZEY_RENK[d.anahtar].arka, color: DUZEY_RENK[d.anahtar].yazi }}>{d.kisa}</span>
              {d.ad}
            </span>
          ))}
        </div>

        {ulkeGeneli && (
          <p className="rounded-xl px-3 py-2 text-xs" style={{ background: BUTTER_BG, color: TEXT }}>
            Bu yazılı ülke geneli ortak sınav olarak yapılacak; MEB senaryo vermedi. Tablodaki öğrenme çıktılarının hepsi gösteriliyor.
          </p>
        )}
      </div>

      {ogrenciler.length === 0 || gorunen.length === 0 ? (
        <p className="rounded-2xl p-5 text-sm" style={{ background: BG1, color: TEXT_MUTED, border: `2px solid ${BORDER}` }}>
          {ogrenciler.length === 0 ? "Bu sınıfta öğrenci yok." : "Bu yazılı için öğrenme çıktısı yok."}
        </p>
      ) : (
        <div className="rounded-3xl overflow-hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" style={{ minWidth: 220 + gorunen.length * 64 }}>
              <thead>
                <tr style={{ background: BG1_ALT }}>
                  <th className="sticky left-0 z-10 px-3 py-2 text-left font-bold" style={{ background: BG1_ALT, color: TEXT }}>Öğrenci</th>
                  {gorunen.map((c) => (
                    <th key={c.kod} title={c.metin} className="px-1 py-2 text-center font-bold whitespace-nowrap" style={{ color: TEXT }}>{c.kod}</th>
                  ))}
                </tr>
                {yazabilir && (
                  <tr style={{ background: BG1_ALT }}>
                    <th className="sticky left-0 z-10 px-3 pb-2 text-left text-[10px] font-semibold" style={{ background: BG1_ALT, color: TEXT_MUTED }}>Boş olanlara</th>
                    {gorunen.map((c) => (
                      <th key={c.kod} className="px-1 pb-2">
                        <select aria-label={`${c.kod} boş olanlara`} value="" onChange={(e) => { if (e.target.value) boslaraUygula(c.kod, e.target.value as CiktiDuzeyi); }}
                          className="w-full rounded-lg px-1 py-0.5 text-[10px] outline-none" style={{ background: BG0, color: TEXT_MUTED, border: `1px dashed ${BORDER_STRONG}` }}>
                          <option value="">…</option>
                          {CIKTI_DUZEYLERI.map((d) => <option key={d.anahtar} value={d.anahtar}>{d.ad}</option>)}
                        </select>
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {ogrenciler.map((o) => (
                  <tr key={o.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td className="sticky left-0 z-10 px-3 py-1.5 font-semibold whitespace-nowrap" style={{ background: BG1, color: TEXT }}>
                      {o.ad} <span className="font-normal" style={{ color: TEXT_MUTED }}>· {o.okulNo}</span>
                    </td>
                    {gorunen.map((c) => {
                      const deger = durum.get(anahtar(o.id, yazili, c.kod)) ?? null;
                      const renk = deger ? DUZEY_RENK[deger] : null;
                      if (!yazabilir) {
                        return (
                          <td key={c.kod} className="px-1 py-1.5 text-center">
                            {deger ? <span className="rounded-md px-1.5 py-0.5 font-bold" style={{ background: renk!.arka, color: renk!.yazi }}>{kisa(deger)}</span>
                              : <span style={{ color: TEXT_MUTED }}>—</span>}
                          </td>
                        );
                      }
                      return (
                        <td key={c.kod} className="px-1 py-1 text-center">
                          <select aria-label={`${o.ad} — ${c.kod}`} value={deger ?? ""}
                            onChange={(e) => {
                              const v = (e.target.value || null) as CiktiDuzeyi | null;
                              setDurum((m) => new Map(m).set(anahtar(o.id, yazili, c.kod), v));
                            }}
                            className="w-full rounded-lg px-1 py-1 text-xs font-bold outline-none"
                            style={{ background: renk?.arka ?? BG0, color: renk?.yazi ?? TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
                            <option value="">—</option>
                            {CIKTI_DUZEYLERI.map((d) => <option key={d.anahtar} value={d.anahtar}>{d.kisa} · {d.ad}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {yazabilir && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={kaydet} disabled={pending || degisenler.length === 0}
            className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
            style={{ background: MINT, color: MINT_ON }}>
            <Save size={14} /> {pending ? "Kaydediliyor..." : degisenler.length > 0 ? `Değerlendirmeyi kaydet (${degisenler.length})` : "Değişiklik yok"}
          </button>
          {mesaj && <span className="text-xs font-semibold" style={{ color: mesaj.tur === "ok" ? MINT : BLUSH }}>{mesaj.metin}</span>}
        </div>
      )}

      {gorunen.length > 0 && (
        <div className="rounded-3xl p-5 flex flex-col gap-2" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <h2 className="text-sm font-bold" style={{ color: TEXT }}>{yazili}. Yazılının Öğrenme Çıktıları</h2>
          <ul className="flex flex-col gap-1.5">
            {gorunen.map((c) => (
              <li key={c.kod} className="text-xs" style={{ color: TEXT }}>
                <span className="font-bold">{c.kod}</span> {c.metin}
                <span className="block text-[11px]" style={{ color: TEXT_MUTED }}>
                  {[c.unite, c.konu].filter(Boolean).join(" · ")}{c.unite || c.konu ? " — " : ""}{senaryoOzeti(c, yazili)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Kaynak: {kaynak}</p>
        </div>
      )}
    </div>
  );
}
