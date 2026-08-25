import { hataBildirimleriGetir } from "@/app/yonetici/actions";
import { HataBildirimListesi } from "@/components/yonetici/HataBildirimListesi";
import { BG1, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";

// Faz G (2026-08-25) — tüm rollerden gelen "hata bildir" kayıtları.
export async function HataBildirimleriYonetimi() {
  const { bildirimler } = await hataBildirimleriGetir();
  const bekleyenler = bildirimler.filter((b) => b.durum === "bekliyor");
  const adminNotlari = bekleyenler.filter((b) => b.bildirenRol === "admin");
  const kullaniciBildirimleri = bekleyenler.filter((b) => b.bildirenRol !== "admin");
  const cozulmusler = bildirimler.filter((b) => b.durum === "cozuldu");

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

      {cozulmusler.length > 0 && (
        <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold mb-4">Çözülenler (son {cozulmusler.length})</h2>
          <HataBildirimListesi bildirimler={cozulmusler} salt />
        </div>
      )}
    </div>
  );
}
