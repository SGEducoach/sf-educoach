"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, NotebookPen, Save, Sprout } from "lucide-react";
import {
  GELISIM_DUZEYLERI, GELISIM_KALEMLERI, ayEtiketi, kalemiYazabilirMi, notuYazabilirMi,
} from "@/lib/ilkokul-gelisim";
import type { GelisimDuzeyi, GelisimKalemi, GelisimNotTuru, GelisimYetkisi } from "@/lib/ilkokul-gelisim";
import type { IlkokulSinifKaydi } from "@/lib/ilkokul-gelisim-sorgu";
import { ilkokulGelisimKaydet, veliDavetKodlariOlustur } from "@/app/dashboard/ilkokul-actions";
import type { VeliDavetKodu } from "@/app/dashboard/ilkokul-actions";
import {
  BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, MINT_ON, PEACH, PEACH_BG, TEXT, TEXT_MUTED,
} from "@/lib/theme";

// İlkokul gelişim raporu giriş ekranı (16.10.2026). Sınıf öğretmeni dokuz
// kalemi ve öğretmen notunu, rehberlik servisi "Rehberlik" kalemini ve
// rehberlik notunu, müdür/moderatör hepsini düzenler. Ayda bir doldurulur;
// boş aya geçen ayın işaretleri ön dolgu olarak gelir, kaydedilene kadar
// yazılmaz.

const DUZEY_RENK: Record<GelisimDuzeyi, { arka: string; yazi: string }> = {
  // "Geliştirilmeli" akademik bir eksik, kırmızı değil sıcak nötr (ortaokulla aynı ilke).
  gelistirilmeli: { arka: PEACH_BG, yazi: PEACH },
  gelisiyor: { arka: BUTTER_BG, yazi: BUTTER },
  basarili: { arka: MINT_BG, yazi: MINT },
};

export interface IlkokulSinifSecenegi {
  id: string;
  ad: string;
}

const anahtar = (studentId: string, kalem: string) => `${studentId}|${kalem}`;

export function IlkokulGelisimGirisi({
  siniflar, seciliSinifId, ay, yetkiler, ogrenciler, kayitlar, oncekiAyKayitlari, notlar,
}: {
  siniflar: IlkokulSinifSecenegi[];
  seciliSinifId: string;
  ay: string;
  yetkiler: GelisimYetkisi[];
  ogrenciler: { id: string; ad: string; okulNo: string }[];
  kayitlar: IlkokulSinifKaydi[];
  oncekiAyKayitlari: IlkokulSinifKaydi[];
  notlar: { studentId: string; tur: GelisimNotTuru; metin: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<{ tur: "ok" | "hata"; metin: string } | null>(null);

  const kayitliDurum = useMemo(() => {
    const m = new Map<string, GelisimDuzeyi>();
    for (const k of kayitlar) m.set(anahtar(k.studentId, k.kalem), k.duzey);
    return m;
  }, [kayitlar]);

  // Bu ay hiç işaret yoksa geçen ayın işaretleri (yalnız kişinin yazabildiği
  // kalemler) ön dolgu olarak gelir.
  const onDolgu = kayitlar.length === 0 && oncekiAyKayitlari.length > 0;
  const [durum, setDurum] = useState<Map<string, GelisimDuzeyi | null>>(() => {
    const m = new Map<string, GelisimDuzeyi | null>(kayitliDurum);
    if (onDolgu) {
      for (const k of oncekiAyKayitlari) {
        if (kalemiYazabilirMi(yetkiler, k.kalem)) m.set(anahtar(k.studentId, k.kalem), k.duzey);
      }
    }
    return m;
  });

  const kayitliNot = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of notlar) m.set(anahtar(n.studentId, n.tur), n.metin);
    return m;
  }, [notlar]);
  const [notDurumu, setNotDurumu] = useState<Map<string, string>>(() => new Map(kayitliNot));

  const yazilabilirNotTurleri = (["ogretmen", "rehberlik"] as GelisimNotTuru[]).filter((t) => notuYazabilirMi(yetkiler, t));
  const degisenHucreler = ogrenciler.flatMap((o) => GELISIM_KALEMLERI
    .filter((k) => kalemiYazabilirMi(yetkiler, k.anahtar))
    .filter((k) => (durum.get(anahtar(o.id, k.anahtar)) ?? null) !== (kayitliDurum.get(anahtar(o.id, k.anahtar)) ?? null))
    .map((k) => ({ studentId: o.id, kalem: k.anahtar as GelisimKalemi, duzey: durum.get(anahtar(o.id, k.anahtar)) ?? null })));
  const degisenNotlar = ogrenciler.flatMap((o) => yazilabilirNotTurleri
    .filter((t) => (notDurumu.get(anahtar(o.id, t)) ?? "").trim() !== (kayitliNot.get(anahtar(o.id, t)) ?? "").trim())
    .map((t) => ({ studentId: o.id, tur: t, metin: notDurumu.get(anahtar(o.id, t)) ?? "" })));
  const degisiklikVar = degisenHucreler.length > 0 || degisenNotlar.length > 0;

  function kaydet() {
    setMesaj(null);
    startTransition(async () => {
      const r = await ilkokulGelisimKaydet({ classId: seciliSinifId, ay, hucreler: degisenHucreler, notlar: degisenNotlar });
      if (r.error) return setMesaj({ tur: "hata", metin: r.error });
      setMesaj({ tur: "ok", metin: `${ayEtiketi(ay)} raporu kaydedildi.` });
      router.refresh();
    });
  }

  const ayYolu = (yeniAy: string) => `/dashboard/ilkokul-gelisim?sinif=${seciliSinifId}&ay=${yeniAy.slice(0, 7)}`;
  const ayOnce = (() => { const [y, a] = ay.split("-").map(Number); return a === 1 ? `${y - 1}-12-01` : `${y}-${String(a - 1).padStart(2, "0")}-01`; })();
  const aySonra = (() => { const [y, a] = ay.split("-").map(Number); return a === 12 ? `${y + 1}-01-01` : `${y}-${String(a + 1).padStart(2, "0")}-01`; })();

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5 flex flex-col gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
            <Sprout size={16} color={MINT} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Gelişim Raporu</h1>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>
              İlkokul öğrencileri sisteme girmez; bu rapor veliye ve kuruma gider. Ayda bir doldurulur.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {siniflar.map((s) => (
            <Link key={s.id} href={`/dashboard/ilkokul-gelisim?sinif=${s.id}&ay=${ay.slice(0, 7)}`}
              className="sfec-btn rounded-full px-4 py-1.5 text-xs font-bold"
              style={{ background: s.id === seciliSinifId ? MINT : BG0, color: s.id === seciliSinifId ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}>
              {s.ad}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px" style={{ background: BORDER_STRONG }} aria-hidden="true" />
          <Link href={ayYolu(ayOnce)} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: BG0, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>‹ Önceki ay</Link>
          <span className="text-sm font-bold" style={{ color: TEXT }}>{ayEtiketi(ay)}</span>
          <Link href={ayYolu(aySonra)} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: BG0, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>Sonraki ay ›</Link>
        </div>

        <div className="flex flex-wrap gap-3 text-[11px]" style={{ color: TEXT_MUTED }}>
          {GELISIM_DUZEYLERI.map((d) => (
            <span key={d.anahtar} className="inline-flex items-center gap-1">
              <span className="rounded-md px-1.5 py-0.5 font-bold" style={{ background: DUZEY_RENK[d.anahtar].arka, color: DUZEY_RENK[d.anahtar].yazi }}>{d.kisa}</span>
              {d.ad}
            </span>
          ))}
          <span>· Rehberlik kalemini rehberlik servisi, diğerlerini sınıf öğretmeni işaretler.</span>
        </div>

        {onDolgu && (
          <p className="rounded-xl px-3 py-2 text-xs" style={{ background: BUTTER_BG, color: TEXT }}>
            Bu ay henüz işaretlenmemiş. {ayEtiketi(ayOnce)} işaretleri başlangıç olarak getirildi; yalnız değişenleri düzeltip kaydedin.
          </p>
        )}
      </div>

      {ogrenciler.length === 0 ? (
        <p className="rounded-2xl p-5 text-sm" style={{ background: BG1, color: TEXT_MUTED, border: `2px solid ${BORDER}` }}>Bu sınıfta öğrenci yok.</p>
      ) : (
        <div className="rounded-3xl overflow-hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" style={{ minWidth: 900 }}>
              <thead>
                <tr style={{ background: BG1_ALT }}>
                  <th className="sticky left-0 z-10 px-3 py-2 text-left font-bold" style={{ background: BG1_ALT, color: TEXT }}>Öğrenci</th>
                  {GELISIM_KALEMLERI.map((k) => (
                    <th key={k.anahtar} className="px-1.5 py-2 text-center font-bold" style={{ color: kalemiYazabilirMi(yetkiler, k.anahtar) ? TEXT : TEXT_MUTED }}>{k.ad}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ogrenciler.map((o) => (
                  <tr key={o.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td className="sticky left-0 z-10 px-3 py-1.5 font-semibold whitespace-nowrap" style={{ background: BG1, color: TEXT }}>
                      {o.ad} <span className="font-normal" style={{ color: TEXT_MUTED }}>· {o.okulNo}</span>
                    </td>
                    {GELISIM_KALEMLERI.map((k) => {
                      const deger = durum.get(anahtar(o.id, k.anahtar)) ?? null;
                      const renk = deger ? DUZEY_RENK[deger] : null;
                      if (!kalemiYazabilirMi(yetkiler, k.anahtar)) {
                        return (
                          <td key={k.anahtar} className="px-1.5 py-1.5 text-center">
                            {deger ? <span className="rounded-md px-1.5 py-0.5 font-bold" style={{ background: renk!.arka, color: renk!.yazi }}>{GELISIM_DUZEYLERI.find((d) => d.anahtar === deger)?.kisa}</span>
                              : <span style={{ color: TEXT_MUTED }}>—</span>}
                          </td>
                        );
                      }
                      return (
                        <td key={k.anahtar} className="px-1 py-1 text-center">
                          <select
                            aria-label={`${o.ad} — ${k.ad}`}
                            value={deger ?? ""}
                            onChange={(e) => {
                              const v = (e.target.value || null) as GelisimDuzeyi | null;
                              setDurum((m) => new Map(m).set(anahtar(o.id, k.anahtar), v));
                            }}
                            className="w-full rounded-lg px-1 py-1 text-xs font-bold outline-none"
                            style={{ background: renk?.arka ?? BG0, color: renk?.yazi ?? TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
                            <option value="">—</option>
                            {GELISIM_DUZEYLERI.map((d) => <option key={d.anahtar} value={d.anahtar}>{d.ad}</option>)}
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

      {ogrenciler.length > 0 && yazilabilirNotTurleri.length > 0 && (
        <details className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <summary className="cursor-pointer text-sm font-bold flex items-center gap-2" style={{ color: TEXT }}>
            <NotebookPen size={14} color={MINT} /> {yazilabilirNotTurleri.includes("ogretmen") ? "Öğretmen notları" : "Rehberlik notları"} (isteğe bağlı, veliye görünür)
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            {ogrenciler.map((o) => (
              <div key={o.id} className="grid gap-2 sm:grid-cols-[12rem_1fr] items-start">
                <span className="text-xs font-semibold pt-2" style={{ color: TEXT }}>{o.ad}</span>
                <div className="flex flex-col gap-1.5">
                  {yazilabilirNotTurleri.map((t) => (
                    <textarea key={t} rows={1} maxLength={600}
                      aria-label={`${o.ad} ${t === "ogretmen" ? "öğretmen" : "rehberlik"} notu`}
                      placeholder={t === "ogretmen" ? "Öğretmen notu" : "Rehberlik notu"}
                      value={notDurumu.get(anahtar(o.id, t)) ?? ""}
                      onChange={(e) => { const v = e.target.value; setNotDurumu((m) => new Map(m).set(anahtar(o.id, t), v)); }}
                      className="w-full rounded-xl px-3 py-2 text-xs outline-none resize-y"
                      style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={kaydet} disabled={pending || !degisiklikVar}
          className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
          style={{ background: MINT, color: MINT_ON }}>
          <Save size={14} /> {pending ? "Kaydediliyor..." : degisiklikVar ? `${ayEtiketi(ay)} raporunu kaydet` : "Değişiklik yok"}
        </button>
        {mesaj && <span className="text-xs font-semibold" style={{ color: mesaj.tur === "ok" ? MINT : BLUSH }}>{mesaj.metin}</span>}
      </div>

      {yetkiler.includes("yonetim") && <VeliDavetKodlari classId={seciliSinifId} sinifAdi={siniflar.find((s) => s.id === seciliSinifId)?.ad ?? ""} />}
    </div>
  );
}

// Veli davet kodu listesi (yönetici, müdür, moderatör). Kodlar yalnız bir
// kez gösterilir; listeyi indirip okula verin.
export function VeliDavetKodlari({ classId, sinifAdi }: { classId: string; sinifAdi: string }) {
  const [pending, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ kodlar: VeliDavetKodu[]; atlanan: number } | null>(null);

  function olustur() {
    setHata(null);
    startTransition(async () => {
      const r = await veliDavetKodlariOlustur(classId);
      if (r.error) return setHata(r.error);
      setSonuc({ kodlar: r.kodlar, atlanan: r.atlanan });
      if (r.kodlar.length > 0) csvIndir(r.kodlar, sinifAdi);
    });
  }

  return (
    <div className="rounded-3xl p-5 flex flex-col gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div>
        <h2 className="text-sm font-bold" style={{ color: TEXT }}>Veli davet kodları — {sinifAdi}</h2>
        <p className="text-xs" style={{ color: TEXT_MUTED }}>
          Velisi bağlı olmayan her öğrenci için 30 gün geçerli bir kod üretilir ve liste Excel&apos;de açılabilen bir dosya olarak iner.
          Veli giriş ekranında &quot;Veli&quot; sekmesinde öğrenci numarası ve bu kodla hesabını açar.
        </p>
      </div>
      <button type="button" onClick={olustur} disabled={pending}
        className="sfec-btn inline-flex w-fit items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
        style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        <Download size={13} /> {pending ? "Hazırlanıyor..." : "Kod listesini oluştur ve indir"}
      </button>
      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
      {sonuc && (
        <div className="flex flex-col gap-2">
          <p className="text-xs" style={{ color: TEXT_MUTED }}>
            {sonuc.kodlar.length} yeni kod üretildi{sonuc.atlanan > 0 ? `, ${sonuc.atlanan} öğrencinin velisi zaten bağlı ya da geçerli kodu var` : ""}. Kodlar bir daha gösterilmez.
          </p>
          {sonuc.kodlar.length > 0 && (
            <div className="overflow-x-auto rounded-xl" style={{ border: `1px solid ${BORDER_STRONG}` }}>
              <table className="w-full text-xs">
                <thead><tr style={{ background: BG1_ALT, color: TEXT }}>
                  <th className="px-3 py-1.5 text-left">Öğrenci</th><th className="px-3 py-1.5 text-left">No</th><th className="px-3 py-1.5 text-left">Kod</th><th className="px-3 py-1.5 text-left">Son gün</th>
                </tr></thead>
                <tbody>
                  {sonuc.kodlar.map((k) => (
                    <tr key={k.okulNo} style={{ borderTop: `1px solid ${BORDER}`, color: TEXT }}>
                      <td className="px-3 py-1.5">{k.ogrenciAd}</td><td className="px-3 py-1.5">{k.okulNo}</td>
                      <td className="px-3 py-1.5 font-mono font-bold">{k.kod}</td><td className="px-3 py-1.5">{k.sonGecerlilik}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function csvIndir(kodlar: VeliDavetKodu[], sinifAdi: string) {
  const kacir = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const satirlar = [
    ["Sınıf", "Öğrenci", "Öğrenci No", "Veli", "Davet Kodu", "Son Geçerlilik"].map(kacir).join(";"),
    ...kodlar.map((k) => [k.sinif, k.ogrenciAd, k.okulNo, k.veliAd, k.kod, k.sonGecerlilik].map(kacir).join(";")),
  ];
  // Başındaki BOM, Excel'in Türkçe karakterleri doğru açması için.
  const blob = new Blob(["﻿" + satirlar.join("\r\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `veli-davet-kodlari-${sinifAdi || "sinif"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
