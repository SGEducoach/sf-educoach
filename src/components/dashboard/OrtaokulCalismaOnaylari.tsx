"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, PencilLine } from "lucide-react";
import { ortaokulCalismaOnayla } from "@/app/dashboard/ortaokul-bolum-actions";
import { BOLUM_ETIKET } from "@/lib/ortaokul-bolum";
import { CALISMA_TURU_ETIKET } from "@/lib/ortaokul-calisma";
import type { OrtaokulBekleyenCalisma } from "@/lib/ortaokul-calisma-onay-sorgu";
import { BG0, BG1, BORDER, BORDER_STRONG, BLUSH, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

function KayitSatiri({ kayit, bugun, tamamlandi }: {
  kayit: OrtaokulBekleyenCalisma;
  bugun: string;
  tamamlandi: (id: string) => void;
}) {
  const router = useRouter();
  const [duzenle, setDuzenle] = useState(false);
  const [tarih, setTarih] = useState(kayit.tarih);
  const [sure, setSure] = useState(kayit.sureDakika?.toString() ?? "");
  const [dogru, setDogru] = useState(String(kayit.dogru ?? 0));
  const [yanlis, setYanlis] = useState(String(kayit.yanlis ?? 0));
  const [bos, setBos] = useState(String(kayit.bos ?? 0));
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function isle(duzelt: boolean) {
    setHata(null);
    startTransition(async () => {
      const sonuc = await ortaokulCalismaOnayla(kayit.id, duzelt ? {
        tarih,
        sureDakika: sure.trim() ? Number(sure) : null,
        dogru: kayit.tur === "soru" ? Number(dogru) : null,
        yanlis: kayit.tur === "soru" ? Number(yanlis) : null,
        bos: kayit.tur === "soru" ? Number(bos) : null,
      } : undefined);
      if (sonuc.error) return setHata(sonuc.error);
      tamamlandi(kayit.id);
      router.refresh();
    });
  }

  const girdiStili = { background: BG0, border: `2px solid ${BORDER_STRONG}`, color: TEXT };
  return (
    <li className="rounded-2xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-bold" style={{ color: TEXT }}>{kayit.ogrenciAdi} · {kayit.sinifAdi}</div>
          <div className="mt-0.5 text-xs" style={{ color: TEXT_MUTED }}>
            {kayit.dersAdi} · {BOLUM_ETIKET[kayit.bolum]} · {CALISMA_TURU_ETIKET[kayit.tur]}
          </div>
          {kayit.konuAdi && <div className="mt-1 text-xs font-semibold" style={{ color: TEXT }}>{kayit.konuAdi}{kayit.altBaslik ? ` › ${kayit.altBaslik}` : ""}</div>}
          <div className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
            {kayit.tarih} · {kayit.tur === "soru" ? `${kayit.dogru ?? 0} doğru · ${kayit.yanlis ?? 0} yanlış · ${kayit.bos ?? 0} boş` : "Konu çalışması"}
            {kayit.sureDakika !== null ? ` · ${kayit.sureDakika} dk` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} onClick={() => isle(false)}
            className="rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
            <Check size={13} className="mr-1 inline" />Onayla
          </button>
          <button type="button" disabled={pending} onClick={() => setDuzenle((v) => !v)}
            className="rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT_BG, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
            <PencilLine size={13} className="mr-1 inline" />{duzenle ? "Vazgeç" : "Düzelt"}
          </button>
        </div>
      </div>
      {duzenle && <div className="mt-3 rounded-xl p-3" style={{ background: BG0 }}>
        <p className="mb-2 text-[11px]" style={{ color: TEXT_MUTED }}>Hatalı alanları değiştirin. Eski değerler ve düzeltmeyi yapan öğretmen kaydedilir.</p>
        <div className="flex flex-wrap gap-2">
          <label className="flex min-w-[135px] flex-1 flex-col gap-1 text-xs" style={{ color: TEXT }}>Tarih
            <input type="date" value={tarih} max={bugun} disabled={pending} onChange={(e) => setTarih(e.target.value)}
              className="rounded-xl px-2 py-2" style={girdiStili} />
          </label>
          <label className="flex min-w-[115px] flex-1 flex-col gap-1 text-xs" style={{ color: TEXT }}>Süre (dk){kayit.tur === "soru" ? " · isteğe bağlı" : ""}
            <input type="number" inputMode="numeric" min={1} max={600} value={sure} disabled={pending} onChange={(e) => setSure(e.target.value)}
              className="rounded-xl px-2 py-2" style={girdiStili} />
          </label>
          {kayit.tur === "soru" && ([
            ["Doğru", dogru, setDogru], ["Yanlış", yanlis, setYanlis], ["Boş", bos, setBos],
          ] as const).map(([etiket, deger, ayarla]) => <label key={etiket} className="flex min-w-[90px] flex-1 flex-col gap-1 text-xs" style={{ color: TEXT }}>{etiket}
            <input type="number" inputMode="numeric" min={0} value={deger} disabled={pending} onChange={(e) => ayarla(e.target.value)}
              className="rounded-xl px-2 py-2" style={girdiStili} />
          </label>)}
        </div>
        <button type="button" disabled={pending} onClick={() => isle(true)}
          className="mt-3 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
          Düzeltip onayla
        </button>
      </div>}
      {hata && <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
    </li>
  );
}

export function OrtaokulCalismaOnaylari({ kayitlar, bugun }: { kayitlar: OrtaokulBekleyenCalisma[]; bugun: string }) {
  const [tamamlanan, setTamamlanan] = useState<Set<string>>(new Set());
  const bekleyen = kayitlar.filter((k) => !tamamlanan.has(k.id));
  return <section className="flex flex-col gap-4">
    <div>
      <h1 className="text-xl font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Çalışma Onayları</h1>
      <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>
        Öğrencilerin konu çalışması ve soru çözümü kayıtlarını inceleyin. Hatalı sayı, süre veya tarihi düzelterek onaylayabilirsiniz.
      </p>
    </div>
    {bekleyen.length === 0
      ? <div className="rounded-2xl p-6 text-center text-sm" style={{ background: BG1, border: `2px solid ${BORDER}`, color: TEXT_MUTED }}>Onay bekleyen çalışma yok.</div>
      : <><p className="text-xs font-semibold" style={{ color: TEXT_MUTED }}>{bekleyen.length} kayıt bekliyor</p>
          <ul className="flex flex-col gap-2">{bekleyen.map((k) => <KayitSatiri key={k.id} kayit={k} bugun={bugun} tamamlandi={(id) => setTamamlanan((onceki) => new Set(onceki).add(id))} />)}</ul></>}
  </section>;
}
