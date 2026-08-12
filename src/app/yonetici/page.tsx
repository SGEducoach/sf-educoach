import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { AdminPanel } from "@/components/dashboard/AdminPanel";
import { KullaniciArama } from "@/components/yonetici/KullaniciArama";
import { VeliTalepleri } from "@/components/yonetici/VeliTalepleri";
import { PlatformIstatistikleri } from "@/components/yonetici/PlatformIstatistikleri";
import { KonuAnlatimYonetimi } from "@/components/yonetici/KonuAnlatimYonetimi";
import { KurallarYonetimi } from "@/components/yonetici/KurallarYonetimi";
import { SifreDegistir } from "@/components/yonetici/SifreDegistir";
import { YoneticiGirisForm } from "@/components/yonetici/YoneticiGirisForm";
import { YoneticiYetkileri } from "@/components/yonetici/YoneticiYetkileri";
import { sinifSiraKarsilastir } from "@/lib/types";

// SG EduCoach'un tek kontrol noktası — bilerek /dashboard'dan ayrı, kendi
// bağımsız girişi olan, hiçbir yerden link verilmeyen bir adres. Normal
// giriş/rol seçimi akışının hiçbir parçası değil: sadece bu URL'yi bilen
// (ve admin hesabı olan) kişi buraya ulaşabilir.
export default async function YoneticiPage({
  searchParams,
}: {
  searchParams: Promise<{ okul?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <YoneticiGirisForm />;

  const { data: profile } = await supabase.from("profiles").select("ad, role").eq("id", user.id).single();

  // Admin olmayan biri (başka bir rolle oturum açmış durumda) bu adrese
  // gelirse panelin var olduğunu hiç hissettirmeden anasayfaya yönlendirilir.
  if (!profile || profile.role !== "admin") redirect("/");

  const params = await searchParams;

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
    <div style={{ minHeight: "100vh", width: "100%" }} className="flex-1 flex flex-col">
      <Header ad={profile.ad} role="admin" />
      <main id="ana-icerik" className="max-w-6xl mx-auto px-4 sm:px-6 py-7 pb-24 lg:pb-7 w-full flex-1 flex flex-col gap-6">
        <SifreDegistir />
        <section id="istatistikler" className="sgec-section"><PlatformIstatistikleri /></section>
        <YoneticiYetkileri />
        <section id="kullanicilar" className="sgec-section"><KullaniciArama /></section>
        <VeliTalepleri />
        <section id="okullar" className="sgec-section"><AdminPanel
          okullar={okulListesi}
          gorunecekOkulId={gorunecekOkulId}
          siniflar={((siniflar ?? []) as { id: string; seviye: string; sube: string }[]).sort(sinifSiraKarsilastir)}
          ogretmenListesi={ogretmenListesi}
          islemKayitlari={kayitListesi}
        /></section>
        <section id="icerik" className="sgec-section"><KonuAnlatimYonetimi /></section>
        <KurallarYonetimi />
      </main>
    </div>
  );
}
