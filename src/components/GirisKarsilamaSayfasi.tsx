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

// Her iki sütun da kendi 0-100 dikey ölçeğinde, kullanıcının verdiği
// "bölge" numaralarıyla MUTLAK konumlandırılıyor (ör. sağda fotoğraflar
// %3-20, cümle %35-40, giriş %70-80; solda logo %5-15, slogan %50
// ortalı, e-posta %95) — akış tabanlı boşluklarla YAKLAŞIK değil,
// birebir bu yüzdelerde. Mobilde de AYNI ORANLAR korunuyor (kullanıcı
// isteği: "mobil de aynı oranda") — sadece iki sütun üst üste dizilirken
// her biri kendi (daha kısa) yüksekliği içinde aynı yüzdelere oturuyor.
type Rol = "ogrenci" | "ogretmen" | "veli";

const ROLLER: { id: Rol; ad: string; foto: string; cumle: string }[] = [
  {
    id: "ogrenci", ad: "Öğrenci", foto: "/landing/ogrenci.jpg",
    cumle: "Hedeflerini belirle, gelişimini takip et ve sana özel yönlendirmelerle başarıya daha emin adımlarla ilerle.",
  },
  {
    id: "ogretmen", ad: "Öğretmen", foto: "/landing/ogretmen.jpg",
    cumle: "Öğrencilerinin gelişimini tek yerden izle, ihtiyaçlarını erkenden fark et ve doğru zamanda destek ol.",
  },
  {
    id: "veli", ad: "Veli", foto: "/landing/veli.jpg",
    cumle: "Çocuğunun eğitim sürecini yakından takip et, gelişimini görünür kıl ve geleceğine bilinçli şekilde rehberlik et.",
  },
];

const DONGU_SURESI_MS = 5000;

// Fotoğraf kartı — normalde hafif, sırası gelince (aktif) derin gölge;
// çerçeve yok (kullanıcı isteği: "fotolar çerçevesiz").
function FotoKart({ foto, alt, aktifMi, oncelik }: { foto: string; alt: string; aktifMi: boolean; oncelik?: boolean }) {
  return (
    <div className="relative h-full overflow-hidden rounded-2xl transition-all duration-700 ease-out"
      style={{
        flex: aktifMi ? 2.3 : 1,
        boxShadow: aktifMi
          ? "0 0 0 2px rgba(255,255,255,0.3), 0 24px 48px -10px rgba(0,0,0,0.6)"
          : "0 4px 14px -4px rgba(0,0,0,0.4)",
      }}>
      <Image src={foto} alt={alt} fill sizes="(max-width: 640px) 100vw, 33vw" className="object-cover" priority={oncelik} />
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
      {/* Sol ince sütun. Kullanıcı isteği (son revize): "sol sütunu kademe
          kademe açık tonlara getir, en alt mevcut hali iken en üst beyazla
          bitsin" — alttan (koyulaştırılmış ÖSYM mavisi) yukarı (beyaz) doğru
          yumuşak bir geçiş. Logo bu sayede zaten en üstteki beyaza yakın
          alanda oturuyor, ayrıca bir "spot ışığı" katmanına gerek kalmadı. */}
      <div className="relative h-[40vh] w-full sm:h-[100dvh] sm:w-[280px] sm:shrink-0"
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
          <a href="mailto:sefukoc@gmail.com" style={{ color: BEYAZ }} className="text-xs font-semibold opacity-80">sefukoc@gmail.com</a>
        </div>
      </div>

      {/* Sağ ana kısım — vitrin, koyulaştırılmış zemin */}
      <div className="relative h-[58vh] w-full sm:h-[100dvh] sm:flex-1" style={{ background: KOYU_ZEMIN }}>
        {/* Fotoğraflar — %3-20 */}
        <div className="absolute left-1/2 w-[92%] -translate-x-1/2 sm:w-[85%] sm:max-w-4xl" style={{ top: "3%", height: "25.3%" }}>
          {/* Masaüstü/tablet: üç fotoğraf yan yana */}
          <div className="hidden h-full gap-3 sm:flex lg:gap-4">
            {ROLLER.map((r, i) => (
              <FotoKart key={r.id} foto={r.foto} alt={`${r.ad} SeFu Koç kullanırken`} aktifMi={i === aktifIndex} oncelik={i === 0} />
            ))}
          </div>
          {/* Mobil: tek fotoğraf akıyor */}
          <div key={`mobil-foto-${aktif.id}`} className="sfec-tg-haber-gir h-full sm:hidden">
            <FotoKart foto={aktif.foto} alt={`${aktif.ad} SeFu Koç kullanırken`} aktifMi oncelik />
          </div>
        </div>

        {/* Cümle — %35-40, çerçevesiz, italik, normal ağırlık */}
        <p key={`cumle-${aktif.id}`}
          className="sfec-tg-haber-gir absolute left-1/2 line-clamp-2 w-[97%] -translate-x-1/2 -translate-y-1/2 text-center text-xs italic leading-snug sm:w-[85%] sm:max-w-2xl sm:text-xl sm:leading-relaxed"
          style={{ top: "47.5%", color: BEYAZ, fontWeight: 400 }}>
          {aktif.cumle}
        </p>

        {/* Giriş — %70-80, çerçevesiz */}
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: "75%" }}>
          <Link href={`/login?rol=${aktif.id}`}
            className="sfec-btn flex items-center gap-2 rounded-full px-7 py-3 sm:px-10" style={{ background: KOYU_MAVI_ZEMIN, color: BEYAZ }}>
            <span className="text-base font-bold">GİRİŞ</span>
          </Link>
        </div>

        {/* İletişim — SADECE mobilde, sayfanın en altında (bkz. sol
            sütundaki karşılığının üstündeki not). */}
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-full text-center sm:hidden" style={{ top: "97%" }}>
          <a href="mailto:sefukoc@gmail.com" style={{ color: BEYAZ }} className="text-xs font-semibold opacity-80">sefukoc@gmail.com</a>
        </div>
      </div>
    </div>
  );
}
