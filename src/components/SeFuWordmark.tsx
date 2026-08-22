import { SEFU_MAVI, SEFU_KIRMIZI, SEFU_KIRMIZI_KOYU } from "@/lib/theme";

// Marka adı — ÖSYM mavisi (kullanıcı kararı). `as` ile h1/span arasında
// seçim yapılabiliyor — bazı sayfalarda bu isim sayfanın tek H1'i (login/
// signup), Header'da ise sadece bir div/span içeriği.
export function SeFuMarkaAdi({ className, as: Etiket = "span" }: { className?: string; as?: "span" | "h1" }) {
  return <Etiket style={{ color: SEFU_MAVI, fontFamily: "var(--font-baloo)" }} className={className}>SeFu Koç</Etiket>;
}

// Slogan — ÖSYM kırmızısı; "SeFu" ile eşleşen baş harfler (Sen'in S'i,
// Farkın'ın F'i) biraz büyük ve daha koyu bir kırmızı ile vurgulanıyor.
export function SeFuSlogan({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span style={{ color: SEFU_KIRMIZI_KOYU, fontWeight: 800, fontSize: "1.2em" }}>S</span>
      <span style={{ color: SEFU_KIRMIZI }}>en Geliş, </span>
      <span style={{ color: SEFU_KIRMIZI_KOYU, fontWeight: 800, fontSize: "1.2em" }}>F</span>
      <span style={{ color: SEFU_KIRMIZI }}>arkın Duyulur</span>
    </span>
  );
}
