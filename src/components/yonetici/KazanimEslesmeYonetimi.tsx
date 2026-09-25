import { kazanimEslesmeVerisiGetir } from "@/app/yonetici/kazanim-eslesme-actions";
import { KazanimEslesmeListesi } from "@/components/yonetici/KazanimEslesmeListesi";
import { BG1, BLUSH, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";

// Deneme konu eşleştirme (25.09.2026) — karnelerden gelen yayınevi
// konularını müfredat konularına bağlar; Analiz Motoru'nun konu hakimiyeti
// puanı bu eşleşmeler üzerinden deneme sonuçlarını da kullanır.
export async function KazanimEslesmeYonetimi() {
  const veri = await kazanimEslesmeVerisiGetir();
  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold mb-1">Deneme Konu Eşleştirme</h2>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
        Karneli deneme PDF&apos;lerindeki yayınevi konularını müfredat konularına bağlayın. Eşleşen konulardaki deneme
        doğru/yanlışları öğrencilerin konu hakimiyeti puanına &quot;ölçüm&quot; olarak eklenir. Bir kez eşleştirilen konu
        sonraki denemelerde de kullanılır.
      </p>
      {veri.error
        ? <p style={{ color: BLUSH }} className="text-sm font-semibold">Veri alınamadı: {veri.error}</p>
        : veri.satirlar.length === 0
          ? <p style={{ color: TEXT_MUTED }} className="text-sm">Henüz karneli deneme yüklenmemiş.</p>
          : <KazanimEslesmeListesi veri={veri} />}
    </div>
  );
}
