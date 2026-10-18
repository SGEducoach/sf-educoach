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
  DEVAMSIZLIK_RENK, DUYURU_SABLONLARI, TOPLU_LISTE_SAYFA_SATIRI, devamsizlikVeliKarti, kartTarihi, topluListeSayfalari, varsayilanDegerler,
  type DevamsizOgrenci, type DuyuruSablonu,
} from "@/lib/whatsapp-duyuru";
import { duyuruKartiCiz, topluListeCiz } from "@/components/dashboard/whatsapp-kart-cizim";
import { kurumLogosuYukle } from "@/app/dashboard/kurum-logo-actions";
import {
  Alan, FotoSecici, Onizleme, SablonDugmesi, dosyaAdiTemizle, girdiStili, gorselYukle, indirVeyaPaylas, useFotoSecimi, yaziTipi,
} from "@/components/dashboard/whatsapp-ortak";
import { CinsiyetBilgileri, YurtListeDuzenleyici, type YurtVerisi } from "@/components/dashboard/YurtListeStudyosu";
import { YURT_SABLONLARI } from "@/lib/yurt-listesi";
import { etkinSablonlar, type EtkinSablon, type EtkinSablonlar } from "@/lib/whatsapp-sablon-ayarlari";

const DEVAMSIZLIK = "devamsizlik";
const CINSIYET = "cinsiyet-bilgileri";

export interface StudyoOgrencisi { id: string; ad: string; sinif: string | null; seviye: string | null; sube: string | null }

// genelDuyurular: müdür ve rehber (duyuru şablonları + devamsızlık).
// yurt: yurtlu kurumda her öğretmen ve müdür (yurt listesi kartları).
// sablonlar: admin ayarları uygulanmış şablonlar (ad, başlık, gizli, fotoğraflar).
export function WhatsappDuyuruStudyosu({ kurumAdi, logoAdresi, logoDegistirebilir, ogrenciler, genelDuyurular = true, yurt = null, sablonlar: sablonlarGirdi }: {
  kurumAdi: string; logoAdresi: string | null; logoDegistirebilir: boolean; ogrenciler: StudyoOgrencisi[];
  genelDuyurular?: boolean; yurt?: YurtVerisi | null; sablonlar?: EtkinSablonlar;
}) {
  const sablonlar = useMemo(() => sablonlarGirdi ?? etkinSablonlar([]), [sablonlarGirdi]);
  const gorunur = (anahtar: string) => !sablonlar[anahtar]?.gizli;
  const ilkAnahtar = [...(genelDuyurular ? [...DUYURU_SABLONLARI.map((s) => s.anahtar), DEVAMSIZLIK] : []), ...(yurt ? YURT_SABLONLARI.map((s) => s.anahtar) : [])]
    .find(gorunur) ?? (yurt?.mudurMu ? CINSIYET : DEVAMSIZLIK);
  const [logo, setLogo] = useState<string | null>(logoAdresi);
  const [sablonAnahtari, setSablonAnahtari] = useState<string>(ilkAnahtar);
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
  const yurtSablonu = YURT_SABLONLARI.find((s) => s.anahtar === sablonAnahtari) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {!genelDuyurular ? (
        <section className="sfec-fade flex items-center gap-3 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <MessageSquareShare size={18} color={MINT} aria-hidden="true" />
          <div>
            <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Yurt Listeleri</h2>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>Yoklama, evci ve çarşı izni listelerini kart olarak hazırlayıp müdür yardımcısına WhatsApp&apos;tan gönderin. Kartlar sistemde saklanmaz.</p>
          </div>
        </section>
      ) : (
      <section className="sfec-fade flex flex-wrap items-center gap-4 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full" style={{ background: "#fff", border: `3px solid ${BORDER_STRONG}` }}>
          {logo
            // eslint-disable-next-line @next/next/no-img-element -- kurum logosu, kendi API yolumuzdan
            ? <img src={logo} alt={`${kurumAdi} logosu`} className="h-full w-full object-contain p-1" />
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
      )}

      {/* Şablonlar kenarda (kullanıcı isteği 18.10.2026); dar ekranda üstte yatay kayan şerit. */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <nav aria-label="Duyuru türü"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 max-lg:[contain:inline-size] lg:sticky lg:top-4 lg:mx-0 lg:w-60 lg:shrink-0 lg:overflow-visible lg:p-0">
          <div className="contents lg:flex lg:w-full lg:flex-col lg:gap-1 lg:rounded-3xl lg:p-2" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            {genelDuyurular && (<>
              <span className="hidden px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide lg:block" style={{ color: TEXT_MUTED }}>Duyurular</span>
              {DUYURU_SABLONLARI.filter((s) => gorunur(s.anahtar)).map((s) => (
                <SablonDugmesi key={s.anahtar} ad={sablonlar[s.anahtar].ad} foto={sablonlar[s.anahtar].fotolar[0] ?? ""} renk={s.renk} secili={s.anahtar === sablonAnahtari} sec={() => setSablonAnahtari(s.anahtar)} />
              ))}
              {gorunur(DEVAMSIZLIK) && (<>
                <span className="hidden px-2 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide lg:block" style={{ color: TEXT_MUTED }}>Veli Bildirimi</span>
                <SablonDugmesi ad={sablonlar[DEVAMSIZLIK].ad} foto={sablonlar[DEVAMSIZLIK].fotolar[0] ?? ""} renk={DEVAMSIZLIK_RENK}
                  secili={sablonAnahtari === DEVAMSIZLIK} sec={() => setSablonAnahtari(DEVAMSIZLIK)} />
              </>)}
            </>)}
            {yurt && (<>
              <span className={`hidden px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide lg:block ${genelDuyurular ? "pt-3" : "pt-1"}`} style={{ color: TEXT_MUTED }}>Yurt</span>
              {YURT_SABLONLARI.filter((s) => gorunur(s.anahtar)).map((s) => (
                <SablonDugmesi key={s.anahtar} ad={sablonlar[s.anahtar].ad} foto={sablonlar[s.anahtar].fotolar[0] ?? ""} renk={s.renk} secili={s.anahtar === sablonAnahtari} sec={() => setSablonAnahtari(s.anahtar)} />
              ))}
              {yurt.mudurMu && (
                <SablonDugmesi ad="Cinsiyet Bilgileri" foto="aksam-yoklamasi.jpg" renk="#5b6b82"
                  secili={sablonAnahtari === CINSIYET} sec={() => setSablonAnahtari(CINSIYET)} />
              )}
            </>)}
          </div>
        </nav>

        <div className="min-w-0 flex-1">
          {yurt && yurtSablonu
            ? <YurtListeDuzenleyici key={yurtSablonu.anahtar} sablon={yurtSablonu} etkin={sablonlar[yurtSablonu.anahtar]} kurumAdi={kurumAdi} logo={logo} yurt={yurt} paylasilabilir={paylasilabilir} />
            : yurt && sablonAnahtari === CINSIYET
            ? <CinsiyetBilgileri yurt={yurt} />
            : sablon
            ? <DuyuruDuzenleyici key={sablon.anahtar} sablon={sablon} etkin={sablonlar[sablon.anahtar]} kurumAdi={kurumAdi} logo={logo} telefon={telefon} paylasilabilir={paylasilabilir} />
            : <DevamsizlikDuzenleyici etkin={sablonlar[DEVAMSIZLIK]} kurumAdi={kurumAdi} logo={logo} telefon={telefon} paylasilabilir={paylasilabilir} ogrenciler={ogrenciler} />}
        </div>
      </div>
    </div>
  );
}

function DuyuruDuzenleyici({ sablon, etkin, kurumAdi, logo, telefon, paylasilabilir }: {
  sablon: DuyuruSablonu; etkin: EtkinSablon; kurumAdi: string; logo: string | null; telefon: string; paylasilabilir: boolean;
}) {
  const [degerler, setDegerler] = useState<Record<string, string>>(() => varsayilanDegerler(sablon));
  const [renk, setRenk] = useState(sablon.renk);
  const foto = useFotoSecimi(etkin.fotolar);
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [durum, setDurum] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Admin başlığı (varsa) şablonun sabit başlığının yerine geçer.
  const icerik = useMemo(() => {
    const i = sablon.icerik(degerler);
    return etkin.baslik ? { ...i, baslik: etkin.baslik } : i;
  }, [sablon, degerler, etkin.baslik]);
  const fotoKaynak = foto.kaynak;

  useEffect(() => {
    let iptal = false;
    const z = window.setTimeout(async () => {
      const [aile, fotoImg, logoImg, sefu] = await Promise.all([yaziTipi(), gorselYukle(fotoKaynak), gorselYukle(logo), gorselYukle(icerik.girisGerekli ? "/icon-192.png" : null)]);
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      duyuruKartiCiz(canvas, { icerik, sablonAdi: etkin.ad, renk, foto: fotoImg, logo: logoImg, sefuSimgesi: sefu, kurumAdi, telefon, aile });
      if (!iptal) setOnizleme(canvas.toDataURL("image/png"));
    }, 150);
    return () => { iptal = true; window.clearTimeout(z); };
  }, [icerik, etkin.ad, renk, fotoKaynak, logo, kurumAdi, telefon]);

  async function cikti(paylas: boolean) {
    if (!canvasRef.current) return;
    const ok = await indirVeyaPaylas(canvasRef.current, `duyuru-${sablon.anahtar}-${bugununTarihiTR()}.png`, paylas);
    setDurum(ok ? (paylas ? "Kart paylaşıldı. Sistemde saklanmadı." : "Kart indirildi. Sistemde saklanmadı.") : null);
  }

  return (
    <section className="sfec-fade grid gap-4 rounded-3xl p-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex min-w-0 flex-col gap-3">
        <h3 className="text-sm font-bold" style={{ color: TEXT }}>{etkin.ad}</h3>
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
          <FotoSecici durum={foto} />
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
          <button type="button" onClick={() => { setDegerler(varsayilanDegerler(sablon)); setRenk(sablon.renk); foto.sifirla(); }}
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

function DevamsizlikDuzenleyici({ etkin, kurumAdi, logo, telefon, paylasilabilir, ogrenciler }: {
  etkin: EtkinSablon; kurumAdi: string; logo: string | null; telefon: string; paylasilabilir: boolean; ogrenciler: StudyoOgrencisi[];
}) {
  const [tarih, setTarih] = useState(bugununTarihiTR());
  const [varsayilanDers, setVarsayilanDers] = useState("");
  const [veliNotu, setVeliNotu] = useState("");
  const [sinif, setSinif] = useState("");
  const [arama, setArama] = useState("");
  const [secili, setSecili] = useState<Record<string, string>>({}); // öğrenci → ders/saat (boşsa varsayılan)
  const [odak, setOdak] = useState<string | "liste">("liste");
  const foto = useFotoSecimi(etkin.fotolar);
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
    const fotoImg = await gorselYukle(foto.kaynak);
    const icerik = devamsizlikVeliKarti(o, tarih, veliNotu);
    duyuruKartiCiz(canvas, {
      icerik: etkin.baslik ? { ...icerik, baslik: etkin.baslik } : icerik, sablonAdi: "Devamsızlık", renk: DEVAMSIZLIK_RENK, foto: fotoImg, logo: logoImg,
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
  }, [gecerliOdak, devamsizlar, tarih, veliNotu, foto.kaynak, logo, telefon, kurumAdi, etkin.baslik]);

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
          <h3 className="text-sm font-bold" style={{ color: TEXT }}>{etkin.ad}</h3>
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

        <FotoSecici durum={foto} />

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
