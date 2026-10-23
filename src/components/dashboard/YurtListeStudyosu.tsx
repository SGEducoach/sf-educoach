"use client";

// Yurt listesi kartları (kullanıcı isteği 18.10.2026): akşam yoklamasında
// olmayanlar, evci ve çarşı iznine gidecekler. Kart yoklama isteyen müdür
// yardımcısına WhatsApp'tan gider. Kadın öğretmen kız, erkek öğretmen erkek
// öğrencilerin listesini hazırlar; müdür iki grubu da seçebilir ve cinsiyet
// bilgisini girer. Logo kurumun logosu (yatay ise çerçevesiz); yoksa
// kurumun baş harfleri. Kart saklanmaz.
import { useEffect, useMemo, useState, useTransition } from "react";
import { Download, Inbox, Send, Share2, Users } from "lucide-react";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { bugununTarihiTR } from "@/lib/tarih";
import { kartTarihi } from "@/lib/whatsapp-duyuru";
import { sinifSiraKarsilastir } from "@/lib/types";
import {
  YURT_LISTE_SAYFA_SATIRI, YURT_SABLONLARI, grupEtiketi, ogretmeninGrubu, yurtBilgiSatirlari, yurtKartImzasi, yurtSayfalari, yurtVarsayilanlari,
  type OgrenciCinsiyeti, type OgretmenCinsiyeti, type YurtOgrencisi, type YurtSablonu,
} from "@/lib/yurt-listesi";
import { yurtListesiCiz } from "@/components/dashboard/whatsapp-kart-cizim";
import { Alan, FotoSecici, Onizleme, girdiStili, gorselYukle, indirVeyaPaylas, useFotoSecimi, yaziTipi } from "@/components/dashboard/whatsapp-ortak";
import { cinsiyetKaydet } from "@/app/dashboard/yurt-cinsiyet-actions";
import { gelenYoklamalar, yoklamaGonder, type GelenYoklama } from "@/app/dashboard/yoklama-actions";
import type { EtkinSablon } from "@/lib/whatsapp-sablon-ayarlari";

export interface YurtOgretmeni { id: string; ad: string; brans: string | null; cinsiyet: OgretmenCinsiyeti | null }
export interface YurtVerisi {
  ogrenciler: YurtOgrencisi[];
  ogretmenler: YurtOgretmeni[];          // yalnız müdüre dolu gelir
  benimCinsiyetim: OgretmenCinsiyeti | null;
  mudurMu: boolean;
  hazirlayan: string;
  cinsiyetHazir: boolean;                // migration 0161 uygulandı mı
  okulId?: string;                       // admin başka kurum adına girerken
}

const kucukBaslik = "text-[10px] font-semibold uppercase tracking-wide";
const sinifSirala = (a: YurtOgrencisi, b: YurtOgrencisi) =>
  (a.seviye && b.seviye && a.sube && b.sube ? sinifSiraKarsilastir({ seviye: a.seviye, sube: a.sube }, { seviye: b.seviye, sube: b.sube }) : 0) || a.ad.localeCompare(b.ad, "tr");

// baslangic: müdür yardımcısının açtığı gelen yoklama (Faz 3) — form ondan dolar.
export interface YoklamaBaslangici { grup: OgrenciCinsiyeti; degerler: Record<string, string>; secili: Record<string, string>; hazirlayanAdi: string }

export function YurtListeDuzenleyici({ sablon, etkin, kurumAdi, logo: kurumLogosu, yurt, paylasilabilir, baslangic = null }: {
  sablon: YurtSablonu; etkin: EtkinSablon; kurumAdi: string; logo: string | null; yurt: YurtVerisi; paylasilabilir: boolean;
  baslangic?: YoklamaBaslangici | null;
}) {
  const kendiGrubum = ogretmeninGrubu(yurt.benimCinsiyetim);
  const [grup, setGrup] = useState<OgrenciCinsiyeti>(baslangic?.grup ?? kendiGrubum ?? "kiz");
  const [degerler, setDegerler] = useState<Record<string, string>>(() => ({ ...yurtVarsayilanlari(sablon, bugununTarihiTR()), ...(baslangic?.degerler ?? {}) }));
  const [arama, setArama] = useState("");
  const [secili, setSecili] = useState<Record<string, string>>(baslangic?.secili ?? {}); // anahtar → not
  const foto = useFotoSecimi(etkin.fotolar);
  const [sayfa, setSayfa] = useState(0);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [durum, setDurum] = useState<string | null>(null);
  const [gonderiliyor, startGonder] = useTransition();

  const grubum = yurt.mudurMu ? grup : kendiGrubum;
  const gruptakiler = useMemo(() => yurt.ogrenciler.filter((o) => o.cinsiyet === grubum), [yurt.ogrenciler, grubum]);
  const cinsiyetsiz = yurt.ogrenciler.filter((o) => !o.cinsiyet).length;
  const aramaKucuk = arama.toLocaleLowerCase("tr-TR");
  const listelenen = gruptakiler.filter((o) => !aramaKucuk || o.ad.toLocaleLowerCase("tr-TR").includes(aramaKucuk) || (o.okulNo ?? "").includes(aramaKucuk));
  const secilenler = useMemo(() => gruptakiler.filter((o) => o.anahtar in secili).sort(sinifSirala), [gruptakiler, secili]);
  const sayfalar = useMemo(() => yurtSayfalari(secilenler), [secilenler]);
  const gecerliSayfa = Math.min(sayfa, sayfalar.length - 1);

  // Öğretmen yoklamayı yurt sorumlusu müdür yardımcısına gönderir (Faz 3).
  const mudurYardimcisinaGonder = () => {
    if (!grubum) return;
    const ogrenciler = secilenler.map((o) => ({ anahtar: o.anahtar, ad: o.ad, okulNo: o.okulNo ?? "", sinif: o.sinif ?? "", not: secili[o.anahtar] ?? "" }));
    setDurum(null);
    startGonder(async () => {
      const r = await yoklamaGonder({ tur: sablon.anahtar, grup: grubum, alanlar: degerler, ogrenciler });
      setDurum(r.error ?? `Müdür yardımcısına gönderildi${r.aliciSayisi > 1 ? ` (${r.aliciSayisi} kişi)` : ""}.`);
    });
  };

  async function ciz(i: number): Promise<HTMLCanvasElement> {
    const canvas = document.createElement("canvas");
    const fotoKaynak = foto.kaynak;
    const [aile, logo, fotoImg] = await Promise.all([yaziTipi(), gorselYukle(kurumLogosu), gorselYukle(fotoKaynak)]);
    const s = sayfalar[i] ?? [];
    yurtListesiCiz(canvas, {
      kurumAdi, logo, foto: fotoImg, baslik: etkin.baslik ?? sablon.ad, grupEtiketi: grupEtiketi(grubum ?? "kiz"),
      bilgi: yurtBilgiSatirlari(sablon.anahtar, degerler), notEtiketi: sablon.notEtiketi, bosMesaj: sablon.bosMesaj,
      satirlar: s.map((o, j) => ({ no: i * YURT_LISTE_SAYFA_SATIRI + j + 1, ad: o.ad, okulNo: o.okulNo ?? "", sinif: o.sinif ?? "", not: secili[o.anahtar] ?? "" })),
      sayfa: i + 1, toplamSayfa: sayfalar.length, toplamOgrenci: secilenler.length,
      imza: yurtKartImzasi(baslangic?.hazirlayanAdi ?? yurt.hazirlayan, degerler.ekOgretmen), renk: sablon.renk, aile,
    });
    return canvas;
  }

  useEffect(() => {
    if (!grubum) return;
    let iptal = false;
    const z = window.setTimeout(async () => {
      const c = await ciz(gecerliSayfa);
      if (!iptal) setOnizleme(c.toDataURL("image/png"));
    }, 150);
    return () => { iptal = true; window.clearTimeout(z); };
    // ciz her çizimde yeniden kurulur; bağımlılıklar çizimin girdileri.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gecerliSayfa, sayfalar, secili, degerler, foto.kaynak, grubum, kurumAdi, kurumLogosu, etkin.baslik]);

  async function cikti(i: number, paylas: boolean) {
    const c = await ciz(i);
    const ad = `${sablon.anahtar}-${grubum}-${(degerler.tarih || degerler.cikisTarihi || bugununTarihiTR())}${sayfalar.length > 1 ? `-${i + 1}` : ""}.png`;
    const ok = await indirVeyaPaylas(c, ad, paylas);
    if (ok) setDurum(paylas ? "Kart paylaşıldı. Sistemde saklanmadı." : "Kart indirildi. Sistemde saklanmadı.");
  }

  if (!yurt.cinsiyetHazir) {
    return <Uyari metin="Yurt listeleri için cinsiyet bilgisi altyapısı henüz kurulmadı (veritabanı güncellemesi bekleniyor)." />;
  }
  if (!grubum) {
    return <Uyari metin="Cinsiyet bilginiz girilmemiş. Kız ya da erkek öğrencilerin listesini hazırlayabilmeniz için müdürünüzden bilginizi işaretlemesini isteyin." />;
  }

  return (
    <section className="sfec-fade grid gap-4 rounded-3xl p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold" style={{ color: TEXT }}>{etkin.ad}</h3>
          {yurt.mudurMu ? (
            <div className="inline-flex gap-1 rounded-xl p-1" style={{ background: BG1_ALT }}>
              {(["kiz", "erkek"] as const).map((g) => (
                <button key={g} type="button" onClick={() => { setGrup(g); setSecili({}); setSayfa(0); }} aria-pressed={grup === g}
                  className="sfec-btn rounded-lg px-3 py-1.5 text-[11px] font-bold" style={grup === g ? { background: MINT, color: MINT_ON } : { color: TEXT_MUTED }}>
                  {grupEtiketi(g)}
                </button>
              ))}
            </div>
          ) : (
            <span className="rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: MINT_BG, color: TEXT }}>{grupEtiketi(grubum)}</span>
          )}
        </div>

        {baslangic && (
          <p className="rounded-xl px-3 py-2 text-[11px] font-semibold" style={{ background: MINT_BG, color: TEXT }}>
            {baslangic.hazirlayanAdi} öğretmenin gönderdiği liste açıldı. Eklemeniz gereken öğrenci varsa işaretleyin, sonra kartı paylaşın.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {sablon.alanlar.map((a) => {
            const id = `yurt-${sablon.anahtar}-${a.anahtar}`;
            return (
              <Alan key={a.anahtar} id={id} etiket={a.etiket}>
                <input id={id} type={a.tur === "tarih" ? "date" : "time"} value={degerler[a.anahtar] ?? ""}
                  onChange={(e) => setDegerler((d) => ({ ...d, [a.anahtar]: e.target.value }))}
                  className="rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={girdiStili} />
              </Alan>
            );
          })}
        </div>
        <Alan id="yurt-ek-nobetci" etiket="Yanındaki diğer nöbetçi öğretmen (isteğe bağlı)">
          <input id="yurt-ek-nobetci" type="text" value={degerler.ekOgretmen ?? ""} maxLength={80}
            onChange={(e) => setDegerler((d) => ({ ...d, ekOgretmen: e.target.value }))}
            placeholder="Adı ve soyadı" className="w-full rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={girdiStili} />
        </Alan>

        <div className="rounded-2xl p-3" style={{ background: BG1_ALT }}>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Ad ya da okul no ara…" aria-label="Öğrenci ara"
              className="min-w-[160px] flex-1 rounded-xl px-3 py-1.5 text-xs outline-none" style={girdiStili} />
            <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{gruptakiler.length} yurt öğrencisi</span>
          </div>
          <div className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
            {listelenen.length === 0 && <p className="py-3 text-center text-xs" style={{ color: TEXT_MUTED }}>Öğrenci bulunamadı.</p>}
            {listelenen.map((o) => {
              const isaretli = o.anahtar in secili;
              return (
                <label key={o.anahtar} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs" style={{ background: isaretli ? MINT_BG : "transparent", color: TEXT }}>
                  <input type="checkbox" checked={isaretli} onChange={(e) => setSecili((s) => {
                    const y = { ...s };
                    if (e.target.checked) y[o.anahtar] = ""; else delete y[o.anahtar];
                    return y;
                  })} />
                  <span className="flex-1 truncate font-semibold">{o.ad}</span>
                  <span style={{ color: TEXT_MUTED }}>{[o.okulNo ? `No ${o.okulNo}` : "", o.sinif].filter(Boolean).join(" · ") || "—"}</span>
                </label>
              );
            })}
          </div>
          {/* Kullanıcı isteği: sonradan yurda giren öğrenci listede yoksa. */}
          <p className="mt-2 text-[11px] font-semibold" style={{ color: BLUSH }}>
            Listede ismi olmayan öğrencilerin ismini hata bildirimi ile yöneticiye iletiniz.
          </p>
          {yurt.mudurMu && cinsiyetsiz > 0 && (
            <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>{cinsiyetsiz} yurt öğrencisinin cinsiyeti girilmemiş; listede görünmesi için Cinsiyet Bilgileri&apos;nden işaretleyin.</p>
          )}
        </div>

        {secilenler.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className={kucukBaslik} style={{ color: TEXT_MUTED }}>Seçilenler ({secilenler.length}) · {sablon.notEtiketi.toLocaleLowerCase("tr-TR")} isteğe bağlı</div>
            <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
              {secilenler.map((o) => (
                <div key={o.anahtar} className="flex items-center gap-2 rounded-xl px-3 py-1.5" style={{ background: BG1_ALT }}>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: TEXT }}>{o.ad}</span>
                  <input value={secili[o.anahtar] ?? ""} onChange={(e) => setSecili((s) => ({ ...s, [o.anahtar]: e.target.value }))}
                    placeholder={sablon.notOrnegi} aria-label={`${o.ad} ${sablon.notEtiketi}`} maxLength={40}
                    className="w-40 rounded-lg px-2 py-1 text-[11px] outline-none" style={girdiStili} />
                </div>
              ))}
            </div>
          </div>
        )}

        <FotoSecici durum={foto} />

        <div className="flex flex-wrap items-center gap-2">
          {sayfalar.map((_, i) => (
            <span key={i} className="inline-flex gap-1">
              <button type="button" onClick={() => cikti(i, false)} className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>
                <Download size={13} aria-hidden="true" /> {sayfalar.length > 1 ? `Kart ${i + 1}` : "İndir (PNG)"}
              </button>
              {paylasilabilir && (
                <button type="button" onClick={() => cikti(i, true)} className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                  <Share2 size={13} aria-hidden="true" /> Paylaş
                </button>
              )}
            </span>
          ))}
          {sayfalar.length > 1 && sayfalar.map((_, i) => (
            <button key={`o${i}`} type="button" onClick={() => setSayfa(i)} className="rounded-lg px-2 py-1 text-[11px] font-bold"
              style={i === gecerliSayfa ? { background: MINT_BG, color: TEXT } : { color: TEXT_MUTED }}>Önizle {i + 1}</button>
          ))}
          {/* Öğretmen isterse WhatsApp'ta paylaşır, isterse müdür yardımcısına gönderir. */}
          {!yurt.mudurMu && (
            <button type="button" onClick={mudurYardimcisinaGonder} disabled={gonderiliyor}
              className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${MINT}` }}>
              <Send size={13} aria-hidden="true" /> {gonderiliyor ? "Gönderiliyor…" : "Müdür Yardımcısına Gönder"}
            </button>
          )}
        </div>
        {secilenler.length === 0 && <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Kimse seçilmezse kartta &quot;{sablon.bosMesaj}&quot; yazar.</p>}
        {durum && <p className="text-xs font-semibold" style={{ color: MINT }}>{durum}</p>}
      </div>
      <div className="min-w-0"><Onizleme src={onizleme} /></div>
    </section>
  );
}

function Uyari({ metin }: { metin: string }) {
  return (
    <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <p className="text-sm" style={{ color: TEXT_MUTED }}>{metin}</p>
    </div>
  );
}

// Müdür: yurt öğrencilerinin ve öğretmenlerin cinsiyet bilgisi.
export function CinsiyetBilgileri({ yurt }: { yurt: YurtVerisi }) {
  const [ogrenci, setOgrenci] = useState<Record<string, OgrenciCinsiyeti | null>>(() => Object.fromEntries(yurt.ogrenciler.map((o) => [o.anahtar, o.cinsiyet])));
  const [ogretmen, setOgretmen] = useState<Record<string, OgretmenCinsiyeti | null>>(() => Object.fromEntries(yurt.ogretmenler.map((o) => [o.id, o.cinsiyet])));
  const [sadeceBos, setSadeceBos] = useState(false);
  const [arama, setArama] = useState("");
  const [isaretli, setIsaretli] = useState<Set<string>>(new Set());
  const [hata, setHata] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!yurt.cinsiyetHazir) return <Uyari metin="Cinsiyet bilgisi altyapısı henüz kurulmadı (veritabanı güncellemesi bekleniyor)." />;

  const aramaKucuk = arama.toLocaleLowerCase("tr-TR");
  const ogrenciler = yurt.ogrenciler
    .filter((o) => (!sadeceBos || !ogrenci[o.anahtar]) && (!aramaKucuk || o.ad.toLocaleLowerCase("tr-TR").includes(aramaKucuk) || (o.okulNo ?? "").includes(aramaKucuk)));
  const bosSayisi = yurt.ogrenciler.filter((o) => !ogrenci[o.anahtar]).length;

  function ogrenciKaydet(anahtarlar: string[], c: OgrenciCinsiyeti) {
    const onceki = { ...ogrenci };
    setOgrenci((s) => ({ ...s, ...Object.fromEntries(anahtarlar.map((a) => [a, c])) }));
    setHata(null);
    start(async () => {
      const r = await cinsiyetKaydet("ogrenci", anahtarlar, c, yurt.okulId);
      if (r.error) { setHata(r.error); setOgrenci(onceki); } else setIsaretli(new Set());
    });
  }
  function ogretmenKaydet(id: string, c: OgretmenCinsiyeti) {
    const onceki = { ...ogretmen };
    setOgretmen((s) => ({ ...s, [id]: c }));
    setHata(null);
    start(async () => {
      const r = await cinsiyetKaydet("ogretmen", [id], c, yurt.okulId);
      if (r.error) { setHata(r.error); setOgretmen(onceki); }
    });
  }

  const ikiSecim = <T extends string>(deger: T | null, secenekler: readonly [T, string][], sec: (v: T) => void) => (
    <div className="inline-flex shrink-0 gap-1 rounded-lg p-0.5" style={{ background: BG1_ALT }}>
      {secenekler.map(([v, e]) => (
        <button key={v} type="button" onClick={() => sec(v)} aria-pressed={deger === v}
          className="rounded-md px-2.5 py-1 text-[11px] font-bold" style={deger === v ? { background: MINT, color: MINT_ON } : { color: TEXT_MUTED }}>{e}</button>
      ))}
    </div>
  );

  return (
    <section className="sfec-fade flex flex-col gap-4 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <Users size={15} color={MINT} aria-hidden="true" />
        <h3 className="text-sm font-bold" style={{ color: TEXT }}>Cinsiyet Bilgileri</h3>
        {pending && <span className="text-[11px]" style={{ color: TEXT_MUTED }}>Kaydediliyor…</span>}
      </div>
      <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
        Kız öğrencilerin listesini kadın, erkek öğrencilerinkini erkek öğretmenler hazırlar. Öğrenciler resmî listeden (ön kayıt dahil) gelir. Seçim anında kaydedilir.
      </p>
      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={kucukBaslik} style={{ color: TEXT_MUTED }}>Yurt öğrencileri ({yurt.ogrenciler.length}{bosSayisi ? ` · ${bosSayisi} girilmemiş` : ""})</span>
          <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Ara…" aria-label="Öğrenci ara"
            className="ml-auto w-40 rounded-xl px-3 py-1.5 text-xs outline-none" style={girdiStili} />
          <label className="inline-flex items-center gap-1 text-[11px]" style={{ color: TEXT_MUTED }}>
            <input type="checkbox" checked={sadeceBos} onChange={(e) => setSadeceBos(e.target.checked)} /> Yalnız girilmemişler
          </label>
        </div>
        {isaretli.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2" style={{ background: MINT_BG }}>
            <span className="text-xs font-semibold" style={{ color: TEXT }}>{isaretli.size} öğrenci seçili:</span>
            <button type="button" onClick={() => ogrenciKaydet([...isaretli], "kiz")} className="sfec-btn rounded-lg px-3 py-1 text-[11px] font-bold" style={{ background: MINT, color: MINT_ON }}>Kız yap</button>
            <button type="button" onClick={() => ogrenciKaydet([...isaretli], "erkek")} className="sfec-btn rounded-lg px-3 py-1 text-[11px] font-bold" style={{ background: MINT, color: MINT_ON }}>Erkek yap</button>
            <button type="button" onClick={() => setIsaretli(new Set())} className="text-[11px] font-bold" style={{ color: TEXT_MUTED }}>Seçimi temizle</button>
          </div>
        )}
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
          {ogrenciler.length === 0 && <p className="py-3 text-center text-xs" style={{ color: TEXT_MUTED }}>Öğrenci yok.</p>}
          {ogrenciler.map((o) => (
            <div key={o.anahtar} className="flex items-center gap-2 rounded-lg px-2 py-1" style={{ background: isaretli.has(o.anahtar) ? MINT_BG : "transparent" }}>
              <input type="checkbox" aria-label={`${o.ad} seç`} checked={isaretli.has(o.anahtar)} onChange={(e) => setIsaretli((s) => {
                const y = new Set(s);
                if (e.target.checked) y.add(o.anahtar); else y.delete(o.anahtar);
                return y;
              })} />
              <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: TEXT }}>{o.ad}</span>
              <span className="hidden text-[11px] sm:inline" style={{ color: TEXT_MUTED }}>{[o.okulNo ? `No ${o.okulNo}` : "", o.sinif, o.kayitli ? "" : "ön kayıt"].filter(Boolean).join(" · ")}</span>
              {ikiSecim(ogrenci[o.anahtar] ?? null, [["kiz", "Kız"], ["erkek", "Erkek"]] as const, (v) => ogrenciKaydet([o.anahtar], v))}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className={kucukBaslik} style={{ color: TEXT_MUTED }}>Öğretmenler ({yurt.ogretmenler.length})</span>
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
          {yurt.ogretmenler.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg px-2 py-1">
              <span className="min-w-0 flex-1 truncate text-xs font-semibold" style={{ color: TEXT }}>{t.ad}</span>
              <span className="hidden text-[11px] sm:inline" style={{ color: TEXT_MUTED }}>{t.brans ?? ""}</span>
              {ikiSecim(ogretmen[t.id] ?? null, [["kadin", "Kadın"], ["erkek", "Erkek"]] as const, (v) => ogretmenKaydet(t.id, v))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Yurt sorumlusu müdür yardımcısı / müdür: öğretmenlerin gönderdiği son 7
// günün yoklamaları (Faz 3). "Aç" listeyi düzenleyiciye yükler; müdür
// yardımcısı ekleme yapıp kartı kendisi paylaşır.
export function GelenYoklamalar({ onAc }: { onAc: (y: GelenYoklama) => void }) {
  const [veri, setVeri] = useState<{ error: string | null; yoklamalar: GelenYoklama[] } | null>(null);

  useEffect(() => {
    let iptal = false;
    void gelenYoklamalar()
      .then((v) => { if (!iptal) setVeri(v); })
      .catch(() => { if (!iptal) setVeri({ error: "Gelen yoklamalar yüklenemedi.", yoklamalar: [] }); });
    return () => { iptal = true; };
  }, []);

  const gunler = new Map<string, GelenYoklama[]>();
  for (const y of veri?.yoklamalar ?? []) gunler.set(y.tarih, [...(gunler.get(y.tarih) ?? []), y]);

  return (
    <section className="sfec-fade flex flex-col gap-4 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <Inbox size={15} color={MINT} aria-hidden="true" />
        <h3 className="text-sm font-bold" style={{ color: TEXT }}>Gelen Yoklamalar</h3>
      </div>
      <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Öğretmenlerin gönderdiği son 7 günün listeleri. Açtığınız listeye ekleme yapıp kartı kendiniz paylaşabilirsiniz.</p>
      {!veri && <p className="text-xs" style={{ color: TEXT_MUTED }}>Yükleniyor…</p>}
      {veri?.error && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{veri.error}</p>}
      {veri && !veri.error && veri.yoklamalar.length === 0 && <p className="text-xs" style={{ color: TEXT_MUTED }}>Henüz gelen yoklama yok.</p>}
      {[...gunler.entries()].map(([tarih, liste]) => (
        <div key={tarih} className="flex flex-col gap-1.5">
          <div className={kucukBaslik} style={{ color: TEXT_MUTED }}>{kartTarihi(tarih)}</div>
          {liste.map((y) => {
            const s = YURT_SABLONLARI.find((x) => x.anahtar === y.tur);
            return (
              <div key={y.id} className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2" style={{ background: BG1_ALT }}>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-bold" style={{ color: TEXT }}>{s?.ad ?? y.tur} · {grupEtiketi(y.grup)}</div>
                  <div className="text-[11px]" style={{ color: TEXT_MUTED }}>
                    {y.hazirlayanAdi} · {new Date(y.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} · {y.ogrenciler.length ? `${y.ogrenciler.length} öğrenci` : "eksik yok"}
                  </div>
                </div>
                <button type="button" onClick={() => onAc(y)} className="sfec-btn rounded-lg px-3 py-1.5 text-[11px] font-bold" style={{ background: MINT, color: MINT_ON }}>Aç</button>
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
