import { SEFU_MAVI, SEFU_KIRMIZI, SEFU_KIRMIZI_VURGU } from "@/lib/theme";

// Marka adı — ÖSYM mavisi (kullanıcı kararı). `as` ile h1/span arasında
// seçim yapılabiliyor — bazı sayfalarda bu isim sayfanın tek H1'i (login/
// signup), Header'da ise sadece bir div/span içeriği.
export function SeFuMarkaAdi({ className, as: Etiket = "span" }: { className?: string; as?: "span" | "h1" }) {
  return <Etiket style={{ color: SEFU_MAVI, fontFamily: "var(--font-baloo)" }} className={className}>SeFu Koç</Etiket>;
}

// Slogan — ÖSYM kırmızısı; her kelimenin baş harfi (S/G/F/D) biraz büyük
// ve daha vurgulu bir kırmızı ile öne çıkarılıyor.
export function SeFuSlogan({ className }: { className?: string }) {
  const vurgu = { color: SEFU_KIRMIZI_VURGU, fontWeight: 800, fontSize: "1.2em" };
  const normal = { color: SEFU_KIRMIZI };
  return (
    <span className={className}>
      <span style={vurgu}>S</span>
      <span style={normal}>en </span>
      <span style={vurgu}>G</span>
      <span style={normal}>eliş, </span>
      <span style={vurgu}>F</span>
      <span style={normal}>arkın </span>
      <span style={vurgu}>D</span>
      <span style={normal}>uyulur</span>
    </span>
  );
}
