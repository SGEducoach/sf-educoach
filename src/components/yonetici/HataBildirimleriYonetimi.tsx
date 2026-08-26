import { hataBildirimleriGetir } from "@/app/yonetici/actions";
import { HataBildirimListesi } from "@/components/yonetici/HataBildirimListesi";
import { BG1, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";

// Faz G (2026-08-25) — tüm rollerden gelen "hata bildir" kayıtları.
// 2026-08-26 kullanıcı isteği: çözülen bildirimler artık işaretlenmiyor,
// doğrudan siliniyor (bkz. hataBildirimiCozulduIsaretle) — bu yüzden
// gelen liste zaten sadece "bekliyor" durumundaki kayıtları içeriyor,
// ayrı bir "Çözülenler" bölümüne gerek kalmadı.
export async function HataBildirimleriYonetimi() {
  const { bildirimler } = await hataBildirimleriGetir();
  const adminNotlari = bildirimler.filter((b) => b.bildirenRol === "admin");
  const kullaniciBildirimleri = bildirimler.filter((b) => b.bildirenRol !== "admin");

  return (
    <div className="flex flex-col gap-5">
      {adminNotlari.length > 0 && (
        <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold mb-1">Claude ile çözülecek notlar</h2>
          <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
            Kendi bildirdiğiniz kayıtlar — panelden değil, Claude Code oturumunda kod değişikliğiyle çözülür.
          </p>
          <HataBildirimListesi bildirimler={adminNotlari} />
        </div>
      )}

      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold mb-1">Bekleyen hata bildirimleri</h2>
        <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">Öğrenci, veli, öğretmen ve müdürlerden gelen bildirimler.</p>
        {kullaniciBildirimleri.length === 0
          ? <p style={{ color: TEXT_MUTED }} className="text-sm">Bekleyen bildirim yok.</p>
          : <HataBildirimListesi bildirimler={kullaniciBildirimleri} />}
      </div>
    </div>
  );
}
