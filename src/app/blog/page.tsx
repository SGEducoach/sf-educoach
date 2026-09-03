import type { Metadata } from "next";
import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/public";
import { SayfaKabugu } from "@/components/SayfaKabugu";
import { blogYazilariniGetir, blogGorselUrl, tarihFormatla } from "@/lib/blog";

const LACIVERT = "#0F2540";
const TURKUAZ = "#14B8B0";
const GRI = "#3F4B5A";

export const metadata: Metadata = {
  title: "SeFu Blog | YKS, Sınav ve Çalışma Rehberi",
  description: "YKS hazırlık, net artırma, sınav takvimi ve verimli çalışma üzerine SeFu Koç blog yazıları.",
  alternates: { canonical: "https://www.sefukoc.com/blog" },
  openGraph: {
    title: "SeFu Blog | YKS, Sınav ve Çalışma Rehberi",
    description: "YKS hazırlık, net artırma, sınav takvimi ve verimli çalışma üzerine yazılar.",
    url: "https://www.sefukoc.com/blog",
    type: "website",
  },
};

// Yeni yazı yayınlanınca liste en geç 1 saat içinde tazelensin (tam statik
// kalırsa yeni yazı görünmez, tamamen dinamik olursa her ziyaret sorgu açar).
export const revalidate = 3600;

export default async function BlogListesi() {
  const supabase = createPublicClient();
  const yazilar = await blogYazilariniGetir(supabase);

  return (
    <SayfaKabugu>
      {/* Kullanıcı isteği (03.09.2026): "soldaki boşlukla eşit şekilde sağda da
          boşluk", "çerçeveyi kaldır, sadece altta bir yöntemle sonraki
          yazıdan ayrılsın" — kart/çerçeve yerine klasik blog akışı: tek
          sütun, simetrik yan boşluk (yazı sayfasıyla aynı max-w-3xl),
          yazılar arasında yalnız alt çizgi. */}
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>SeFu Blog</h1>
        <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: GRI }}>
          YKS hazırlık süreci, net artırma, sınav takvimi ve verimli çalışma üzerine yazılar.
        </p>

        {yazilar.length === 0 ? (
          <p className="mt-10 text-sm" style={{ color: GRI }}>Henüz yazı yayınlanmadı.</p>
        ) : (
          <div className="mt-8 flex flex-col">
            {yazilar.map((y, i) => (
              <article key={y.id}
                className={i < yazilar.length - 1 ? "border-b pb-9 mb-9" : ""}
                style={i < yazilar.length - 1 ? { borderColor: "#E4E9EE" } : undefined}>
                <Link href={`/blog/${y.slug}`} className="block">
                  {y.kapakGorseli && (
                    // eslint-disable-next-line @next/next/no-img-element -- yönetilen Supabase Storage görseli
                    <img src={blogGorselUrl(y.kapakGorseli)} alt="" className="mb-5 h-56 w-full rounded-2xl object-cover sm:h-64" loading="lazy" />
                  )}
                  {y.yayinTarihi && <span className="text-[11px] font-bold" style={{ color: TURKUAZ }}>{tarihFormatla(y.yayinTarihi)}</span>}
                  <h2 className="mt-1 text-xl font-extrabold leading-snug sm:text-2xl" style={{ color: LACIVERT }}>{y.baslik}</h2>
                  <p className="mt-2 text-base leading-7" style={{ color: GRI }}>{y.ozet}</p>
                  <span className="mt-3 inline-block text-sm font-bold" style={{ color: TURKUAZ }}>Devamını oku →</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </SayfaKabugu>
  );
}
