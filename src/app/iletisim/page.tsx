import type { Metadata } from "next";
import { Mail, Globe, MessageSquare } from "lucide-react";
import { SayfaKabugu } from "@/components/SayfaKabugu";

const LACIVERT = "#0F2540";
const TURKUAZ = "#14B8B0";
const GRI = "#3F4B5A";
const TABAN = "https://www.sefukoc.com";

// Kullanıcı isteği (03.09.2026): v1'de yalnız iletişim bilgisi. Mesaj formu,
// Google Workspace (bilgi@sefukoc.com / yonetici@sefukoc.com) alındıktan
// sonraki adıma bırakıldı.
const EPOSTA = "sefukoc@gmail.com";

export const metadata: Metadata = {
  title: "İletişim | SeFu Koç",
  description: "SeFu Koç ile iletişime geçin: kurum başvuruları, öneri ve destek talepleri.",
  alternates: { canonical: `${TABAN}/iletisim` },
  openGraph: { title: "İletişim | SeFu Koç", description: "SeFu Koç ile iletişime geçin.", url: `${TABAN}/iletisim`, type: "website" },
};

export default function IletisimSayfasi() {
  const kartlar = [
    { Icon: Mail, baslik: "E-posta", metin: EPOSTA, href: `mailto:${EPOSTA}` },
    { Icon: Globe, baslik: "Web", metin: "www.sefukoc.com", href: TABAN },
    { Icon: MessageSquare, baslik: "Kurum başvurusu", metin: "Okul/dershane olarak kullanmak için bize yazın", href: `mailto:${EPOSTA}?subject=Kurum%20ba%C5%9Fvurusu` },
  ];

  return (
    <SayfaKabugu>
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>İletişim</h1>
        <p className="mt-3 text-base leading-7" style={{ color: GRI }}>
          Soru, öneri veya kurum başvurusu için bize ulaşabilirsiniz. Mesajlarınızı en kısa sürede yanıtlıyoruz.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {kartlar.map(({ Icon, baslik, metin, href }) => (
            <a key={baslik} href={href} className="flex flex-col gap-2 rounded-3xl border border-[#DDE7EA] bg-[#F7FAFB] p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: `${TURKUAZ}1A` }}>
                <Icon size={18} color={TURKUAZ} />
              </div>
              <h2 className="text-base font-extrabold" style={{ color: LACIVERT }}>{baslik}</h2>
              <p className="break-words text-sm leading-6" style={{ color: GRI }}>{metin}</p>
            </a>
          ))}
        </div>

        <p className="mt-8 text-sm leading-7" style={{ color: GRI }}>
          Öğrenci, öğretmen ve velilerin hesap işlemleri (şifre sıfırlama, hesap açma) kendi kurumlarının
          yetkilisi üzerinden yürütülür; kurum yetkiliniz size yardımcı olamıyorsa bize yazabilirsiniz.
        </p>
      </section>
    </SayfaKabugu>
  );
}
