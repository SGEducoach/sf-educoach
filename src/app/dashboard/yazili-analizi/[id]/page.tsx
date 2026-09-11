import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { yaziliRaporuGetir } from "@/lib/yazili-rapor";
import { UUID_DESENI } from "@/lib/yazili-sinif-ogrencileri";
import { yaziliErisimi } from "@/lib/yazili-erisim";
import { YAZILI_KILIT_MESAJI } from "@/lib/yazili-erisim-hesap";
import { YaziliRaporu } from "@/components/dashboard/YaziliRaporu";

export const metadata = {
  title: "Soru Analizi ve Sınav Başarı Değerlendirmesi | SeFu Koç",
};

// Kaydedilen bir yazılının çıktısı (A4, yazdırılabilir). Erişim yazili_*
// RLS politikalarıyla sınırlı: o sınıfın o dersine kayıtlı olmayan biri
// sınavı okuyamaz, sayfa 404 döner. Ayrıca dürüstlük engeli (bkz.
// lib/yazili-erisim.ts): öğrencisinin takibini düzenli yapmayan öğretmen
// kayıtlı raporu da açamaz.
export default async function YaziliRaporSayfasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_DESENI.test(id)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const erisim = await yaziliErisimi(user.id);
  if (!erisim.izinli) {
    return (
      <main className="flex min-h-dvh w-full items-center justify-center bg-[#dee2e6] p-6 text-[#111]">
        <p className="max-w-lg rounded-2xl bg-white p-8 text-center text-base font-bold leading-relaxed shadow-lg" role="alert">
          {YAZILI_KILIT_MESAJI}
        </p>
      </main>
    );
  }

  const rapor = await yaziliRaporuGetir(id);
  if (!rapor) notFound();

  return <YaziliRaporu rapor={rapor} />;
}
