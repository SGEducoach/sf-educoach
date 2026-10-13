import { createClient } from "@/lib/supabase/server";
import { SifreDegistir } from "@/components/SifreDegistir";
import { HesapBaglama } from "@/components/dashboard/HesapBaglama";
import { OgrenciHedefDuzenleyici } from "@/components/dashboard/OgrenciHedefDuzenleyici";
import { AYT_ALAN_ETIKET } from "@/lib/types";
import type { AytAlan } from "@/lib/types";
import { alanSorulurMu, hedefEtiketi } from "@/lib/kademe";
import type { Kademe } from "@/lib/kademe";
import { BG1, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";

// Kimlik bilgileri salt-okunur; öğrenci yalnız hedefini ve şifresini değiştirir.
//
// Ortaokul (kullanıcı kararı 01.10.2026): YKS "alan" satırı HİÇ gösterilmez
// — o seçim 11. sınıfta yapılıyor, 5. sınıf öğrencisinin ekranında yeri yok.
// "Hedef bölüm" de "Hedef meslek" olur.
export async function OgrenciProfilim({ userId, ad, kademe }: { userId: string; ad: string; kademe?: Kademe | null }) {
  const supabase = await createClient();
  const [{ data: ogrenci }, { data: baglantiHam }] = await Promise.all([
    supabase
      .from("students")
      .select("okul_no, ayt_alan, hedef_bolum, classes(seviye, sube), schools(ad, tur)")
      .eq("id", userId)
      .maybeSingle(),
    // Diğer kurumdaki hesapla bağlantı (migration 0136).
    supabase.rpc("hesap_baglantim"),
  ]);
  const baglantiSatiri = (Array.isArray(baglantiHam) ? baglantiHam[0] : baglantiHam) as {
    es_kurum: string | null; es_kurum_turu: string | null; baglanti_tarihi: string | null;
    bekleyen_kod: string | null; kod_son_gecerlilik: string | null;
  } | null | undefined;

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
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h1 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Profilim</h1>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
          {alanVar
            ? "Hedefinizi ve şifrenizi değiştirebilirsiniz. Ad, numara, sınıf veya alan bilgilerinizde yanlışlık varsa yöneticinize başvurun."
            : "Hedefini ve şifreni değiştirebilirsin. Adında, numaranda veya sınıfında yanlışlık varsa öğretmenine söyle."}
        </p>

        <dl className="sfec-liste mt-4">
          {satirlar.map(({ etiket, deger }) => (
            <div key={etiket} className="sfec-liste-satiri px-2 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{etiket}</dt>
              <dd className="mt-0.5 text-sm font-semibold" style={{ color: TEXT }}>{deger}</dd>
            </div>
          ))}
        </dl>
        <OgrenciHedefDuzenleyici ilkHedef={ogrenci?.hedef_bolum ?? ""} etiket={hedefEtiketi(kademe)} />
      </div>

      <HesapBaglama baglanti={{
        esKurum: baglantiSatiri?.es_kurum ?? null,
        esKurumTuru: baglantiSatiri?.es_kurum_turu ?? null,
        baglantiTarihi: baglantiSatiri?.baglanti_tarihi ?? null,
        bekleyenKod: baglantiSatiri?.bekleyen_kod ?? null,
        kodSonGecerlilik: baglantiSatiri?.kod_son_gecerlilik ?? null,
      }} />

      <SifreDegistir />
    </div>
  );
}
