import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createPublicClient } from "@/lib/supabase/public";
import { SayfaKabugu } from "@/components/SayfaKabugu";
import { BasitMarkdown } from "@/components/BasitMarkdown";
import { blogYazisiGetir, blogYazilariniGetir, blogGorselUrl, tarihFormatla } from "@/lib/blog";

const LACIVERT = "#0F2540";
const TURKUAZ = "#14B8B0";
const GRI = "#3F4B5A";
const TABAN = "https://www.sefukoc.com";

export const revalidate = 3600;

// Yayındaki yazıların yolları önceden üretiliyor — Google'ın gördüğü sayfa
// hazır HTML olarak dönsün diye (indekslemede en belirleyici etken).
export async function generateStaticParams() {
  const supabase = createPublicClient();
  const yazilar = await blogYazilariniGetir(supabase);
  return yazilar.map((y) => ({ slug: y.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = createPublicClient();
  const yazi = await blogYazisiGetir(supabase, slug);
  if (!yazi) return { title: "Yazı bulunamadı | SeFu Blog" };

  const gorsel = yazi.kapakGorseli ? blogGorselUrl(yazi.kapakGorseli) : undefined;
  return {
    title: `${yazi.baslik} | SeFu Blog`,
    description: yazi.ozet,
    alternates: { canonical: `${TABAN}/blog/${yazi.slug}` },
    openGraph: {
      title: yazi.baslik,
      description: yazi.ozet,
      url: `${TABAN}/blog/${yazi.slug}`,
      type: "article",
      publishedTime: yazi.yayinTarihi ?? undefined,
      modifiedTime: yazi.updatedAt,
      images: gorsel ? [gorsel] : undefined,
    },
    twitter: { card: gorsel ? "summary_large_image" : "summary", title: yazi.baslik, description: yazi.ozet, images: gorsel ? [gorsel] : undefined },
  };
}

export default async function BlogYazisiSayfasi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const yazi = await blogYazisiGetir(supabase, slug);
  if (!yazi) notFound();

  const gorsel = yazi.kapakGorseli ? blogGorselUrl(yazi.kapakGorseli) : null;
  // Article JSON-LD — Google'ın içeriği "makale" olarak tanıması için.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: yazi.baslik,
    description: yazi.ozet,
    datePublished: yazi.yayinTarihi ?? yazi.createdAt,
    dateModified: yazi.updatedAt,
    image: gorsel ? [gorsel] : undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": `${TABAN}/blog/${yazi.slug}` },
    publisher: { "@type": "Organization", name: "SeFu Koç", url: TABAN },
    author: { "@type": "Organization", name: "SeFu Koç" },
  };

  return (
    <SayfaKabugu>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <Link href="/blog" className="text-sm font-bold" style={{ color: TURKUAZ }}>← Tüm yazılar</Link>
        <h1 className="mt-4 text-balance text-3xl font-extrabold leading-tight sm:text-4xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>
          {yazi.baslik}
        </h1>
        {yazi.yayinTarihi && <p className="mt-2 text-sm font-semibold" style={{ color: TURKUAZ }}>{tarihFormatla(yazi.yayinTarihi)}</p>}
        <p className="mt-4 text-lg leading-8" style={{ color: GRI }}>{yazi.ozet}</p>
        {gorsel && (
          // eslint-disable-next-line @next/next/no-img-element -- yönetilen Supabase Storage görseli
          <img src={gorsel} alt="" className="mt-6 w-full rounded-3xl object-cover" />
        )}
        <div className="mt-8">
          <BasitMarkdown icerik={yazi.icerik} />
        </div>
      </article>
    </SayfaKabugu>
  );
}
