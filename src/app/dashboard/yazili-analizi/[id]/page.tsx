import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { yaziliRaporuGetir } from "@/lib/yazili-rapor";
import { UUID_DESENI } from "@/lib/yazili-sinif-ogrencileri";
import { YaziliRaporu } from "@/components/dashboard/YaziliRaporu";

export const metadata = {
  title: "Soru Analizi ve Sınav Başarı Değerlendirmesi | SeFu Koç",
};

// Kaydedilen bir yazılının çıktısı (A4, yazdırılabilir). Erişim yazili_*
// RLS politikalarıyla sınırlı: o sınıfın o dersine kayıtlı olmayan biri
// sınavı okuyamaz, sayfa 404 döner.
export default async function YaziliRaporSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_DESENI.test(id)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const rapor = await yaziliRaporuGetir(id);
  if (!rapor) notFound();

  return <YaziliRaporu rapor={rapor} />;
}
