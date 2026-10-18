import Link from "next/link";
import { Megaphone, MessageSquareShare } from "lucide-react";
import { BG1, BORDER, MINT, MINT_ON, TEXT_MUTED } from "@/lib/theme";

// Duyurular bölümünde iki sekme (kullanıcı isteği 18.10.2026): site içi
// duyuru formu ve WhatsApp duyuru kartları (?tur=whatsapp). WhatsApp sekmesi
// yalnız müdür ve rehber öğretmene gösterilir; çağıran taraf karar verir.
export function DuyuruTuruSekmeleri({ secili }: { secili: "site" | "whatsapp" }) {
  const sekmeler = [
    { tur: "site", etiket: "Site içi duyurular", href: "/dashboard/duyurular", Ikon: Megaphone },
    { tur: "whatsapp", etiket: "WhatsApp duyuruları", href: "/dashboard/duyurular?tur=whatsapp", Ikon: MessageSquareShare },
  ] as const;
  return (
    <nav aria-label="Duyuru türü" className="mb-4 inline-flex gap-1 rounded-2xl p-1" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      {sekmeler.map(({ tur, etiket, href, Ikon }) => {
        const aktif = tur === secili;
        return (
          <Link key={tur} href={href} aria-current={aktif ? "page" : undefined}
            className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold"
            style={aktif ? { background: MINT, color: MINT_ON } : { color: TEXT_MUTED }}>
            <Ikon size={14} aria-hidden="true" /> {etiket}
          </Link>
        );
      })}
    </nav>
  );
}
