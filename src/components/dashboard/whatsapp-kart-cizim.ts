// WhatsApp duyuru kartlarının tarayıcıda (canvas) çizimi — 1080×1350.
// İçerik whatsapp-duyuru.ts'ten gelir; burada yalnız yerleşim. Kurum logosu
// HER ZAMAN yuvarlak kırpılır (kullanıcı kararı 18.10.2026). SeFu simgesi
// yalnız giriş gerektiren kartta, alt köşede küçük olarak çizilir.
import type { KartIcerigi } from "@/lib/whatsapp-duyuru";
import { YURT_BLOK_SATIRI as BLOK_SATIRI } from "@/lib/yurt-listesi";

export const KART_G = 1080;
export const KART_Y = 1350;
const KENAR = 72;
const KOYU = "#14213d";
const SOLUK = "#5b6b82";
const ZEMIN = "#f5f7fb";

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function yuvarlak(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function satirla(ctx: Ctx, metin: string, genislik: number, enFazla: number): string[] {
  const sonuc: string[] = [];
  for (const paragraf of metin.split(/\n+/)) {
    let satir = "";
    for (const k of paragraf.split(/\s+/).filter(Boolean)) {
      const aday = satir ? `${satir} ${k}` : k;
      if (ctx.measureText(aday).width <= genislik || !satir) satir = aday;
      else { sonuc.push(satir); satir = k; }
    }
    if (satir) sonuc.push(satir);
  }
  if (sonuc.length > enFazla) {
    const kesik = sonuc.slice(0, enFazla);
    let son = kesik[enFazla - 1];
    while (son.length > 1 && ctx.measureText(`${son}…`).width > genislik) son = son.slice(0, -1);
    kesik[enFazla - 1] = `${son.trimEnd()}…`;
    return kesik;
  }
  return sonuc;
}

// Görseli kutuya "cover" sığdırır (taşan kısım kırpılır).
function kapla(ctx: Ctx, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const o = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const iw = img.naturalWidth * o;
  const ih = img.naturalHeight * o;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

function kurumLogosu(ctx: Ctx, logo: HTMLImageElement | null, kurumAdi: string, cx: number, cy: number, r: number, renk: string) {
  ctx.save();
  ctx.shadowColor = "rgba(20,33,61,0.28)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  if (logo) {
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    // Yatay logo daireye sığdırılır (kırpılmaz); kare logo daireyi doldurur.
    if (genisLogoMu(logo)) genisLogoCiz(ctx, logo, cx - r * 0.86, cy - r, r * 2, r * 1.72);
    else kapla(ctx, logo, cx - r, cy - r, r * 2, r * 2);
  } else {
    ctx.fillStyle = renk;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 ${r * 0.8}px sans-serif`;
    const harfler = kurumAdi.split(/\s+/).filter(Boolean).slice(0, 2).map((k) => k[0]?.toLocaleUpperCase("tr-TR")).join("");
    ctx.fillText(harfler || "•", cx, cy + 4);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }
  ctx.restore();
}

// Yatay (yazılı) kurum logosu yuvarlak kırpılmaz (kullanıcı isteği
// 18.10.2026, Elbistan Bist Fen Lisesi logosu): fotoğrafın altındaki açık
// zemine çerçevesiz, oranı korunarak çizilir. Kare logo yuvarlak kalır.
export const genisLogoMu = (logo: HTMLImageElement | null): logo is HTMLImageElement =>
  !!logo && logo.naturalHeight > 0 && logo.naturalWidth / logo.naturalHeight > 1.4;

function genisLogoCiz(ctx: Ctx, logo: HTMLImageElement, x: number, y: number, yukseklik: number, enFazlaGenislik: number): number {
  const oran = logo.naturalWidth / logo.naturalHeight;
  const g = Math.min(enFazlaGenislik, yukseklik * oran);
  const h = g / oran;
  ctx.drawImage(logo, x, y + (yukseklik - h) / 2, g, h);
  return g;
}

export interface DuyuruCizimi {
  icerik: KartIcerigi;
  sablonAdi: string;
  renk: string;
  foto: HTMLImageElement | null;
  logo: HTMLImageElement | null;
  sefuSimgesi: HTMLImageElement | null;
  kurumAdi: string;
  telefon: string;
  aile: string;
}

const OLCEKLER = [1, 0.9, 0.8, 0.72, 0.64];

export function duyuruKartiCiz(canvas: HTMLCanvasElement, c: DuyuruCizimi) {
  canvas.width = KART_G;
  canvas.height = KART_Y;
  const ctx = canvas.getContext("2d") as Ctx;
  const font = (a: number, b: number) => `${a} ${Math.round(b)}px ${c.aile}`;
  const harf = (px: number) => { if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`; };

  ctx.fillStyle = ZEMIN;
  ctx.fillRect(0, 0, KART_G, KART_Y);

  // Fotoğraf alanı
  const FOTO_Y = 580;
  if (c.foto) {
    kapla(ctx, c.foto, 0, 0, KART_G, FOTO_Y);
  } else {
    const g = ctx.createLinearGradient(0, 0, KART_G, FOTO_Y);
    g.addColorStop(0, rgba(c.renk, 1));
    g.addColorStop(1, rgba(c.renk, 0.72));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, KART_G, FOTO_Y);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (const [x, y, r] of [[900, 90, 220], [140, 470, 160], [620, 520, 90]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  }
  const perde = ctx.createLinearGradient(0, 0, 0, FOTO_Y);
  perde.addColorStop(0, "rgba(0,0,0,0)");
  perde.addColorStop(0.55, rgba(c.renk, 0.12));
  perde.addColorStop(1, rgba(c.renk, 0.62));
  ctx.fillStyle = perde;
  ctx.fillRect(0, 0, KART_G, FOTO_Y);

  // Şablon etiketi fotoğrafın üstünde (hap)
  ctx.font = font(800, 24);
  harf(2);
  const etiket = c.sablonAdi.toLocaleUpperCase("tr-TR");
  const ew = ctx.measureText(etiket).width + 44;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  yuvarlak(ctx, KENAR, 56, ew, 52, 26);
  ctx.fill();
  ctx.fillStyle = c.renk;
  ctx.textBaseline = "middle";
  ctx.fillText(etiket, KENAR + 22, 83);
  ctx.textBaseline = "alphabetic";
  harf(0);

  // Logo ve kurum adı
  const LR = 104;
  if (genisLogoMu(c.logo)) {
    // Logo kurumun adını zaten taşır; yanına yalnız "Duyuru" yazılır.
    genisLogoCiz(ctx, c.logo, KENAR, FOTO_Y + 28, 104, KART_G - 2 * KENAR - 200);
    ctx.fillStyle = c.renk;
    ctx.font = font(800, 26);
    ctx.textAlign = "right";
    ctx.fillText("Duyuru", KART_G - KENAR, FOTO_Y + 88);
    ctx.textAlign = "left";
  } else {
    kurumLogosu(ctx, c.logo, c.kurumAdi, KENAR + LR, FOTO_Y, LR, c.renk);
    const adX = KENAR + LR * 2 + 40;
    ctx.fillStyle = KOYU;
    ctx.font = font(900, 38);
    const adSatir = satirla(ctx, c.kurumAdi, KART_G - KENAR - adX, 1)[0] ?? "";
    ctx.fillText(adSatir, adX, FOTO_Y + 64);
    ctx.fillStyle = c.renk;
    ctx.font = font(700, 24);
    ctx.fillText("Duyuru", adX, FOTO_Y + 100);
  }

  // Alt bilgi
  const altY = KART_Y - 54;
  ctx.font = font(700, 24);
  ctx.fillStyle = SOLUK;
  ctx.fillText([c.kurumAdi, c.telefon.trim()].filter(Boolean).join(" · "), KENAR, altY);
  if (c.icerik.girisGerekli) {
    ctx.textAlign = "right";
    ctx.fillText("sefukoc.com", KART_G - KENAR, altY);
    const w = ctx.measureText("sefukoc.com").width;
    if (c.sefuSimgesi) ctx.drawImage(c.sefuSimgesi, KART_G - KENAR - w - 52, altY - 34, 42, 42);
    ctx.textAlign = "left";
  }

  // İçerik: sığana kadar küçült
  const ust = FOTO_Y + LR + 66;
  const alt = altY - 44;
  const genislik = KART_G - 2 * KENAR;
  for (const o of OLCEKLER) {
    const p = {
      baslik: 66 * o, alt: 32 * o, etiket: 22 * o, deger: 32 * o, aciklama: 28 * o, satirAra: 22 * o,
    };
    ctx.font = font(900, p.baslik);
    const baslik = satirla(ctx, c.icerik.baslik, genislik, 2);
    ctx.font = font(700, p.alt);
    const altBaslik = c.icerik.altBaslik ? satirla(ctx, c.icerik.altBaslik, genislik, 2) : [];
    const degerX = KENAR + 250 * Math.max(o, 0.8);
    ctx.font = font(800, p.deger);
    const satirlar = c.icerik.satirlar.map((s) => ({ etiket: s.etiket, degerler: satirla(ctx, s.deger, KART_G - KENAR - degerX, 2) }));
    ctx.font = font(600, p.aciklama);
    const aciklama = c.icerik.aciklama ? satirla(ctx, c.icerik.aciklama, genislik - 56, 7) : [];

    const baslikYuk = baslik.length * p.baslik * 1.08;
    const altYuk = altBaslik.length ? altBaslik.length * p.alt * 1.25 + 8 : 0;
    const satirYuk = satirlar.reduce((t, s) => t + Math.max(1, s.degerler.length) * p.deger * 1.2 + p.satirAra, 0);
    const aciklamaYuk = aciklama.length ? 56 + (c.icerik.aciklamaBasligi ? p.etiket + 14 : 0) + aciklama.length * p.aciklama * 1.42 : 0;
    const toplam = baslikYuk + altYuk + (satirlar.length ? 26 + satirYuk : 0) + (aciklama.length ? 24 + aciklamaYuk : 0);
    if (toplam > alt - ust && o !== OLCEKLER[OLCEKLER.length - 1]) continue;

    let y = ust;
    ctx.fillStyle = KOYU;
    ctx.font = font(900, p.baslik);
    harf(-1);
    for (const s of baslik) { y += p.baslik * 1.08; ctx.fillText(s, KENAR, y - p.baslik * 0.12); }
    harf(0);
    if (altBaslik.length) {
      y += 8;
      ctx.fillStyle = c.renk;
      ctx.font = font(700, p.alt);
      for (const s of altBaslik) { y += p.alt * 1.25; ctx.fillText(s, KENAR, y - p.alt * 0.2); }
    }
    if (satirlar.length) {
      y += 26;
      for (const s of satirlar) {
        const yuk = Math.max(1, s.degerler.length) * p.deger * 1.2;
        ctx.strokeStyle = rgba(KOYU, 0.08);
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(KENAR, y); ctx.lineTo(KART_G - KENAR, y); ctx.stroke();
        ctx.fillStyle = SOLUK;
        ctx.font = font(800, p.etiket);
        harf(2);
        ctx.fillText(s.etiket.toLocaleUpperCase("tr-TR"), KENAR, y + p.satirAra / 2 + p.deger * 0.95);
        harf(0);
        ctx.fillStyle = KOYU;
        ctx.font = font(800, p.deger);
        s.degerler.forEach((d, i) => ctx.fillText(d, degerX, y + p.satirAra / 2 + p.deger * (1 + i * 1.2)));
        y += yuk + p.satirAra;
      }
    }
    if (aciklama.length) {
      y += 24;
      ctx.fillStyle = rgba(c.renk, 0.09);
      yuvarlak(ctx, KENAR, y, genislik, aciklamaYuk, 28);
      ctx.fill();
      let ay = y + 28;
      if (c.icerik.aciklamaBasligi) {
        ctx.fillStyle = c.renk;
        ctx.font = font(800, p.etiket);
        harf(2);
        ay += p.etiket;
        ctx.fillText(c.icerik.aciklamaBasligi.toLocaleUpperCase("tr-TR"), KENAR + 28, ay);
        harf(0);
        ay += 14;
      }
      ctx.fillStyle = KOYU;
      ctx.font = font(600, p.aciklama);
      for (const s of aciklama) { ay += p.aciklama * 1.42; ctx.fillText(s, KENAR + 28, ay - p.aciklama * 0.3); }
    }
    break;
  }
}

export interface TopluListeCizimi {
  kurumAdi: string;
  logo: HTMLImageElement | null;
  tarih: string;        // biçimlenmiş
  satirlar: { no: number; ad: string; sinif: string; dersSaat: string }[];
  sayfa: number;
  toplamSayfa: number;
  toplamOgrenci: number;
  renk: string;
  aile: string;
}

export function topluListeCiz(canvas: HTMLCanvasElement, c: TopluListeCizimi) {
  canvas.width = KART_G;
  canvas.height = KART_Y;
  const ctx = canvas.getContext("2d") as Ctx;
  const font = (a: number, b: number) => `${a} ${b}px ${c.aile}`;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, KART_G, KART_Y);
  const g = ctx.createLinearGradient(0, 0, KART_G, 220);
  g.addColorStop(0, c.renk);
  g.addColorStop(1, rgba(c.renk, 0.8));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, KART_G, 220);
  kurumLogosu(ctx, c.logo, c.kurumAdi, KENAR + 70, 110, 70, c.renk);
  ctx.fillStyle = "#fff";
  ctx.font = font(900, 40);
  ctx.fillText(satirla(ctx, c.kurumAdi, KART_G - KENAR - 270, 1)[0] ?? "", KENAR + 172, 102);
  ctx.font = font(700, 26);
  ctx.fillText("Devamsızlık Listesi", KENAR + 172, 146);

  // Kurum içi şeridi
  ctx.fillStyle = "#fde2e4";
  ctx.fillRect(0, 220, KART_G, 64);
  ctx.fillStyle = "#b8323a";
  ctx.font = font(900, 26);
  ctx.textAlign = "center";
  ctx.fillText("KURUM İÇİ — VELİLERE GÖNDERİLMEZ", KART_G / 2, 262);
  ctx.textAlign = "left";

  ctx.fillStyle = KOYU;
  ctx.font = font(900, 46);
  ctx.fillText(c.tarih, KENAR, 362);
  ctx.fillStyle = SOLUK;
  ctx.font = font(700, 24);
  ctx.textAlign = "right";
  ctx.fillText(`${c.toplamOgrenci} öğrenci · sayfa ${c.sayfa}/${c.toplamSayfa}`, KART_G - KENAR, 362);
  ctx.textAlign = "left";

  const sutun = { no: KENAR + 16, ad: KENAR + 90, sinif: KENAR + 560, ders: KENAR + 700 };
  let y = 410;
  ctx.fillStyle = rgba(c.renk, 0.1);
  yuvarlak(ctx, KENAR, y, KART_G - 2 * KENAR, 56, 16);
  ctx.fill();
  ctx.fillStyle = c.renk;
  ctx.font = font(800, 22);
  for (const [x, t] of [[sutun.no, "NO"], [sutun.ad, "AD SOYAD"], [sutun.sinif, "SINIF"], [sutun.ders, "DERS / SAAT"]] as const) ctx.fillText(t, x, y + 36);
  y += 56;
  c.satirlar.forEach((s, i) => {
    if (i % 2 === 1) { ctx.fillStyle = "#f5f7fb"; ctx.fillRect(KENAR, y, KART_G - 2 * KENAR, 52); }
    ctx.fillStyle = SOLUK;
    ctx.font = font(700, 24);
    ctx.fillText(String(s.no), sutun.no, y + 35);
    ctx.fillStyle = KOYU;
    ctx.font = font(800, 26);
    ctx.fillText(satirla(ctx, s.ad, sutun.sinif - sutun.ad - 20, 1)[0] ?? "", sutun.ad, y + 35);
    ctx.font = font(700, 24);
    ctx.fillText(s.sinif, sutun.sinif, y + 35);
    ctx.fillText(satirla(ctx, s.dersSaat || "—", KART_G - KENAR - sutun.ders - 10, 1)[0] ?? "", sutun.ders, y + 35);
    y += 52;
  });

  ctx.fillStyle = SOLUK;
  ctx.font = font(700, 22);
  ctx.fillText("Bu liste kurum içi bilgilendirme içindir; öğrenci velilerine ayrı ayrı bildirim yapılır.", KENAR, KART_Y - 54);
}

// Yurt listesi kartı (kullanıcı isteği 18.10.2026): yoklama/evci/çarşı
// listesi, yoklama isteyen müdür yardımcısına gider. Logo yuvarlak (MEB).
export interface YurtListesiCizimi {
  kurumAdi: string;
  logo: HTMLImageElement | null;
  foto: HTMLImageElement | null;
  baslik: string;
  grupEtiketi: string;   // "Kız Öğrenciler"
  bilgi: string[];
  satirlar: { no: number; ad: string; okulNo: string; sinif: string; not: string }[];
  notEtiketi: string;
  bosMesaj: string;
  sayfa: number;
  toplamSayfa: number;
  toplamOgrenci: number;
  hazirlayan: string;
  renk: string;
  aile: string;
}

export function yurtListesiCiz(canvas: HTMLCanvasElement, c: YurtListesiCizimi) {
  canvas.width = KART_G;
  canvas.height = KART_Y;
  const ctx = canvas.getContext("2d") as Ctx;
  const font = (a: number, b: number) => `${a} ${Math.round(b)}px ${c.aile}`;
  const harf = (px: number) => { if ("letterSpacing" in ctx) ctx.letterSpacing = `${px}px`; };

  ctx.fillStyle = ZEMIN;
  ctx.fillRect(0, 0, KART_G, KART_Y);

  const FOTO_Y = 360;
  if (c.foto) kapla(ctx, c.foto, 0, 0, KART_G, FOTO_Y);
  else { ctx.fillStyle = c.renk; ctx.fillRect(0, 0, KART_G, FOTO_Y); }
  const perde = ctx.createLinearGradient(0, 0, 0, FOTO_Y);
  perde.addColorStop(0, "rgba(0,0,0,0.05)");
  perde.addColorStop(1, rgba(c.renk, 0.7));
  ctx.fillStyle = perde;
  ctx.fillRect(0, 0, KART_G, FOTO_Y);

  // Grup etiketi (hap)
  ctx.font = font(900, 26);
  harf(2);
  const etiket = c.grupEtiketi.toLocaleUpperCase("tr-TR");
  const ew = ctx.measureText(etiket).width + 48;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  yuvarlak(ctx, KENAR, 52, ew, 56, 28);
  ctx.fill();
  ctx.fillStyle = c.renk;
  ctx.textBaseline = "middle";
  ctx.fillText(etiket, KENAR + 24, 81);
  ctx.textBaseline = "alphabetic";
  harf(0);

  const LR = 86;
  if (genisLogoMu(c.logo)) {
    genisLogoCiz(ctx, c.logo, KENAR, FOTO_Y + 22, 92, KART_G - 2 * KENAR - 300);
    ctx.fillStyle = c.renk;
    ctx.font = font(800, 22);
    ctx.textAlign = "right";
    ctx.fillText("Yurt Bildirimi · Kurum İçi", KART_G - KENAR, FOTO_Y + 76);
    ctx.textAlign = "left";
  } else {
    kurumLogosu(ctx, c.logo, c.kurumAdi, KENAR + LR, FOTO_Y, LR, c.renk);
    const adX = KENAR + LR * 2 + 36;
    ctx.fillStyle = KOYU;
    ctx.font = font(900, 34);
    ctx.fillText(satirla(ctx, c.kurumAdi, KART_G - KENAR - adX, 1)[0] ?? "", adX, FOTO_Y + 52);
    ctx.fillStyle = c.renk;
    ctx.font = font(700, 22);
    ctx.fillText("Yurt Bildirimi · Kurum İçi", adX, FOTO_Y + 86);
  }

  // Başlık: tek satıra sığana kadar küçülür.
  let bp = 54;
  ctx.font = font(900, bp);
  while (ctx.measureText(c.baslik).width > KART_G - 2 * KENAR && bp > 34) { bp -= 2; ctx.font = font(900, bp); }
  ctx.fillStyle = KOYU;
  harf(-1);
  ctx.fillText(c.baslik, KENAR, FOTO_Y + 176);
  harf(0);
  let y = FOTO_Y + 176;
  ctx.font = font(700, 26);
  ctx.fillStyle = c.renk;
  for (const b of c.bilgi.slice(0, 2)) { y += 38; ctx.fillText(b, KENAR, y); }

  // Liste 12'şer satırlık üç blok (kullanıcı isteği: mesaj uzamasın). Her
  // satır: sıra + ad; altında okul no · sınıf · not.
  y = Math.max(y + 30, FOTO_Y + 256);
  if (c.satirlar.length > 0) {
    ctx.fillStyle = KOYU;
    ctx.font = font(800, 20);
    ctx.textAlign = "right";
    ctx.fillText(`${c.toplamOgrenci} öğrenci${c.toplamSayfa > 1 ? ` · kart ${c.sayfa}/${c.toplamSayfa}` : ""}`, KART_G - KENAR, y - 6);
    ctx.textAlign = "left";
    ctx.fillStyle = SOLUK;
    ctx.font = font(600, 17);
    const satirYuk = (KART_Y - 100 - (y + 8)) / Math.max(BLOK_SATIRI, Math.ceil(c.satirlar.length / 3));
    ctx.fillText(Math.min(54, satirYuk) >= 42
      ? `Ad altında: okul no · sınıf · ${c.notEtiketi.toLocaleLowerCase("tr-TR")}`
      : `Ad — ${c.notEtiketi.toLocaleLowerCase("tr-TR")}`, KENAR, y - 6);
    y += 8;
  }
  if (c.satirlar.length === 0) {
    ctx.fillStyle = "#e7f5ee";
    yuvarlak(ctx, KENAR, y + 24, KART_G - 2 * KENAR, 110, 22);
    ctx.fill();
    ctx.fillStyle = "#0f7a5c";
    ctx.font = font(800, 30);
    ctx.textAlign = "center";
    ctx.fillText(c.bosMesaj, KART_G / 2, y + 90);
    ctx.textAlign = "left";
  }
  // 36'ya kadar sütun başına 12 satır; fazlasında üç sütuna eşit dağılır.
  const ARA = 14;
  const BLOK_G = (KART_G - 2 * KENAR - 2 * ARA) / 3;
  const sutunSatiri = Math.max(BLOK_SATIRI, Math.ceil(c.satirlar.length / 3));
  const SATIR_Y = Math.min(54, (KART_Y - 100 - y) / sutunSatiri);
  const iki = SATIR_Y >= 42; // sıklaşınca tek satır: ad · not
  c.satirlar.forEach((s, i) => {
    const blok = Math.floor(i / sutunSatiri);
    const sira = i % sutunSatiri;
    const x = KENAR + blok * (BLOK_G + ARA);
    const sy = y + sira * SATIR_Y;
    ctx.fillStyle = sira % 2 === 0 ? "#ffffff" : rgba(c.renk, 0.06);
    yuvarlak(ctx, x, sy + 1, BLOK_G, SATIR_Y - 2, Math.min(10, SATIR_Y / 3));
    ctx.fill();
    const tabanY = iki ? sy + 24 : sy + SATIR_Y / 2 + 7;
    const boy = iki ? 20 : Math.max(14, Math.min(19, SATIR_Y * 0.62));
    ctx.fillStyle = c.renk;
    ctx.font = font(800, boy - 2);
    ctx.textAlign = "right";
    ctx.fillText(String(s.no), x + 34, tabanY);
    ctx.textAlign = "left";
    ctx.fillStyle = KOYU;
    ctx.font = font(800, boy);
    if (iki) {
      ctx.fillText(satirla(ctx, s.ad, BLOK_G - 52, 1)[0] ?? "", x + 44, tabanY);
      const alt = [s.okulNo ? `No ${s.okulNo}` : "", s.sinif, s.not].filter(Boolean).join(" · ");
      ctx.fillStyle = s.not ? c.renk : SOLUK;
      ctx.font = font(600, 15);
      ctx.fillText(satirla(ctx, alt || "—", BLOK_G - 52, 1)[0] ?? "", x + 44, sy + 44);
    } else {
      ctx.fillText(satirla(ctx, s.not ? `${s.ad} — ${s.not}` : s.ad, BLOK_G - 52, 1)[0] ?? "", x + 44, tabanY);
    }
  });

  ctx.fillStyle = SOLUK;
  ctx.font = font(700, 22);
  ctx.fillText(satirla(ctx, `Hazırlayan: ${c.hazirlayan}`, KART_G - 2 * KENAR, 1)[0] ?? "", KENAR, KART_Y - 54);
}
