import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, LogOut, Megaphone, ShieldCheck } from "lucide-react";
import { BORDER, BORDER_STRONG, LILAC_BG, LILAC_TEXT, MINT, MINT_BG, NAV_BG, TEXT, TEXT_MUTED } from "@/lib/theme";
import { signOut } from "@/app/dashboard/actions";
import { MesajlarimIkonu } from "@/components/dashboard/MesajlarimIkonu";
import { BildirimAyarlari } from "@/components/dashboard/BildirimAyarlari";
import { HataBildirButonu } from "@/components/dashboard/HataBildirButonu";
import type { KurumTuru, UserRole } from "@/lib/types";
import { MobilMenu } from "@/components/dashboard/MobilMenu";
import { OturumZamanAsimi } from "@/components/OturumZamanAsimi";
import { SeFuMarkaAdi, SeFuSlogan } from "@/components/SeFuWordmark";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { createClient } from "@/lib/supabase/server";
import { aktifYoneticiDuyurusuGetir } from "@/lib/site-duyuru";

const rolEtiket: Record<UserRole, string> = {
  ogrenci: "Öğrenci",
  veli: "Veli",
  ogretmen: "Öğretmen",
  mudur: "Müdür",
  admin: "Yönetici",
};

export async function Header({ ad, role, kurumTuru, brans, okunmamisMesajSayisi = 0, mobilNavigasyon = true, moderatorMu = false, rolEtiketi, aktifBolum = "ozet", geriDonusHref, geriDonusEtiketi }: { ad: string; role: UserRole; kurumTuru?: KurumTuru; brans?: string; okunmamisMesajSayisi?: number; mobilNavigasyon?: boolean; moderatorMu?: boolean; rolEtiketi?: string; aktifBolum?: DashboardBolumu;
  // Kullanıcı isteği (26.08.2026): moderatör panelinin KENDİ İÇİNDEKİ "Ana
  // sayfaya dön" butonu kaldırıldı, isim yanına (buraya) taşındı — hem
  // gerçek moderatör (/dashboard'a) hem admin'in okul görüntülemesi
  // (/yonetici/moderatorler'e) için geçerli. Verildiğinde moderatörMu'nun
  // normal "Moderatör Paneli" linkinin YERİNE geçer (zaten o panelin
  // içindeyken kendine link vermek anlamsız).
  geriDonusHref?: string; geriDonusEtiketi?: string;
}) {
  // Kullanıcı isteği (26.08.2026): admin duyurusu artık rol fark etmeksizin
  // sitenin üstünde sabit bir şerit olarak da görünüyor (bkz. src/lib/
  // site-duyuru.ts). Header zaten her dashboard/yönetici/moderatör
  // sayfasında render edildiği için bu tek yer yeterli.
  const supabase = await createClient();
  const yoneticiDuyurusu = await aktifYoneticiDuyurusuGetir(supabase);
  return (
    <>
    <OturumZamanAsimi aktif={role === "admin" || moderatorMu} />
    {/* Kullanıcı isteği (26.08.2026): duyuru şeridi logonun olduğu bölümün
        HEMEN ALTINDA yer alsın (üstünde değil) — ikisi de tek bir sticky
        sarmalayıcı içinde tutulup birlikte üstte sabit kalıyor, böylece
        şeridin yüksekliğini ayrıca hesaplamaya gerek kalmıyor. Ayrıca rengi
        okunaklı hale getirildi: LILAC (koyu mor) metin için düşük kontrastlı
        — LILAC_TEXT (açık lila) bu amaç için zaten var (bkz. theme.ts). */}
    <div className="sticky top-0 z-[100] isolate print:hidden">
      <header className="sfec-dashboard-header" style={{
        background: NAV_BG,
        borderBottom: `2px solid ${BORDER_STRONG}`,
      }}>
        <div className="max-w-[100rem] mx-auto px-4 sm:px-6 py-3.5 sm:py-4 relative">
          <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Link href="/dashboard" title="Ana sayfaya dön" className="shrink-0">
                <Image src="/logo.png" alt="www.sefukoc.com" width={1258} height={837} className="sfec-brand-logo h-10 sm:h-12 w-auto object-contain" priority />
              </Link>
              <div className="min-w-0">
                <SeFuMarkaAdi className="block text-base sm:text-lg font-extrabold leading-none truncate" />
                <div className="text-[10px] sm:text-[12px] italic mt-1 truncate max-w-[150px] sm:max-w-none"><SeFuSlogan /></div>
              </div>
            </div>

            {/* Geniş masaüstünde ikonlar doğrudan yan yana; mobil ve tablette
                bölüm bağlantılarıyla birlikte hamburger menüde gösterilir. */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
                <span style={{ color: TEXT }} className="text-[12px] font-bold truncate max-w-[160px]">{ad}</span>
                <span style={{ color: TEXT_MUTED }} className="text-[11px] shrink-0">· {rolEtiketi ?? rolEtiket[role]}</span>
              </div>
              {geriDonusHref ? (
                <Link href={geriDonusHref} title={geriDonusEtiketi} className="sfec-btn flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
                  <LayoutDashboard size={15} color={TEXT_MUTED}/><span style={{ color: TEXT }} className="text-[11px] font-bold">{geriDonusEtiketi}</span>
                </Link>
              ) : moderatorMu && (
                <Link href="/moderator" title="Moderatör paneli" className="sfec-btn flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3" style={{ background: MINT_BG, border: `2px solid ${BORDER}` }}><ShieldCheck size={16} color={MINT}/><span style={{ color: MINT }} className="text-[11px] font-bold">Moderatör Paneli</span></Link>
              )}
              <HataBildirButonu />
              <BildirimAyarlari role={role} />
              {/* Kullanıcı isteği (26.08.2026, Bildirimler yeniden tasarımı — devam):
                  yanlış giriş bildirimi artık Bildirimler'e gidiyor (bkz.
                  BildirimAyarlari.tsx, migration 0079) — Mesajlarım'ı tüm
                  rollerde göstermenin TEK gerekçesi buydu, artık öğretmen/
                  müdür/admin için hep boş bir kutuya dönüyordu. Öğrenci/veli-
                  özel görünüme geri alındı (onlar gerçekten duyuru alıyor). */}
              {(role === "ogrenci" || role === "veli") && <MesajlarimIkonu baslangicSayisi={okunmamisMesajSayisi} />}
              <form action={signOut}>
                <button type="submit" title="Çıkış yap"
                  className="sfec-btn w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
                  <LogOut size={14} color={TEXT_MUTED} />
                </button>
              </form>
            </div>

            <MobilMenu ad={ad} role={role} kurumTuru={kurumTuru} brans={brans} okunmamisMesajSayisi={okunmamisMesajSayisi} moderatorMu={moderatorMu} rolEtiketi={rolEtiketi} aktifBolum={aktifBolum} navigasyonGoster={mobilNavigasyon} />
          </div>
        </div>
      </header>
      {yoneticiDuyurusu && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold" style={{ background: LILAC_BG, color: LILAC_TEXT, borderBottom: `2px solid ${BORDER_STRONG}` }}>
          <Megaphone size={14} className="shrink-0" />
          <span className="min-w-0"><strong>Yönetici Duyurusu:</strong> {yoneticiDuyurusu.mesaj}</span>
        </div>
      )}
    </div>
    </>
  );
}
