"use client";

// WhatsApp duyuru stüdyosu (kullanıcı isteği 18.10.2026): müdür ve rehber
// öğretmen kurumun yuvarlak logosu ve konu fotoğrafıyla hazır duyuru
// kartları oluşturur; devamsızlıkta veliye tek tek kart ve kurum içi toplu
// liste üretir. Kartlar tarayıcıda çizilir; sunucuya gitmez, saklanmaz.
// Kendi seçilen fotoğraf da yalnız bu sayfada kullanılır, yüklenmez.
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Download, ImagePlus, MessageSquareShare, Share2, UserX } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { bugununTarihiTR } from "@/lib/tarih";
import { sinifSiraKarsilastir } from "@/lib/types";
import {
  DEVAMSIZLIK_FOTO, DEVAMSIZLIK_RENK, DUYURU_SABLONLARI, TOPLU_LISTE_SAYFA_SATIRI, devamsizlikVeliKarti, kartTarihi, topluListeSayfalari, varsayilanDegerler,
  type DevamsizOgrenci, type DuyuruSablonu,
} from "@/lib/whatsapp-duyuru";
import { duyuruKartiCiz, topluListeCiz } from "@/components/dashboard/whatsapp-kart-cizim";
import { kurumLogosuYukle } from "@/app/dashboard/kurum-logo-actions";

const FOTO_KOKU = "/duyuru-fotograflari/";
const DEVAMSIZLIK = "devamsizlik";
type FotoSecimi = "hazir" | "kendi" | "yok";

const gorselOnbellegi = new Map<string, Promise<HTMLImageElement | null>>();
function gorselYukle(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  const hazir = gorselOnbellegi.get(src);
  if (hazir) return hazir;
  const soz = new Promise<HTMLImageElement | null>((coz) => {
    const img = new Image();
    img.onload = () => coz(img);
    img.onerror = () => coz(null);
    img.src = src;
  });
  gorselOnbellegi.set(src, soz);
  return soz;
}

async function yaziTipi(): Promise<string> {
  const aile = getComputedStyle(document.body).fontFamily || "sans-serif";
  try { await Promise.all([document.fonts.load(`900 40px ${aile}`), document.fonts.load(`700 24px ${aile}`), document.fonts.load(`600 28px ${aile}`)]); } catch { /* yedek yazı tipi */ }
  return aile;
}

function blobOl(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((coz) => canvas.toBlob(coz, "image/png"));
}

function dosyaAdiTemizle(s: string): string {
  return s.toLocaleLowerCase("tr-TR").replace(/[^a-z0-9ğüşıöç]+/g, "-").replace(/^-|-$/g, "") || "kart";
}

async function indirVeyaPaylas(canvas: HTMLCanvasElement, ad: string, paylas: boolean): Promise<boolean> {
  const blob = await blobOl(canvas);
  if (!blob) return false;
  if (paylas) {
    try { await navigator.share({ files: [new File([blob], ad, { type: "image/png" })] }); return true; } catch { return false; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

export interface StudyoOgrencisi { id: string; ad: string; sinif: string | null; seviye: string | null; sube: string | null }

export function WhatsappDuyuruStudyosu({ kurumAdi, logoAdresi, logoDegistirebilir, ogrenciler }: {
  kurumAdi: string; logoAdresi: string | null; logoDegistirebilir: boolean; ogrenciler: StudyoOgrencisi[];
}) {
  const [logo, setLogo] = useState<string | null>(logoAdresi);
  const [sablonAnahtari, setSablonAnahtari] = useState<string>(DUYURU_SABLONLARI[0].anahtar);
  const [telefon, setTelefon] = useState("");
  const [paylasilabilir, setPaylasilabilir] = useState(false);
  const [mesaj, setMesaj] = useState<{ hata: boolean; metin: string } | null>(null);
  const [logoPending, startLogo] = useTransition();

  // Tarayıcıya özgü değerler sunucu çizimiyle çakışmasın diye ilk çizimden sonra okunur.
  useEffect(() => {
    const z = window.setTimeout(() => {
      try { setTelefon(localStorage.getItem(`sfec-wa-tel-${kurumAdi}`) ?? ""); } catch { /* depolama kapalı */ }
      try { setPaylasilabilir(!!navigator.canShare?.({ files: [new File([new Blob()], "k.png", { type: "image/png" })] })); } catch { /* yok */ }
    }, 0);
    return () => window.clearTimeout(z);
  }, [kurumAdi]);
  function telefonDegistir(v: string) {
    setTelefon(v);
    try { localStorage.setItem(`sfec-wa-tel-${kurumAdi}`, v); } catch { /* depolama kapalı */ }
  }

  function logoSec(dosya: File | undefined) {
    if (!dosya) return;
    const fd = new FormData();
    fd.set("logo", dosya);
    startLogo(async () => {
      const r = await kurumLogosuYukle(fd);
      if (r.error) setMesaj({ hata: true, metin: r.error });
      else { setLogo(r.logoAdresi); setMesaj({ hata: false, metin: "Kurum logosu güncellendi." }); }
    });
  }

  const sablon = DUYURU_SABLONLARI.find((s) => s.anahtar === sablonAnahtari) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <section className="sfec-fade flex flex-wrap items-center gap-4 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full" style={{ background: "#fff", border: `3px solid ${BORDER_STRONG}` }}>
          {logo
            // eslint-disable-next-line @next/next/no-img-element -- kurum logosu, kendi API yolumuzdan
            ? <img src={logo} alt={`${kurumAdi} logosu`} className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center text-lg font-black" style={{ color: "#14213d" }}>{kurumAdi.slice(0, 2).toLocaleUpperCase("tr-TR")}</span>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <MessageSquareShare size={15} color={MINT} aria-hidden="true" />
            <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>WhatsApp Duyuruları</h2>
          </div>
          <p className="text-xs" style={{ color: TEXT_MUTED }}>{kurumAdi} logosuyla hazır duyuru kartı oluşturun. Kartlar sistemde saklanmaz; indirince ya da paylaşınca sizde kalır.</p>
          {!logo && <p className="mt-1 text-[11px] font-semibold" style={{ color: BLUSH }}>Kurum logosu yüklenmemiş; kartlarda kurumun baş harfleri görünür.</p>}
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Kartta görünecek telefon</span>
            <input id="wa-telefon" value={telefon} onChange={(e) => telefonDegistir(e.target.value)} placeholder="0 (344) 000 00 00" maxLength={24}
              className="w-48 rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          </label>
          {logoDegistirebilir && (
            <label className="sfec-btn inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
              <ImagePlus size={13} aria-hidden="true" /> {logoPending ? "Yükleniyor…" : logo ? "Logoyu değiştir" : "Logo yükle"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={logoPending}
                onChange={(e) => { logoSec(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          )}
        </div>
        {mesaj && <p className="w-full text-xs font-semibold" style={{ color: mesaj.hata ? BLUSH : MINT }}>{mesaj.metin}</p>}
      </section>

      {/* Şablonlar kenarda (kullanıcı isteği 18.10.2026); dar ekranda üstte yatay kayan şerit. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <nav aria-label="Duyuru türü"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 max-lg:[contain:inline-size] lg:sticky lg:top-4 lg:mx-0 lg:w-60 lg:shrink-0 lg:overflow-visible lg:p-0">
          <div className="contents lg:flex lg:w-full lg:flex-col lg:gap-1 lg:rounded-3xl lg:p-2" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <span className="hidden px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide lg:block" style={{ color: TEXT_MUTED }}>Duyurular</span>
            {DUYURU_SABLONLARI.map((s) => (
              <SablonDugmesi key={s.anahtar} ad={s.ad} foto={s.foto} renk={s.renk} secili={s.anahtar === sablonAnahtari} sec={() => setSablonAnahtari(s.anahtar)} />
            ))}
            <span className="hidden px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide lg:block" style={{ color: TEXT_MUTED }}>Veli bildirimi</span>
            <SablonDugmesi ad="Devamsızlık bildirimi" foto={DEVAMSIZLIK_FOTO} renk={DEVAMSIZLIK_RENK}
              secili={sablonAnahtari === DEVAMSIZLIK} sec={() => setSablonAnahtari(DEVAMSIZLIK)} />
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {sablon
            ? <DuyuruDuzenleyici key={sablon.anahtar} sablon={sablon} kurumAdi={kurumAdi} logo={logo} telefon={telefon} paylasilabilir={paylasilabilir} />
            : <DevamsizlikDuzenleyici kurumAdi={kurumAdi} logo={logo} telefon={telefon} paylasilabilir={paylasilabilir} ogrenciler={ogrenciler} />}
        </div>
      </div>
    </div>
  );
}

function SablonDugmesi({ ad, foto, renk, secili, sec }: { ad: string; foto: string; renk: string; secili: boolean; sec: () => void }) {
  return (
    <button type="button" onClick={sec} aria-pressed={secili}
      className="sfec-btn flex shrink-0 items-center gap-2.5 rounded-2xl py-1.5 pl-1.5 pr-3 text-left lg:w-full lg:pr-2"
      style={secili ? { background: MINT_BG, outline: `2px solid ${MINT}`, outlineOffset: -2 } : { background: BG1_ALT }}>
      <span aria-hidden="true" className="relative h-9 w-11 shrink-0 overflow-hidden rounded-xl" style={{ background: renk }}>
        <span className="absolute inset-0 bg-cover bg-center opacity-80" style={{ backgroundImage: `url(${FOTO_KOKU}${foto})` }} />
        <span className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: renk }} />
      </span>
      <span className="whitespace-nowrap text-xs font-bold leading-tight lg:whitespace-normal" style={{ color: secili ? TEXT : TEXT_MUTED }}>{ad}</span>
    </button>
  );
}

function FotoSecici({ secim, setSecim, kendiFoto, setKendiFoto }: {
  secim: FotoSecimi; setSecim: (s: FotoSecimi) => void; kendiFoto: string | null; setKendiFoto: (s: string | null) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Fotoğraf</legend>
      <div className="flex flex-wrap gap-1.5">
        {([["hazir", "Hazır fotoğraf"], ["kendi", "Kendi fotoğrafım"], ["yok", "Fotoğrafsız"]] as const).map(([d, e]) => (
          <button key={d} type="button" onClick={() => setSecim(d)} aria-pressed={secim === d}
            className="sfec-btn rounded-full px-3 py-1.5 text-[11px] font-bold"
            style={secim === d ? { background: MINT, color: MINT_ON } : { background: BG1_ALT, color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
            {e}
          </button>
        ))}
      </div>
      {secim === "kendi" && (
        <label className="mt-1 flex flex-col gap-1 text-[11px]" style={{ color: TEXT_MUTED }}>
          <input type="file" accept="image/*" onChange={(e) => {
            const f = e.target.files?.[0];
            if (kendiFoto) URL.revokeObjectURL(kendiFoto);
            setKendiFoto(f ? URL.createObjectURL(f) : null);
          }} className="text-xs" style={{ color: TEXT }} />
          Fotoğraf yalnız bu kartta kullanılır, sisteme yüklenmez.
        </label>
      )}
    </fieldset>
  );
}

function Alan({ id, etiket, children }: { id: string; etiket: string; children: React.ReactNode }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{etiket}</span>
      {children}
    </label>
  );
}

const girdiStili = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };

function Onizleme({ src, yukseklik = "auto" }: { src: string | null; yukseklik?: string }) {
  return src
    // eslint-disable-next-line @next/next/no-img-element -- canvas çıktısı (data URL)
    ? <img src={src} alt="Kart önizlemesi" className="w-full rounded-2xl" style={{ border: `1px solid ${BORDER}`, height: yukseklik }} />
    : <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl text-xs" style={{ background: BG1_ALT, color: TEXT_MUTED }}>Önizleme hazırlanıyor…</div>;
}

function DuyuruDuzenleyici({ sablon, kurumAdi, logo, telefon, paylasilabilir }: {
  sablon: DuyuruSablonu; kurumAdi: string; logo: string | null; telefon: string; paylasilabilir: boolean;
}) {
  const [degerler, setDegerler] = useState<Record<string, string>>(() => varsayilanDegerler(sablon));
  const [renk, setRenk] = useState(sablon.renk);
  const [fotoSecim, setFotoSecim] = useState<FotoSecimi>("hazir");
  const [kendiFoto, setKendiFoto] = useState<string | null>(null);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [durum, setDurum] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const icerik = useMemo(() => sablon.icerik(degerler), [sablon, degerler]);

  useEffect(() => {
    let iptal = false;
    const z = window.setTimeout(async () => {
      const fotoKaynak = fotoSecim === "hazir" ? `${FOTO_KOKU}${sablon.foto}` : fotoSecim === "kendi" ? kendiFoto : null;
      const [aile, foto, logoImg, sefu] = await Promise.all([yaziTipi(), gorselYukle(fotoKaynak), gorselYukle(logo), gorselYukle(icerik.girisGerekli ? "/icon-192.png" : null)]);
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      duyuruKartiCiz(canvas, { icerik, sablonAdi: sablon.ad, renk, foto, logo: logoImg, sefuSimgesi: sefu, kurumAdi, telefon, aile });
      if (!iptal) setOnizleme(canvas.toDataURL("image/png"));
    }, 150);
    return () => { iptal = true; window.clearTimeout(z); };
  }, [icerik, sablon, renk, fotoSecim, kendiFoto, logo, kurumAdi, telefon]);

  async function cikti(paylas: boolean) {
    if (!canvasRef.current) return;
    const ok = await indirVeyaPaylas(canvasRef.current, `duyuru-${sablon.anahtar}-${bugununTarihiTR()}.png`, paylas);
    setDurum(ok ? (paylas ? "Kart paylaşıldı. Sistemde saklanmadı." : "Kart indirildi. Sistemde saklanmadı.") : null);
  }

  return (
    <section className="sfec-fade grid gap-4 rounded-3xl p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="text-sm font-bold" style={{ color: TEXT }}>{sablon.ad}</h3>
        {sablon.girisGerekli && (
          <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Bu duyuru sisteme girişi gerektirdiği için kartın alt köşesinde küçük bir SeFu Koç işareti ve sefukoc.com adresi yer alır.</p>
        )}
        {sablon.anahtar === "tebrik" && (
          <p className="text-[11px] font-semibold" style={{ color: BLUSH }}>Öğrencinin adını paylaşmadan önce velisinin onayını alın.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {sablon.alanlar.map((a) => {
            const id = `wa-${sablon.anahtar}-${a.anahtar}`;
            const ortak = { id, value: degerler[a.anahtar] ?? "", placeholder: a.ornek, onChange: (e: { target: { value: string } }) => setDegerler((d) => ({ ...d, [a.anahtar]: e.target.value })) };
            return (
              <div key={a.anahtar} className={a.tur === "uzun" ? "sm:col-span-2" : ""}>
                <Alan id={id} etiket={a.etiket}>
                  {a.tur === "uzun"
                    ? <textarea {...ortak} rows={3} maxLength={320} className="rounded-xl px-3 py-2 text-xs outline-none" style={girdiStili} />
                    : <input {...ortak} type={a.tur === "tarih" ? "date" : a.tur === "saat" ? "time" : "text"} maxLength={90}
                        className="rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={girdiStili} />}
                </Alan>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <FotoSecici secim={fotoSecim} setSecim={setFotoSecim} kendiFoto={kendiFoto} setKendiFoto={setKendiFoto} />
          <Alan id={`wa-renk-${sablon.anahtar}`} etiket="Renk">
            <input id={`wa-renk-${sablon.anahtar}`} type="color" value={renk} onChange={(e) => setRenk(e.target.value)} className="h-9 w-14 cursor-pointer rounded-lg" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0 }} />
          </Alan>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => cikti(false)} disabled={!onizleme}
            className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
            <Download size={13} aria-hidden="true" /> İndir (PNG)
          </button>
          {paylasilabilir && (
            <button type="button" onClick={() => cikti(true)} disabled={!onizleme}
              className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
              <Share2 size={13} aria-hidden="true" /> Paylaş (WhatsApp)
            </button>
          )}
          <button type="button" onClick={() => { setDegerler(varsayilanDegerler(sablon)); setRenk(sablon.renk); setFotoSecim("hazir"); }}
            className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold" style={{ color: TEXT_MUTED }}>
            Sıfırla
          </button>
        </div>
        {durum && <p className="text-xs font-semibold" style={{ color: MINT }}>{durum}</p>}
      </div>
      <div className="min-w-0"><Onizleme src={onizleme} /></div>
    </section>
  );
}

function DevamsizlikDuzenleyici({ kurumAdi, logo, telefon, paylasilabilir, ogrenciler }: {
  kurumAdi: string; logo: string | null; telefon: string; paylasilabilir: boolean; ogrenciler: StudyoOgrencisi[];
}) {
  const [tarih, setTarih] = useState(bugununTarihiTR());
  const [varsayilanDers, setVarsayilanDers] = useState("");
  const [veliNotu, setVeliNotu] = useState("");
  const [sinif, setSinif] = useState("");
  const [arama, setArama] = useState("");
  const [secili, setSecili] = useState<Record<string, string>>({}); // öğrenci → ders/saat (boşsa varsayılan)
  const [odak, setOdak] = useState<string | "liste">("liste");
  const [fotoSecim, setFotoSecim] = useState<FotoSecimi>("hazir");
  const [kendiFoto, setKendiFoto] = useState<string | null>(null);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [durum, setDurum] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const siniflar = useMemo(() => {
    const m = new Map<string, { seviye: string; sube: string }>();
    for (const o of ogrenciler) if (o.sinif && o.seviye && o.sube) m.set(o.sinif, { seviye: o.seviye, sube: o.sube });
    return [...m.entries()].sort((a, b) => sinifSiraKarsilastir(a[1], b[1])).map(([ad]) => ad);
  }, [ogrenciler]);
  const aramaKucuk = arama.toLocaleLowerCase("tr-TR");
  const listelenen = ogrenciler.filter((o) => (!sinif || o.sinif === sinif) && o.ad.toLocaleLowerCase("tr-TR").includes(aramaKucuk));
  const devamsizlar: DevamsizOgrenci[] = useMemo(() => ogrenciler
    .filter((o) => o.id in secili)
    .map((o) => ({ id: o.id, ad: o.ad, sinif: o.sinif, dersSaat: secili[o.id] || varsayilanDers })), [ogrenciler, secili, varsayilanDers]);
  const sayfalar = useMemo(() => topluListeSayfalari(devamsizlar), [devamsizlar]);

  async function ciz(hedef: string | "liste", sayfa = 0): Promise<HTMLCanvasElement | null> {
    const canvas = document.createElement("canvas");
    const [aile, logoImg] = await Promise.all([yaziTipi(), gorselYukle(logo)]);
    if (hedef === "liste") {
      const s = sayfalar[sayfa];
      if (!s) return null;
      topluListeCiz(canvas, {
        kurumAdi, logo: logoImg, tarih: kartTarihi(tarih), sayfa: sayfa + 1, toplamSayfa: sayfalar.length, toplamOgrenci: devamsizlar.length,
        satirlar: s.map((o, i) => ({ no: sayfa * TOPLU_LISTE_SAYFA_SATIRI + i + 1, ad: o.ad, sinif: o.sinif ?? "—", dersSaat: o.dersSaat })), renk: DEVAMSIZLIK_RENK, aile,
      });
      return canvas;
    }
    const o = devamsizlar.find((x) => x.id === hedef);
    if (!o) return null;
    const fotoKaynak = fotoSecim === "hazir" ? `${FOTO_KOKU}${DEVAMSIZLIK_FOTO}` : fotoSecim === "kendi" ? kendiFoto : null;
    const foto = await gorselYukle(fotoKaynak);
    duyuruKartiCiz(canvas, {
      icerik: devamsizlikVeliKarti(o, tarih, veliNotu), sablonAdi: "Devamsızlık", renk: DEVAMSIZLIK_RENK, foto, logo: logoImg,
      sefuSimgesi: null, kurumAdi, telefon, aile,
    });
    return canvas;
  }

  const gecerliOdak = odak !== "liste" && !devamsizlar.some((o) => o.id === odak) ? "liste" : odak;
  useEffect(() => {
    let iptal = false;
    // Seçim boşken önizleme alanı yer tutucuyu gösterir; eski görsel kullanılmaz.
    if (devamsizlar.length === 0) return;
    const z = window.setTimeout(async () => {
      const c = await ciz(gecerliOdak);
      canvasRef.current = c;
      if (!iptal) setOnizleme(c ? c.toDataURL("image/png") : null);
    }, 150);
    return () => { iptal = true; window.clearTimeout(z); };
    // ciz her çizimde yeniden kurulur; bağımlılıklar çizimin girdileri.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gecerliOdak, devamsizlar, tarih, veliNotu, fotoSecim, kendiFoto, logo, telefon, kurumAdi]);

  async function cikti(hedef: string | "liste", paylas: boolean, sayfa = 0) {
    const c = await ciz(hedef, sayfa);
    if (!c) return;
    const o = devamsizlar.find((x) => x.id === hedef);
    const ad = hedef === "liste"
      ? `devamsizlik-listesi-${tarih}${sayfalar.length > 1 ? `-${sayfa + 1}` : ""}.png`
      : `devamsizlik-${dosyaAdiTemizle(o?.ad ?? "ogrenci")}-${tarih}.png`;
    const ok = await indirVeyaPaylas(c, ad, paylas);
    if (ok) setDurum(hedef === "liste" ? "Kurum içi liste indirildi." : `${o?.ad} için veli kartı ${paylas ? "paylaşıldı" : "indirildi"}.`);
  }

  const dugme = (vurgulu: boolean) => vurgulu
    ? { background: MINT, color: MINT_ON }
    : { background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` };

  return (
    <section className="sfec-fade grid gap-4 rounded-3xl p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex items-center gap-2">
          <UserX size={15} color={BLUSH} aria-hidden="true" />
          <h3 className="text-sm font-bold" style={{ color: TEXT }}>Devamsızlık bildirimi</h3>
        </div>
        <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
          Her öğrenci için yalnız kendi velisine gönderilecek ayrı bir kart oluşur. Toplu liste kurum içidir; üzerinde &quot;velilere gönderilmez&quot; yazar.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Alan id="wa-dev-tarih" etiket="Tarih">
            <input id="wa-dev-tarih" type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} className="rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={girdiStili} />
          </Alan>
          <Alan id="wa-dev-ders" etiket="Ders / saat (hepsi için)">
            <input id="wa-dev-ders" value={varsayilanDers} onChange={(e) => setVarsayilanDers(e.target.value)} placeholder="1. ve 2. ders" maxLength={60}
              className="rounded-xl px-3 py-2 text-xs font-semibold outline-none" style={girdiStili} />
          </Alan>
          <div className="sm:col-span-2">
            <Alan id="wa-dev-not" etiket="Veli kartındaki metin (boşsa hazır metin)">
              <textarea id="wa-dev-not" value={veliNotu} onChange={(e) => setVeliNotu(e.target.value)} rows={2} maxLength={260}
                placeholder="Öğrenciniz …, … tarihinde derse katılmamıştır. Bilginize sunar, iyi günler dileriz."
                className="rounded-xl px-3 py-2 text-xs outline-none" style={girdiStili} />
            </Alan>
          </div>
        </div>

        <div className="rounded-2xl p-3" style={{ background: BG1_ALT }}>
          <div className="mb-2 flex flex-wrap gap-2">
            <select value={sinif} onChange={(e) => setSinif(e.target.value)} aria-label="Sınıf" className="rounded-xl px-3 py-1.5 text-xs font-semibold outline-none" style={girdiStili}>
              <option value="">Tüm sınıflar</option>
              {siniflar.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Öğrenci ara…" aria-label="Öğrenci ara"
              className="min-w-[140px] flex-1 rounded-xl px-3 py-1.5 text-xs outline-none" style={girdiStili} />
          </div>
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
            {listelenen.length === 0 && <p className="py-3 text-center text-xs" style={{ color: TEXT_MUTED }}>Öğrenci bulunamadı.</p>}
            {listelenen.map((o) => {
              const isaretli = o.id in secili;
              return (
                <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs" style={{ background: isaretli ? MINT_BG : "transparent", color: TEXT }}>
                  <input type="checkbox" checked={isaretli} onChange={(e) => setSecili((s) => {
                    const y = { ...s };
                    if (e.target.checked) y[o.id] = ""; else delete y[o.id];
                    return y;
                  })} />
                  <span className="flex-1 truncate font-semibold">{o.ad}</span>
                  <span style={{ color: TEXT_MUTED }}>{o.sinif ?? "—"}</span>
                </label>
              );
            })}
          </div>
        </div>

        <FotoSecici secim={fotoSecim} setSecim={setFotoSecim} kendiFoto={kendiFoto} setKendiFoto={setKendiFoto} />

        {devamsizlar.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Veli kartları ({devamsizlar.length})</div>
            {devamsizlar.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2" style={{ background: odak === o.id ? MINT_BG : BG1_ALT }}>
                <button type="button" onClick={() => setOdak(o.id)} className="min-w-0 flex-1 truncate text-left text-xs font-semibold" style={{ color: TEXT }}>
                  {o.ad} <span style={{ color: TEXT_MUTED }}>· {o.sinif ?? "—"}</span>
                </button>
                <input value={secili[o.id] ?? ""} onChange={(e) => setSecili((s) => ({ ...s, [o.id]: e.target.value }))}
                  placeholder={varsayilanDers || "ders / saat"} aria-label={`${o.ad} ders / saat`} maxLength={60}
                  className="w-32 rounded-lg px-2 py-1 text-[11px] outline-none" style={girdiStili} />
                <button type="button" onClick={() => cikti(o.id, false)} className="sfec-btn inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold" style={dugme(true)}>
                  <Download size={12} aria-hidden="true" /> İndir
                </button>
                {paylasilabilir && (
                  <button type="button" onClick={() => cikti(o.id, true)} className="sfec-btn inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold" style={dugme(false)}>
                    <Share2 size={12} aria-hidden="true" /> Veliye gönder
                  </button>
                )}
              </div>
            ))}
            <div className="mt-1 flex flex-wrap items-center gap-2 rounded-xl px-3 py-2" style={{ background: odak === "liste" ? MINT_BG : BG1_ALT }}>
              <button type="button" onClick={() => setOdak("liste")} className="flex-1 text-left text-xs font-bold" style={{ color: TEXT }}>
                Toplu liste · kurum içi{sayfalar.length > 1 ? ` (${sayfalar.length} sayfa)` : ""}
              </button>
              {sayfalar.map((_, i) => (
                <button key={i} type="button" onClick={() => cikti("liste", false, i)} className="sfec-btn inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold" style={dugme(false)}>
                  <Download size={12} aria-hidden="true" /> {sayfalar.length > 1 ? `Sayfa ${i + 1}` : "İndir"}
                </button>
              ))}
            </div>
          </div>
        )}
        {durum && <p className="text-xs font-semibold" style={{ color: MINT }}>{durum}</p>}
      </div>
      <div className="min-w-0">
        {devamsizlar.length === 0
          ? <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl px-6 text-center text-xs" style={{ background: BG1_ALT, color: TEXT_MUTED }}>Listeden derse gelmeyen öğrencileri seçin; kartları burada görürsünüz.</div>
          : <Onizleme src={onizleme} />}
      </div>
    </section>
  );
}
