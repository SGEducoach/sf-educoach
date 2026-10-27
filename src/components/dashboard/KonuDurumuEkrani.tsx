"use client";

// Konu Durumu (kullanıcı isteği 17.10.2026) — eski Konu Haritası'nın yerine.
// Sadelik önce: tek ölçü (konu puanı, 0-100), tek renk dili, ayrıntı yalnız
// konuya tıklanınca. Hesap sunucuda (konu-durumu.ts), burada yalnız gösterim
// ve ders süzgeci.
import { createContext, useContext, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, ClipboardCheck, Compass, Printer, TrendingDown, TrendingUp } from "lucide-react";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, BLUSH_BG, BUTTER, BUTTER_BG, MINT, MINT_BG, MINT_ON, SKY, SKY_BG, TEXT, TEXT_MUTED,
} from "@/lib/theme";
import { gorevVer } from "@/app/dashboard/gorev-actions";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import { LiseOgrenmeGelisimiPaneli } from "./LiseOgrenmeGelisimiPaneli";
import {
  ZORLANMA_ESIGI, oncelikliKonular, tabanDers,
  type KdHucre, type KdKarsilastirma, type KdKonu, type KdKonuSorusu, type KdOgrenciSkoru, type KonuDurumuVerisi,
} from "@/lib/konu-durumu";

const TUMU = "";

// Öğretmenin görev verebildiği sınıflar (sınıf öğretmenliği + ders atamaları).
// Boşsa görev kısayolu hiç gösterilmez (müdür, rehber, yönetici, moderatör).
const GorevSiniflari = createContext<Set<string>>(new Set());

// Baskıda koyu temanın renkleri kâğıtta okunmuyor; data-ton ile globals.css
// her tonu kâğıda uygun sabit renkle basar.
function puanTonu(puan: number): "zayif" | "orta" | "iyi" {
  return puan < ZORLANMA_ESIGI ? "zayif" : puan < 75 ? "orta" : "iyi";
}

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
    <div className="kd-iz h-2 w-full overflow-hidden rounded-full" style={{ background: BORDER }} aria-hidden="true">
      <div className="kd-renkli kd-dolgu h-full rounded-full" data-ton={puanTonu(puan)} style={{ width: `${Math.max(3, puan)}%`, background: puanRengi(puan).renk }} />
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
          <span style={{ color: renk }} data-ton={puanTonu(konu.ortalama)} className="kd-renkli w-9 shrink-0 text-right text-sm font-bold">%{konu.ortalama}</span>
        </span>
        <span className="order-2 flex items-center gap-2 justify-self-end sm:order-none">
          <span className="whitespace-nowrap text-[11px] font-semibold" style={{ color: zorlanan > 0 ? BLUSH : TEXT_MUTED }}>
            {zorlanan > 0 ? `${zorlanan}/${konu.ogrenciSayisi} zorlanıyor` : `${konu.ogrenciSayisi} öğrenci`}
          </span>
          <Gidisat konu={konu} />
        </span>
        <span className="hidden sm:block print:hidden">{acik ? <ChevronUp size={15} color={TEXT_MUTED} /> : <ChevronDown size={15} color={TEXT_MUTED} />}</span>
      </button>
      {acik && <KonuDetayi konu={konu} ogrenciLinki={ogrenciLinki} />}
    </div>
  );
}

function KonuDetayi({ konu, ogrenciLinki }: { konu: KdKonu; ogrenciLinki: boolean }) {
  const gorevSiniflari = useContext(GorevSiniflari);
  const atanabilir = konu.zorlananlar.filter((o) => o.classId !== null && gorevSiniflari.has(o.classId));
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
      {konu.sorular.length > 0 && <DenemeSorulari sorular={konu.sorular} />}
      {atanabilir.length > 0 && <GorevKisayolu konu={konu} ogrenciler={atanabilir} />}
    </div>
  );
}

// "Sorular 3-5, 8" gibi ardışık aralıkları kısaltır.
function soruAraligi(sorular: number[]): string {
  const parcalar: string[] = [];
  for (let i = 0; i < sorular.length; i++) {
    let j = i;
    while (j + 1 < sorular.length && sorular[j + 1] === sorular[j] + 1) j++;
    parcalar.push(j > i ? `${sorular[i]}–${sorular[j]}` : String(sorular[i]));
    i = j;
  }
  return parcalar.join(", ");
}

// Faz 2 — konunun son denemelerde hangi sorular olduğu (karnenin soru soru
// cevaplarından çıkarım; yalnız cevap tablosu olan karnelerde var).
function DenemeSorulari({ sorular }: { sorular: KdKonuSorusu[] }) {
  const gruplar = new Map<string, KdKonuSorusu[]>();
  for (const s of sorular) {
    const anahtar = `${s.denemeEtiketi}|${s.test}`;
    gruplar.set(anahtar, [...(gruplar.get(anahtar) ?? []), s]);
  }
  return (
    <div>
      <div style={{ color: TEXT_MUTED }} className="mb-1 text-[10px] font-bold uppercase tracking-wide">Denemedeki soruları</div>
      <ul className="flex flex-col gap-0.5 text-[11px]" style={{ color: TEXT, margin: 0, padding: 0, listStyle: "none" }}>
        {[...gruplar.values()].map((g) => (
          <li key={`${g[0].denemeEtiketi}|${g[0].test}`}>
            <span style={{ color: TEXT_MUTED }}>{g[0].denemeEtiketi} · {g[0].test.replace(/^(TYT|AYT)\s+/, "")} testi: </span>
            {g.map((s, i) => (
              <span key={s.kitapcik ?? i} style={{ color: s.kesin ? TEXT : TEXT_MUTED }} className={s.kesin ? "font-semibold" : ""}>
                {i > 0 ? " · " : ""}{s.kitapcik ? `${s.kitapcik} kitapçığı ` : ""}{s.kesin ? `soru ${soruAraligi(s.sorular)}` : `olası sorular ${soruAraligi(s.sorular)}`}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Faz 2 — "Bu öğrencilere görev ver". Mevcut görev sistemi (gorevVer) ders
// ve konu dolu çağrılır. Yalnız öğretmenin görev verebildiği sınıflardaki
// öğrenciler listelenir (sınıf öğretmenliği ya da ders ataması; veritabanı
// kuralı gorev_atamalari_insert_own ile aynı).
function GorevKisayolu({ konu, ogrenciler }: { konu: Pick<KdKonu, "ders" | "konu">; ogrenciler: Pick<KdOgrenciSkoru, "id" | "ad">[] }) {
  const router = useRouter();
  const [acik, setAcik] = useState(false);
  const [tur, setTur] = useState<"soru" | "konu">("soru");
  const [hedef, setHedef] = useState("20");
  const [sonTarih, setSonTarih] = useState(() => tarihEkle(bugununTarihiTR(), 7));
  const [secili, setSecili] = useState<Set<string>>(() => new Set(ogrenciler.map((o) => o.id)));
  const [mesaj, setMesaj] = useState<{ hata: boolean; metin: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!acik) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => { setAcik(true); setMesaj(null); }}
          className="sfec-btn inline-flex w-fit items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>
          <ClipboardCheck size={13} aria-hidden="true" /> Bu {ogrenciler.length} öğrenciye görev ver
        </button>
        {mesaj && !mesaj.hata && <span className="text-[11px] font-semibold" style={{ color: MINT }}>{mesaj.metin}</span>}
      </div>
    );
  }

  function gonder() {
    const bugun = bugununTarihiTR();
    const sayi = Number(hedef);
    if (secili.size === 0) return setMesaj({ hata: true, metin: "En az bir öğrenci seçin." });
    if (!Number.isFinite(sayi) || sayi <= 0) return setMesaj({ hata: true, metin: tur === "soru" ? "Soru sayısı girin." : "Süre girin." });
    startTransition(async () => {
      const r = await gorevVer({
        studentIds: [...secili], tur, ders: tabanDers(konu.ders), konu: konu.konu,
        hedefSoruSayisi: tur === "soru" ? sayi : undefined, hedefDakika: tur === "konu" ? sayi : undefined,
        tarih: bugun, sonTarih: sonTarih >= bugun ? sonTarih : bugun,
      });
      if (r.error) setMesaj({ hata: true, metin: r.error });
      else { setMesaj({ hata: false, metin: `${r.ogrenciSayisi} öğrenciye görev verildi.` }); setAcik(false); router.refresh(); }
    });
  }

  const girdi = { background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` };
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl p-3" style={{ background: BG1, border: `2px solid ${BORDER_STRONG}` }}>
      <div style={{ color: TEXT }} className="text-xs font-bold">Görev: {tabanDers(konu.ders)} · {konu.konu}</div>
      <div className="flex flex-wrap gap-1.5">
        {ogrenciler.map((o) => (
          <label key={o.id} className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ border: `1px solid ${BORDER_STRONG}`, color: secili.has(o.id) ? TEXT : TEXT_MUTED }}>
            <input type="checkbox" checked={secili.has(o.id)}
              onChange={(e) => setSecili((s) => { const y = new Set(s); if (e.target.checked) y.add(o.id); else y.delete(o.id); return y; })} />
            {o.ad}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Görev türü</span>
          <select value={tur} onChange={(e) => { const t = e.target.value as "soru" | "konu"; setTur(t); setHedef(t === "soru" ? "20" : "40"); }}
            className="rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none" style={girdi}>
            <option value="soru">Soru çözümü</option>
            <option value="konu">Konu çalışma</option>
          </select>
        </label>
        <label className="flex w-24 flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{tur === "soru" ? "Soru sayısı" : "Süre (dk)"}</span>
          <input type="number" min={1} value={hedef} onChange={(e) => setHedef(e.target.value)}
            className="rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none" style={girdi} />
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Son tarih</span>
          <input type="date" value={sonTarih} onChange={(e) => setSonTarih(e.target.value)}
            className="rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none" style={girdi} />
        </label>
        <button type="button" onClick={gonder} disabled={pending}
          className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Veriliyor…" : `Görevi ver (${secili.size})`}
        </button>
        <button type="button" onClick={() => setAcik(false)} className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold" style={{ color: TEXT_MUTED }}>
          Vazgeç
        </button>
      </div>
      {mesaj && <div className="text-[11px] font-semibold" style={{ color: mesaj.hata ? BLUSH : MINT }}>{mesaj.metin}</div>}
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
            <span style={{ color: renk }} data-ton={puanTonu(ortalama)} className="kd-renkli text-sm font-bold">%{ortalama}</span>
          </span>
          <span className="mt-1.5 block"><PuanCubugu puan={ortalama} /></span>
          <span style={{ color: TEXT_MUTED }} className="mt-1 block text-[11px]">
            {ogrenciSayisi} öğrenci · {konular.length} konu{zayifKonuSayisi > 0 ? ` · ${zayifKonuSayisi} konuda ortalama 50'nin altında` : ""}
          </span>
        </span>
        {acik ? <ChevronUp size={16} color={TEXT_MUTED} className="print:hidden" /> : <ChevronDown size={16} color={TEXT_MUTED} className="print:hidden" />}
      </button>
      {acik && <div className="pb-2">{konular.map((k) => <KonuSatiri key={k.anahtar} konu={k} dersGoster={false} ogrenciLinki={ogrenciLinki} />)}</div>}
    </div>
  );
}

export function KonuDurumuEkrani({ gorevSiniflari = [], ...props }: {
  veri: KonuDurumuVerisi | null;
  hata?: string | null;
  kapsamlar: { anahtar: string; etiket: string }[];
  seciliAnahtar: string;
  ogrenciLinki?: boolean;
  bosMesaj?: string;
  gorevSiniflari?: string[];
}) {
  const siniflar = useMemo(() => new Set(gorevSiniflari), [gorevSiniflari]);
  return <GorevSiniflari.Provider value={siniflar}><KonuDurumuIcerik {...props} /></GorevSiniflari.Provider>;
}

function KonuDurumuIcerik({ veri, hata, kapsamlar, seciliAnahtar, ogrenciLinki = true, bosMesaj }: {
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
  const [gorunum, setGorunum] = useState<"konular" | "gelisim">("konular");
  const gorevSiniflari = useContext(GorevSiniflari);

  const dersler = veri?.dersler ?? [];
  // Süzgeç taban derse göre: "Matematik" seçilince "Matematik (Branş)" da gelir.
  const dersSecenekleri = [...new Set([...dersler.map((d) => tabanDers(d.ders)),
    ...(veri?.ogrenmeGelisimi?.takipler.map((g) => tabanDers(g.ders)) ?? [])])];
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

  const kapsamEtiketi = kapsamlar.find((k) => k.anahtar === seciliAnahtar)?.etiket;

  return (
    // sfec-konu-durumu: yazdırmada sayfanın geri kalanı gizlenir (globals.css).
    <div className="sfec-konu-durumu sfec-fade flex flex-col gap-5 rounded-3xl p-5 sm:p-6" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="hidden print:block">
        <div className="text-lg font-bold">Konu Durumu{kapsamEtiketi ? ` — ${kapsamEtiketi}` : ""}{gecerliDers ? ` — ${gecerliDers}` : ""}</div>
        <div className="text-xs">Oluşturulma: {tarihGoster(bugununTarihiTR())} · SeFu Koç</div>
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
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
          {veri && veri.konular.length > 0 && (
            <button type="button" onClick={() => window.print()}
              className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={secimStili}>
              <Printer size={13} aria-hidden="true" /> Yazdır / PDF
            </button>
          )}
        </div>
      </div>

      {veri?.ogrenmeGelisimi && <div className="flex flex-wrap gap-2 print:hidden" role="group" aria-label="Konu raporu görünümü">
        {([["konular", "Konu Özeti"], ["gelisim", "Öğrenme Gelişimi"]] as const).map(([id, etiket]) => (
          <button key={id} type="button" aria-pressed={gorunum === id} onClick={() => setGorunum(id)}
            className="sfec-btn min-h-11 rounded-full px-4 py-2 text-xs font-bold"
            style={{ background: gorunum === id ? MINT_BG : BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>{etiket}</button>
        ))}
      </div>}

      {pending && <p style={{ color: TEXT_MUTED }} className="text-xs font-semibold">Yükleniyor…</p>}

      {hata ? (
        <p style={{ color: BLUSH }} className="text-sm font-semibold">Konu verisi alınamadı: {hata}</p>
      ) : gorunum === "gelisim" && veri?.ogrenmeGelisimi ? (
        <LiseOgrenmeGelisimiPaneli key={gecerliDers} veri={veri.ogrenmeGelisimi} ders={gecerliDers}
          calismaVer={(ogrenci, konu) => ogrenci.classId && gorevSiniflari.has(ogrenci.classId)
            ? <GorevKisayolu key={`${ogrenci.id}|${konu.ders}|${konu.konu}`} konu={konu} ogrenciler={[ogrenci]} /> : null} />
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
            <h3 style={{ color: TEXT }} className="text-sm font-bold">Öncelikli Konular</h3>
            <p style={{ color: TEXT_MUTED }} className="mb-1 text-[11px]">En çok öğrencinin, en derin zorlandığı konular. Kimlerin zorlandığını görmek için konuya tıklayın.</p>
            {oncelikliler.length === 0
              ? <p style={{ color: MINT }} className="py-3 text-sm font-semibold">Birden çok öğrencinin zorlandığı konu yok.</p>
              : oncelikliler.map((k) => <KonuSatiri key={k.anahtar} konu={k} dersGoster ogrenciLinki={ogrenciLinki} />)}
          </section>

          {veri.karsilastirma && <SinifKarsilastirmasi karsilastirma={veri.karsilastirma} ders={gecerliDers} />}

          <section aria-label="Ders ders" className="flex flex-col gap-2">
            <h3 style={{ color: TEXT }} className="text-sm font-bold">Ders Ders</h3>
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

// Faz 3 — sınıflar arası karşılaştırma: satır konu, sütun sınıf, hücre o
// sınıftaki öğrencilerin konu puanı ortalaması. İlk satır sınıfın genel
// puanı. Ders süzgeci tabloyu da daraltır.
function SinifKarsilastirmasi({ karsilastirma, ders }: { karsilastirma: KdKarsilastirma; ders: string }) {
  const satirlar = karsilastirma.satirlar.filter((s) => !ders || tabanDers(s.ders) === ders).slice(0, 12);
  const genel = karsilastirma.genel[ders] ?? karsilastirma.genel[""];
  if (satirlar.length === 0) return null;
  const hucre = (h: KdHucre | { ortalama: number; ogrenciSayisi: number } | null, sinif: string, kalin = false) => {
    if (!h) return <td key={sinif} className="px-1 py-1.5 text-center" style={{ color: TEXT_MUTED }}>—</td>;
    const { renk, zemin } = puanRengi(h.ortalama);
    const zorlanan = "zorlanan" in h ? `, ${h.zorlanan} zorlanıyor` : "";
    return (
      <td key={sinif} data-ton={puanTonu(h.ortalama)} className={`kd-renkli kd-hucre rounded-md px-1 py-1.5 text-center ${kalin ? "font-extrabold" : "font-bold"}`}
        style={{ background: zemin, color: renk }} title={`${sinif}: %${h.ortalama} · ${h.ogrenciSayisi} öğrenci${zorlanan}`}>
        %{h.ortalama}
      </td>
    );
  };
  return (
    <section aria-label="Sınıflar arası karşılaştırma">
      <h3 style={{ color: TEXT }} className="text-sm font-bold">Sınıflar Arası Karşılaştırma</h3>
      <p style={{ color: TEXT_MUTED }} className="mb-2 text-[11px]">
        Her hücre o sınıftaki öğrencilerin konu puanı ortalaması; üzerine gelince öğrenci ve zorlanan sayısı görünür. Konular en çok öğrencinin zorlandığına göre sıralı.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-separate text-[11px]" style={{ borderSpacing: 3 }}>
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[9rem] px-1 text-left font-semibold" style={{ background: BG1, color: TEXT_MUTED }}>Konu</th>
              {karsilastirma.siniflar.map((s) => <th key={s.classId} className="px-1 text-center font-bold" style={{ color: TEXT }}>{s.sinif}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="sticky left-0 z-10 px-1 py-1.5 font-bold" style={{ background: BG1, color: TEXT }}>Genel{ders ? ` (${ders})` : ""}</td>
              {karsilastirma.siniflar.map((s, i) => hucre(genel?.[i] ?? null, s.sinif, true))}
            </tr>
            {satirlar.map((satir) => (
              <tr key={satir.anahtar}>
                <td className="sticky left-0 z-10 max-w-[16rem] px-1 py-1" style={{ background: BG1 }}>
                  <span style={{ color: TEXT }} className="line-clamp-2 font-semibold" title={satir.konu}>{satir.konu}</span>
                  <span style={{ color: TEXT_MUTED }} className="block text-[10px]">{satir.ders} · {satir.zorlanan} zorlanıyor</span>
                </td>
                {karsilastirma.siniflar.map((s, i) => hucre(satir.hucreler[i], s.sinif))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
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
