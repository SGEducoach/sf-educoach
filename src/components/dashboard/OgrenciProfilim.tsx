import { createClient } from "@/lib/supabase/server";
import { SifreDegistir } from "@/components/SifreDegistir";
import { AYT_ALAN_ETIKET } from "@/lib/types";
import type { AytAlan } from "@/lib/types";
import { alanSorulurMu, hedefEtiketi } from "@/lib/kademe";
import type { Kademe } from "@/lib/kademe";
import { BG1, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";

// Kullanıcı isteği (03.09.2026): "Öğrenci panelinde profilimi düzenle kısmı
// gelecek. Sadece şifre değiştirebilecek. Numarasına vs dokunamaz."
// Bu yüzden ekranda TEK yazılabilir alan şifredir (paylaşılan SifreDegistir
// bileşeni — supabase.auth.updateUser'ı doğrudan tarayıcıdan çağırır).
// Kimlik bilgileri yalnızca gösteriliyor; bunları değiştirmek okul
// yönetiminin/adminin işi (bkz. yonetici KullaniciDetayYonetimi, moderatör).
//
// Ortaokul (kullanıcı kararı 01.10.2026): YKS "alan" satırı HİÇ gösterilmez
// — o seçim 11. sınıfta yapılıyor, 5. sınıf öğrencisinin ekranında yeri yok.
// "Hedef bölüm" de "Hedef meslek" olur.
export async function OgrenciProfilim({ userId, ad, kademe }: { userId: string; ad: string; kademe?: Kademe | null }) {
  const supabase = await createClient();
  const { data: ogrenci } = await supabase
    .from("students")
    .select("okul_no, ayt_alan, hedef_bolum, classes(seviye, sube), schools(ad, tur)")
    .eq("id", userId)
    .maybeSingle();

  const sinif = ogrenci?.classes as unknown as { seviye: string; sube: string } | null;
  const okul = ogrenci?.schools as unknown as { ad: string; tur: string } | null;
  const dershaneMi = okul?.tur === "dershane";
  const alanVar = alanSorulurMu(kademe);

  const satirlar: { etiket: string; deger: string }[] = [
    { etiket: "Ad Soyad", deger: ad },
    { etiket: dershaneMi ? "Kullanıcı adı" : "Okul numarası", deger: ogrenci?.okul_no ?? "—" },
    { etiket: dershaneMi ? "Dershane" : "Okul", deger: okul?.ad ?? "—" },
    { etiket: "Sınıf", deger: sinif ? `${sinif.seviye}-${sinif.sube}` : "—" },
    ...(alanVar
      ? [{ etiket: "Alan", deger: ogrenci?.ayt_alan ? AYT_ALAN_ETIKET[ogrenci.ayt_alan as AytAlan] : "—" }]
      : []),
    { etiket: hedefEtiketi(kademe), deger: ogrenci?.hedef_bolum?.trim() ? ogrenci.hedef_bolum : "—" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h1 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Profilim</h1>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
          {alanVar
            ? "Buradan yalnızca şifrenizi değiştirebilirsiniz. Ad, numara, sınıf ve alan bilgilerinizde bir yanlışlık varsa okul/dershane yöneticinize başvurun."
            : "Buradan yalnızca şifreni değiştirebilirsin. Adında, numaranda veya sınıfında bir yanlışlık varsa öğretmenine söyle."}
        </p>

        <dl className="sfec-liste mt-4">
          {satirlar.map(({ etiket, deger }) => (
            <div key={etiket} className="sfec-liste-satiri px-2 py-3">
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
