import type { Metadata } from "next";
import Link from "next/link";
import {
  BarChart3, BellRing, BookOpenCheck, Building2, CalendarRange, ClipboardList,
  GraduationCap, HeartHandshake, LineChart, ShieldCheck, Target, Users,
} from "lucide-react";
import { SayfaKabugu } from "@/components/SayfaKabugu";
import { createPublicClient } from "@/lib/supabase/public";
import { blogYazilariniGetir } from "@/lib/blog";

// "Öğrenci veri takibi ve koçluk" tanıtım sayfası (kullanıcı isteği
// 18.09.2026, SEO planının 3. maddesi). Search Console verisi sitenin
// yalnızca marka aramalarında göründüğünü gösterdi; bu sayfa gerçek arama
// karşılığı olan sorulara ("öğrenci takip sistemi", "YKS koçluk") cevap
// veren ilk içerik sayfası. Metin YALNIZCA sistemde gerçekten var olan
// özellikleri anlatır — yeni bir özellik eklenmeden buraya vaat yazılmaz.
const LACIVERT = "#0F2540";
const TURKUAZ = "#14B8B0";
const GRI = "#3F4B5A";
const CIZGI = "#DDE7EA";
const ZEMIN = "#F7FAFB";
const TABAN = "https://www.sefukoc.com";
const YOL = "/ogrenci-takip-ve-kocluk";

const BASLIK = "Öğrenci Takip Sistemi ve Koçluk | SeFu Koç";
const ACIKLAMA =
  "Öğrencinin çalışma, konu hakimiyeti ve deneme verisini tek yerde toplayan; öğrenciye program, öğretmene ve veliye net bir gelişim tablosu sunan öğrenci takip ve koçluk sistemi.";

export const metadata: Metadata = {
  title: BASLIK,
  description: ACIKLAMA,
  alternates: { canonical: `${TABAN}${YOL}` },
  robots: { index: true, follow: true },
  openGraph: {
    title: BASLIK,
    description: ACIKLAMA,
    url: `${TABAN}${YOL}`,
    siteName: "SeFu Koç",
    locale: "tr_TR",
    type: "website",
    images: [{ url: "/og-kapak.png", width: 1200, height: 630, alt: "SeFu Koç" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-kapak.png"] },
};

export const revalidate = 3600;

// Döngü gerçekten bu sırayla işliyor: veri → analiz → program → takip.
const ADIMLAR = [
  {
    Icon: ClipboardList,
    baslik: "Veri girişi",
    metin: "Öğrenci konu çalışmasını, çözdüğü soruları ve deneme sonuçlarını birkaç dokunuşla girer. Dershanelerde rehber öğretmen öğrenci adına da girebilir; deneme sonuçları PDF'ten toplu aktarılabilir.",
  },
  {
    Icon: LineChart,
    baslik: "Analiz",
    metin: "Her konu için bir hakimiyet skoru hesaplanır, deneme netlerinin yönü (yükseliyor, durgun, düşüyor) çıkarılır, hız ve doğruluk birlikte değerlendirilir, öncelikli konular sıralanır.",
  },
  {
    Icon: CalendarRange,
    baslik: "Program",
    metin: "SeFu Oto Program, öğrencinin boş saatlerine ve zayıf konularına göre haftalık ya da aylık çalışma programı hazırlar. Öğrenci programı dilediği gibi düzenleyebilir.",
  },
  {
    Icon: Target,
    baslik: "Takip ve yönlendirme",
    metin: "Öğretmen görev verir ve tamamlananları onaylar, düşüşe geçen öğrenciyi erken fark eder; veli çocuğunun gelişim özetini görür. Yeni veri geldikçe döngü baştan işler.",
  },
];

const ROLLER = [
  {
    Icon: GraduationCap,
    rol: "Öğrenci",
    baslik: "Kendi gelişimini görür",
    maddeler: [
      "Müfredattaki tüm konular için hakimiyet haritası: nerede güçlü, nerede eksik",
      "Deneme netlerinin yönü ve belirlediği hedef nete ne kadar uzak olduğu",
      "Boş saatlerine göre otomatik hazırlanan haftalık ve aylık program",
      "Veri girmeyi aksattığında kendisine gelen hatırlatmalar",
    ],
  },
  {
    Icon: BookOpenCheck,
    rol: "Öğretmen",
    baslik: "Tahminle değil veriyle yönlendirir",
    maddeler: [
      "Sınıfa ya da tek öğrenciye görev verme, öğrenciye özel gün ve saat",
      "Sınıfın en çok zorlandığı konuları gösteren isimsiz konu haritası",
      "Öğrenci profilinde net trendi, çalışma verimi ve erken uyarı",
      "Yazılı sınav sonuçlarının soru ve kazanım bazında analizi",
    ],
  },
  {
    Icon: HeartHandshake,
    rol: "Veli",
    baslik: "Neler olup bittiğini bilir",
    maddeler: [
      "Çocuğunun çalışma ve deneme özeti",
      "Hangi derste kaç konuya hakim olduğunu gösteren özet",
      "Öğretmen ve kurum duyurularının bildirim olarak gelmesi",
    ],
  },
  {
    Icon: Building2,
    rol: "Okul ve dershane",
    baslik: "Kurumu tek panelden yönetir",
    maddeler: [
      "Okul ve dershane için ayrı kurgulanmış kayıt ve giriş akışları",
      "Toplu öğrenci ekleme, sınıf ve öğretmen yönetimi",
      "Deneme sonuçlarının PDF'ten öğrencilere aktarılması",
      "Duyurular, ders programı ve nöbet listesi yönetimi",
    ],
  },
];

const SSS = [
  {
    soru: "Öğrenci takip sistemi ne işe yarar?",
    cevap: "Öğrencinin ne çalıştığını, hangi konuda ne kadar ilerlediğini ve denemelerde nereye gittiğini tek yerde toplar. Böylece sorun, karne ya da deneme sonucu kötü geldiğinde değil, ortaya çıkmaya başladığı anda görülür ve öğrenciye zamanında yön verilebilir.",
  },
  {
    soru: "SeFu Koç hangi sınıf düzeyleri ve sınavlar için uygun?",
    cevap: "YKS'ye (TYT ve AYT) hazırlanan öğrenciler için tasarlandı. 9, 10 ve 11. sınıflarda Maarif Modeli konuları üst başlık ve alt başlıklarıyla, 12. sınıfta TYT ve AYT konu listesiyle çalışır.",
  },
  {
    soru: "Analizler yapay zekâ ile mi yapılıyor?",
    cevap: "Hayır. Konu hakimiyeti, net trendi, hedefe uzaklık ve öncelik sıralaması sabit ve açıklanabilir kurallarla hesaplanır. Aynı veri her zaman aynı sonucu verir; öğretmen bir önerinin neden yapıldığını görebilir.",
  },
  {
    soru: "Öğrenci düzenli veri girmezse sistem işe yarar mı?",
    cevap: "Analizler veri ne kadar düzenliyse o kadar isabetli olur. Öğretmenin verdiği görevler tamamlandıkça veri kendiliğinden birikir; dershanelerde rehber öğretmen öğrenci adına veri girebilir, deneme sonuçları da PDF'ten toplu aktarılabilir.",
  },
  {
    soru: "Öğrenci diğer öğrencilerin verilerini görebilir mi?",
    cevap: "Hayır. Öğrenci yalnızca kendi verisini görür ve kendisine başkalarıyla kıyas gösterilmez. Sınıf karşılaştırması yalnızca öğretmen tarafında ve isimsiz olarak sunulur.",
  },
  {
    soru: "Veliler neleri görebilir?",
    cevap: "Veli, hesabı kendi çocuğuna bağlandıktan sonra yalnızca o öğrencinin çalışma özetini, deneme sonuçlarını ve konu hakimiyeti özetini görür; kurumun ve öğretmenin duyuruları da bildirim olarak gelir.",
  },
  {
    soru: "Okul ya da dershane olarak nasıl başlarız?",
    cevap: "İletişim sayfasından kurum başvurusu yapmanız yeterli. Kurum tanımlandıktan sonra öğretmen ve öğrenci hesapları kurum yetkilisi tarafından açılır; öğrenciler okul numarası ya da kullanıcı adıyla giriş yapar.",
  },
];

async function ilgiliYazilar() {
  try {
    const yazilar = await blogYazilariniGetir(createPublicClient());
    return yazilar.slice(0, 3);
  } catch (hata) {
    console.error("tanıtım sayfası blog yazıları okunamadı:", hata);
    return [];
  }
}

export default async function OgrenciTakipVeKoclukSayfasi() {
  const yazilar = await ilgiliYazilar();

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: SSS.map(({ soru, cevap }) => ({
        "@type": "Question",
        name: soru,
        acceptedAnswer: { "@type": "Answer", text: cevap },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Ana Sayfa", item: TABAN },
        { "@type": "ListItem", position: 2, name: "Öğrenci Takibi ve Koçluk", item: `${TABAN}${YOL}` },
      ],
    },
  ];

  return (
    <SayfaKabugu>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Giriş */}
      <section className="mx-auto max-w-4xl px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
        <p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: TURKUAZ }}>Okul ve dershaneler için</p>
        <h1 className="mt-3 text-balance text-3xl font-extrabold leading-tight sm:text-5xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>
          Öğrenci veri takibi ve koçluk sistemi
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8" style={{ color: GRI }}>
          SeFu Koç, öğrencinin ne çalıştığını, hangi konuda ne kadar ilerlediğini ve denemelerde nereye gittiğini
          tek yerde toplar. Öğrenci kendi gelişimini görür, öğretmen tahminle değil veriyle yönlendirir,
          veli neler olup bittiğini bilir.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/iletisim" className="rounded-full px-6 py-3 text-sm font-bold" style={{ background: TURKUAZ, color: "#FFFFFF" }}>
            Kurum başvurusu yap
          </Link>
          <Link href="/login" className="rounded-full px-6 py-3 text-sm font-bold" style={{ color: LACIVERT, border: `1.5px solid ${CIZGI}` }}>
            Giriş yap
          </Link>
        </div>
      </section>

      {/* Sorun */}
      <section style={{ background: ZEMIN, borderTop: `1px solid ${CIZGI}`, borderBottom: `1px solid ${CIZGI}` }}>
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:px-8 sm:py-16 md:grid-cols-[1fr_1.4fr] md:items-start">
          <h2 className="text-balance text-2xl font-extrabold leading-snug sm:text-3xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>
            Takip çoğu zaman eksik veriyle yapılır
          </h2>
          <div className="space-y-4 text-base leading-7" style={{ color: GRI }}>
            <p>
              Öğrencinin gerçekte ne kadar çalıştığı, hangi konuları atladığı ya da denemedeki düşüşün nereden
              geldiği çoğu zaman bilinmez. Öğretmen sınıfın genel havasına, veli karne notuna bakar; sorun
              görünür hale geldiğinde genellikle geç kalınmıştır.
            </p>
            <p>
              Öğrenci veri takibi bu boşluğu kapatır: küçük ama düzenli kayıtlar, haftalar içinde öğrencinin
              nerede güçlü, nerede zorlandığını açıkça gösteren bir tabloya dönüşür. Koçluk da bu tablonun
              üzerine kurulur.
            </p>
          </div>
        </div>
      </section>

      {/* Nasıl çalışır */}
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <h2 className="text-balance text-2xl font-extrabold sm:text-3xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>
          Nasıl çalışır?
        </h2>
        <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: GRI }}>
          Koçluk tek seferlik bir öneri listesi değil, her hafta yeniden işleyen bir döngüdür.
        </p>
        <ol className="mt-8 grid gap-4 sm:grid-cols-2">
          {ADIMLAR.map(({ Icon, baslik, metin }, i) => (
            <li key={baslik} className="flex gap-4 rounded-3xl p-5" style={{ background: ZEMIN, border: `1px solid ${CIZGI}` }}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${TURKUAZ}1A` }}>
                <Icon size={20} color={TURKUAZ} />
              </div>
              <div>
                <h3 className="text-base font-extrabold" style={{ color: LACIVERT }}>
                  <span className="mr-1.5 tabular-nums" style={{ color: TURKUAZ }}>{i + 1}.</span>{baslik}
                </h3>
                <p className="mt-1.5 text-sm leading-6" style={{ color: GRI }}>{metin}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Roller */}
      <section style={{ background: ZEMIN, borderTop: `1px solid ${CIZGI}`, borderBottom: `1px solid ${CIZGI}` }}>
        <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <h2 className="text-balance text-2xl font-extrabold sm:text-3xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>
            Herkes aynı veriye kendi açısından bakar
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {ROLLER.map(({ Icon, rol, baslik, maddeler }) => (
              <article key={rol} className="rounded-3xl bg-white p-6" style={{ border: `1px solid ${CIZGI}` }}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${TURKUAZ}1A` }}>
                    <Icon size={18} color={TURKUAZ} />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: TURKUAZ }}>{rol}</p>
                    <h3 className="text-lg font-extrabold leading-tight" style={{ color: LACIVERT }}>{baslik}</h3>
                  </div>
                </div>
                <ul className="mt-4 space-y-2">
                  {maddeler.map((m) => (
                    <li key={m} className="flex gap-2 text-sm leading-6" style={{ color: GRI }}>
                      <span aria-hidden className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: TURKUAZ }} />
                      {m}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Güven */}
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { Icon: ShieldCheck, baslik: "Kıyas yok", metin: "Öğrenciye başkalarıyla karşılaştırma gösterilmez; sınıf verisi öğretmende ve isimsiz." },
            { Icon: BarChart3, baslik: "Açıklanabilir analiz", metin: "Sonuçlar sabit kurallarla hesaplanır; aynı veri her zaman aynı sonucu verir." },
            { Icon: BellRing, baslik: "Zamanında haber", metin: "Görevler, duyurular ve hatırlatmalar uygulama içinde ve anlık bildirimle ulaşır." },
          ].map(({ Icon, baslik, metin }) => (
            <div key={baslik} className="rounded-3xl p-5" style={{ border: `1px solid ${CIZGI}` }}>
              <Icon size={20} color={TURKUAZ} />
              <h3 className="mt-3 text-base font-extrabold" style={{ color: LACIVERT }}>{baslik}</h3>
              <p className="mt-1.5 text-sm leading-6" style={{ color: GRI }}>{metin}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sık sorulan sorular */}
      <section style={{ background: ZEMIN, borderTop: `1px solid ${CIZGI}`, borderBottom: `1px solid ${CIZGI}` }}>
        <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
          <h2 className="text-balance text-2xl font-extrabold sm:text-3xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>
            Sık sorulan sorular
          </h2>
          <div className="mt-6 space-y-3">
            {SSS.map(({ soru, cevap }) => (
              <details key={soru} className="group rounded-2xl bg-white p-5" style={{ border: `1px solid ${CIZGI}` }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-extrabold" style={{ color: LACIVERT }}>
                  {soru}
                  <span aria-hidden className="text-xl leading-none transition-transform group-open:rotate-45" style={{ color: TURKUAZ }}>+</span>
                </summary>
                <p className="mt-3 text-sm leading-7" style={{ color: GRI }}>{cevap}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* İlgili yazılar */}
      {yazilar.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <h2 className="text-2xl font-extrabold" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>Blogdan</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {yazilar.map((y) => (
              <Link key={y.slug} href={`/blog/${y.slug}`} className="flex flex-col rounded-3xl p-5" style={{ background: ZEMIN, border: `1px solid ${CIZGI}` }}>
                <h3 className="text-base font-extrabold leading-snug" style={{ color: LACIVERT }}>{y.baslik}</h3>
                <p className="mt-2 line-clamp-3 text-sm leading-6" style={{ color: GRI }}>{y.ozet}</p>
                <span className="mt-auto pt-3 text-sm font-bold" style={{ color: TURKUAZ }}>Yazıyı oku →</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Kapanış */}
      <section className="mx-auto max-w-4xl px-5 pb-16 pt-4 sm:px-8">
        <div className="rounded-3xl px-6 py-10 text-center sm:px-12" style={{ background: LACIVERT }}>
          <Users size={26} color={TURKUAZ} className="mx-auto" />
          <h2 className="mt-3 text-balance text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: "var(--font-baloo)" }}>
            Kurumunuzda öğrenci takibini veriyle yapın
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6" style={{ color: "#C9D6DF" }}>
            Okul ya da dershane olarak SeFu Koç&apos;u kullanmak için bize yazın; kurulumu birlikte yapalım.
          </p>
          <Link href="/iletisim" className="mt-6 inline-block rounded-full px-6 py-3 text-sm font-bold" style={{ background: TURKUAZ, color: "#FFFFFF" }}>
            Kurum başvurusu yap
          </Link>
        </div>
      </section>
    </SayfaKabugu>
  );
}
