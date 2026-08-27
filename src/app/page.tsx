import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AnaSayfa } from "@/components/AnaSayfa";
import { anaSayfaAyarlariniGetir, anaSayfaSliderGorselleriGetir } from "@/lib/ana-sayfa";

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

  const [ayarlar, sliderGorselleri] = await Promise.all([
    anaSayfaAyarlariniGetir(supabase),
    anaSayfaSliderGorselleriGetir(supabase),
  ]);

  return (
    <AnaSayfa
      baslik={ayarlar.baslik}
      govde={ayarlar.govde}
      sliderGecisSaniye={ayarlar.sliderGecisSaniye}
      sliderGorselleri={sliderGorselleri}
    />
  );
}
