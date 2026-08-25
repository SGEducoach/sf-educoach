import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { DashboardYanMenu } from "@/components/dashboard/DashboardYanMenu";
import { AdminPanel } from "@/components/dashboard/AdminPanel";
import { KullaniciArama } from "@/components/yonetici/KullaniciArama";
import { VeliTalepleri } from "@/components/yonetici/VeliTalepleri";
import { PdfEslesmeYonetimi } from "@/components/yonetici/PdfEslesmeYonetimi";
import { ModeratorlerListesi } from "@/components/yonetici/ModeratorlerListesi";
import { PlatformIstatistikleri } from "@/components/yonetici/PlatformIstatistikleri";
import { KonuAnlatimYonetimi } from "@/components/yonetici/KonuAnlatimYonetimi";
import { MufredatHiyerarsiYonetimi } from "@/components/yonetici/MufredatHiyerarsiYonetimi";
import { KurallarYonetimi } from "@/components/yonetici/KurallarYonetimi";
import { HataBildirimleriYonetimi } from "@/components/yonetici/HataBildirimleriYonetimi";
import { AdminProfilim } from "@/components/yonetici/AdminProfilim";
import { YoneticiGirisForm } from "@/components/yonetici/YoneticiGirisForm";
import { YoneticiYetkileri } from "@/components/yonetici/YoneticiYetkileri";
import { dashboardMenusu } from "@/lib/dashboard-navigation";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { sinifSiraKarsilastir } from "@/lib/types";

// SeFu Koç'un tek kontrol noktası — bilerek /dashboard'dan ayrı, kendi
// bağımsız girişi olan, hiçbir yerden link verilmeyen bir adres. Normal
// giriş/rol seçimi akışının hiçbir parçası değil: sadece bu URL'yi bilen
// (ve admin hesabı olan) kişi buraya ulaşabilir.
//
// Diğer roller gibi (bkz. dashboard/page.tsx) tek sayfa üst üste dizilmiş
// bölümler yerine artık sol menü + aktif bölüm mantığıyla çalışıyor —
// ?bolum= (veya /yonetici/[bolum] catch-all, bkz. dashboard-navigation.ts
// YONETICI_ROUTE_BOLUMLERI) hangi bölümün gösterileceğini belirler.
export default async function YoneticiPage({
  searchParams,
}: {
  searchParams: Promise<{ okul?: string; bolum?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <YoneticiGirisForm />;

  const { data: profile } = await supabase.from("profiles").select("ad, role").eq("id", user.id).single();

  // Admin olmayan biri (başka bir rolle oturum açmış durumda) bu adrese
  // gelirse panelin var olduğunu hiç hissettirmeden anasayfaya yönlendirilir.
  if (!profile || profile.role !== "admin") redirect("/");

  const params = await searchParams;
  const aktifBolum = (params.bolum ?? "ozet") as DashboardBolumu;
  if (!dashboardMenusu("admin").some((oge) => oge.bolum === aktifBolum)) redirect("/yonetici");

  const { data: okullar } = await supabase.from("schools").select("id, ad, okul_kodu, tur, aktif").order("ad");
  const okulListesi = (okullar ?? []) as { id: string; ad: string; okul_kodu: string; tur: "okul" | "dershane"; aktif: boolean }[];
  const gorunecekOkulId = params.okul || okulListesi[0]?.id || null;

  const [{ data: siniflar }, { data: ogretmenler }] = await Promise.all([
    gorunecekOkulId
      ? supabase.from("classes").select("id, seviye, sube").eq("school_id", gorunecekOkulId)
      : Promise.resolve({ data: [] }),
    gorunecekOkulId
      ? supabase.from("teachers").select("id, brans, class_id, profiles!teachers_id_fkey(ad, role), classes(seviye, sube)").eq("school_id", gorunecekOkulId)
      : Promise.resolve({ data: [] }),
  ]);

  type OgretmenRow = { id: string; brans: string; class_id: string | null; profiles: { ad: string; role: string } | null; classes: { seviye: string; sube: string } | null };
  const ogretmenListesi = ((ogretmenler as unknown as OgretmenRow[]) ?? []).map((o) => ({
    id: o.id, ad: o.profiles?.ad ?? "İsimsiz", brans: o.brans, classId: o.class_id,
    sinifAdi: o.classes ? `${o.classes.seviye}-${o.classes.sube}` : null,
    mudurMu: o.profiles?.role === "mudur",
  }));

  const { data: kayitlar } = await supabase
    .from("admin_audit_log")
    .select("id, eylem, detay, created_at, profiles(ad)")
    .order("created_at", { ascending: false })
    .limit(30);

  type KayitRow = { id: string; eylem: string; detay: Record<string, unknown> | null; created_at: string; profiles: { ad: string } | null };
  const kayitListesi = ((kayitlar as unknown as KayitRow[]) ?? []).map((k) => ({
    id: k.id, eylem: k.eylem, detay: k.detay, createdAt: k.created_at, aktorAdi: k.profiles?.ad ?? "—",
  }));

  return (
    <div className="sfec-dashboard-shell min-h-dvh w-full flex-1 flex flex-col">
      <Header ad={profile.ad} role="admin" aktifBolum={aktifBolum} />
      <div className="mx-auto flex min-h-[calc(100dvh-6.75rem)] w-full max-w-[100rem] flex-1 items-stretch gap-6 px-4 py-6 sm:px-6 lg:py-7">
        <DashboardYanMenu role="admin" aktifBolum={aktifBolum} />
        <main id="ana-icerik" className="sfec-dashboard-main min-h-[calc(100dvh-10.25rem)] min-w-0 w-full flex-1 flex flex-col gap-6">
          {aktifBolum === "ozet" && (
            <>
              <section className="sfec-section"><PlatformIstatistikleri /></section>
              <YoneticiYetkileri />
            </>
          )}
          {aktifBolum === "kullanicilar" && <section className="sfec-section"><KullaniciArama /></section>}
          {aktifBolum === "talepler" && <VeliTalepleri />}
          {aktifBolum === "pdf-eslesme" && <section className="sfec-section"><PdfEslesmeYonetimi /></section>}
          {aktifBolum === "okullar" && (
            <section className="sfec-section"><AdminPanel
              okullar={okulListesi}
              gorunecekOkulId={gorunecekOkulId}
              siniflar={((siniflar ?? []) as { id: string; seviye: string; sube: string }[]).sort(sinifSiraKarsilastir)}
              ogretmenListesi={ogretmenListesi}
              islemKayitlari={kayitListesi}
            /></section>
          )}
          {aktifBolum === "moderatorler" && <section className="sfec-section"><ModeratorlerListesi /></section>}
          {aktifBolum === "icerik" && (
            <section className="sfec-section flex flex-col gap-5">
              <KonuAnlatimYonetimi />
              <MufredatHiyerarsiYonetimi />
            </section>
          )}
          {aktifBolum === "kurallar" && <KurallarYonetimi />}
          {aktifBolum === "hata-bildirimleri" && <section className="sfec-section"><HataBildirimleriYonetimi /></section>}
          {aktifBolum === "profil" && <section className="sfec-section"><AdminProfilim /></section>}
        </main>
      </div>
    </div>
  );
}
