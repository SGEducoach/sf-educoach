// SMS bölümünün sunucu tarafı (kullanıcı kararı 28.10.2026): yetkiyi ve veriyi
// veritabanından çözer, ekranı çizen SmsModulu'ne yalnız güvenli alanları verir.
import { createAdminClient } from "@/lib/supabase/admin";
import { SMS_ROL_ETIKETI, smsKullaniciErisimi, smsKurumunuGetir, smsYonetimErisimi } from "@/lib/sms-erisim";
import { smsSaglayiciBilgisi } from "@/lib/sms-saglayici-bilgi";
import { smsAyarOzetiGetir, smsGecmisiGetir, smsSablonlariGetir, smsSiniflariGetir } from "@/lib/sms-veri";
import { SmsModulu } from "@/components/dashboard/SmsModulu";
import { BG1, BORDER, TEXT_MUTED } from "@/lib/theme";

function Kutu({ metin }: { metin: string }) {
  return (
    <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <p style={{ color: TEXT_MUTED }} className="text-sm">{metin}</p>
    </div>
  );
}

export async function SmsBolumu({ userId }: { userId: string }) {
  const admin = createAdminClient();
  const erisim = await smsKullaniciErisimi(admin, userId);
  if (!erisim) return <Kutu metin="SMS modülü müdür, müdür yardımcısı ve rehber öğretmen içindir." />;
  const kurum = await smsKurumunuGetir(admin, erisim.schoolId);
  if (!kurum?.modulAcik) return <Kutu metin="SMS modülü kurumunuz için kapalı. Açılması için kurum yetkilinizle görüşün." />;

  const kapsamYok = erisim.sinifDuzeyleri !== null && erisim.sinifDuzeyleri.length === 0;
  const [yonetim, ayar, siniflar, sablonlar, gecmis] = await Promise.all([
    smsYonetimErisimi(admin, userId),
    smsAyarOzetiGetir(admin, erisim.schoolId),
    kapsamYok ? Promise.resolve([]) : smsSiniflariGetir(admin, erisim.schoolId, erisim.sinifDuzeyleri),
    smsSablonlariGetir(admin, erisim.schoolId),
    smsGecmisiGetir(admin, erisim.schoolId, 50, erisim.rol === "mudur" ? undefined : userId),
  ]);

  return (
    <SmsModulu ayar={ayar} siniflar={siniflar} sablonlar={sablonlar} gecmis={gecmis}
      rolEtiketi={SMS_ROL_ETIKETI[erisim.rol]} kapsamYok={kapsamYok}
      ayarYapabilir={yonetim !== null}
      zamanlama={smsSaglayiciBilgisi(ayar?.saglayici)?.zamanlama === true} />
  );
}
