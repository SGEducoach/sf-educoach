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
import { TEXT, TEXT_MUTED } from "@/lib/theme";

// ?okul=<schoolId>: admin'in /yonetici → "Moderatörler" listesinden bir
// okula tıklayıp o okulun moderatör panelini görüntülemesi için — sadece
// gerçekten admin rolündeki kullanıcı için işleme alınır (bkz.
// moderator/actions.ts requireModerator), aksi halde normal akış
// (kullanıcının kendi school_moderators satırı) çalışır.
//
// ?bolum=<...>: menüde seçili bölüm (kullanıcı isteği 03.10.2026, bkz.
// ModeratorNavigasyonu). Bilinmeyen değer "Öğrenciler"e düşer; deneme
// bölümleri yalnızca dershanede açılır.
export default async function ModeratorPage({ searchParams }: { searchParams: Promise<{ okul?: string; bolum?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profil } = await supabase.from("profiles").select("ad, role").eq("id", user.id).single();
  if (!profil) redirect("/dashboard");

  const params = await searchParams;
  const adminGoruntuluyor = profil.role === "admin" && !!params.okul;

  if (!adminGoruntuluyor) {
    const { data: yetki } = await supabase.from("school_moderators").select("school_id").eq("profile_id", user.id).maybeSingle();
    if (!yetki) redirect("/dashboard");
  }

  const veri = await moderatorKullanicilariGetir(adminGoruntuluyor ? params.okul : undefined);
  const dershane = veri.kurumTuru === "dershane";
  const bolum = moderatorBolumuCoz(params.bolum, dershane);
  const adminOkulId = adminGoruntuluyor ? params.okul : undefined;

  return (
    <div className="flex min-h-screen flex-col">
      <Header ad={profil.ad} role={profil.role as UserRole} moderatorMu={!adminGoruntuluyor} rolEtiketi={adminGoruntuluyor ? undefined : "Moderatör"} mobilNavigasyon={false}
        geriDonusHref={adminGoruntuluyor ? "/yonetici/moderatorler" : "/dashboard"}
        geriDonusEtiketi={adminGoruntuluyor ? "Yönetim paneline dön" : "Ana sayfaya dön"}
      />
      <main id="ana-icerik" className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-5 px-4 py-7 pb-24 sm:px-6">
        <ModeratorNavigasyonu aktif={bolum} dershane={dershane} adminOkulId={adminOkulId} />

        {(bolum === "ogrenciler" || bolum === "ogretmenler" || bolum === "siniflar" || bolum === "kurum") && (
          <ModeratorPanel {...veri} bolum={bolum} schoolId={adminOkulId} />
        )}

        {/* Kurum moderatörü KENDİ kurumunun panosunu yönetir (kullanıcı kararı
            02.10.2026, migration 0134). `okullar` geçilmiyor: kurum sunucuda
            moderatörün kendi kaydından okunuyor, istemciden gelmiyor.
            Admin başka bir kurumu görüntülerken bu kart gizli — admin bütün
            panoları /yonetici > İçerik altından yönetiyor. */}
        {bolum === "kurum" && !adminGoruntuluyor && <section className="sfec-section"><TgDenemeYonetimi /></section>}

        {bolum === "deneme-yukle" && (
          <section className="flex flex-col gap-3">
            <div>
              <h1 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Deneme sonucu yükle</h1>
              <p className="text-xs" style={{ color: TEXT_MUTED }}>PDF ya da Excel ile toplu deneme sonucu yükleyin. Adı eşleşmeyen satırlar “PDF eşleştirme” bölümüne düşer.</p>
            </div>
            <DershaneDenemePdfFormu schoolId={adminOkulId} />
          </section>
        )}

        {bolum === "pdf-eslesme" && <PdfEslesmeYonetimi kurumId={adminOkulId} />}
      </main>
    </div>
  );
}
