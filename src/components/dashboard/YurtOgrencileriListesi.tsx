"use client";

// Yurt sorumlusu müdür yardımcısının yurt öğrencileri görünümü (kullanıcı
// kararı 18.10.2026): resmî listeden (ön kayıt dahil) gelen bütün yurt
// öğrencileri; sisteme kayıtlı olanın profiline (analiz, deneme) geçilir.
import { useMemo, useState } from "react";
import Link from "next/link";
import { BedDouble } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";
import { sinifSiraKarsilastir } from "@/lib/types";
import type { YurtOgrencisi } from "@/lib/yurt-listesi";

const girdi = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };

export function YurtOgrencileriListesi({ ogrenciler }: { ogrenciler: YurtOgrencisi[] }) {
  const [arama, setArama] = useState("");
  const [cinsiyet, setCinsiyet] = useState<"" | "kiz" | "erkek" | "yok">("");
  const [sinif, setSinif] = useState("");

  const siniflar = useMemo(() => {
    const m = new Map<string, { seviye: string; sube: string }>();
    for (const o of ogrenciler) if (o.sinif && o.seviye && o.sube) m.set(o.sinif, { seviye: o.seviye, sube: o.sube });
    return [...m.entries()].sort((a, b) => sinifSiraKarsilastir(a[1], b[1])).map(([ad]) => ad);
  }, [ogrenciler]);

  const k = arama.toLocaleLowerCase("tr-TR");
  const liste = ogrenciler.filter((o) =>
    (!k || o.ad.toLocaleLowerCase("tr-TR").includes(k) || (o.okulNo ?? "").includes(k))
    && (!sinif || o.sinif === sinif)
    && (!cinsiyet || (cinsiyet === "yok" ? !o.cinsiyet : o.cinsiyet === cinsiyet)));
  const kiz = ogrenciler.filter((o) => o.cinsiyet === "kiz").length;
  const erkek = ogrenciler.filter((o) => o.cinsiyet === "erkek").length;
  const kayitli = ogrenciler.filter((o) => o.kayitli).length;

  return (
    <section className="sfec-fade flex flex-col gap-4 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <BedDouble size={16} color={MINT} aria-hidden="true" />
        <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Yurt Öğrencileri</h2>
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {[["Toplam", ogrenciler.length], ["Kız", kiz], ["Erkek", erkek], ["Sisteme kayıtlı", kayitli], ["Ön kayıt", ogrenciler.length - kayitli]].map(([e, n]) => (
          <span key={e} className="rounded-full px-3 py-1 font-semibold" style={{ background: BG1_ALT, color: TEXT }}>{e}: {n}</span>
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr style={{ color: TEXT_MUTED }}>
              <th className="px-2 py-2 font-semibold">Ad Soyad</th>
              <th className="px-2 py-2 font-semibold">Okul No</th>
              <th className="px-2 py-2 font-semibold">Sınıf</th>
              <th className="px-2 py-2 font-semibold">Cinsiyet</th>
              <th className="px-2 py-2 font-semibold">Durum</th>
            </tr>
          </thead>
          <tbody>
            {liste.map((o) => (
              <tr key={o.anahtar} style={{ borderTop: `1px solid ${BORDER}`, color: TEXT }}>
                <td className="px-2 py-2 font-semibold">
                  {o.ogrenciId
                    ? <Link href={`/dashboard?bolum=ozet&ogrenci=${o.ogrenciId}`} className="underline-offset-2 hover:underline">{o.ad}</Link>
                    : o.ad}
                </td>
                <td className="px-2 py-2">{o.okulNo ?? "—"}</td>
                <td className="px-2 py-2">{o.sinif ?? "—"}</td>
                <td className="px-2 py-2">{o.cinsiyet === "kiz" ? "Kız" : o.cinsiyet === "erkek" ? "Erkek" : "—"}</td>
                <td className="px-2 py-2" style={{ color: o.kayitli ? MINT : TEXT_MUTED }}>{o.kayitli ? "Kayıtlı" : "Ön kayıt"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {liste.length === 0 && <p className="py-4 text-center text-xs" style={{ color: TEXT_MUTED }}>Öğrenci bulunamadı.</p>}
      </div>
    </section>
  );
}
