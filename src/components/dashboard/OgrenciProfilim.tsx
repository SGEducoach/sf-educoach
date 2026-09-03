import { createClient } from "@/lib/supabase/server";
import { SifreDegistir } from "@/components/SifreDegistir";
import { AYT_ALAN_ETIKET } from "@/lib/types";
import type { AytAlan } from "@/lib/types";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Kullanıcı isteği (03.09.2026): "Öğrenci panelinde profilimi düzenle kısmı
// gelecek. Sadece şifre değiştirebilecek. Numarasına vs dokunamaz."
// Bu yüzden ekranda TEK yazılabilir alan şifredir (paylaşılan SifreDegistir
// bileşeni — supabase.auth.updateUser'ı doğrudan tarayıcıdan çağırır).
// Kimlik bilgileri (ad, okul no, sınıf, kurum, AYT alanı) yalnızca
// gösteriliyor; bunları değiştirmek okul yönetiminin/adminin işi
// (bkz. yonetici KullaniciDetayYonetimi, moderator paneli).
export async function OgrenciProfilim({ userId, ad }: { userId: string; ad: string }) {
  const supabase = await createClient();
  const { data: ogrenci } = await supabase
    .from("students")
    .select("okul_no, ayt_alan, hedef_bolum, classes(seviye, sube), schools(ad, tur)")
    .eq("id", userId)
    .maybeSingle();

  const sinif = ogrenci?.classes as unknown as { seviye: string; sube: string } | null;
  const okul = ogrenci?.schools as unknown as { ad: string; tur: string } | null;
  const dershaneMi = okul?.tur === "dershane";

  const satirlar: { etiket: string; deger: string }[] = [
    { etiket: "Ad Soyad", deger: ad },
    { etiket: dershaneMi ? "Kullanıcı adı" : "Okul numarası", deger: ogrenci?.okul_no ?? "—" },
    { etiket: dershaneMi ? "Dershane" : "Okul", deger: okul?.ad ?? "—" },
    { etiket: "Sınıf", deger: sinif ? `${sinif.seviye}-${sinif.sube}` : "—" },
    { etiket: "Alan", deger: ogrenci?.ayt_alan ? AYT_ALAN_ETIKET[ogrenci.ayt_alan as AytAlan] : "—" },
    { etiket: "Hedef bölüm", deger: ogrenci?.hedef_bolum?.trim() ? ogrenci.hedef_bolum : "—" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h1 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Profilim</h1>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
          Buradan yalnızca şifrenizi değiştirebilirsiniz. Ad, numara, sınıf ve alan bilgilerinizde bir yanlışlık
          varsa okul/dershane yöneticinize başvurun.
        </p>

        <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {satirlar.map(({ etiket, deger }) => (
            <div key={etiket} className="rounded-2xl px-3.5 py-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
              <dt className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{etiket}</dt>
              <dd className="mt-0.5 text-sm font-semibold" style={{ color: TEXT }}>{deger}</dd>
            </div>
          ))}
        </dl>
      </div>

      <SifreDegistir />
    </div>
  );
}
