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
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>SeFu Blog</h1>
        <p className="mt-3 max-w-2xl text-base leading-7" style={{ color: GRI }}>
          YKS hazırlık süreci, net artırma, sınav takvimi ve verimli çalışma üzerine yazılar.
        </p>

        {yazilar.length === 0 ? (
          <p className="mt-10 text-sm" style={{ color: GRI }}>Henüz yazı yayınlanmadı.</p>
        ) : (
          <div className="mt-9 grid gap-5 sm:grid-cols-2">
            {yazilar.map((y) => (
              <article key={y.id} className="overflow-hidden rounded-3xl border border-[#DDE7EA] bg-white shadow-sm">
                <Link href={`/blog/${y.slug}`} className="block">
                  {y.kapakGorseli && (
                    // eslint-disable-next-line @next/next/no-img-element -- yönetilen Supabase Storage görseli
                    <img src={blogGorselUrl(y.kapakGorseli)} alt="" className="h-44 w-full object-cover" loading="lazy" />
                  )}
                  <div className="flex flex-col gap-2 p-5">
                    {y.yayinTarihi && <span className="text-[11px] font-bold" style={{ color: TURKUAZ }}>{tarihFormatla(y.yayinTarihi)}</span>}
                    <h2 className="text-lg font-extrabold leading-snug" style={{ color: LACIVERT }}>{y.baslik}</h2>
                    <p className="text-sm leading-6" style={{ color: GRI }}>{y.ozet}</p>
                    <span className="mt-1 text-sm font-bold" style={{ color: TURKUAZ }}>Devamını oku →</span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </SayfaKabugu>
  );
}
