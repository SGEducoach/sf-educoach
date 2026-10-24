import { hataBildirimleriGetir } from "@/app/yonetici/actions";
import { HataBildirimListesi } from "@/components/yonetici/HataBildirimListesi";
import { BG1, BLUSH, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";
import { mufredatBasvurusunuOku } from "@/lib/mufredat-basvurusu";

// Faz G (2026-08-25) — tüm rollerden gelen "hata bildir" kayıtları.
// 2026-08-26 kullanıcı isteği: çözülen bildirimler artık işaretlenmiyor,
// doğrudan siliniyor (bkz. hataBildirimiCozulduIsaretle) — bu yüzden
// gelen liste zaten sadece "bekliyor" durumundaki kayıtları içeriyor,
// ayrı bir "Çözülenler" bölümüne gerek kalmadı.
export async function HataBildirimleriYonetimi() {
  const { bildirimler, error } = await hataBildirimleriGetir();
  const adminNotlari = bildirimler.filter((b) => b.bildirenRol === "admin");
  const mufredatBasvurusuMu = (b: (typeof bildirimler)[number]) => b.bildirenRol === "ogretmen" && mufredatBasvurusunuOku(b.mesaj) !== null;
  const mufredatBasvurulari = bildirimler.filter(mufredatBasvurusuMu);
  const kullaniciBildirimleri = bildirimler.filter((b) => b.bildirenRol !== "admin" && !mufredatBasvurusuMu(b));

  return (
    <div className="flex flex-col gap-5">
      {error && <p role="alert" className="rounded-xl px-4 py-3 text-sm" style={{ background: BG1, color: BLUSH }}>Hata bildirimleri yüklenemedi: {error}</p>}
      <section className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="mb-1 text-base font-bold">Müfredat Değişiklik Başvuruları ({mufredatBasvurulari.length})</h2>
        <p style={{ color: TEXT_MUTED }} className="mb-4 text-xs">Öğretmenin önce tespiti, sonra önerisi. “Düzeltme istemini kopyala” ile başvuruyu geliştirme oturumuna aktarabilirsiniz. Kopyalama veya yanıt verme müfredatı değiştirmez.</p>
        {mufredatBasvurulari.length ? <HataBildirimListesi bildirimler={mufredatBasvurulari} /> : <p className="text-sm" style={{ color: TEXT_MUTED }}>Bekleyen müfredat başvurusu yok.</p>}
      </section>
      {adminNotlari.length > 0 && (
        <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold mb-1">Claude ile Çözülecek Notlar</h2>
          <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
            Kendi bildirdiğiniz kayıtlar — panelden değil, Claude Code oturumunda kod değişikliğiyle çözülür.
          </p>
          <HataBildirimListesi bildirimler={adminNotlari} />
        </div>
      )}

      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold mb-1">Bekleyen Hata Bildirimleri</h2>
        <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">Öğrenci, veli, öğretmen ve müdürlerden gelen bildirimler.</p>
        {kullaniciBildirimleri.length === 0
          ? <p style={{ color: TEXT_MUTED }} className="text-sm">Bekleyen bildirim yok.</p>
          : <HataBildirimListesi bildirimler={kullaniciBildirimleri} />}
      </div>
    </div>
  );
}
