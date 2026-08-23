import { moderatorKendiBilgileriniGetir, moderatorKendiBilgileriniGuncelle } from "@/app/moderator/actions";
import { KisiselBilgilerFormu } from "@/components/KisiselBilgilerFormu";
import { SifreDegistir } from "@/components/SifreDegistir";
import { BG1, BORDER, TEXT_MUTED } from "@/lib/theme";

// Moderatör kendi hesabını buradan yönetir — kendi öğretmen/öğrenci
// listesinde artık kendi satırı hiç görünmüyor (bkz. moderator/actions.ts
// moderatorKullanicilariGetir), yani "kendini pasifleştirme/silme" hiç
// mümkün değil; kişisel bilgi ve şifre değişikliği tek yer burası.
export async function ModeratorProfilim() {
  const { ad, email, telefon } = await moderatorKendiBilgileriniGetir();

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
          Kendi hesabınız artık öğretmen/öğrenci listesinde görünmüyor — pasifleştirme veya silme buradan yapılamaz. Kişisel bilgilerinizi ve şifrenizi buradan güncelleyebilirsiniz.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <KisiselBilgilerFormu baslangic={{ ad, email, telefon }} guncelle={moderatorKendiBilgileriniGuncelle} />
        <SifreDegistir />
      </div>
    </div>
  );
}
