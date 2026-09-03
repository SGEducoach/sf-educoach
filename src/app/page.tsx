import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnaSayfa } from "@/components/AnaSayfa";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { anaSayfaAyarlariniGetir, anaSayfaSliderGorselleriGetir } from "@/lib/ana-sayfa";
import { tgDenemeIlanlariGetir } from "@/lib/tg-deneme-ilanlari";
import { anaSayfaDuyurulariniGetir } from "@/lib/ana-sayfa-duyurulari";

// Kullanıcı isteği (27.08.2026): "/" artık admin panelinden (Site Ayarları
// → Ana Sayfa Ayarları) yönetilen kurumsal bir tanıtım sayfası — header +
// slider + tanıtım metni. Önceki vitrin ekranı (GirisKarsilamaSayfasi,
// rol bazlı fotoğraf akışı) bilinçli olarak bunun yerine geçti; oturumu
// olan kullanıcı hâlâ doğrudan panele düşüyor, davranış onlar için
// değişmedi. Bakım modu artık "/" için de geçerli (bkz. middleware.ts).
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const [ayarlar, sliderGorselleri, tgIlanlar, duyurular] = await Promise.all([
    anaSayfaAyarlariniGetir(supabase),
    anaSayfaSliderGorselleriGetir(supabase),
    tgDenemeIlanlariGetir(supabase),
    anaSayfaDuyurulariniGetir(supabase),
  ]);

  return (
    <>
      <AnaSayfa
        baslik={ayarlar.baslik}
        govde={ayarlar.govde}
        sliderGecisSaniye={ayarlar.sliderGecisSaniye}
        sliderGorselleri={sliderGorselleri}
        tgIlanlar={tgIlanlar}
        duyurular={duyurular}
      />
      {/* Ölçüm etiketi yalnızca herkese açık sayfalarda — bkz. GoogleAnalytics */}
      <GoogleAnalytics />
    </>
  );
}
