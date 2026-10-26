import type { Metadata } from "next";
import { SayfaKabugu } from "@/components/SayfaKabugu";

const LACIVERT = "#0F2540";
const GRI = "#3F4B5A";
const TABAN = "https://www.sefukoc.com";
const EPOSTA = "sefukoc@gmail.com";

// Google OAuth onay ekranı için herkese açık kullanım şartları bağlantısı. Kısa ve
// uygulamanın gerçek işleyişine bağlı tutuldu; hukuki bir sözleşme metni değildir,
// kurum sözleşmeleri ayrıca yapılır.
export const metadata: Metadata = {
  title: "Kullanım Şartları | SeFu Koç",
  description: "SeFu Koç'u kullanırken hesap, içerik ve sorumluluklara ilişkin temel kurallar.",
  alternates: { canonical: `${TABAN}/kullanim-sartlari` },
  robots: { index: true, follow: true },
};

const BOLUMLER: { baslik: string; paragraflar: string[] }[] = [
  {
    baslik: "Hizmetin kapsamı",
    paragraflar: [
      "SeFu Koç, okul ve dershanelerde öğrenci takibi ve koçluk için kullanılan bir web uygulamasıdır. Hesaplar öğrenci, veli, öğretmen, rehber ve kurum yöneticisi rollerine göre açılır; her rol yalnızca kendi yetkisindeki bilgileri görür.",
    ],
  },
  {
    baslik: "Hesap sorumluluğu",
    paragraflar: [
      "Hesabınızın şifresini gizli tutmak ve hesabınızla yapılan işlemlerden sorumlu olmak size aittir. Başka birinin hesabını kullanmak, yanlış veri girmek ya da sonuçları manipüle etmeye çalışmak yasaktır; tekrarlanan girişimlerde hesap kısıtlanabilir.",
    ],
  },
  {
    baslik: "İçerik ve veri",
    paragraflar: [
      "Uygulamaya girdiğiniz veriler (deneme sonuçları, çalışma kayıtları, ödev yanıtları) size ve yetkili öğretmen/yöneticilere görünür. Kişisel verilerin nasıl işlendiği Gizlilik Politikası'nda anlatılır. Duyuru eklerinde başkalarına ait kişisel veri paylaşmayın.",
    ],
  },
  {
    baslik: "Hizmetin sürekliliği",
    paragraflar: [
      "Hizmeti kesintisiz ve hatasız sunmaya çalışırız; ancak bakım, güncelleme ya da üçüncü taraf altyapı sorunları nedeniyle geçici kesintiler olabilir. Analiz ve önerilerimiz yardımcı niteliktedir; sınav sonuçları için bir garanti oluşturmaz.",
    ],
  },
  {
    baslik: "Hesabın kapatılması",
    paragraflar: [
      "Hesabınızın kapatılmasını " + EPOSTA + " adresinden ya da kurum yöneticiniz aracılığıyla isteyebilirsiniz. Kuralları ihlal eden hesaplar uyarı yapılarak veya doğrudan kısıtlanabilir.",
    ],
  },
  {
    baslik: "Değişiklikler ve iletişim",
    paragraflar: [
      "Bu şartlar güncellenebilir; güncel hali bu sayfada yayımlanır. Sorularınız için " + EPOSTA + " adresine yazabilirsiniz. Son güncelleme: 26.10.2026.",
    ],
  },
];

export default function KullanimSartlariSayfasi() {
  return (
    <SayfaKabugu>
      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>Kullanım Şartları</h1>
        <p className="mt-3 text-base leading-7" style={{ color: GRI }}>
          SeFu Koç&apos;u kullanarak aşağıdaki kuralları kabul etmiş olursunuz.
        </p>
        {BOLUMLER.map((b) => (
          <section key={b.baslik} className="mt-8">
            <h2 className="text-xl font-extrabold" style={{ color: LACIVERT }}>{b.baslik}</h2>
            {b.paragraflar.map((p) => (
              <p key={p} className="mt-2 text-sm leading-7 sm:text-base" style={{ color: GRI }}>{p}</p>
            ))}
          </section>
        ))}
      </article>
    </SayfaKabugu>
  );
}
