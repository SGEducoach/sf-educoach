import { adminKendiBilgileriniGetir, adminKendiBilgileriniGuncelle } from "@/app/yonetici/profil-actions";
import { KisiselBilgilerFormu } from "@/components/KisiselBilgilerFormu";
import { SifreDegistir } from "@/components/SifreDegistir";
import { BG1, BORDER, TEXT_MUTED } from "@/lib/theme";

// Admin kendi hesabını buradan yönetir. Admin hesapları hiçbir yerden
// (Kullanıcı ara, kullanıcı detay sayfası) bulunup pasifleştirilemez/
// silinemez — bu bilerek böyle, admin'in kendini (ya da başka bir
// admin'i) kilitleyip sistemin dışında bırakması engelleniyor. Kendi
// bilgilerini düzenlemek ve şifresini değiştirmek isterse tek yer burası.
export async function AdminProfilim() {
  const { ad, email, telefon } = await adminKendiBilgileriniGetir();

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
          Yönetici hesapları başka hiçbir ekrandan (Kullanıcılar araması, kullanıcı detay sayfası) pasifleştirilemez veya silinemez — kendi bilgilerinizi ve şifrenizi yalnızca buradan değiştirebilirsiniz.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <KisiselBilgilerFormu baslangic={{ ad, email, telefon }} guncelle={adminKendiBilgileriniGuncelle} />
        <SifreDegistir />
      </div>
    </div>
  );
}
