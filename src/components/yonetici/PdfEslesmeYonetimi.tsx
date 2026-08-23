import { pdfEslesmeBekleyenleriGetir } from "@/app/yonetici/pdf-eslesme-actions";
import { PdfEslesmeListesi } from "@/components/yonetici/PdfEslesmeListesi";
import { BG1, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";

// DERSHANE MODU (Faz D5) — dershane müdürlerinin yüklediği deneme sonuç
// PDF'lerinden ad-soyad ile eşleşmeyen/belirsiz kalan satırlar burada
// admin tarafından elle bir öğrenciye atanır ya da reddedilir.
export async function PdfEslesmeYonetimi() {
  const { bekleyenler } = await pdfEslesmeBekleyenleriGetir();

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold mb-1">PDF Deneme Eşleştirme</h2>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
        Dershane müdürlerinin yüklediği deneme sonuç PDF&apos;lerinden ad-soyad ile otomatik eşleşmeyen satırlar.
      </p>
      {bekleyenler.length === 0
        ? <p style={{ color: TEXT_MUTED }} className="text-sm">Bekleyen eşleştirme yok.</p>
        : <PdfEslesmeListesi bekleyenler={bekleyenler} />}
    </div>
  );
}
