import { SiteBakimdaEkrani } from "@/components/SiteBakimdaEkrani";

// proxy.ts (bkz. src/lib/supabase/middleware.ts) site_kapali=true iken
// admin olmayan /dashboard ve /moderator isteklerini buraya rewrite eder —
// URL çubuğu değişmez, sadece render edilen içerik değişir.
export default function SiteBakimdaPage() {
  return <SiteBakimdaEkrani />;
}
