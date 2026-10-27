import { etkinSablonlar, type SablonAyari } from "@/lib/whatsapp-sablon-ayarlari";

// Adminin kendi genel kartı: kurum logolarını/ayarlarını değiştirmez.
// Üst çubukta kullanılan resmî yerel logo canvas'a aynı origin'den yüklenir.
export function adminWhatsappStudyoAyarlari(ayarlar: SablonAyari[]) {
  const sablonlar = etkinSablonlar(ayarlar);
  return {
    kurumAdi: "SeFu Koç",
    logoAdresi: "/logo.png",
    logoDegistirebilir: false,
    ogrenciler: [],
    genelDuyurular: true,
    // Logonun yanındaki hedef yazısını admin seçer (kullanıcı isteği 28.10.2026).
    hedefSecimi: true,
    // Şablonları kopyalayarak süzeriz. Admin kurumlar için Genel'i gizlese
    // bile kendi marka kartını hazırlayabilir; diğer stüdyolar etkilenmez.
    sablonlar: Object.fromEntries(Object.entries(sablonlar).map(([anahtar, s]) =>
      [anahtar, { ...s, gizli: anahtar !== "genel" }])),
  };
}
