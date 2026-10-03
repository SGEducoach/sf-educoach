import Link from "next/link";
import {
  BarChart2, Building2, CircleUserRound, FileUp, GitCompareArrows, GraduationCap, Layers, ListTree, Users,
  type LucideIcon,
} from "lucide-react";
import { BG1, BORDER, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";
import type { ModeratorMenuOgesi, ModeratorPanelBolumu } from "@/lib/moderator-bolumleri";

export { moderatorBolumuCoz } from "@/lib/moderator-bolumleri";

// Moderatör menüsü (kullanıcı isteği 03.10.2026): "kurum bilgilerini
// düzenleme / öğrenci ekleme-çıkarma / öğretmen ekleme-çıkarma / sınıf
// öğretmeni tanımlama / deneme PDF'i yükleme / deneme PDF'i eşleştirme"
// ayrı ayrı bulunabilsin. Önceden hepsi tek uzun sayfadaydı.
//
// Panel bölümleri /moderator?bolum=... ile açılır (tek sayfa, tek yetki
// kontrolü); Konu Haritası, Kurum Konuları ve Profilim kendi sayfalarında.
// Deneme bölümleri yalnızca dershanede var (PDF yükleme yetkisi müdürle aynı
// kapsamda: okul ve Grup Koçluk kurumları hariç).
type Oge = { id: ModeratorMenuOgesi; href: string; etiket: string; Icon: LucideIcon };

export function ModeratorNavigasyonu({ aktif, dershane, adminOkulId }: {
  aktif: ModeratorMenuOgesi;
  dershane: boolean;
  // Admin başka bir kurumun panelini görüntülerken (/moderator?okul=...):
  // linkler okul parametresini taşır; moderatörün kişisel sayfaları gizlenir.
  adminOkulId?: string;
}) {
  const panel = (bolum: ModeratorPanelBolumu) => {
    const parametreler = new URLSearchParams();
    if (bolum !== "ogrenciler") parametreler.set("bolum", bolum);
    if (adminOkulId) parametreler.set("okul", adminOkulId);
    const sorgu = parametreler.toString();
    return sorgu ? `/moderator?${sorgu}` : "/moderator";
  };

  const gruplar: { baslik: string; ogeler: Oge[] }[] = [
    {
      baslik: "Kurum yönetimi",
      ogeler: [
        { id: "ogrenciler", href: panel("ogrenciler"), etiket: "Öğrenciler", Icon: Users },
        { id: "ogretmenler", href: panel("ogretmenler"), etiket: "Öğretmenler", Icon: GraduationCap },
        { id: "siniflar", href: panel("siniflar"), etiket: "Sınıflar", Icon: Layers },
        { id: "kurum", href: panel("kurum"), etiket: "Kurum bilgileri", Icon: Building2 },
      ],
    },
    ...(dershane ? [{
      baslik: "Denemeler",
      ogeler: [
        { id: "deneme-yukle" as const, href: panel("deneme-yukle"), etiket: "Deneme yükle", Icon: FileUp },
        { id: "pdf-eslesme" as const, href: panel("pdf-eslesme"), etiket: "PDF eşleştirme", Icon: GitCompareArrows },
      ],
    }] : []),
    ...(!adminOkulId ? [{
      baslik: "Diğer",
      ogeler: [
        { id: "konu-haritasi" as const, href: "/moderator/konu-haritasi", etiket: "Konu Haritası", Icon: BarChart2 },
        { id: "kurum-konulari" as const, href: "/moderator/kurum-konulari", etiket: "Kurum Konuları", Icon: ListTree },
        { id: "profil" as const, href: "/moderator/profil", etiket: "Profilim", Icon: CircleUserRound },
      ],
    }] : []),
  ];

  return (
    <nav aria-label="Moderatör bölümleri" className="rounded-2xl p-2" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      {/* Telefonda tek satır yatay kaydırma (sayfa taşmaz, yalnız menü
          kayar); geniş ekranda gruplar yan yana sarılır. */}
      <div className="flex gap-3 overflow-x-auto sm:flex-wrap sm:overflow-visible">
        {gruplar.map((grup) => (
          <div key={grup.baslik} className="flex shrink-0 flex-col gap-1">
            <span className="px-2 pt-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{grup.baslik}</span>
            <div className="flex gap-1">
              {grup.ogeler.map(({ id, href, etiket, Icon }) => {
                const secili = aktif === id;
                return (
                  <Link key={id} href={href} aria-current={secili ? "page" : undefined}
                    className="sfec-btn inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-bold"
                    style={{ color: secili ? TEXT : TEXT_MUTED, background: secili ? MINT_BG : "transparent", border: `1px solid ${secili ? MINT : "transparent"}` }}>
                    <Icon size={16} color={secili ? MINT : TEXT_MUTED} /> {etiket}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
