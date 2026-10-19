"use client";

// Yurt sorumlusu müdür yardımcısının yurt öğrencileri görünümü (kullanıcı
// kararı 18.10.2026): resmî listeden (ön kayıt dahil) gelen öğrenciler;
// sisteme kayıtlı yurt öğrencisinin profiline (analiz, deneme) geçilir.
// Ön kayıtlılar dahil her öğrenci yurt öğrencisi olarak işaretlenir ya da
// işareti kaldırılır (tek tek ya da seçerek toplu).
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { BedDouble } from "lucide-react";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { sinifSiraKarsilastir } from "@/lib/types";
import type { DurumluOgrenci, OgrenciCinsiyeti } from "@/lib/yurt-listesi";
import { yurtDurumuKaydet } from "@/app/dashboard/yurt-durumu-actions";
import { cinsiyetKaydet } from "@/app/dashboard/yurt-cinsiyet-actions";

const girdi = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };

export function YurtOgrencileriListesi({ ogrenciler }: { ogrenciler: DurumluOgrenci[] }) {
  const [arama, setArama] = useState("");
  const [cinsiyet, setCinsiyet] = useState<"" | "kiz" | "erkek" | "yok">("");
  const [sinif, setSinif] = useState("");
  const [goster, setGoster] = useState<"yurt" | "degil" | "hepsi">("yurt");
  // Kaydedilen değişiklikler sayfa yenilenmeden listeye yansır.
  const [degisen, setDegisen] = useState<Record<string, boolean>>({});
  const [cinsiyetDegisen, setCinsiyetDegisen] = useState<Record<string, OgrenciCinsiyeti>>({});
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [hata, setHata] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const tum = useMemo(() => ogrenciler.map((o) => ({
    ...o,
    yurt: o.anahtar in degisen ? degisen[o.anahtar] : o.yurt,
    cinsiyet: cinsiyetDegisen[o.anahtar] ?? o.cinsiyet,
  })), [ogrenciler, degisen, cinsiyetDegisen]);
  const yurtlular = tum.filter((o) => o.yurt);
  // Cinsiyeti girilmemiş yurt öğrencisi kız/erkek yoklama listelerinde görünmez.
  const cinsiyetsiz = yurtlular.filter((o) => !o.cinsiyet).length;

  const siniflar = useMemo(() => {
    const m = new Map<string, { seviye: string; sube: string }>();
    for (const o of ogrenciler) if (o.sinif && o.seviye && o.sube) m.set(o.sinif, { seviye: o.seviye, sube: o.sube });
    return [...m.entries()].sort((a, b) => sinifSiraKarsilastir(a[1], b[1])).map(([ad]) => ad);
  }, [ogrenciler]);

  const k = arama.toLocaleLowerCase("tr-TR");
  const liste = tum.filter((o) =>
    (goster === "hepsi" || (goster === "yurt" ? o.yurt : !o.yurt))
    && (!k || o.ad.toLocaleLowerCase("tr-TR").includes(k) || (o.okulNo ?? "").includes(k))
    && (!sinif || o.sinif === sinif)
    && (!cinsiyet || (cinsiyet === "yok" ? !o.cinsiyet : o.cinsiyet === cinsiyet)));
  const kiz = yurtlular.filter((o) => o.cinsiyet === "kiz").length;
  const erkek = yurtlular.filter((o) => o.cinsiyet === "erkek").length;
  const kayitli = yurtlular.filter((o) => o.kayitli).length;

  function kaydet(anahtarlar: string[], yurt: boolean) {
    if (anahtarlar.length === 0) return;
    setHata(null);
    start(async () => {
      const r = await yurtDurumuKaydet(anahtarlar, yurt);
      if (r.error) return setHata(r.error);
      setDegisen((d) => ({ ...d, ...Object.fromEntries(anahtarlar.map((a) => [a, yurt])) }));
      setSecili(new Set());
    });
  }

  function cinsiyetiKaydet(anahtarlar: string[], c: OgrenciCinsiyeti) {
    if (anahtarlar.length === 0) return;
    setHata(null);
    start(async () => {
      const r = await cinsiyetKaydet("ogrenci", anahtarlar, c);
      if (r.error) return setHata(r.error);
      setCinsiyetDegisen((d) => ({ ...d, ...Object.fromEntries(anahtarlar.map((a) => [a, c])) }));
      setSecili(new Set());
    });
  }

  const tumuSecili = liste.length > 0 && liste.every((o) => secili.has(o.anahtar));
  const sec = (anahtar: string) => setSecili((s) => { const y = new Set(s); if (y.has(anahtar)) y.delete(anahtar); else y.add(anahtar); return y; });

  return (
    <section className="sfec-fade flex min-w-0 max-w-full flex-col gap-4 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <BedDouble size={16} color={MINT} aria-hidden="true" />
        <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Yurt Öğrencileri</h2>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {[["Yurt öğrencisi", yurtlular.length], ["Kız", kiz], ["Erkek", erkek], ["Sisteme kayıtlı", kayitli], ["Ön kayıt", yurtlular.length - kayitli]].map(([e, n]) => (
          <span key={e} className="rounded-full px-3 py-1 font-semibold" style={{ background: BG1_ALT, color: TEXT }}>{e}: {n}</span>
        ))}
        {cinsiyetsiz > 0 && (
          <button type="button" onClick={() => { setGoster("yurt"); setCinsiyet("yok"); setSecili(new Set()); }}
            className="rounded-full px-3 py-1 font-bold" style={{ background: BLUSH, color: "#fff" }}>
            Cinsiyeti girilmemiş: {cinsiyetsiz}
          </button>
        )}
      </div>
      {cinsiyetsiz > 0 && (
        <p className="text-[11px] font-semibold" style={{ color: BLUSH }}>
          Cinsiyeti girilmemiş yurt öğrencisi kız ve erkek yoklama listelerinde görünmez. Satırdaki Kız / Erkek düğmesiyle ya da seçerek toplu işaretleyin.
        </p>
      )}
      <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
        Ön kayıtlılar dahil bütün öğrenciler listelenir. Yurt öğrencisi olanı işaretleyin, ayrılanın işaretini kaldırın; yoklama ve izin listeleri buna göre hazırlanır.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {([["yurt", "Yurt öğrencileri"], ["degil", "Yurt öğrencisi olmayanlar"], ["hepsi", "Tüm öğrenciler"]] as const).map(([d, e]) => (
          <button key={d} type="button" onClick={() => { setGoster(d); setSecili(new Set()); }}
            className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ background: goster === d ? MINT : BG0, color: goster === d ? MINT_ON : TEXT, border: `2px solid ${goster === d ? MINT : BORDER_STRONG}` }}>
            {e}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Ad ya da okul no ara…" aria-label="Öğrenci ara"
          className="min-w-[180px] flex-1 rounded-xl px-3 py-2 text-xs outline-none" style={girdi} />
        <select value={sinif} onChange={(e) => setSinif(e.target.value)} aria-label="Sınıf" className="rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={girdi}>
          <option value="">Tüm sınıflar</option>
          {siniflar.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={cinsiyet} onChange={(e) => setCinsiyet(e.target.value as typeof cinsiyet)} aria-label="Cinsiyet" className="rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={girdi}>
          <option value="">Kız ve erkek</option>
          <option value="kiz">Kız öğrenciler</option>
          <option value="erkek">Erkek öğrenciler</option>
          <option value="yok">Cinsiyeti girilmemiş</option>
        </select>
      </div>
      {secili.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2" style={{ background: BG1_ALT }}>
          <span className="text-xs font-semibold" style={{ color: TEXT }}>{secili.size} öğrenci seçildi</span>
          <button type="button" disabled={pending} onClick={() => kaydet([...secili], true)}
            className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>Yurt Öğrencisi Yap</button>
          <button type="button" disabled={pending} onClick={() => kaydet([...secili], false)}
            className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ color: BLUSH, border: `1px solid ${BORDER}` }}>Yurttan Çıkar</button>
          <span className="text-xs" style={{ color: TEXT_MUTED }}>Cinsiyet:</span>
          {(["kiz", "erkek"] as const).map((c) => (
            <button key={c} type="button" disabled={pending} onClick={() => cinsiyetiKaydet([...secili], c)}
              className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
              {c === "kiz" ? "Kız" : "Erkek"}
            </button>
          ))}
        </div>
      )}
      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr style={{ color: TEXT_MUTED }}>
              <th className="w-8 px-2 py-2">
                <input type="checkbox" aria-label="Listedekilerin tümünü seç" checked={tumuSecili}
                  onChange={() => setSecili(tumuSecili ? new Set() : new Set(liste.map((o) => o.anahtar)))} />
              </th>
              <th className="px-2 py-2 font-semibold">Ad Soyad</th>
              <th className="px-2 py-2 font-semibold">Okul No</th>
              <th className="px-2 py-2 font-semibold">Sınıf</th>
              <th className="px-2 py-2 font-semibold">Cinsiyet</th>
              <th className="px-2 py-2 font-semibold">Kayıt</th>
              <th className="px-2 py-2 font-semibold">Yurt</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((o) => (
              <tr key={o.anahtar} style={{ borderTop: `1px solid ${BORDER}`, color: TEXT }}>
                <td className="px-2 py-2">
                  <input type="checkbox" aria-label={`${o.ad} seç`} checked={secili.has(o.anahtar)} onChange={() => sec(o.anahtar)} />
                </td>
                <td className="px-2 py-2 font-semibold">
                  {o.ogrenciId && o.yurt
                    ? <Link href={`/dashboard?bolum=ozet&ogrenci=${o.ogrenciId}`} className="underline-offset-2 hover:underline">{o.ad}</Link>
                    : o.ad}
                </td>
                <td className="px-2 py-2">{o.okulNo ?? "—"}</td>
                <td className="px-2 py-2">{o.sinif ?? "—"}</td>
                <td className="px-2 py-2">
                  <span className="inline-flex gap-1" role="group" aria-label={`${o.ad} cinsiyet`}>
                    {(["kiz", "erkek"] as const).map((c) => (
                      <button key={c} type="button" disabled={pending || o.cinsiyet === c} onClick={() => cinsiyetiKaydet([o.anahtar], c)} aria-pressed={o.cinsiyet === c}
                        className="rounded-full px-2 py-0.5 text-[11px] font-bold disabled:cursor-default"
                        style={o.cinsiyet === c
                          ? { background: MINT, color: MINT_ON }
                          : { color: o.yurt && !o.cinsiyet ? BLUSH : TEXT_MUTED, border: `1px solid ${o.yurt && !o.cinsiyet ? BLUSH : BORDER_STRONG}` }}>
                        {c === "kiz" ? "Kız" : "Erkek"}
                      </button>
                    ))}
                  </span>
                </td>
                <td className="px-2 py-2" style={{ color: o.kayitli ? MINT : TEXT_MUTED }}>{o.kayitli ? "Kayıtlı" : "Ön kayıt"}</td>
                <td className="px-2 py-2">
                  <button type="button" disabled={pending} onClick={() => kaydet([o.anahtar], !o.yurt)} aria-pressed={o.yurt}
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold disabled:opacity-50"
                    style={o.yurt ? { background: MINT, color: MINT_ON } : { color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
                    {o.yurt ? "Yurt öğrencisi" : "Değil"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {liste.length === 0 && <p className="py-4 text-center text-xs" style={{ color: TEXT_MUTED }}>Öğrenci bulunamadı.</p>}
      </div>
    </section>
  );
}
