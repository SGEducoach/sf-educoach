import Image from "next/image";
import { X } from "lucide-react";
import { BG1, BORDER_STRONG, TEXT_MUTED } from "@/lib/theme";

export function MaskotKonusmaBalonu({
  children,
  onKapat,
  ariaLabel,
  genis = false,
}: {
  children: React.ReactNode;
  onKapat: () => void;
  ariaLabel: string;
  // Kullanıcı isteği (26.08.2026): "Mesajlar kutusu küçük, boyutu
  // ayarlanacak" — sadece Mesajlarım için daha geniş bir varyant, diğer
  // maskot popup'ları (Görevlerim, Hoşgeldin) etkilenmiyor.
  genis?: boolean;
}) {
  return (
    <div className="sfec-mascot-scene" role="dialog" aria-modal="true" aria-label={ariaLabel}>
      <button className="absolute inset-0" type="button" aria-label="Pencereyi kapat" onClick={onKapat} />
      <div className="sfec-mascot-stage">
        <Image
          src="/characters/einstein-mascot.webp"
          alt="Albert Einstein çizgi karakteri"
          width={512}
          height={768}
          className="sfec-mascot-character pointer-events-none select-none"
          priority
        />
        <div className={`sfec-mascot-bubble${genis ? " sfec-mascot-bubble--genis" : ""}`} style={{ background: BG1, border: `2px solid ${BORDER_STRONG}` }}>
          <button
            type="button"
            onClick={onKapat}
            aria-label="Kapat"
            className="sfec-btn sticky top-0 z-10 float-right ml-2 flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: BG1 }}
          >
            <X size={14} color={TEXT_MUTED} />
          </button>
          {children}
        </div>
      </div>
    </div>
  );
}
