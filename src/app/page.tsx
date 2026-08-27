import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GirisKarsilamaSayfasi } from "@/components/GirisKarsilamaSayfasi";

// Kullanıcı isteği (27.08.2026): "anasayfa bir önceki yapıyı tekrar
// getir" — kısa süre önce denenen admin-yönetimli kurumsal Ana Sayfa
// (AnaSayfa.tsx, slider+tanıtım metni) geri alındı, eski vitrin ekranına
// dönüldü. AnaSayfa.tsx, ana_sayfa_ayarlari/ana_sayfa_slider_gorselleri
// tabloları ve admin panelindeki "Ana Sayfa Ayarları" bölümü BİLİNÇLİ
// OLARAK silinmedi — ileride tekrar gerekirse kod ve veri duruyor, sadece
// bu sayfa onu kullanmıyor.
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");
  return <GirisKarsilamaSayfasi />;
}
