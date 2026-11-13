import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SifreDegistir } from "@/components/SifreDegistir";
import { MezunBilgiFormu } from "@/components/dashboard/MezunBilgiFormu";
import { netHesapla } from "@/lib/types";
import { BG0, BG1, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Mezun hesabının tek sayfası (migration 0188, kullanıcı kararı 13.11.2026):
// kimlik bilgileri (kurumun kaydı, salt okunur), güncellenebilir iletişim ve
// üniversite/meslek bilgisi, eski deneme geçmişi (salt okunur) ve şifre.
const TUR_ADI: Record<string, string> = { TYT: "TYT", AYT: "AYT", BRANS: "Branş", LGS: "LGS" };

export async function MezunPaneli({ userId, ad }: { userId: string; ad: string }) {
  const supabase = await createClient();
  const { data: ogrenci } = await supabase.from("students").select("school_id, okul_no, schools(ad)").eq("id", userId).maybeSingle();
  const okul = ogrenci?.schools as unknown as { ad: string } | null;
  // Mezun Takip tablosu yalnız sunucuda okunur; kişi yalnız KENDİ kaydını görür.
  const { data: kayit } = ogrenci
    ? await createAdminClient().from("mezunlar").select("mezuniyet_yili, telefon, eposta, il, ilce, universite, meslek")
      .eq("school_id", ogrenci.school_id).eq("student_id", userId).maybeSingle()
    : { data: null };
  const { data: denemeler } = await supabase.from("denemeler")
    .select("id, tarih, tur, yayinevi, deneme_ders_sonuclari(dogru, yanlis)")
    .eq("student_id", userId).order("tarih", { ascending: false }).limit(60);
  type Deneme = { id: string; tarih: string; tur: string; yayinevi: string | null; deneme_ders_sonuclari: { dogru: number; yanlis: number }[] };
  const liste = ((denemeler ?? []) as Deneme[]).map((d) => ({
    ...d, net: Math.round(d.deneme_ders_sonuclari.reduce((t, s) => t + netHesapla(s.dogru, s.yanlis), 0) * 100) / 100,
  }));
  const telefonGoster = kayit?.telefon ? `0${String(kayit.telefon).slice(2)}` : "";

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h1 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Mezun Profilim</h1>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
          Okulundan mezun oldun; hesabın ve geçmişin korunuyor. İletişim, üniversite ve meslek bilgini güncel tutarsan okulun rehberlik servisi sana ulaşabilir. Ad, numara ya da mezuniyet yılında yanlışlık varsa okulunla iletişime geç.
        </p>
        <dl className="sfec-liste mt-4">
          {[
            { etiket: "Ad Soyad", deger: ad },
            { etiket: "Okul", deger: okul?.ad ?? "—" },
            { etiket: "Okul numarası", deger: ogrenci?.okul_no ?? "—" },
            { etiket: "Mezuniyet yılı", deger: kayit?.mezuniyet_yili ? String(kayit.mezuniyet_yili) : "—" },
          ].map(({ etiket, deger }) => (
            <div key={etiket} className="sfec-liste-satiri px-2 py-3">
              <dt className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{etiket}</dt>
              <dd className="mt-0.5 text-sm font-semibold" style={{ color: TEXT }}>{deger}</dd>
            </div>
          ))}
        </dl>
      </div>

      <MezunBilgiFormu kayitVar={!!kayit} baslangic={{
        telefon: telefonGoster, eposta: kayit?.eposta ?? "", il: kayit?.il ?? "", ilce: kayit?.ilce ?? "",
        universite: kayit?.universite ?? "", meslek: kayit?.meslek ?? "",
      }} />

      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Deneme Geçmişim</h2>
        <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>Öğrenciyken girdiğin denemeler (salt okunur).</p>
        {liste.length === 0 ? (
          <p className="mt-3 text-xs" style={{ color: TEXT_MUTED }}>Kayıtlı deneme yok.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-1.5">
            {liste.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}`, color: TEXT }}>
                <span><strong>{TUR_ADI[d.tur] ?? d.tur}</strong>{d.yayinevi ? ` · ${d.yayinevi}` : ""}</span>
                <span style={{ color: TEXT_MUTED }}>{d.tarih.split("-").reverse().join(".")} · <strong style={{ color: TEXT }}>{d.net.toLocaleString("tr-TR")} net</strong></span>
              </div>
            ))}
          </div>
        )}
      </div>

      <SifreDegistir />
    </div>
  );
}
