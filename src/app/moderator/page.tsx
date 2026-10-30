import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { ModeratorPanel } from "@/components/moderator/ModeratorPanel";
import { ModeratorNavigasyonu, moderatorBolumuCoz } from "@/components/moderator/ModeratorNavigasyonu";
import { moderatorKullanicilariGetir } from "@/app/moderator/actions";
import type { UserRole } from "@/lib/types";
import { TgDenemeYonetimi } from "@/components/yonetici/TgDenemeYonetimi";
import { DershaneDenemePdfFormu } from "@/components/dashboard/DershaneDenemePdfFormu";
import { PdfEslesmeYonetimi } from "@/components/yonetici/PdfEslesmeYonetimi";
import { KayitsizOgrencilerKarti } from "@/components/yonetici/KayitsizOgrencilerKarti";
import { TEXT, TEXT_MUTED } from "@/lib/theme";
import { createAdminClient } from "@/lib/supabase/admin";
import { smsAyarOzetiGetir } from "@/lib/sms-veri";
import { SmsAyarlari } from "@/components/dashboard/SmsAyarlari";
import { kullaniciKurumuGetir } from "@/lib/deneme-suresi";
import { kurumErisimiKapaliMi, kurumModuluAcikMi, moderatorBolumuAcikMi, type KurumModulYetkileri } from "@/lib/kurum-yetkileri";

// ?okul=<schoolId>: admin'in /yonetici → "Moderatörler" listesinden bir
// okula tıklayıp o okulun moderatör panelini görüntülemesi için — sadece
// gerçekten admin rolündeki kullanıcı için işleme alınır (bkz.
// moderator/actions.ts requireModerator), aksi halde normal akış
// (kullanıcının kendi school_moderators satırı) çalışır.
//
// ?bolum=<...>: menüde seçili bölüm (kullanıcı isteği 03.10.2026, bkz.
// ModeratorNavigasyonu). Bilinmeyen değer "Öğrenciler"e düşer; deneme
// bölümleri yalnızca dershanede açılır.
export default async function ModeratorPage({ searchParams }: { searchParams: Promise<{ okul?: string; bolum?: string; deneme?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profil } = await supabase.from("profiles").select("ad, role").eq("id", user.id).single();
  if (!profil) redirect("/dashboard");

  const params = await searchParams;
  const adminGoruntuluyor = profil.role === "admin" && !!params.okul;
  let moderatorOkulId = adminGoruntuluyor ? params.okul : undefined;

  if (!adminGoruntuluyor) {
    if (kurumErisimiKapaliMi(await kullaniciKurumuGetir(supabase, user.id, profil.role as UserRole))) redirect("/dashboard");
    const { data: yetki } = await supabase.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle();
    if (!yetki) redirect("/dashboard");
    moderatorOkulId = yetki.school_id;
  }

  const veri = await moderatorKullanicilariGetir(adminGoruntuluyor ? params.okul : undefined);
  const { data: kurumAyarlari } = await supabase.from("schools")
    .select("modul_yetkileri").eq("id", moderatorOkulId!).maybeSingle();
  const modulYetkileri = (kurumAyarlari?.modul_yetkileri as KurumModulYetkileri | null) ?? {};
  // Deneme yükleme ve eşleştirme dershane ve okul moderatöründe (okul 16.10.2026).
  const denemeAcik = (veri.kurumTuru === "dershane" || veri.kurumTuru === "okul") && kurumModuluAcikMi(modulYetkileri, "denemeler");
  const smsAcik = kurumModuluAcikMi(modulYetkileri, "sms");
  const bolum = moderatorBolumuCoz(params.bolum, denemeAcik, smsAcik);
  if (!moderatorBolumuAcikMi(modulYetkileri, bolum)) redirect("/moderator/profil");
  const adminOkulId = adminGoruntuluyor ? params.okul : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <Header ad={profil.ad} role={profil.role as UserRole} moderatorMu={!adminGoruntuluyor} rolEtiketi={adminGoruntuluyor ? undefined : "Moderatör"} mobilNavigasyon={false}
        geriDonusHref={adminGoruntuluyor ? "/yonetici/moderatorler" : "/dashboard"}
        geriDonusEtiketi={adminGoruntuluyor ? "Yönetim paneline dön" : "Ana sayfaya dön"}
      />
      <main id="ana-icerik" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-7 pb-24 sm:px-6">
        <ModeratorNavigasyonu aktif={bolum} denemeAcik={denemeAcik} adminOkulId={adminOkulId} modulYetkileri={modulYetkileri} />

        {(bolum === "ogrenciler" || bolum === "ogretmenler" || bolum === "siniflar" || bolum === "kurum") && (
          <ModeratorPanel {...veri} bolum={bolum} schoolId={adminOkulId} />
        )}

        {bolum === "ogrenciler" && <KayitsizOgrencilerKarti kurumId={adminOkulId} />}

        {/* SMS bağlantısı (kullanıcı kararı 28.10.2026): kurum kendi sağlayıcısını
            seçip hesap bilgilerini girer; modülü admin Kurum Yetkileri'nden açar. */}
        {bolum === "sms" && (
          <section className="flex flex-col gap-3">
            <div>
              <h1 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>SMS Ayarları</h1>
              <p className="text-xs" style={{ color: TEXT_MUTED }}>Müdür, müdür yardımcısı ve rehber öğretmen bu bağlantıyla velilere SMS gönderir.</p>
            </div>
            <SmsAyarlari ozet={await smsAyarOzetiGetir(createAdminClient(), moderatorOkulId!)} okulId={adminOkulId} />
          </section>
        )}

        {/* Kurum moderatörü KENDİ kurumunun panosunu yönetir (kullanıcı kararı
            02.10.2026, migration 0134). `okullar` geçilmiyor: kurum sunucuda
            moderatörün kendi kaydından okunuyor, istemciden gelmiyor.
            Admin başka bir kurumu görüntülerken bu kart gizli — admin bütün
            panoları /yonetici > İçerik altından yönetiyor. */}
        {bolum === "kurum" && !adminGoruntuluyor && kurumModuluAcikMi(modulYetkileri, "pano") && <section className="sfec-section"><TgDenemeYonetimi /></section>}

        {bolum === "deneme-yukle" && (
          <section className="flex flex-col gap-3">
            <div>
              <h1 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Deneme Sonucu Yükle</h1>
              <p className="text-xs" style={{ color: TEXT_MUTED }}>PDF ya da Excel ile toplu deneme sonucu yükleyin. Adı eşleşmeyen satırlar “PDF eşleştirme” bölümüne düşer.</p>
            </div>
            <DershaneDenemePdfFormu schoolId={adminOkulId} kademe={veri.kademe} />
          </section>
        )}

        {bolum === "pdf-eslesme" && <PdfEslesmeYonetimi kurumId={adminOkulId} denemeAnahtari={params.deneme} />}
      </main>
    </div>
  );
}
