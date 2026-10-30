// Mezun Takip bölümünün sunucu tarafı (kullanıcı isteği 30.10.2026): yetkiyi
// çözer, ders yılı bittiyse 12. sınıfları mezun listesine aktarır, SMS
// modülünün kurumda kullanılabilir olup olmadığını bildirir.
import { createAdminClient } from "@/lib/supabase/admin";
import { mezunErisimi, mezunlariGetir, mezunOtomatikAktar } from "@/lib/mezun-veri";
import { smsKurumunuGetir } from "@/lib/sms-erisim";
import { smsAyarOzetiGetir } from "@/lib/sms-veri";
import { bugununTarihiTR } from "@/lib/tarih";
import { MezunTakip } from "@/components/dashboard/MezunTakip";
import { BG1, BORDER, TEXT_MUTED } from "@/lib/theme";

export async function MezunTakipBolumu({ userId }: { userId: string }) {
  const admin = createAdminClient();
  const erisim = await mezunErisimi(admin, userId);
  if (!erisim) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-sm">Mezun Takip modülünü lise öğrencisi olan okulların rehberlik servisi ve müdürü kullanır.</p>
      </div>
    );
  }
  // Zamanlanmış görev her gün de çalışır; sayfa açılışı yedektir (aynı kişi iki kez eklenmez).
  await mezunOtomatikAktar(admin, erisim.schoolId, bugununTarihiTR());
  const [mezunlar, kurum, ayar] = await Promise.all([
    mezunlariGetir(admin, erisim.schoolId),
    smsKurumunuGetir(admin, erisim.schoolId),
    smsAyarOzetiGetir(admin, erisim.schoolId),
  ]);
  const smsDurumu = !kurum?.modulAcik ? "kapali" : !ayar?.seciliBaslik ? "baglantisiz" : "hazir";
  return (
    <MezunTakip mezunlar={mezunlar} smsDurumu={smsDurumu} buYil={Number(bugununTarihiTR().slice(0, 4))} />
  );
}
