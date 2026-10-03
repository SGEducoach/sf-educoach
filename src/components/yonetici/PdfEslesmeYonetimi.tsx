import { pdfEslesmeBekleyenleriGetir } from "@/app/yonetici/pdf-eslesme-actions";
import { PdfEslesmeListesi } from "@/components/yonetici/PdfEslesmeListesi";
import { BG1, BORDER, BUTTER, TEXT, TEXT_MUTED } from "@/lib/theme";

// DERSHANE MODU (Faz D5) — deneme sonuç PDF'lerinden gelen satırlar burada
// admin tarafından elle bir öğrenciye atanır ya da reddedilir.
//
// Kullanıcı isteği (01.10.2026): ekran artık yalnız eşleşmeyen satırları
// değil, yüklenen PDF'teki BÜTÜN adları durumlarıyla gösteriyor — bir denetim
// ekranı. "Bekleyen yok" demek bu yüzden yanlış olurdu: liste boşsa henüz hiç
// PDF yüklenmemiş demektir.
// kurumId: yönetici bir kurumun moderatör panelini görüntülerken listeyi o
// kuruma daraltmak için. Dershane moderatörü için daraltma zaten sunucuda
// (pdf-eslesme-actions.ts requireEslesmeYetkisi) yapılıyor.
export async function PdfEslesmeYonetimi({ kurumId }: { kurumId?: string } = {}) {
  const sonuc = await pdfEslesmeBekleyenleriGetir();
  const kirpildi = sonuc.kirpildi;
  const bekleyenler = kurumId ? sonuc.bekleyenler.filter((b) => b.schoolId === kurumId) : sonuc.bekleyenler;

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold mb-1">PDF Deneme Eşleştirme</h2>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
        Yüklenen deneme PDF&apos;lerindeki bütün adlar; eşleşenler, ön kayıtta bulunanlar ve okunamayan satırlar durumlarıyla birlikte gösterilir.
      </p>
      {kirpildi && (
        <p style={{ color: BUTTER }} className="mb-3 text-[11px] font-semibold">
          Yalnız en yeni 500 satır gösteriliyor. Eski satırlar için kurum ve deneme süzgecini kullanın.
        </p>
      )}
      {bekleyenler.length === 0
        ? <p style={{ color: TEXT_MUTED }} className="text-sm">Henüz yüklenmiş bir deneme PDF&apos;i yok.</p>
        : <PdfEslesmeListesi bekleyenler={bekleyenler} />}
    </div>
  );
}
