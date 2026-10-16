"use client";

// Konu Durumu (kullanıcı isteği 17.10.2026) — eski Konu Haritası'nın yerine.
// Sadelik önce: tek ölçü (konu puanı, 0-100), tek renk dili, ayrıntı yalnız
// konuya tıklanınca. Hesap sunucuda (konu-durumu.ts), burada yalnız gösterim
// ve ders süzgeci.
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Compass, TrendingDown, TrendingUp } from "lucide-react";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, BLUSH_BG, BUTTER, BUTTER_BG, MINT, MINT_BG, SKY, SKY_BG, TEXT, TEXT_MUTED,
} from "@/lib/theme";
import { ZORLANMA_ESIGI, oncelikliKonular, tabanDers, type KdKonu, type KonuDurumuVerisi } from "@/lib/konu-durumu";

const TUMU = "";

function puanRengi(puan: number): { renk: string; zemin: string } {
  if (puan < ZORLANMA_ESIGI) return { renk: BLUSH, zemin: BLUSH_BG };
  if (puan < 75) return { renk: BUTTER, zemin: BUTTER_BG };
  return { renk: MINT, zemin: MINT_BG };
}

function tarihGoster(tarih: string): string {
  const [y, a, g] = tarih.split("-");
  return `${g}.${a}.${y}`;
}

function PuanCubugu({ puan }: { puan: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: BORDER }} aria-hidden="true">
      <div className="h-full rounded-full" style={{ width: `${Math.max(3, puan)}%`, background: puanRengi(puan).renk }} />
    </div>
  );
}

function Gidisat({ konu }: { konu: KdKonu }) {
  if (!konu.gidisat) return null;
  const artti = konu.gidisat.son > konu.gidisat.ilk;
  const Icon = artti ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold" style={{ color: artti ? MINT : BLUSH }}
      title={`Denemede başarı: ${tarihGoster(konu.gidisat.ilkTarih)} %${konu.gidisat.ilk} → ${tarihGoster(konu.gidisat.sonTarih)} %${konu.gidisat.son}`}>
      <Icon size={12} aria-hidden="true" /> {artti ? "yükseliyor" : "düşüyor"}
    </span>
  );
}

function KonuSatiri({ konu, dersGoster, ogrenciLinki }: { konu: KdKonu; dersGoster: boolean; ogrenciLinki: boolean }) {
  const [acik, setAcik] = useState(false);
  const { renk } = puanRengi(konu.ortalama);
  const zorlanan = konu.zorlananlar.length;
  return (
    <div style={{ borderTop: `1px solid ${BORDER}` }}>
      <button type="button" onClick={() => setAcik((a) => !a)} aria-expanded={acik}
        className="sfec-btn grid w-full grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5 py-2.5 text-left sm:grid-cols-[minmax(0,1fr)_9rem_auto_auto]">
        <span className="min-w-0">
          <span style={{ color: TEXT }} className="line-clamp-2 text-sm font-semibold" title={konu.konu}>{konu.konu}</span>
          {dersGoster && <span style={{ color: TEXT_MUTED }} className="block text-[11px]">{konu.ders}</span>}
        </span>
        <span className="order-3 col-span-2 flex items-center gap-2 sm:order-none sm:col-span-1">
          <PuanCubugu puan={konu.ortalama} />
          <span style={{ color: renk }} className="w-9 shrink-0 text-right text-sm font-bold">%{konu.ortalama}</span>
        </span>
        <span className="order-2 flex items-center gap-2 justify-self-end sm:order-none">
          <span className="whitespace-nowrap text-[11px] font-semibold" style={{ color: zorlanan > 0 ? BLUSH : TEXT_MUTED }}>
            {zorlanan > 0 ? `${zorlanan}/${konu.ogrenciSayisi} zorlanıyor` : `${konu.ogrenciSayisi} öğrenci`}
          </span>
          <Gidisat konu={konu} />
        </span>
        <span className="hidden sm:block">{acik ? <ChevronUp size={15} color={TEXT_MUTED} /> : <ChevronDown size={15} color={TEXT_MUTED} />}</span>
      </button>
      {acik && <KonuDetayi konu={konu} ogrenciLinki={ogrenciLinki} />}
    </div>
  );
}

function KonuDetayi({ konu, ogrenciLinki }: { konu: KdKonu; ogrenciLinki: boolean }) {
  const kaynaklar: string[] = [];
  if (konu.deneme) kaynaklar.push(`Deneme: %${konu.deneme.basari} başarı (${konu.deneme.soru} soru · ${konu.deneme.dogru} D · ${konu.deneme.yanlis} Y · ${konu.deneme.bos} B, ${konu.deneme.denemeSayisi} deneme)`);
  if (konu.soruCozumu) kaynaklar.push(`Soru çözümü: %${konu.soruCozumu.basari} doğru (${konu.soruCozumu.dogru} D · ${konu.soruCozumu.yanlis} Y)`);
  if (konu.beyan) kaynaklar.push(`Öğrenci beyanı: ${konu.beyan.uzak} yetersiz · ${konu.beyan.belirsiz} orta · ${konu.beyan.yakin} yeterli`);
  if (konu.oturumSayisi > 0) kaynaklar.push(`Konu çalışma: ${konu.oturumSayisi} oturum`);
  return (
    <div className="mb-3 flex flex-col gap-3 rounded-2xl p-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
      <div>
        <div style={{ color: TEXT_MUTED }} className="mb-1.5 text-[10px] font-bold uppercase tracking-wide">
          {konu.zorlananlar.length > 0 ? `Zorlanan öğrenciler (${konu.zorlananlar.length})` : "Zorlanan öğrenci yok"}
        </div>
        {konu.zorlananlar.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {konu.zorlananlar.map((o) => {
              const icerik = <>{o.ad}{o.sinif ? <span style={{ color: TEXT_MUTED }}> · {o.sinif}</span> : null} <span style={{ color: BLUSH }}>%{o.skor}</span></>;
              const stil = { background: BG1, border: `1px solid ${BORDER_STRONG}`, color: TEXT };
              return ogrenciLinki ? (
                <Link key={o.id} href={`/dashboard?bolum=ozet&sinif=${o.classId ?? ""}&ogrenci=${o.id}`}
                  className="sfec-btn rounded-full px-2.5 py-1 text-[11px] font-semibold" style={stil}>{icerik}</Link>
              ) : (
                <span key={o.id} className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={stil}>{icerik}</span>
              );
            })}
          </div>
        )}
      </div>
      <div>
        <div style={{ color: TEXT_MUTED }} className="mb-1 text-[10px] font-bold uppercase tracking-wide">Neye dayanıyor</div>
        <ul className="flex flex-col gap-0.5 text-[11px]" style={{ color: TEXT, margin: 0, padding: 0, listStyle: "none" }}>
          {kaynaklar.map((k) => <li key={k}>{k}</li>)}
        </ul>
      </div>
    </div>
  );
}

function DersBolumu({ ders, ortalama, konular, zayifKonuSayisi, ogrenciSayisi, ogrenciLinki }: {
  ders: string; ortalama: number; konular: KdKonu[]; zayifKonuSayisi: number; ogrenciSayisi: number; ogrenciLinki: boolean;
}) {
  const [acik, setAcik] = useState(false);
  const { renk } = puanRengi(ortalama);
  return (
    <div className="rounded-2xl px-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <button type="button" onClick={() => setAcik((a) => !a)} aria-expanded={acik}
        className="sfec-btn flex w-full items-center gap-3 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span style={{ color: TEXT }} className="text-sm font-bold">{ders}</span>
            <span style={{ color: renk }} className="text-sm font-bold">%{ortalama}</span>
          </span>
          <span className="mt-1.5 block"><PuanCubugu puan={ortalama} /></span>
          <span style={{ color: TEXT_MUTED }} className="mt-1 block text-[11px]">
            {ogrenciSayisi} öğrenci · {konular.length} konu{zayifKonuSayisi > 0 ? ` · ${zayifKonuSayisi} konuda ortalama 50'nin altında` : ""}
          </span>
        </span>
        {acik ? <ChevronUp size={16} color={TEXT_MUTED} /> : <ChevronDown size={16} color={TEXT_MUTED} />}
      </button>
      {acik && <div className="pb-2">{konular.map((k) => <KonuSatiri key={k.anahtar} konu={k} dersGoster={false} ogrenciLinki={ogrenciLinki} />)}</div>}
    </div>
  );
}

export function KonuDurumuEkrani({ veri, hata, kapsamlar, seciliAnahtar, ogrenciLinki = true, bosMesaj }: {
  veri: KonuDurumuVerisi | null;
  hata?: string | null;
  kapsamlar: { anahtar: string; etiket: string }[];
  seciliAnahtar: string;
  ogrenciLinki?: boolean;
  bosMesaj?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [ders, setDers] = useState(TUMU);

  const dersler = veri?.dersler ?? [];
  // Süzgeç taban derse göre: "Matematik" seçilince "Matematik (Branş)" da gelir.
  const dersSecenekleri = [...new Set(dersler.map((d) => tabanDers(d.ders)))];
  const gecerliDers = dersSecenekleri.includes(ders) ? ders : TUMU;
  const dersUyar = (d: string) => gecerliDers === TUMU || tabanDers(d) === gecerliDers;
  const konular = useMemo(
    () => (veri?.konular ?? []).filter((k) => gecerliDers === TUMU || tabanDers(k.ders) === gecerliDers),
    [veri, gecerliDers],
  );
  const oncelikliler = useMemo(
    () => (gecerliDers === TUMU ? veri?.oncelikliler ?? [] : oncelikliKonular(konular, veri?.veriliOgrenciSayisi ?? 0)),
    [veri, konular, gecerliDers],
  );

  function kapsamSec(anahtar: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("kapsam", anahtar);
    startTransition(() => router.push(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  const secimStili = { background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` };

  return (
    <div className="sfec-fade flex flex-col gap-5 rounded-3xl p-5 sm:p-6 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: SKY_BG }}>
            <Compass size={15} color={SKY} aria-hidden="true" />
          </div>
          <div>
            <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold leading-tight">Konu Durumu</h2>
            <p style={{ color: TEXT_MUTED }} className="text-xs">Öğrencilerin denemedeki, soru çözümündeki ve kendi beyanlarındaki konu hakimiyeti.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {kapsamlar.length > 1 && (
            <select value={seciliAnahtar} onChange={(e) => kapsamSec(e.target.value)} disabled={pending} aria-label="Kapsam"
              className="rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={secimStili}>
              {kapsamlar.map((k) => <option key={k.anahtar} value={k.anahtar}>{k.etiket}</option>)}
            </select>
          )}
          {dersSecenekleri.length > 1 && (
            <select value={gecerliDers} onChange={(e) => setDers(e.target.value)} aria-label="Ders"
              className="rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={secimStili}>
              <option value={TUMU}>Tüm dersler</option>
              {dersSecenekleri.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
        </div>
      </div>

      {pending && <p style={{ color: TEXT_MUTED }} className="text-xs font-semibold">Yükleniyor…</p>}

      {hata ? (
        <p style={{ color: BLUSH }} className="text-sm font-semibold">Konu verisi alınamadı: {hata}</p>
      ) : !veri ? (
        <p style={{ color: TEXT_MUTED }} className="py-6 text-center text-sm">{bosMesaj ?? "Bu görünüm için öğrenci kapsamı yok."}</p>
      ) : veri.konular.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="py-6 text-center text-sm">
          {veri.ogrenciSayisi === 0
            ? "Bu kapsamda öğrenci yok."
            : "Henüz konu verisi yok. Karneli deneme PDF'i yüklendiğinde ya da öğrenciler soru çözümü / konu hakimiyeti girdikçe burası dolar."}
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <OzetKutusu deger={String(oncelikliler.length)} etiket="öncelikli konu" vurgu={oncelikliler.length > 0 ? BLUSH : MINT} />
            <OzetKutusu deger={`${veri.veriliOgrenciSayisi}/${veri.ogrenciSayisi}`} etiket="öğrencinin verisi var" />
            <OzetKutusu deger={veri.sonDeneme ? tarihGoster(veri.sonDeneme.tarih) : "—"}
              etiket={veri.sonDeneme ? `son deneme · ${veri.sonDeneme.etiket.split(" · ").slice(1).join(" · ")}` : "karneli deneme yok"} />
          </div>

          <section aria-label="Öncelikli konular">
            <h3 style={{ color: TEXT }} className="text-sm font-bold">Öncelikli konular</h3>
            <p style={{ color: TEXT_MUTED }} className="mb-1 text-[11px]">En çok öğrencinin, en derin zorlandığı konular. Kimlerin zorlandığını görmek için konuya tıklayın.</p>
            {oncelikliler.length === 0
              ? <p style={{ color: MINT }} className="py-3 text-sm font-semibold">Birden çok öğrencinin zorlandığı konu yok.</p>
              : oncelikliler.map((k) => <KonuSatiri key={k.anahtar} konu={k} dersGoster ogrenciLinki={ogrenciLinki} />)}
          </section>

          <section aria-label="Ders ders" className="flex flex-col gap-2">
            <h3 style={{ color: TEXT }} className="text-sm font-bold">Ders ders</h3>
            {dersler.filter((d) => dersUyar(d.ders)).map((d) => (
              <DersBolumu key={d.ders} ders={d.ders} ortalama={d.ortalama} zayifKonuSayisi={d.zayifKonuSayisi} ogrenciSayisi={d.ogrenciSayisi}
                konular={konular.filter((k) => k.ders === d.ders)} ogrenciLinki={ogrenciLinki} />
            ))}
          </section>

          <p style={{ color: TEXT_MUTED }} className="text-[11px]">
            Konu puanı öğrencinin kendi Konu Hakimiyeti ekranındaki puanla aynı hesaptır: deneme ve soru çözümü doğruluğu %50,
            öğrencinin beyanı %30, konu çalışma değerlendirmesi %20 ağırlıklı. {ZORLANMA_ESIGI}&apos;nin altı &quot;zorlanıyor&quot; sayılır.
          </p>
        </>
      )}
    </div>
  );
}

function OzetKutusu({ deger, etiket, vurgu }: { deger: string; etiket: string; vurgu?: string }) {
  return (
    <div className="min-w-0 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
      <div style={{ color: vurgu ?? TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold leading-none sm:text-xl">{deger}</div>
      <div style={{ color: TEXT_MUTED }} className="mt-1 text-[10px] leading-tight sm:text-[11px]">{etiket}</div>
    </div>
  );
}
