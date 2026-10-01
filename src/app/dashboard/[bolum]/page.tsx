import { notFound } from "next/navigation";
import DashboardPage from "@/app/dashboard/page";
import { DASHBOARD_ROUTE_BOLUMLERI } from "@/lib/dashboard-navigation";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";

export default async function DashboardBolumPage({ params, searchParams }: {
  params: Promise<{ bolum: string }>;
  // `konu`: Derslerim'deki bir konudan "Yardım İste"ye geçilirken taşınıyor.
  searchParams: Promise<{ sinif?: string; ogrenci?: string; ogretmen?: string; donem?: string; okul?: string; hafta?: string; ders?: string; konu?: string }>;
}) {
  const [{ bolum }, mevcutArama] = await Promise.all([params, searchParams]);
  if (!DASHBOARD_ROUTE_BOLUMLERI.has(bolum as DashboardBolumu)) notFound();

  return DashboardPage({
    searchParams: Promise.resolve({ ...mevcutArama, bolum }),
  });
}
