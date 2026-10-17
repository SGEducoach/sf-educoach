"use client";

// Ödev mesaj kartı (kullanıcı isteği 18.10.2026): öğretmen verdiği
// ödevlerden WhatsApp'ta paylaşılacak 1080×1350 bir görsel oluşturur. Kart
// tamamen tarayıcıda (canvas) çizilir; sunucuya gönderilmez, hiçbir yerde
// saklanmaz. İndirince ya da paylaşınca kapanır ve önizleme silinir.
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, MessageSquareShare, Share2, X } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { bugununTarihiTR } from "@/lib/tarih";
import {
  MESAJ_KARTI_EN_FAZLA, OGRETMEN_NOTU_BASLIGI, OGRETMEN_NOTU_EN_FAZLA, kartTarihi, mesajKartiIcerigi,
  type MesajKartiGorevi, type MesajKartiIcerigi,
} from "@/lib/mesaj-karti";

const G = 1080;
const Y = 1350;
const KENAR = 72;
const R = {
  lacivert: "#0b2e4f", turkuaz: "#2596a3", buz: "#eaf4fc", yazi: "#0a1e3d", soluk: "#3d5a80",
  kirmizi: "#c0264a", kirmiziZemin: "#f9e3e9", acikTurkuaz: "#7fd6e0", kutuYazi: "#d6ecf5",
};

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function yuvarlakDikdortgen(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function satirlaraBol(ctx: Ctx, metin: string, genislik: number, enFazla: number): string[] {
  const kelimeler = metin.split(/\s+/).filter(Boolean);
  const satirlar: string[] = [];
  let satir = "";
  for (const k of kelimeler) {
    const aday = satir ? `${satir} ${k}` : k;
    if (ctx.measureText(aday).width <= genislik || !satir) satir = aday;
    else { satirlar.push(satir); satir = k; }
  }
  if (satir) satirlar.push(satir);
  if (satirlar.length > enFazla) {
    const kalan = satirlar.slice(0, enFazla);
    let son = kalan[enFazla - 1];
    while (son.length > 1 && ctx.measureText(`${son}…`).width > genislik) son = son.slice(0, -1);
    kalan[enFazla - 1] = `${son.trimEnd()}…`;
    return kalan;
  }
  return satirlar;
}

interface Olcu { etiket: number; baslik: number; hap: number; no: number; ic: number; aralik: number }
const OLCULER: Olcu[] = [
  { etiket: 24, baslik: 44, hap: 26, no: 96, ic: 34, aralik: 22 },
  { etiket: 21, baslik: 38, hap: 23, no: 84, ic: 28, aralik: 18 },
  { etiket: 19, baslik: 33, hap: 21, no: 74, ic: 24, aralik: 14 },
  { etiket: 17, baslik: 29, hap: 19, no: 64, ic: 20, aralik: 12 },
];

export async function mesajKartiCiz(canvas: HTMLCanvasElement, icerik: MesajKartiIcerigi, ogretmenNotu: string, aile: string, logo: HTMLImageElement | null) {
  canvas.width = G;
  canvas.height = Y;
  const ctx = canvas.getContext("2d") as Ctx;
  const font = (agirlik: number, boyut: number) => `${agirlik} ${boyut}px ${aile}`;
  const harfAraligi = (px: number) => { if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`; };

  // Zemin ve sağ üst ışık
  ctx.fillStyle = R.buz;
  ctx.fillRect(0, 0, G, Y);
  const isik = ctx.createRadialGradient(G - 0, 100, 0, G - 0, 100, 520);
  isik.addColorStop(0, "rgba(37,150,163,0.22)");
  isik.addColorStop(1, "rgba(37,150,163,0)");
  ctx.fillStyle = isik;
  ctx.fillRect(0, 0, G, Y);

  // Üst: logo + sınıflar
  if (logo) {
    const h = 118;
    ctx.drawImage(logo, KENAR, 64, (logo.naturalWidth / logo.naturalHeight) * h, h);
  }
  ctx.textAlign = "right";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = R.lacivert;
  ctx.font = font(900, 34);
  ctx.fillText(icerik.ustBaslik, G - KENAR, 112);
  ctx.fillStyle = R.soluk;
  ctx.font = font(700, 24);
  ctx.fillText(icerik.sinifSatiri, G - KENAR, 148);
  ctx.textAlign = "left";

  // Başlık
  ctx.font = font(900, 66);
  harfAraligi(-2);
  ctx.fillStyle = R.lacivert;
  ctx.fillText(icerik.baslikOn, KENAR, 280);
  if (icerik.baslikVurgu) {
    ctx.fillStyle = R.turkuaz;
    ctx.fillText(icerik.baslikVurgu, KENAR, 348);
    const w = ctx.measureText(`${icerik.baslikVurgu} `).width;
    ctx.fillStyle = R.lacivert;
    ctx.fillText(icerik.baslikSon, KENAR + w, 348);
  } else {
    ctx.fillText(icerik.baslikSon, KENAR, 348);
  }
  harfAraligi(0);

  // Alt bilgi ve öğretmen notu kutusu (yukarı doğru yerleşir)
  ctx.font = font(700, 24);
  ctx.fillStyle = R.soluk;
  ctx.fillText(icerik.altSol, KENAR, Y - 52);
  ctx.textAlign = "right";
  ctx.fillText("www.sefukoc.com", G - KENAR, Y - 52);
  ctx.textAlign = "left";

  // Not boşsa kutu çizilmez; ödev kartları o alanı da kullanır.
  const notMetni = ogretmenNotu.trim();
  const kutuIcGenislik = G - 2 * KENAR - 80;
  ctx.font = font(600, 27);
  const notSatirlari = notMetni ? satirlaraBol(ctx, notMetni, kutuIcGenislik, 5) : [];
  const kutuYukseklik = notMetni ? 36 + 44 + 14 + notSatirlari.length * 38 + 30 : 0;
  const kutuUst = Y - 52 - 48 - kutuYukseklik;

  // Ödev kartları: sığana kadar ölçü küçülür
  const listeUst = 392;
  const listeAlt = notMetni ? kutuUst - 28 : Y - 52 - 60;
  const icX = KENAR + 38;
  let secilen = OLCULER[OLCULER.length - 1];
  type Yerlesim = { y: number; h: number; basliklar: string[]; haplar: { metin: string; tarih: boolean; x: number; y: number; w: number }[] };
  let yerlesimler: Yerlesim[] = [];
  for (const o of OLCULER) {
    const metinX = icX + o.no + 28;
    const metinGenislik = G - KENAR - 38 - metinX;
    let y = listeUst;
    const sonuc: Yerlesim[] = [];
    for (const od of icerik.odevler) {
      ctx.font = font(900, o.baslik);
      const basliklar = satirlaraBol(ctx, od.baslik, metinGenislik, 2);
      ctx.font = font(800, o.hap);
      const hapYuk = o.hap + 18;
      let hx = metinX;
      let hy = 0;
      const haplar: Yerlesim["haplar"] = [];
      for (const h of [od.hedef, od.tarih].filter((m): m is string => !!m)) {
        const w = ctx.measureText(h).width + 40;
        if (hx > metinX && hx + w > metinX + metinGenislik) { hx = metinX; hy += hapYuk + 10; }
        haplar.push({ metin: h, tarih: h === od.tarih, x: hx, y: hy, w });
        hx += w + 12;
      }
      const icerikYuk = o.etiket + 10 + basliklar.length * o.baslik * 1.12 + 14 + hy + hapYuk;
      const h = Math.max(o.no, icerikYuk) + 2 * o.ic;
      sonuc.push({ y, h, basliklar, haplar });
      y += h + o.aralik;
    }
    secilen = o;
    yerlesimler = sonuc;
    if (y - o.aralik <= listeAlt) break;
  }

  icerik.odevler.forEach((od, i) => {
    const o = secilen;
    const { y, h, basliklar, haplar } = yerlesimler[i];
    ctx.save();
    ctx.shadowColor = "rgba(11,46,79,0.16)";
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = "#fff";
    yuvarlakDikdortgen(ctx, KENAR, y, G - 2 * KENAR, h, 34);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = od.tur === "konu" ? R.turkuaz : R.lacivert;
    yuvarlakDikdortgen(ctx, icX, y + o.ic, o.no, o.no, o.no * 0.29);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = font(900, o.no * 0.52);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(od.no), icX + o.no / 2, y + o.ic + o.no / 2 + 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    const metinX = icX + o.no + 28;
    let ty = y + o.ic + o.etiket;
    ctx.fillStyle = R.soluk;
    ctx.font = font(800, o.etiket);
    harfAraligi(2);
    ctx.fillText(od.turEtiketi.toLocaleUpperCase("tr-TR"), metinX, ty);
    harfAraligi(-0.5);
    ctx.fillStyle = R.yazi;
    ctx.font = font(900, o.baslik);
    ty += 10;
    for (const s of basliklar) { ty += o.baslik * 1.12; ctx.fillText(s, metinX, ty - o.baslik * 0.18); }
    harfAraligi(0);
    const hapUst = ty + 14;
    ctx.font = font(800, o.hap);
    for (const hp of haplar) {
      const hy = hapUst + hp.y;
      ctx.fillStyle = hp.tarih ? R.kirmiziZemin : R.buz;
      yuvarlakDikdortgen(ctx, hp.x, hy, hp.w, o.hap + 18, (o.hap + 18) / 2);
      ctx.fill();
      ctx.fillStyle = hp.tarih ? R.kirmizi : R.lacivert;
      ctx.textBaseline = "middle";
      ctx.fillText(hp.metin, hp.x + 20, hy + (o.hap + 18) / 2 + 1);
      ctx.textBaseline = "alphabetic";
    }
  });

  // Öğretmen notu kutusu (yalnız not yazıldıysa)
  if (!notMetni) return;
  ctx.fillStyle = R.lacivert;
  yuvarlakDikdortgen(ctx, KENAR, kutuUst, G - 2 * KENAR, kutuYukseklik, 34);
  ctx.fill();
  const kutuX = KENAR + 40;
  const by = kutuUst + 36 + 36;
  ctx.font = font(900, 40);
  harfAraligi(-0.5);
  ctx.fillStyle = R.acikTurkuaz;
  ctx.fillText(OGRETMEN_NOTU_BASLIGI, kutuX, by);
  harfAraligi(0);
  ctx.font = font(600, 27);
  ctx.fillStyle = R.kutuYazi;
  notSatirlari.forEach((s, i) => ctx.fillText(s, kutuX, by + 14 + 38 * (i + 1)));
}

function varsayilanSecim(gorevler: MesajKartiGorevi[]): string[] {
  const bugun = bugununTarihiTR();
  const suren = gorevler.filter((g) => g.sonTarih >= bugun).slice(0, MESAJ_KARTI_EN_FAZLA);
  return (suren.length > 0 ? suren : gorevler.slice(0, 2)).map((g) => g.id);
}

function gorevSatiri(g: MesajKartiGorevi): string {
  const tur = g.tur === "soru" ? "Soru çözümü" : g.tur === "konu" ? "Konu çalışma" : "Deneme";
  return `${tur} · ${g.ders}${g.konu ? ` · ${g.konu}` : ""}`;
}

export function MesajKartiOlusturucu({ gorevler, ogretmenAdi }: { gorevler: MesajKartiGorevi[]; ogretmenAdi: string | null }) {
  const [acik, setAcik] = useState(false);
  const [secili, setSecili] = useState<string[]>(() => varsayilanSecim(gorevler));
  // Öğretmen notu kart oluşturulurken o an yazılır; her açılışta boş başlar.
  const [ogretmenNotu, setOgretmenNotu] = useState("");
  const [onizleme, setOnizleme] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [paylasilabilir, setPaylasilabilir] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);

  // Seçim sırası listedeki sırayı izler (en yeni ödev önce).
  const seciliGorevler = useMemo(() => gorevler.filter((g) => secili.includes(g.id)), [gorevler, secili]);
  const icerik = useMemo(() => mesajKartiIcerigi(seciliGorevler, ogretmenAdi), [seciliGorevler, ogretmenAdi]);

  useEffect(() => {
    if (!acik || seciliGorevler.length === 0) return;
    let iptal = false;
    const zamanlayici = window.setTimeout(async () => {
      if (!logoRef.current) {
        const img = new Image();
        img.src = "/logo.png";
        try { await img.decode(); logoRef.current = img; } catch { logoRef.current = null; }
      }
      const aile = getComputedStyle(document.body).fontFamily || "sans-serif";
      try { await Promise.all([document.fonts.load(`900 40px ${aile}`), document.fonts.load(`600 27px ${aile}`), document.fonts.load(`800 24px ${aile}`)]); } catch { /* yedek yazı tipiyle sürer */ }
      const canvas = canvasRef.current ?? document.createElement("canvas");
      canvasRef.current = canvas;
      await mesajKartiCiz(canvas, icerik, ogretmenNotu, aile, logoRef.current);
      if (!iptal) setOnizleme(canvas.toDataURL("image/png"));
    }, 150);
    return () => { iptal = true; window.clearTimeout(zamanlayici); };
  }, [acik, icerik, ogretmenNotu, seciliGorevler.length]);

  function kapat() {
    setAcik(false);
    setOnizleme(null);
    canvasRef.current = null;
  }

  function dosyaAdi() {
    return `odev-karti-${(icerik.baslikVurgu || "odevler").toLocaleLowerCase("tr-TR").replace(/[^a-z0-9ğüşıöç]+/g, "-")}-${bugununTarihiTR()}.png`;
  }

  async function blobAl(): Promise<Blob | null> {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return new Promise((coz) => canvas.toBlob(coz, "image/png"));
  }

  async function indir() {
    const blob = await blobAl();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = dosyaAdi();
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMesaj("Kart indirildi. Sistemde saklanmadı.");
    kapat();
  }

  async function paylas() {
    const blob = await blobAl();
    if (!blob) return;
    const dosya = new File([blob], dosyaAdi(), { type: "image/png" });
    try {
      await navigator.share({ files: [dosya], title: `${icerik.baslikOn} ${icerik.baslikVurgu} ${icerik.baslikSon}`.replace(/\s+/g, " ") });
      setMesaj("Kart paylaşıldı. Sistemde saklanmadı.");
      kapat();
    } catch {
      // Kullanıcı paylaşım menüsünü kapattıysa kart açık kalır.
    }
  }

  function ac() {
    setMesaj(null);
    setSecili(varsayilanSecim(gorevler));
    setOgretmenNotu("");
    setAcik(true);
    const deneme = new File([new Blob()], "k.png", { type: "image/png" });
    setPaylasilabilir(typeof navigator !== "undefined" && !!navigator.canShare?.({ files: [deneme] }));
  }

  const girdi = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };

  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: MINT_BG }}>
          <MessageSquareShare size={15} color={MINT} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Mesaj kartı</div>
          <div className="text-[11px]" style={{ color: TEXT_MUTED }}>Verdiğiniz ödevlerden WhatsApp&apos;ta paylaşılacak bir görsel oluşturun. Kart kaydedilmez; indirince kapanır.</div>
        </div>
        {!acik && (
          <button type="button" onClick={ac} disabled={gorevler.length === 0}
            className="sfec-btn rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
            Mesaj kartı oluştur
          </button>
        )}
      </div>
      {!acik && gorevler.length === 0 && <p className="mt-3 text-xs" style={{ color: TEXT_MUTED }}>Son üç haftada verdiğiniz ödev yok. Aşağıdan ödev verdikten sonra kart oluşturabilirsiniz.</p>}
      {mesaj && !acik && <p className="mt-3 text-xs font-semibold" style={{ color: MINT }}>{mesaj}</p>}

      {acik && (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="flex min-w-0 flex-col gap-3">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
                Kartta yer alacak ödevler (en fazla {MESAJ_KARTI_EN_FAZLA})
              </legend>
              {gorevler.map((g) => {
                const isaretli = secili.includes(g.id);
                const dolu = !isaretli && secili.length >= MESAJ_KARTI_EN_FAZLA;
                return (
                  <label key={g.id} className="flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2 text-xs"
                    style={{ background: isaretli ? MINT_BG : BG1_ALT, color: dolu ? TEXT_MUTED : TEXT, opacity: dolu ? 0.6 : 1 }}>
                    <input type="checkbox" className="mt-0.5" checked={isaretli} disabled={dolu}
                      onChange={(e) => setSecili((s) => e.target.checked ? [...s, g.id] : s.filter((x) => x !== g.id))} />
                    <span className="min-w-0">
                      <span className="block font-semibold">{gorevSatiri(g)}</span>
                      <span className="block text-[11px]" style={{ color: TEXT_MUTED }}>
                        {g.siniflar.join(", ") || "sınıf yok"} · son gün {kartTarihi(g.sonTarih)}
                      </span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <label className="flex flex-col gap-1">
              <span className="flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>
                {OGRETMEN_NOTU_BASLIGI}
                <span className="normal-case tracking-normal">{ogretmenNotu.length}/{OGRETMEN_NOTU_EN_FAZLA}</span>
              </span>
              <textarea id="mesaj-karti-ogretmen-notu" value={ogretmenNotu} maxLength={OGRETMEN_NOTU_EN_FAZLA} rows={4}
                onChange={(e) => setOgretmenNotu(e.target.value)}
                placeholder="Öğrencilere bu kartla iletmek istediğiniz notu yazın. Boş bırakırsanız kartta not kutusu olmaz."
                className="rounded-xl px-3 py-2 text-xs outline-none" style={girdi} />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={indir} disabled={!onizleme}
                className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
                <Download size={13} aria-hidden="true" /> İndir (PNG)
              </button>
              {paylasilabilir && (
                <button type="button" onClick={paylas} disabled={!onizleme}
                  className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                  <Share2 size={13} aria-hidden="true" /> Paylaş (WhatsApp)
                </button>
              )}
              <button type="button" onClick={kapat} className="sfec-btn inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold" style={{ color: TEXT_MUTED }}>
                <X size={13} aria-hidden="true" /> Kapat
              </button>
            </div>
            {seciliGorevler.length === 0 && <p className="text-xs font-semibold" style={{ color: BLUSH }}>Kart için en az bir ödev seçin.</p>}
          </div>
          <div className="min-w-0">
            {onizleme && seciliGorevler.length > 0
              // eslint-disable-next-line @next/next/no-img-element -- canvas çıktısı (data URL), next/image gerekmez
              ? <img src={onizleme} alt="Mesaj kartı önizlemesi" className="w-full rounded-2xl" style={{ border: `1px solid ${BORDER}` }} />
              : <div className="flex aspect-[4/5] w-full items-center justify-center rounded-2xl text-xs" style={{ background: BG1_ALT, color: TEXT_MUTED }}>Önizleme hazırlanıyor…</div>}
          </div>
        </div>
      )}
    </div>
  );
}
