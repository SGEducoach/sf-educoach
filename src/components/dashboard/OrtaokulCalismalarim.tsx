"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Clock, PenLine, Trash2 } from "lucide-react";
import { CALISMA_TURU_ETIKET, calismaMesaji } from "@/lib/ortaokul-calisma";
import type { CalismaKaydi, CalismaOzeti, CalismaTuru } from "@/lib/ortaokul-calisma";
import { BOLUM_ACIKLAMA, BOLUM_ETIKET, ORTAOKUL_BOLUMLERI } from "@/lib/ortaokul-bolum";
import type { OrtaokulBolum } from "@/lib/ortaokul-bolum";
import { YETERLILIK_ETIKET_OGRENCI } from "@/lib/ortaokul-yeterlilik";
import type { TemaYeterliligi } from "@/lib/ortaokul-yeterlilik";
import type { DersSecenegi } from "@/lib/ortaokul-bolum-sorgu";
import { ortaokulCalismaEkle, ortaokulCalismaSil } from "@/app/dashboard/ortaokul-bolum-actions";
import {
  BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED,
} from "@/lib/theme";

// Ortaokul "Çalışmalarım" — Maarif | LGS (kullanıcı kararı 01.10.2026).
//
// Aynı müfredatın iki bakışı; LGS'nin ayrı konu ağacı yok. İki sekme de 5-8
// sınıflarının HEPSİNDE açık (kullanıcı kararı; tasarım belgesi §10.3 yalnız
// 8. sınıf diyordu).
//
// BURADA YETERLİLİK KARARI VERİLMEZ. Lisede öğrenci "konuyu biliyorum"
// diyordu ve bu hâkimiyete dönüşüyordu; ortaokulda karar öğretmenin. Öğrenci
// öğretmeninin kararını yalnız OKUR (aşağıdaki şerit).

export function OrtaokulCalismalarim({ bolum, dersler, kayitlar, ozet, yeterlilik, bugun }: {
  bolum: OrtaokulBolum;
  dersler: DersSecenegi[];
  kayitlar: CalismaKaydi[];
  ozet: CalismaOzeti;
  // Seçili dersteki öğretmen kararları (salt okunur).
  yeterlilik: TemaYeterliligi[];
  bugun: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h1 className="text-lg font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Çalışmalarım</h1>
        <p className="mt-0.5 text-sm" style={{ color: TEXT_MUTED }}>{calismaMesaji(ozet)}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {ORTAOKUL_BOLUMLERI.map((b) => (
            <Link key={b} href={`/dashboard/ortaokul-calisma?kisim=${b}`}
              className="sfec-btn rounded-full px-4 py-1.5 text-xs font-bold"
              style={{
                background: bolum === b ? MINT : BG0,
                color: bolum === b ? MINT_ON : TEXT,
                border: `2px solid ${bolum === b ? MINT : BORDER_STRONG}`,
              }}>
              {BOLUM_ETIKET[b]}
            </Link>
          ))}
        </div>
        <p className="mt-1.5 text-[11px]" style={{ color: TEXT_MUTED }}>{BOLUM_ACIKLAMA[bolum]}</p>
      </div>

      {dersler.length === 0 ? (
        <div className="rounded-3xl p-6" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            Sınıfın için ders listesi henüz hazır değil. Öğretmenine haber verebilirsin.
          </p>
        </div>
      ) : (
        <CalismaEkleFormu bolum={bolum} dersler={dersler} bugun={bugun} />
      )}

      {yeterlilik.length > 0 && <OgretmenKararlari satirlar={yeterlilik} />}

      <KayitListesi kayitlar={kayitlar} />
    </div>
  );
}

function CalismaEkleFormu({ bolum, dersler, bugun }: { bolum: OrtaokulBolum; dersler: DersSecenegi[]; bugun: string }) {
  const [tur, setTur] = useState<CalismaTuru>("konu");
  const [dersId, setDersId] = useState(dersler[0]?.id ?? "");
  const [temaId, setTemaId] = useState("");
  const [tarih, setTarih] = useState(bugun);
  const [sure, setSure] = useState("");
  const [dogru, setDogru] = useState("");
  const [yanlis, setYanlis] = useState("");
  const [bos, setBos] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [eklendi, setEklendi] = useState(false);
  const [pending, startTransition] = useTransition();

  const ders = dersler.find((d) => d.id === dersId) ?? dersler[0];
  const girdiStili = { border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT };

  function kaydet() {
    setHata(null); setEklendi(false);
    startTransition(async () => {
      const res = await ortaokulCalismaEkle({
        bolum, tur, dersId, temaId: temaId || null, tarih,
        sureDakika: sure ? Number(sure) : null,
        dogru: tur === "soru" && dogru ? Number(dogru) : null,
        yanlis: tur === "soru" && yanlis ? Number(yanlis) : null,
        bos: tur === "soru" && bos ? Number(bos) : null,
      });
      if (res.error) return setHata(res.error);
      setEklendi(true);
      setSure(""); setDogru(""); setYanlis(""); setBos("");
    });
  }

  return (
    <div className="rounded-3xl p-5 flex flex-col gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap gap-1.5">
        {(["konu", "soru"] as CalismaTuru[]).map((t) => (
          <button key={t} type="button" onClick={() => { setTur(t); setEklendi(false); setHata(null); }}
            className="sfec-btn rounded-full px-3.5 py-1.5 text-xs font-bold"
            style={{
              background: tur === t ? MINT : BG0,
              color: tur === t ? MINT_ON : TEXT,
              border: `2px solid ${tur === t ? MINT : BORDER_STRONG}`,
            }}>
            {CALISMA_TURU_ETIKET[t]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={dersId} onChange={(e) => { setDersId(e.target.value); setTemaId(""); }}
          aria-label="Ders" className="min-w-[150px] flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={girdiStili}>
          {dersler.map((d) => <option key={d.id} value={d.id}>{d.ad}</option>)}
        </select>
        <select value={temaId} onChange={(e) => setTemaId(e.target.value)}
          aria-label="Konu" className="min-w-[150px] flex-1 rounded-xl px-3 py-2 text-sm outline-none" style={girdiStili}>
          <option value="">Konu seçmek istemiyorum</option>
          {(ders?.temalar ?? []).map((t) => (
            <option key={t.id} value={t.id}>{t.ad?.trim() ? t.ad : t.kod}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-2">
        <label className="flex min-w-[130px] flex-1 flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Tarih</span>
          <input type="date" value={tarih} max={bugun} onChange={(e) => setTarih(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm outline-none" style={girdiStili} />
        </label>
        <label className="flex min-w-[110px] flex-1 flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
            Süre (dk){tur === "soru" ? " — istersen" : ""}
          </span>
          <input type="number" inputMode="numeric" min={1} max={600} value={sure} onChange={(e) => setSure(e.target.value)}
            className="rounded-xl px-3 py-2 text-sm outline-none" style={girdiStili} />
        </label>
      </div>

      {tur === "soru" && (
        <div className="flex flex-wrap gap-2">
          {([["Doğru", dogru, setDogru], ["Yanlış", yanlis, setYanlis], ["Boş", bos, setBos]] as const).map(([etiket, deger, ayarla]) => (
            <label key={etiket} className="flex min-w-[90px] flex-1 flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{etiket}</span>
              <input type="number" inputMode="numeric" min={0} value={deger} onChange={(e) => ayarla(e.target.value)}
                className="rounded-xl px-3 py-2 text-sm outline-none" style={girdiStili} />
            </label>
          ))}
        </div>
      )}

      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
      {eklendi && (
        <p className="rounded-2xl px-3 py-2 text-[11px] font-semibold" style={{ background: MINT_BG, color: TEXT }}>
          Kaydedildi. İyi iş.
        </p>
      )}

      <button type="button" onClick={kaydet} disabled={pending || !dersId}
        className="sfec-btn self-start rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60"
        style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </div>
  );
}

// Öğretmenin kararı — SALT OKUNUR. Burada düğme yok, bilerek.
function OgretmenKararlari({ satirlar }: { satirlar: TemaYeterliligi[] }) {
  const kararlilar = satirlar.filter((s) => s.durum !== null);
  if (kararlilar.length === 0) return null;

  return (
    <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 className="text-sm font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
        Öğretmeninin değerlendirmesi
      </h2>
      <p className="mt-0.5 text-[11px]" style={{ color: TEXT_MUTED }}>
        Bu değerlendirmeyi öğretmenin yapar; buradan değiştirilemez.
      </p>
      <ul className="mt-2.5 flex flex-col gap-1.5">
        {kararlilar.map((s) => (
          <li key={s.temaId} className="rounded-2xl px-3 py-2" style={{ background: BG1_ALT }}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold" style={{ color: TEXT }}>{s.temaAdi}</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: MINT_BG, color: MINT }}>
                {YETERLILIK_ETIKET_OGRENCI[s.durum!]}
              </span>
            </div>
            {s.aciklama && <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>{s.aciklama}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function KayitListesi({ kayitlar }: { kayitlar: CalismaKaydi[] }) {
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (kayitlar.length === 0) {
    return (
      <div className="rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p className="text-sm font-semibold" style={{ color: TEXT }}>Bu bölümde henüz kayıt yok.</p>
        <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>Yukarıdan ilk çalışmanı ekleyebilirsin.</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
        Son kayıtların <span className="text-xs font-semibold" style={{ color: TEXT_MUTED }}>({kayitlar.length})</span>
      </h2>
      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
      {kayitlar.map((k) => (
        <div key={k.id} className="flex items-center gap-3 rounded-2xl p-3.5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: MINT_BG, color: MINT }}>{k.dersAdi}</span>
              <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>{k.tarih}</span>
            </div>
            <div className="mt-1 text-xs font-semibold" style={{ color: TEXT }}>
              {k.temaAdi ?? CALISMA_TURU_ETIKET[k.tur]}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: TEXT_MUTED }}>
              {k.tur === "soru"
                ? <span className="flex items-center gap-1"><PenLine size={11} /> {k.dogru ?? 0}D · {k.yanlis ?? 0}Y · {k.bos ?? 0}B</span>
                : <span className="flex items-center gap-1"><Check size={11} /> {CALISMA_TURU_ETIKET.konu}</span>}
              {k.sureDakika !== null && <span className="flex items-center gap-1"><Clock size={11} /> {k.sureDakika} dk</span>}
            </div>
          </div>
          <button type="button" disabled={pending} aria-label="Kaydı sil"
            onClick={() => {
              setHata(null);
              startTransition(async () => {
                const res = await ortaokulCalismaSil(k.id);
                if (res.error) setHata(res.error);
              });
            }}
            className="sfec-btn flex h-8 w-8 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
            style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
            <Trash2 size={12} color={TEXT_MUTED} />
          </button>
        </div>
      ))}
    </section>
  );
}
