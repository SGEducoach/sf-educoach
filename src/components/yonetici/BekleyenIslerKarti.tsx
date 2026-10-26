import Link from "next/link";
import { Bug, ClipboardList, CloudOff, FileSearch, MessagesSquare, UserCheck } from "lucide-react";
import { BG1, BG1_ALT, BORDER, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";
import type { BekleyenIsler } from "@/lib/yonetici-bekleyen-isler";

// Genel Bakış'ın başında; sayısı olan iş vurgulanır, tıklayınca o sayfa açılır.
export function BekleyenIslerKarti({ isler }: { isler: BekleyenIsler }) {
  const kalemler = [
    { sayi: isler.yanitBekleyenYazisma, etiket: "Yanıt bekleyen yazışma", href: "/yonetici/iletisim?sekme=yazismalar", Ikon: MessagesSquare },
    { sayi: isler.veliTalebi, etiket: "Veli talebi", href: "/yonetici/talepler", Ikon: ClipboardList },
    { sayi: isler.belletmenBasvurusu, etiket: "Belletmen başvurusu", href: "/yonetici/belletmen-basvurulari", Ikon: UserCheck },
    { sayi: isler.hataBildirimi, etiket: "Hata bildirimi", href: "/yonetici/hata-bildirimleri", Ikon: Bug },
    { sayi: isler.pdfEslesme, etiket: "Eşleşme bekleyen deneme satırı", href: "/yonetici/pdf-eslesme", Ikon: FileSearch },
  ];
  if (isler.driveKoptu) kalemler.push({ sayi: 1, etiket: "Drive bağlantısı koptu — yeniden bağlayın", href: "/yonetici/iletisim?sekme=whatsapp", Ikon: CloudOff });
  const toplam = kalemler.reduce((t, k) => t + k.sayi, 0);
  return (
    <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Bekleyen İşler</h2>
        <span className="text-xs" style={{ color: TEXT_MUTED }}>{toplam === 0 ? "Bekleyen iş yok" : `${toplam} kayıt`}</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {kalemler.map(({ sayi, etiket, href, Ikon }) => (
          <Link key={href} href={href} className="sfec-btn flex items-center gap-3 rounded-2xl p-3"
            style={{ background: BG1_ALT, border: `1px solid ${sayi ? MINT : BORDER}` }}>
            <Ikon size={18} color={sayi ? MINT : TEXT_MUTED} aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-xl font-black leading-none" style={{ color: sayi ? TEXT : TEXT_MUTED }}>{sayi}</span>
              <span className="block text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>{etiket}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
