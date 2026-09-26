"use client";

// Öğrenci Aktivitesi'nin istemci parçaları: kurum/dönem filtresi (URL'ye
// yazılır, sunucu yeniden hesaplar) ve türe göre süzülen hareket listesi.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BG1_ALT, BORDER_STRONG, BUTTER, LILAC, MINT, PEACH, SKY, TEXT, TEXT_MUTED } from "@/lib/theme";
import { zamanGoster, type Hareket, type HareketTuru } from "@/lib/ogrenci-aktivitesi";

export function AktiviteFiltresi({ kurumlar, kurumId, gun, donemler }: {
  kurumlar: { id: string; ad: string }[]; kurumId: string | null; gun: number; donemler: readonly number[];
}) {
  const router = useRouter();
  const git = (yeniKurum: string | null, yeniGun: number) => {
    const p = new URLSearchParams();
    if (yeniKurum) p.set("kurum", yeniKurum);
    p.set("donem", String(yeniGun));
    router.push(`/yonetici/ogrenci-aktivitesi?${p.toString()}`);
  };
  const stil = { border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={kurumId ?? ""} onChange={(e) => git(e.target.value || null, gun)} aria-label="Kurum seç"
        className="text-xs px-3 py-2 rounded-xl outline-none" style={stil}>
        <option value="">Tüm kurumlar</option>
        {kurumlar.map((k) => <option key={k.id} value={k.id}>{k.ad}</option>)}
      </select>
      <select value={gun} onChange={(e) => git(kurumId, Number(e.target.value))} aria-label="Dönem seç"
        className="text-xs px-3 py-2 rounded-xl outline-none" style={stil}>
        {donemler.map((d) => <option key={d} value={d}>Son {d} gün</option>)}
      </select>
    </div>
  );
}

const TUR_ETIKET: Record<HareketTuru, string> = {
  konu: "Konu", soru: "Soru", deneme: "Deneme", "okul-yukleme": "Okul yüklemesi", kayit: "Kayıt",
};
const TUR_RENK: Record<HareketTuru, string> = {
  konu: SKY, soru: MINT, deneme: PEACH, "okul-yukleme": LILAC, kayit: BUTTER,
};
const TUMU = "tumu";

export function HareketListesi({ hareketler }: { hareketler: Hareket[] }) {
  const [tur, setTur] = useState<HareketTuru | typeof TUMU>(TUMU);
  const sayilar = new Map<HareketTuru, number>();
  for (const h of hareketler) sayilar.set(h.tur, (sayilar.get(h.tur) ?? 0) + 1);
  const gosterilen = tur === TUMU ? hareketler : hareketler.filter((h) => h.tur === tur);
  const secenekler: (HareketTuru | typeof TUMU)[] = [TUMU, ...(Object.keys(TUR_ETIKET) as HareketTuru[]).filter((t) => sayilar.has(t))];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Hareket türüne göre süz">
        {secenekler.map((t) => {
          const secili = tur === t;
          return (
            <button key={t} type="button" onClick={() => setTur(t)} aria-pressed={secili}
              className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{ border: `2px solid ${secili ? TEXT : BORDER_STRONG}`, color: secili ? TEXT : TEXT_MUTED, background: BG1_ALT }}>
              {t === TUMU ? `Tümü (${hareketler.length})` : `${TUR_ETIKET[t]} (${sayilar.get(t)})`}
            </button>
          );
        })}
      </div>
      {gosterilen.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Bu kapsamda hareket yok.</p>
      ) : (
        <div className="sfec-liste">
          {gosterilen.map((h) => (
            <div key={h.anahtar} className="sfec-liste-satiri flex items-start gap-2.5 px-3.5 py-2 text-xs">
              <span style={{ color: TEXT_MUTED }} className="shrink-0 tabular-nums w-[5.5rem]">{zamanGoster(h.zaman)}</span>
              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-px" style={{ border: `1.5px solid ${TUR_RENK[h.tur]}`, color: TUR_RENK[h.tur] }}>
                {TUR_ETIKET[h.tur]}
              </span>
              <span style={{ color: TEXT }} className="min-w-0">
                {h.ogrenci ? (
                  <>
                    <Link href={`/yonetici/kullanici/${h.ogrenci.id}`} className="font-bold hover:underline">{h.ogrenci.ad}</Link>
                    <span style={{ color: TEXT_MUTED }}> ({[h.ogrenci.sinif, h.ogrenci.kurum].filter(Boolean).join(" · ")})</span>{" "}
                  </>
                ) : (
                  <span className="font-bold">{h.kurum ?? "Kurum"}: </span>
                )}
                {h.ozet}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
