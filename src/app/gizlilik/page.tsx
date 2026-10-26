import type { Metadata } from "next";
import { SayfaKabugu } from "@/components/SayfaKabugu";

const LACIVERT = "#0F2540";
const GRI = "#3F4B5A";
const TABAN = "https://www.sefukoc.com";
const EPOSTA = "sefukoc@gmail.com";

// Google OAuth onay ekranı (Drive bağlantısı) herkese açık bir gizlilik politikası
// bağlantısı istiyor. Metin, kayıt formundaki KVKK aydınlatma metniyle (v1-2026-08-26)
// ve Drive entegrasyonunun gerçek davranışıyla (docs/WHATSAPP_DRIVE_KURULUM.md) uyumlu
// tutulur; biri değişirse diğeri de gözden geçirilmeli.
export const metadata: Metadata = {
  title: "Gizlilik Politikası | SeFu Koç",
  description: "SeFu Koç'un hangi kişisel verileri neden işlediği, kimlerle paylaştığı ve Google Drive bağlantısının veri kullanımı.",
  alternates: { canonical: `${TABAN}/gizlilik` },
  robots: { index: true, follow: true },
};

const BOLUMLER: { baslik: string; paragraflar: string[] }[] = [
  {
    baslik: "Kim olduğumuz",
    paragraflar: [
      "SeFu Koç (www.sefukoc.com), okul ve dershanelerde öğrenci takibi ve koçluk için kullanılan bir web uygulamasıdır. Bu metin, uygulamanın kişisel verileri nasıl işlediğini açıklar. Sorularınız için " + EPOSTA + " adresine yazabilirsiniz.",
    ],
  },
  {
    baslik: "Hangi verileri işliyoruz",
    paragraflar: [
      "Ad-soyad, okul ve sınıf bilgisi, iletişim bilgileri (e-posta, telefon), akademik performans verileri (deneme sonuçları, çalışma kayıtları, soru çözüm istatistikleri, motivasyon durumu), ödev ve duyuru kayıtları ile hesabınızın güvenliği için gereken oturum bilgileri.",
    ],
  },
  {
    baslik: "Neden işliyoruz",
    paragraflar: [
      "Öğrencinin akademik gelişiminin takip edilmesi, öğretmen ve rehber tarafından değerlendirilmesi, öğrenciye ve (bağlıysa) velisine bildirim ve rapor sunulması. Hukuki sebep: KVKK madde 5/2-c (bir sözleşmenin kurulması veya ifasıyla doğrudan ilgili olması) ve madde 5/2-f (veri sorumlusunun meşru menfaati).",
    ],
  },
  {
    baslik: "Kimlerle paylaşıyoruz",
    paragraflar: [
      "Veriler; öğrencinin okul/dershane yönetimi, öğretmenleri ve (bağlıysa) velisi dışında, uygulamanın altyapı sağlayıcıları (barındırma, veritabanı ve e-posta hizmetleri) hariç üçüncü kişilerle paylaşılmaz. Verileriniz satılmaz ve reklam amacıyla kullanılmaz.",
    ],
  },
  {
    baslik: "Google Drive bağlantısı",
    paragraflar: [
      "Site yöneticisi, genel WhatsApp duyurularına dosya eklemek için kendi Google hesabını SeFu Koç'a bağlayabilir. Bu bağlantı yalnızca https://www.googleapis.com/auth/drive.file kapsamını ister: uygulama sadece kendi yüklediği veya yöneticinin Google klasör seçicisinden seçtiği dosya ve klasöre erişir; Drive'daki diğer dosyaları göremez, okuyamaz ve değiştiremez.",
      "Bağlantı sırasında alınan yenileme anahtarı veritabanında şifrelenmiş (AES-256-GCM) olarak saklanır ve yalnızca sunucu tarafından, duyuru eki yüklemek için kullanılır. Drive'a yüklenen ekler seçilen klasörde durur; öğrenciler bağlantıyı bilen kişi olarak bu dosyaları görüntüleyebilir, bu yüzden klasöre kişisel veri içeren dosya konmaz.",
      "SeFu Koç'un Google API'lerinden aldığı bilgileri kullanması ve başka uygulamalara aktarması, Google API Hizmetleri Kullanıcı Verileri Politikası'na (Sınırlı Kullanım gereklilikleri dahil) uygundur. Google'dan alınan veriler yalnızca bu özelliği sunmak için kullanılır; üçüncü kişilere satılmaz, devredilmez ve reklam için kullanılmaz; insanlar tarafından okunmaz.",
      "Bağlantıyı istediğiniz zaman yönetici panelinden kesebilir ya da Google Hesabınızdaki \"Üçüncü taraf uygulamalar ve hizmetlerle bağlantılar\" sayfasından SeFu Koç'un iznini kaldırabilirsiniz.",
    ],
  },
  {
    baslik: "Saklama süresi",
    paragraflar: [
      "Veriler hesabınız aktif olduğu sürece saklanır; hesabın kapatılmasını talep ettiğinizde makul süre içinde silinir. Okul öğrenci listesine önceden kaydedilmiş ama hesabı olmayan öğrencilerin bekleyen kayıtları, belirli bir süre sonunda otomatik olarak temizlenir.",
    ],
  },
  {
    baslik: "Haklarınız",
    paragraflar: [
      "KVKK madde 11 kapsamında verilerinizin işlenip işlenmediğini öğrenme, düzeltilmesini veya silinmesini isteme, işlenme amacını öğrenme gibi haklara sahipsiniz. Talepleriniz için " + EPOSTA + " adresine yazabilirsiniz. Reşit olmayan öğrencilerin talepleri velileri üzerinden de iletilebilir.",
    ],
  },
  {
    baslik: "Değişiklikler",
    paragraflar: [
      "Bu metin güncellenebilir; güncel hali her zaman bu sayfada yayımlanır. Son güncelleme: 26.10.2026.",
    ],
  },
];

export default function GizlilikSayfasi() {
  return (
    <SayfaKabugu>
      <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-extrabold sm:text-4xl" style={{ color: LACIVERT, fontFamily: "var(--font-baloo)" }}>Gizlilik Politikası</h1>
        <p className="mt-3 text-base leading-7" style={{ color: GRI }}>
          SeFu Koç&apos;u kullanırken kişisel verilerinizin nasıl işlendiğini burada açıkça anlatıyoruz.
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
