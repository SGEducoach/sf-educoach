import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProgramYazdirDugmesi } from "@/components/dashboard/ProgramYazdirDugmesi";
import { TekSayfaOlcek } from "@/components/dashboard/TekSayfaOlcek";
import { gunEkle, haftaninPazartesisi } from "@/lib/oto-program";
import { bugununTarihiTR } from "@/lib/tarih";
import { GOREV_TURU_ETIKET } from "@/lib/types";

// Kullanıcı isteği (24.09.2026): haftalık programın kâğıt çıktısı.
// Yatay A4, belirgin ince çizgiler, dolu zemin YOK (mürekkep tasarrufu —
// kağıt Veri Defteri'nde de aynı ilke), okunaklı yazı tipi. Sol üstte
// yazısız SeFu logosu, ortada başlık, programın altında notlar satırı.
// Ayrı bir sayfa: pano kabuğu (menü/başlık) hiç render edilmiyor.

export const metadata: Metadata = { title: "Haftalık program çıktısı | SeFu Koç", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SAYFA_GENISLIK_MM = 297 - 2 * 9;
const SAYFA_YUKSEKLIK_MM = 210 - 2 * 9;

const GUN_ADI = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

function saatYaz(saat: string | null): string {
  return saat ? saat.slice(0, 5) : "";
}

function tarihYaz(tarih: string): string {
  return new Date(`${tarih}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
}

interface Kalem { tarih: string; baslangic: string | null; bitis: string | null; tur: string; ders: string; konu: string | null; hedef: string | null }

export default async function ProgramCiktiSayfasi({ searchParams }: { searchParams: Promise<{ hafta?: string }> }) {
  const { hafta } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const haftaBaslangic = haftaninPazartesisi(/^\d{4}-\d{2}-\d{2}$/.test(hafta ?? "") ? hafta! : bugununTarihiTR());
  const haftaBitis = gunEkle(haftaBaslangic, 6);

  const [{ data: profil }, { data: ogrenci }, { data: atamalar }] = await Promise.all([
    supabase.from("profiles").select("ad, role").eq("id", user.id).maybeSingle(),
    supabase.from("students").select("classes(seviye, sube)").eq("id", user.id).maybeSingle(),
    supabase.from("gorev_atamalari")
      .select("ogrenci_tarih, ogrenci_baslangic_saat, ogrenci_bitis_saat, gorevler!inner(tur, ders, konu, hedef_soru_sayisi, hedef_dakika, baslangic_saat, bitis_saat)")
      .eq("student_id", user.id)
      .eq("programa_eklendi_mi", true)
      .gte("ogrenci_tarih", haftaBaslangic)
      .lte("ogrenci_tarih", haftaBitis),
  ]);
  if (profil?.role !== "ogrenci") redirect("/dashboard");

  type Satir = {
    ogrenci_tarih: string; ogrenci_baslangic_saat: string | null; ogrenci_bitis_saat: string | null;
    gorevler: { tur: string; ders: string; konu: string | null; hedef_soru_sayisi: number | null; hedef_dakika: number | null; baslangic_saat: string | null; bitis_saat: string | null }
      | { tur: string; ders: string; konu: string | null; hedef_soru_sayisi: number | null; hedef_dakika: number | null; baslangic_saat: string | null; bitis_saat: string | null }[] | null;
  };
  const tek = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

  const kalemler: Kalem[] = ((atamalar ?? []) as unknown as Satir[]).flatMap((a) => {
    const g = tek(a.gorevler);
    if (!g) return [];
    return [{
      tarih: a.ogrenci_tarih,
      baslangic: a.ogrenci_baslangic_saat ?? g.baslangic_saat,
      bitis: a.ogrenci_bitis_saat ?? g.bitis_saat,
      tur: g.tur, ders: g.ders, konu: g.konu,
      hedef: g.hedef_soru_sayisi ? `${g.hedef_soru_sayisi} soru` : g.hedef_dakika ? `${g.hedef_dakika} dk` : null,
    }];
  }).sort((a, b) => a.tarih.localeCompare(b.tarih) || (a.baslangic ?? "").localeCompare(b.baslangic ?? ""));

  const gunler = Array.from({ length: 7 }, (_, i) => gunEkle(haftaBaslangic, i));
  const sinif = (() => {
    const c = tek((ogrenci as unknown as { classes: { seviye: string; sube: string } | null } | null)?.classes ?? null);
    return c ? `${c.seviye}-${c.sube}` : "";
  })();
  const enFazlaSatir = Math.min(9, Math.max(6, ...gunler.map((g) => kalemler.filter((k) => k.tarih === g).length)));

  return (
    <div className="cikti">
      <style>{`
        @page { size: A4 landscape; margin: 9mm; }
        .cikti {
          background: #fff; color: #111; padding: 9mm;
          font-family: var(--font-nunito), "Segoe UI", Arial, sans-serif; font-size: 10pt;
        }
        /* Çıktı tek sayfa: içerik sayfa kutusuna sığacak şekilde ölçeklenir
           (bkz. TekSayfaOlcek), taşma olursa kutu kırpar. */
        .tasma-uyarisi { margin: 0 0 3mm; font-size: 9pt; color: #8a5a00; }
        .cikti__ust { display: flex; align-items: center; gap: 8mm; border-bottom: 1.4pt solid #111; padding-bottom: 3mm; }
        .cikti__logo { flex: none; }
        .cikti__baslik { flex: 1; text-align: center; }
        .cikti__baslik h1 { margin: 0; font-size: 17pt; font-weight: 800; letter-spacing: -0.2pt; }
        .cikti__baslik p { margin: 1mm 0 0; font-size: 10pt; color: #333; }
        .cikti__kimlik { flex: none; min-width: 52mm; text-align: right; font-size: 9.5pt; color: #111; }
        .cikti__kimlik span { display: block; }
        .cikti__kimlik b { font-weight: 700; }
        table { width: 100%; border-collapse: collapse; margin-top: 4mm; table-layout: fixed; }
        th, td { border: 0.8pt solid #111; padding: 1.6mm 1.8mm; vertical-align: top; }
        th { font-size: 10pt; font-weight: 800; text-align: left; }
        th small { display: block; font-weight: 500; font-size: 8.5pt; color: #333; }
        td { height: 11mm; font-size: 9pt; }
        .kalem { line-height: 1.25; }
        .kalem + .kalem { margin-top: 1.4mm; padding-top: 1.4mm; border-top: 0.5pt dashed #777; }
        .kalem b { font-weight: 700; }
        .kalem span { display: block; color: #333; font-size: 8.5pt; }
        .bos { color: #999; }
        .notlar { margin-top: 5mm; border: 0.8pt solid #111; padding: 2.5mm 3mm; }
        .notlar b { font-size: 9.5pt; }
        .notlar .satir { border-bottom: 0.5pt solid #777; height: 7mm; }
        .cikti__alt { margin-top: 3mm; display: flex; justify-content: space-between; font-size: 8pt; color: #444; }
        .sfec-yazdir-dugme {
          display: inline-flex; align-items: center; gap: 6px; border: 1.2pt solid #111; border-radius: 8px;
          background: #fff; color: #111; padding: 6px 12px; font-size: 10pt; font-weight: 700; cursor: pointer;
        }
        .arac-cubugu { display: flex; gap: 10px; align-items: center; margin-bottom: 5mm; }
        .arac-cubugu a { color: #111; font-size: 10pt; text-decoration: underline; }
        @media print {
          .arac-cubugu, .tasma-uyarisi { display: none !important; }
          .cikti { padding: 0; }
          html, body { background: #fff !important; }
        }
      `}</style>

      <div className="arac-cubugu">
        <ProgramYazdirDugmesi />
        <Link href={`/dashboard/planlar?hafta=${haftaBaslangic}`}>← Programa dön</Link>
      </div>

      <TekSayfaOlcek genislikMm={SAYFA_GENISLIK_MM} yukseklikMm={SAYFA_YUKSEKLIK_MM}>
      <div className="cikti__ust">
        <Image src="/icon-192.png" alt="SeFu Koç" width={192} height={192} className="cikti__logo" style={{ height: "16mm", width: "16mm", objectFit: "contain" }} />
        <div className="cikti__baslik">
          <h1>SeFu Haftalık Çalışma Programı</h1>
          <p>{tarihYaz(haftaBaslangic)} – {tarihYaz(haftaBitis)}</p>
        </div>
        <div className="cikti__kimlik">
          <span><b>{profil?.ad ?? ""}</b></span>
          {sinif && <span>{sinif}</span>}
          <span>www.sefukoc.com</span>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            {gunler.map((g, i) => (
              <th key={g} style={{ width: `${100 / 7}%` }}>
                {GUN_ADI[i]}
                <small>{tarihYaz(g)}</small>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {gunler.map((g) => {
              const gunun = kalemler.filter((k) => k.tarih === g);
              return (
                <td key={g} style={{ height: `${enFazlaSatir * 7}mm` }}>
                  {gunun.length === 0 ? <span className="bos">—</span> : gunun.map((k, i) => (
                    <div key={`${g}-${i}`} className="kalem">
                      <b>{saatYaz(k.baslangic)}{k.bitis ? `–${saatYaz(k.bitis)}` : ""} {k.ders}</b>
                      <span>
                        {GOREV_TURU_ETIKET[k.tur as keyof typeof GOREV_TURU_ETIKET] ?? k.tur}
                        {k.konu ? ` · ${k.konu}` : " · konu: ………………"}
                        {k.hedef ? ` · ${k.hedef}` : ""}
                      </span>
                    </div>
                  ))}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>

      <div className="notlar">
        <b>Notlar</b>
        <div className="satir" />
        <div className="satir" />
        <div className="satir" />
      </div>

      <div className="cikti__alt">
        <span>Yaptığın çalışmayı siteye girmeyi unutma: www.sefukoc.com</span>
        <span>Sen Geliş, Farkın Duyulur</span>
      </div>
      </TekSayfaOlcek>
    </div>
  );
}
