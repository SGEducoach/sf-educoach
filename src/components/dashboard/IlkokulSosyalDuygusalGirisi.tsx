"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HeartHandshake, Printer, Save } from "lucide-react";
import {
  SDO_BASLIKLARI, SDO_DUZEYLERI, SDO_GOSTERGE_SAYISI, donemEtiketi, donemIlkAyi, komsuDonem, sdoYazabilirMi,
} from "@/lib/ilkokul-gelisim";
import type { DonemBilgisi, GelisimYetkisi, SdoDuzeyi } from "@/lib/ilkokul-gelisim";
import type { SdoKaydi } from "@/lib/ilkokul-gelisim-sorgu";
import { ilkokulSdoKaydet } from "@/app/dashboard/ilkokul-actions";
import { SDO_RENK } from "@/components/dashboard/ilkokul-renkler";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, BUTTER_BG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import type { IlkokulSinifSecenegi } from "@/components/dashboard/IlkokulGelisimGirisi";

// Sosyal duygusal öğrenme becerileri (MEB kılavuzu; 19.10.2026, migration
// 0167): 5 başlık, 26 gösterge, dört düzey. Dönemde bir kez sınıf öğretmeni
// (ya da müdür/moderatör) doldurur; dönem görüşü de burada yazılır. Öğrenci
// öğrenci ilerlenir, bütün değişiklikler tek seferde kaydedilir.

const anahtar = (studentId: string, gosterge: string) => `${studentId}|${gosterge}`;

export function IlkokulSosyalDuygusalGirisi({
  siniflar, seciliSinifId, donem, yetkiler, ogrenciler, kayitlar, gorusler, hazir,
}: {
  siniflar: IlkokulSinifSecenegi[];
  seciliSinifId: string;
  donem: DonemBilgisi;
  yetkiler: GelisimYetkisi[];
  ogrenciler: { id: string; ad: string; okulNo: string }[];
  kayitlar: SdoKaydi[];
  gorusler: { studentId: string; metin: string }[];
  hazir: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<{ tur: "ok" | "hata"; metin: string } | null>(null);
  const yazabilir = sdoYazabilirMi(yetkiler);
  const [seciliOgrenci, setSeciliOgrenci] = useState(ogrenciler[0]?.id ?? "");

  const kayitli = useMemo(() => new Map(kayitlar.map((k) => [anahtar(k.studentId, k.gosterge), k.duzey])), [kayitlar]);
  const [durum, setDurum] = useState<Map<string, SdoDuzeyi | null>>(() => new Map(kayitli));
  const kayitliGorus = useMemo(() => new Map(gorusler.map((g) => [g.studentId, g.metin])), [gorusler]);
  const [gorusDurumu, setGorusDurumu] = useState<Map<string, string>>(() => new Map(kayitliGorus));

  const tumGostergeler = SDO_BASLIKLARI.flatMap((b) => b.gostergeler.map((_, i) => `${b.anahtar}${i + 1}`));
  const doluSayisi = (studentId: string) => tumGostergeler.filter((g) => durum.get(anahtar(studentId, g))).length;

  const degisenHucreler = ogrenciler.flatMap((o) => tumGostergeler
    .filter((g) => (durum.get(anahtar(o.id, g)) ?? null) !== (kayitli.get(anahtar(o.id, g)) ?? null))
    .map((g) => ({ studentId: o.id, gosterge: g, duzey: durum.get(anahtar(o.id, g)) ?? null })));
  const degisenGorusler = ogrenciler
    .filter((o) => (gorusDurumu.get(o.id) ?? "").trim() !== (kayitliGorus.get(o.id) ?? "").trim())
    .map((o) => ({ studentId: o.id, metin: gorusDurumu.get(o.id) ?? "" }));
  const degisiklikVar = degisenHucreler.length > 0 || degisenGorusler.length > 0;

  function kaydet() {
    setMesaj(null);
    startTransition(async () => {
      const r = await ilkokulSdoKaydet({ classId: seciliSinifId, egitimYili: donem.egitimYili, donem: donem.donem, hucreler: degisenHucreler, gorusler: degisenGorusler });
      if (r.error) return setMesaj({ tur: "hata", metin: r.error });
      setMesaj({ tur: "ok", metin: "Sosyal duygusal değerlendirme kaydedildi." });
      router.refresh();
    });
  }

  const donemYolu = (d: DonemBilgisi) => `/dashboard/ilkokul-gelisim?sinif=${seciliSinifId}&ay=${donemIlkAyi(d).slice(0, 7)}&kisim=sosyal`;
  const ogrenci = ogrenciler.find((o) => o.id === seciliOgrenci) ?? null;
  const siradaki = ogrenci ? ogrenciler[ogrenciler.indexOf(ogrenci) + 1] ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
            <HeartHandshake size={16} color={MINT} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Sosyal Duygusal Öğrenme Becerileri</h1>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>
              MEB gelişim raporundaki 5 başlık ve {SDO_GOSTERGE_SAYISI} gösterge. Dönemde bir kez, gözlem ve kanıta dayanarak işaretlenir; dönem görüşü dönem sonu raporuna girer.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {siniflar.map((s) => (
            <Link key={s.id} href={`/dashboard/ilkokul-gelisim?sinif=${s.id}&ay=${donemIlkAyi(donem).slice(0, 7)}&kisim=sosyal`}
              className="sfec-btn rounded-full px-4 py-1.5 text-xs font-bold"
              style={{ background: s.id === seciliSinifId ? MINT : BG0, color: s.id === seciliSinifId ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}>
              {s.ad}
            </Link>
          ))}
          <span className="mx-1 h-5 w-px" style={{ background: BORDER_STRONG }} aria-hidden="true" />
          <Link href={donemYolu(komsuDonem(donem, -1))} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: BG0, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>‹ Önceki dönem</Link>
          <span className="text-sm font-bold" style={{ color: TEXT }}>{donemEtiketi(donem)}</span>
          <Link href={donemYolu(komsuDonem(donem, 1))} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: BG0, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>Sonraki dönem ›</Link>
        </div>
        {!hazir && (
          <p className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: BUTTER_BG, color: TEXT }}>
            Bu bölüm için veritabanı güncellemesi (0167) bekleniyor; uygulanınca kayıt açılır.
          </p>
        )}
        {!yazabilir && (
          <p className="text-xs" style={{ color: TEXT_MUTED }}>Bu bölümü sınıf öğretmeni doldurur; siz yalnız görüntülüyorsunuz.</p>
        )}
      </div>

      {ogrenciler.length === 0 ? (
        <p className="rounded-2xl p-5 text-sm" style={{ background: BG1, color: TEXT_MUTED, border: `2px solid ${BORDER}` }}>Bu sınıfta öğrenci yok.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <div className="flex flex-col gap-1 rounded-3xl p-3 lg:max-h-[70vh] lg:overflow-y-auto" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            {ogrenciler.map((o) => {
              const dolu = doluSayisi(o.id);
              const secili = o.id === seciliOgrenci;
              return (
                <button key={o.id} type="button" onClick={() => setSeciliOgrenci(o.id)} aria-pressed={secili}
                  className="sfec-btn flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs font-semibold"
                  style={{ background: secili ? MINT_BG : "transparent", color: TEXT }}>
                  <span className="min-w-0 truncate">{o.ad}</span>
                  <span className="shrink-0 tabular-nums" style={{ color: dolu === SDO_GOSTERGE_SAYISI ? MINT : TEXT_MUTED }}>{dolu}/{SDO_GOSTERGE_SAYISI}</span>
                </button>
              );
            })}
          </div>

          {ogrenci && (
            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-3xl px-5 py-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
                <span className="text-sm font-bold" style={{ color: TEXT }}>{ogrenci.ad} <span className="font-normal" style={{ color: TEXT_MUTED }}>· {ogrenci.okulNo}</span></span>
                <a href={`/dashboard/gelisim-raporu?ogrenci=${ogrenci.id}&ay=${donemIlkAyi(donem).slice(0, 7)}`} target="_blank" rel="noopener"
                  className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
                  <Printer size={13} aria-hidden="true" /> Dönem sonu raporu
                </a>
              </div>
              {SDO_BASLIKLARI.map((b) => (
                <section key={b.anahtar} className="rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
                  <h2 className="mb-2 text-[13px] font-bold" style={{ color: TEXT }}>{b.ad}</h2>
                  <div className="flex flex-col gap-2">
                    {b.gostergeler.map((metin, i) => {
                      const g = `${b.anahtar}${i + 1}`;
                      const deger = durum.get(anahtar(ogrenci.id, g)) ?? null;
                      return (
                        <div key={g} className="flex flex-col gap-1.5 rounded-2xl px-3 py-2 sm:flex-row sm:items-center sm:justify-between" style={{ background: BG0 }}>
                          <span className="text-xs" style={{ color: TEXT }}>{metin}</span>
                          <span className="flex shrink-0 flex-wrap gap-1" role="group" aria-label={metin}>
                            {SDO_DUZEYLERI.map((d) => {
                              const aktif = deger === d.anahtar;
                              return (
                                <button key={d.anahtar} type="button" disabled={!yazabilir} aria-pressed={aktif} title={d.ad}
                                  onClick={() => setDurum((m) => new Map(m).set(anahtar(ogrenci.id, g), aktif ? null : d.anahtar))}
                                  className="rounded-full px-2.5 py-1 text-[11px] font-bold disabled:cursor-default"
                                  style={aktif
                                    ? { background: SDO_RENK[d.anahtar].arka, color: SDO_RENK[d.anahtar].yazi, border: `1px solid ${SDO_RENK[d.anahtar].yazi}` }
                                    : { color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
                                  {d.kisa}
                                </button>
                              );
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
              <section className="rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
                <h2 className="mb-2 text-[13px] font-bold" style={{ color: TEXT }}>Öğretmen Görüşü (Dönem Sonu)</h2>
                <textarea rows={3} maxLength={1000} disabled={!yazabilir}
                  aria-label={`${ogrenci.ad} dönem görüşü`}
                  placeholder="Öğrencinin dönem içindeki gelişimine dair görüşünüz (veliye görünür)"
                  value={gorusDurumu.get(ogrenci.id) ?? ""}
                  onChange={(e) => { const v = e.target.value; setGorusDurumu((m) => new Map(m).set(ogrenci.id, v)); }}
                  className="w-full resize-y rounded-xl px-3 py-2 text-xs outline-none"
                  style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }} />
              </section>
              {siradaki && (
                <button type="button" onClick={() => setSeciliOgrenci(siradaki.id)}
                  className="sfec-btn w-fit rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
                  Sıradaki öğrenci: {siradaki.ad} ›
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {yazabilir && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={kaydet} disabled={pending || !degisiklikVar || !hazir}
            className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-50"
            style={{ background: MINT, color: MINT_ON }}>
            <Save size={14} /> {pending ? "Kaydediliyor..." : degisiklikVar ? "Değerlendirmeyi kaydet" : "Değişiklik yok"}
          </button>
          {degisiklikVar && <span className="text-xs" style={{ color: TEXT_MUTED }}>Öğrenciler arasında geçebilirsiniz; bütün değişiklikler birlikte kaydedilir.</span>}
          {mesaj && <span className="text-xs font-semibold" style={{ color: mesaj.tur === "ok" ? MINT : BLUSH }}>{mesaj.metin}</span>}
        </div>
      )}
    </div>
  );
}
