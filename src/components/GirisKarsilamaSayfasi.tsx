"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
// Bu vitrin sayfası (/) sitenin geri kalanından (sabit koyu tema, bkz.
// --sfec-bg0) BİLİNÇLİ olarak farklı, ama kullanıcı isteği (27.08.2026):
// "Giriş'ten sonra koyu tema olacağını düşünerek zeminleri 4-5 ton
// koyulaştır" — sayfa tam siyaha eşitlenmedi (o zaman "vitrin" farkı
// kaybolurdu), sadece açık ÖSYM mavisi pastelinden (eski MINT/MINT_ON
// tonu) birkaç kademe koyuya indirgendi, ara bir köprü. Metinler buna
// göre beyaz. Giriş butonu da artık sol sütunla AYNI renk (kullanıcı
// isteği), o yüzden MINT/MINT_ON tokenlerine bu dosyada artık hiç
// ihtiyaç yok.
const KOYU_ZEMIN = "#39454F"; // sağ (ana) panel — nötr koyu lacivert-gri
const KOYU_MAVI_ZEMIN = "#1C5670"; // sol panel + Giriş butonu
const BEYAZ = "#FFFFFF";

// Her iki sütun da kendi 0-100 dikey ölçeğinde, MUTLAK (top/height %)
// konumlandırılıyor — akış tabanlı boşluklarla değil. Birçok küçük ince
// ayar turundan sonra masaüstü ve mobil değerleri BİLİNÇLİ OLARAK
// birbirinden bağımsız (mobilde sol sütun sayfanın %25'i, fotoğraf farklı
// büyüklük/konumda vb.) — güncel sayılar için her bloğun kendi yorumuna
// bakılmalı, burada tekrar özetlenmiyor (sürekli değiştiği için stale
// kalma riski var).
type Rol = "ogrenci" | "ogretmen" | "veli";

// fotoTaban: uzantısız temel yol — gerçek dosyalar build sırasında
// (scripts değil, elle bir kerelik) `${fotoTaban}-640.webp` ve
// `${fotoTaban}-960.webp` olarak üretildi (bkz. FotoKart yorumu).
// genislik/yukseklik: 960w varyantının gerçek piksel boyutu (width/height
// attribute'ları için — object-cover+absolute nedeniyle layout'u etkilemez,
// sadece semantik/CLS-hint amaçlı).
const ROLLER: { id: Rol; ad: string; fotoTaban: string; genislik: number; yukseklik: number; cumle: string }[] = [
  {
    id: "ogrenci", ad: "Öğrenci", fotoTaban: "/landing/ogrenci", genislik: 960, yukseklik: 540,
    cumle: "Hedeflerini belirle, gelişimini takip et ve sana özel yönlendirmelerle başarıya daha emin adımlarla ilerle.",
  },
  {
    id: "ogretmen", ad: "Öğretmen", fotoTaban: "/landing/ogretmen", genislik: 960, yukseklik: 540,
    cumle: "Öğrencilerinin gelişimini tek yerden izle, ihtiyaçlarını erkenden fark et ve doğru zamanda destek ol.",
  },
  {
    id: "veli", ad: "Veli", fotoTaban: "/landing/veli", genislik: 960, yukseklik: 640,
    cumle: "Çocuğunun eğitim sürecini yakından takip et, gelişimini görünür kıl ve geleceğine bilinçli şekilde rehberlik et.",
  },
];

const DONGU_SURESI_MS = 5000;

// Fotoğraf kartı — normalde hafif, sırası gelince (aktif) derin gölge;
// çerçeve yok (kullanıcı isteği: "fotolar çerçevesiz").
//
// Kullanıcı bulgusu (27.08.2026, ACİL): next/image kullanınca aktif foto
// rotasyonda büyüyüp küçüldüğü için (flex 1↔2.3) `sizes` tahmini tutmuyor,
// tarayıcı her tur Vercel'in ÜCRETLİ Image Optimization servisine yeniden
// gidiyordu (ölçüldü: aynı foto ~15sn'de bir sunucuya gidip geliyordu).
// Düz <img> ile statik dosya olarak servis ediliyor (next/image'ın
// `fill`+`object-cover` davranışı birebir aynı className'lerle taklit
// edildi, GÖRSEL FARK YOK).
//
// İkinci tur (aynı gün, harici öneri üzerine): 1600px JPEG kaynağı
// DOĞRUDAN kullanmak yerine, gösterilen boyuta uygun 640/960px WebP
// varyantları (public/landing/*-640.webp, *-960.webp — orijinal
// 1600px/q82 JPEG'lerden PIL ile üretildi, aynı q82) + srcset/sizes ile
// sunuluyor. `sizes` masaüstünde aktif fotonun ulaştığı en büyük genişliğe
// (~480px, konteyner 896px×2.3/4.3) göre sabitlendi — hangi foto aktif
// olursa olsun bulanıklaşmasın diye üçü de aynı (muhafazakâr) değeri
// kullanıyor.
function FotoKart({ fotoTaban, genislik, yukseklik, alt, aktifMi, oncelik }: {
  fotoTaban: string; genislik: number; yukseklik: number; alt: string; aktifMi: boolean; oncelik?: boolean;
}) {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl transition-all duration-700 ease-out"
      style={{
        flex: aktifMi ? 2.3 : 1,
        boxShadow: aktifMi
          ? "0 0 0 2px rgba(255,255,255,0.3), 0 24px 48px -10px rgba(0,0,0,0.6)"
          : "0 4px 14px -4px rgba(0,0,0,0.4)",
      }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- bilinçli: next/image'ın sunucu taraflı optimizasyonunu (ücretli, gereksiz) atlıyoruz */}
      <img
        src={`${fotoTaban}-960.webp`}
        srcSet={`${fotoTaban}-640.webp 640w, ${fotoTaban}-960.webp 960w`}
        sizes="(max-width: 640px) 92vw, 480px"
        width={genislik} height={yukseklik}
        alt={alt} loading={oncelik ? "eager" : "lazy"} fetchPriority={oncelik ? "high" : "auto"} decoding="async"
        className="absolute inset-0 h-full w-full object-cover" />
    </div>
  );
}

export function GirisKarsilamaSayfasi() {
  const [aktifIndex, setAktifIndex] = useState(0);

  useEffect(() => {
    const zamanlayici = setInterval(() => {
      setAktifIndex((i) => (i + 1) % ROLLER.length);
    }, DONGU_SURESI_MS);
    return () => clearInterval(zamanlayici);
  }, []);

  const aktif = ROLLER[aktifIndex];

  return (
    <div className="flex flex-col sm:flex-row" style={{ background: KOYU_ZEMIN }}>
      {/* Sol ince sütun. Kullanıcı isteği (son revize): "mobil logo bölümü
          sayfanın %25'inde yer alsın" — mobilde artık 25vh (masaüstünde
          eskisi gibi tam yükseklik, kendi sütunu). Arka plan: alt uçta
          KOYU_MAVI_ZEMIN, üstte beyaz — hem mobil hem masaüstü aynı, tek/düz
          gradyan. */}
      <div className="relative h-[25vh] w-full sm:h-[100dvh] sm:w-[280px] sm:shrink-0"
        style={{ background: `linear-gradient(to top, ${KOYU_MAVI_ZEMIN} 0%, #ffffff 100%)` }}>
        <div className="absolute left-1/2 w-[60%] -translate-x-1/2 text-center"
          style={{ top: "5%" }}>
          <Image src="/logo-login.png" alt="SeFu Koç" width={1153} height={965} className="mx-auto h-[6.27rem] w-auto object-contain" priority />
        </div>
        {/* Kullanıcı isteği: "logo altı yazı mobilde kalksın" — bu cümle
            artık mobilde HİÇ görünmüyor, masaüstünde eskisi gibi %50'de
            dikey ortalı kalıyor. */}
        <div className="absolute left-1/2 top-[97%] hidden w-[80%] -translate-x-1/2 -translate-y-full text-center sm:left-8 sm:top-[50%] sm:block sm:w-[200px] sm:translate-x-0 sm:-translate-y-1/2 sm:text-left">
          {/* Bu nokta artık geçiş gradyanının orta tonuna denk düşüyor —
              text-shadow, zemin ne kadar açılırsa açılsın okunurluğu koruyor. */}
          <p style={{ color: BEYAZ, fontFamily: "var(--font-baloo)", textShadow: "0 1px 4px rgba(0,0,0,0.45)" }} className="text-lg font-bold italic leading-snug">
            Her zaman bir adım ötesini düşün
          </p>
        </div>
        {/* Kullanıcı isteği: iletişim mobilde sayfanın en altına (vitrinin
            de altına) düşsün — masaüstünde bu sütunun kendi %95 bölgesinde
            kalıyor, o yüzden burada SADECE masaüstünde gösteriliyor. */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 -translate-y-full text-center sm:left-8 sm:block sm:translate-x-0 sm:text-left"
          style={{ top: "95%" }}>
          <a href="https://mail.google.com/mail/?view=cm&fs=1&to=sefukoc@gmail.com" target="_blank" rel="noopener noreferrer"
            style={{ color: BEYAZ }} className="text-[10px] font-semibold opacity-80">sefukoc@gmail.com</a>
        </div>
      </div>

      {/* Sağ ana kısım — vitrin. Mobilde sol sütun %25 olduğu için burası
          kalan %75 (kullanıcı isteği). Üst kenarda KOYU_MAVI_ZEMIN'den
          başlayıp hızla KOYU_ZEMIN'e geçen kısa bir gradyan var — "iki
          bölüm renk geçişini yumuşat" isteği, sol sütunun bittiği renkle
          (KOYU_MAVI_ZEMIN) burada dikişsiz devam ediyor. Masaüstünde
          sütunlar yan yana olduğu için bu geçişe gerek yok, düz KOYU_ZEMIN
          kalıyor. */}
      <div className="sfec-giris-sag-panel relative h-[75vh] w-full sm:h-[100dvh] sm:flex-1">
        <style jsx>{`
          .sfec-giris-sag-panel {
            background: linear-gradient(to bottom, ${KOYU_MAVI_ZEMIN} 0%, ${KOYU_ZEMIN} 12%, ${KOYU_ZEMIN} 100%);
          }
          @media (min-width: 640px) {
            .sfec-giris-sag-panel {
              background: ${KOYU_ZEMIN};
            }
          }
        `}</style>
        {/* Fotoğraflar. Masaüstü: %3-25.3 (üstte, orijinal "bölge" düzeni).
            Mobil: büyütülmüş (%42 yükseklik, önceki "ortala/%40 büyüt"
            revizeleri) ama son isteğe göre artık ORTALANMIŞ değil —
            "fotonun üstünü kendi rengi üst sınırına al" — üstteki geçiş
            gradyanı bittiği yerden (bkz. sfec-giris-sag-panel, %12) hemen
            başlıyor. */}
        <div className="absolute left-1/2 top-[7%] h-[42%] w-[92%] -translate-x-1/2 sm:top-[3%] sm:h-[25.3%] sm:w-[85%] sm:max-w-4xl">
          {/* Masaüstü/tablet: üç fotoğraf yan yana */}
          <div className="hidden h-full gap-3 sm:flex lg:gap-4">
            {ROLLER.map((r, i) => (
              <FotoKart key={r.id} fotoTaban={r.fotoTaban} genislik={r.genislik} yukseklik={r.yukseklik}
                alt={`${r.ad} SeFu Koç kullanırken`} aktifMi={i === aktifIndex} oncelik={i === 0} />
            ))}
          </div>
          {/* Mobil: tek fotoğraf akıyor */}
          <div key={`mobil-foto-${aktif.id}`} className="sfec-tg-haber-gir h-full sm:hidden">
            <FotoKart fotoTaban={aktif.fotoTaban} genislik={aktif.genislik} yukseklik={aktif.yukseklik}
              alt={`${aktif.ad} SeFu Koç kullanırken`} aktifMi oncelik />
          </div>
        </div>

        {/* Cümle. Mobilde büyütülen fotoğrafa göre aşağı kaydı (%81),
            masaüstünde eskisi gibi %47.5'te. Çerçevesiz, italik, normal
            ağırlık. */}
        <p key={`cumle-${aktif.id}`}
          className="sfec-tg-haber-gir absolute left-1/2 top-[57%] line-clamp-2 w-[97%] -translate-x-1/2 -translate-y-1/2 text-center text-xs italic leading-snug sm:top-[47.5%] sm:w-[85%] sm:max-w-2xl sm:text-xl sm:leading-relaxed"
          style={{ color: BEYAZ, fontWeight: 400 }}>
          {aktif.cumle}
        </p>

        {/* Giriş. Mobilde %92, masaüstünde eskisi gibi %75. Çerçevesiz. */}
        <div className="absolute left-1/2 top-[85%] -translate-x-1/2 -translate-y-1/2 sm:top-[75%]">
          <Link href={`/login?rol=${aktif.id}`}
            className="sfec-btn flex items-center gap-2 rounded-full px-9 py-3 sm:px-12" style={{ background: KOYU_MAVI_ZEMIN, color: BEYAZ }}>
            <span className="text-base font-bold">GİRİŞ</span>
          </Link>
        </div>

        {/* İletişim — SADECE mobilde, sayfanın en altında (bkz. sol
            sütundaki karşılığının üstündeki not). */}
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-full text-center sm:hidden" style={{ top: "99%" }}>
          <a href="https://mail.google.com/mail/?view=cm&fs=1&to=sefukoc@gmail.com" target="_blank" rel="noopener noreferrer"
            style={{ color: BEYAZ }} className="text-[10px] font-semibold opacity-80">sefukoc@gmail.com</a>
        </div>

        {/* Kullanıcı isteği: "her hakkı saklıdır küçük yazı sadece webde
            sağ en alt" — SADECE masaüstünde, sağ panelin sağ alt köşesi. */}
        <p className="absolute bottom-4 right-5 hidden text-[10px] opacity-60 sm:block" style={{ color: BEYAZ }}>
          © 2026 SeFu Koç. Tüm hakları saklıdır.
        </p>
      </div>
    </div>
  );
}
