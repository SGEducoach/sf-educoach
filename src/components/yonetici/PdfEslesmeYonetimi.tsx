import { pdfEslesmeBekleyenleriGetir, pdfEslesmeDenemeleriGetir } from "@/app/yonetici/pdf-eslesme-actions";
import { PdfEslesmeDenemeSecici, PdfEslesmeListesi } from "@/components/yonetici/PdfEslesmeListesi";
import { pdfEslesmeDenemeAnahtariniCoz } from "@/lib/pdf-eslesme-durum";
import { BG1, BLUSH, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";

// DERSHANE MODU (Faz D5) — deneme sonuç PDF'lerinden gelen satırlar burada
// admin tarafından elle bir öğrenciye atanır ya da reddedilir.
//
// Kullanıcı isteği (01.10.2026): ekran artık yalnız eşleşmeyen satırları
// değil, yüklenen PDF'teki BÜTÜN adları durumlarıyla gösteriyor — bir denetim
// ekranı.
// Kullanıcı isteği (17.10.2026): ekran listesiz açılır; önce deneme seçilir,
// yalnız o denemenin bütün satırları gelir (eski 500 satır sınırı kalktı).
// Seçim URL'de (?deneme=...) tutulur, atama sonrası yenilemede korunur.
// kurumId: yönetici bir kurumun moderatör panelini görüntülerken listeyi o
// kuruma daraltmak için. Dershane moderatörü için daraltma zaten sunucuda
// (pdf-eslesme-actions.ts requireEslesmeYetkisi) yapılıyor.
export async function PdfEslesmeYonetimi({ kurumId, denemeAnahtari }: { kurumId?: string; denemeAnahtari?: string } = {}) {
  const { error, denemeler } = await pdfEslesmeDenemeleriGetir(kurumId);
  const secim = pdfEslesmeDenemeAnahtariniCoz(denemeAnahtari);
  const secili = secim ? denemeler.find((d) => d.schoolId === secim.schoolId && d.tarih === secim.tarih && d.tur === secim.tur && d.yayinevi === secim.yayinevi) : undefined;
  const satirlar = secili ? await pdfEslesmeBekleyenleriGetir(secili) : null;

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold mb-1">PDF Deneme Eşleştirme</h2>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
        Bir deneme seçin; o denemenin PDF&apos;indeki bütün adlar (eşleşenler, ön kayıtta bulunanlar ve okunamayan satırlar) durumlarıyla gösterilir.
      </p>
      {error && <p style={{ color: BLUSH }} className="mb-3 text-xs font-semibold">Denemeler alınamadı: {error}</p>}
      {denemeler.length === 0
        ? <p style={{ color: TEXT_MUTED }} className="text-sm">Henüz yüklenmiş bir deneme PDF&apos;i yok.</p>
        : <PdfEslesmeDenemeSecici denemeler={denemeler} seciliAnahtar={secili?.anahtar ?? ""} />}
      {satirlar?.error && <p style={{ color: BLUSH }} className="mt-3 text-xs font-semibold">Satırlar alınamadı: {satirlar.error}</p>}
      {satirlar && !satirlar.error && (
        <div className="mt-3">
          <PdfEslesmeListesi key={secili!.anahtar} bekleyenler={satirlar.bekleyenler} />
        </div>
      )}
    </div>
  );
}
