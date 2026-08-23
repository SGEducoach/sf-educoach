import { notFound } from "next/navigation";
import YoneticiPage from "@/app/yonetici/page";
import { YONETICI_ROUTE_BOLUMLERI } from "@/lib/dashboard-navigation";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";

// dashboard/[bolum]/page.tsx ile birebir aynı desen — gerçek bir path
// (örn. /yonetici/kullanicilar) sol menüde "aktif" durumunu doğru
// gösterebilsin ve tarayıcı geçmişinde/yer imlerinde anlamlı bir URL
// olsun diye, ama render'ı hâlâ tek YoneticiPage bileşeni (bkz. o dosya)
// searchParams.bolum üzerinden yapıyor.
export default async function YoneticiBolumPage({ params, searchParams }: {
  params: Promise<{ bolum: string }>;
  searchParams: Promise<{ okul?: string }>;
}) {
  const [{ bolum }, mevcutArama] = await Promise.all([params, searchParams]);
  if (!YONETICI_ROUTE_BOLUMLERI.has(bolum as DashboardBolumu)) notFound();

  return YoneticiPage({
    searchParams: Promise.resolve({ ...mevcutArama, bolum }),
  });
}
