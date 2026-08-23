import Link from "next/link";
import { CircleUserRound, LayoutDashboard, Medal } from "lucide-react";
import { BG1, BORDER, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

export function YonetimNavigasyonu({ tur, aktif }: { tur: "yonetici" | "moderator"; aktif: "panel" | "rozetler" | "profil" }) {
  const kok = tur === "yonetici" ? "/yonetici" : "/moderator";
  const ogeler = [
    { id: "panel" as const, href: kok, etiket: tur === "yonetici" ? "Yönetim paneli" : "Moderatör paneli", Icon: LayoutDashboard },
    { id: "rozetler" as const, href: `${kok}/rozetler`, etiket: "Rozetler", Icon: Medal },
    { id: "profil" as const, href: `${kok}/profil`, etiket: "Profilim", Icon: CircleUserRound },
  ];
  return (
    <nav aria-label={tur === "yonetici" ? "Yönetici bölümleri" : "Moderatör bölümleri"} className="flex flex-wrap gap-2 rounded-2xl p-2" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      {ogeler.map(({ id, href, etiket, Icon }) => {
        const secili = aktif === id;
        return (
          <Link key={id} href={href} aria-current={secili ? "page" : undefined}
            className="sfec-btn inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
            style={{ color: secili ? TEXT : TEXT_MUTED, background: secili ? MINT_BG : "transparent", border: `1px solid ${secili ? MINT : "transparent"}` }}>
            <Icon size={16} color={secili ? MINT : TEXT_MUTED} /> {etiket}
          </Link>
        );
      })}
    </nav>
  );
}
