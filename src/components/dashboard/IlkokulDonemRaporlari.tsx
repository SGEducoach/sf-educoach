import { ProgramYazdirDugmesi } from "@/components/dashboard/ProgramYazdirDugmesi";
import {
  GELISIM_DUZEYLERI, SDO_BASLIKLARI, SDO_DUZEYLERI, donemDersDuzeyleri, donemEtiketi, sinifKalemleri,
} from "@/lib/ilkokul-gelisim";
import type { DonemBilgisi, GelisimKalemTanimi } from "@/lib/ilkokul-gelisim";
import type { IlkokulDonemRaporu } from "@/lib/ilkokul-gelisim-sorgu";

// İlkokul dönem sonu gelişim raporunun kâğıt çıktısı (19.10.2026), bkz.
// src/app/dashboard/gelisim-raporu/page.tsx. MEB Maarif Modeli gelişim
// raporunun yapısıyla: dersler dört düzey, sosyal duygusal öğrenme
// becerileri, öğretmen görüşü; ek olarak kurumun kendi değerlendirmesi.
// Dikey A4, dolu zemin yok; sınıf çıktısında her öğrenci yeni sayfada.

export function IlkokulDonemRaporlari({ raporlar, donem }: { raporlar: IlkokulDonemRaporu[]; donem: DonemBilgisi }) {
  return (
    <div className="gr">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        .gr { background: #fff; color: #111; padding: 10mm; font-family: var(--font-nunito), "Segoe UI", Arial, sans-serif; font-size: 9.5pt; }
        .gr__sayfa { max-width: 190mm; margin: 0 auto; }
        .gr__sayfa + .gr__sayfa { break-before: page; margin-top: 12mm; }
        .gr__ust { display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; border-bottom: 1.4pt solid #111; padding-bottom: 2.5mm; }
        .gr__ust h1 { margin: 0; font-size: 15pt; font-weight: 800; }
        .gr__ust p { margin: 0.8mm 0 0; font-size: 9.5pt; color: #333; }
        .gr__kurum { text-align: right; font-size: 10pt; font-weight: 700; }
        .gr__kimlik { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1mm 6mm; margin: 3mm 0 1mm; font-size: 9.5pt; }
        .gr__kimlik b { font-weight: 700; }
        h2 { margin: 4mm 0 1.5mm; font-size: 10.5pt; font-weight: 800; break-after: avoid; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; break-inside: auto; }
        tr { break-inside: avoid; }
        th, td { border: 0.7pt solid #111; padding: 1.1mm 1.6mm; vertical-align: middle; }
        th { font-size: 8.5pt; font-weight: 800; text-align: center; }
        th.sol, td.sol { text-align: left; }
        td.isaret { text-align: center; font-size: 11pt; line-height: 1; }
        tr.baslik td { font-weight: 800; font-size: 9pt; }
        .bos { color: #888; font-size: 8pt; }
        .kutu { border: 0.7pt solid #111; padding: 2mm 2.5mm; min-height: 14mm; white-space: pre-line; }
        .satir { border-bottom: 0.5pt solid #777; height: 6mm; }
        .imzalar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8mm; margin-top: 8mm; text-align: center; font-size: 9pt; }
        .imzalar div { border-top: 0.7pt solid #111; padding-top: 1.5mm; }
        .gr__alt { margin-top: 4mm; font-size: 7.5pt; color: #444; }
        .sfec-yazdir-dugme { display: inline-flex; align-items: center; gap: 6px; border: 1.2pt solid #111; border-radius: 8px; background: #fff; color: #111; padding: 6px 12px; font-size: 10pt; font-weight: 700; cursor: pointer; }
        .arac-cubugu { display: flex; gap: 12px; align-items: center; margin: 0 auto 5mm; max-width: 190mm; font-size: 10pt; }
        @media print {
          .arac-cubugu { display: none !important; }
          .gr { padding: 0; }
          .gr__sayfa + .gr__sayfa { margin-top: 0; }
          html, body { background: #fff !important; }
        }
      `}</style>

      <div className="arac-cubugu">
        <ProgramYazdirDugmesi />
        <span>{donemEtiketi(donem)} · {raporlar.length} öğrenci</span>
      </div>

      {raporlar.length === 0 && <p className="arac-cubugu">Bu sınıfta öğrenci yok.</p>}
      {raporlar.map((r) => <OgrenciRaporu key={r.ogrenci.id} r={r} donem={donem} />)}
    </div>
  );
}

function OgrenciRaporu({ r, donem }: { r: IlkokulDonemRaporu; donem: DonemBilgisi }) {
  const duzeyler = donemDersDuzeyleri(r.kayitlar, donem);
  const kalemler = sinifKalemleri(r.ogrenci.seviye);
  const dersler = kalemler.filter((k) => k.bolum === "ders");
  const kurum = kalemler.filter((k) => k.bolum === "kurum");
  const gorus = r.gorus ?? r.ogretmenNotu;

  const dersTablosu = (liste: GelisimKalemTanimi[], baslik: string) => (
    <table>
      <thead>
        <tr>
          <th className="sol" style={{ width: "40%" }}>{baslik}</th>
          {GELISIM_DUZEYLERI.map((d) => <th key={d.anahtar}>{d.ad}</th>)}
        </tr>
      </thead>
      <tbody>
        {liste.map((k) => {
          const d = duzeyler.get(k.anahtar);
          return (
            <tr key={k.anahtar}>
              <td className="sol">{k.ad}{!d && <span className="bos"> · işaretlenmedi</span>}</td>
              {GELISIM_DUZEYLERI.map((g) => <td key={g.anahtar} className="isaret">{d === g.anahtar ? "●" : ""}</td>)}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <section className="gr__sayfa">
      <div className="gr__ust">
        <div>
          <h1>İlkokul Gelişim Raporu</h1>
          <p>{donemEtiketi(donem)}</p>
        </div>
        <div className="gr__kurum">{r.ogrenci.kurumAdi}</div>
      </div>
      <div className="gr__kimlik">
        <span>Adı Soyadı: <b>{r.ogrenci.ad}</b></span>
        <span>Sınıfı: <b>{r.ogrenci.sinif}</b></span>
        <span>Okul No: <b>{r.ogrenci.okulNo || "—"}</b></span>
      </div>

      <h2>Derslerdeki Gelişim</h2>
      {dersTablosu(dersler, "Ders")}

      <h2>Sosyal Duygusal Öğrenme Becerileri</h2>
      <table>
        <thead>
          <tr>
            <th className="sol" style={{ width: "48%" }}>Gösterge</th>
            {SDO_DUZEYLERI.map((d) => <th key={d.anahtar}>{d.ad}</th>)}
          </tr>
        </thead>
        <tbody>
          {SDO_BASLIKLARI.map((b) => [
            <tr key={b.anahtar} className="baslik"><td className="sol" colSpan={1 + SDO_DUZEYLERI.length}>{b.ad}</td></tr>,
            ...b.gostergeler.map((metin, i) => {
              const d = r.sdo.get(`${b.anahtar}${i + 1}`);
              return (
                <tr key={`${b.anahtar}${i + 1}`}>
                  <td className="sol">{metin}</td>
                  {SDO_DUZEYLERI.map((g) => <td key={g.anahtar} className="isaret">{d === g.anahtar ? "●" : ""}</td>)}
                </tr>
              );
            }),
          ])}
        </tbody>
      </table>

      {kurum.length > 0 && (
        <>
          <h2>Kurum Değerlendirmesi</h2>
          {dersTablosu(kurum, "Alan")}
          {r.etkinlikler.length > 0 && (
            <p style={{ margin: "1.5mm 0 0", fontSize: "9pt" }}>
              <b>Katıldığı etkinlikler:</b> {r.etkinlikler.map((e) => `${e.ad} (${e.tarih.split("-").reverse().join(".")})`).join(", ")}
            </p>
          )}
        </>
      )}

      <h2>Öğretmen Görüşü</h2>
      {gorus ? <div className="kutu">{gorus}</div> : <div><div className="satir" /><div className="satir" /><div className="satir" /></div>}
      {r.rehberlikNotu && (
        <>
          <h2>Rehberlik Servisinin Notu</h2>
          <div className="kutu">{r.rehberlikNotu}</div>
        </>
      )}

      <div className="imzalar">
        <div>Sınıf Öğretmeni</div>
        <div>Okul Müdürü</div>
        <div>Veli</div>
      </div>
      <p className="gr__alt">
        Bu rapor, MEB Türkiye Yüzyılı Maarif Modeli ilkokul gelişim raporunun yapısına göre kurum tarafından hazırlanmıştır; resmî e-Okul gelişim raporunun yerine geçmez.
        Ders düzeyleri dönem içindeki son değerlendirmeyi gösterir. Kurum değerlendirmesi MEB raporunda yer almaz.
      </p>
    </section>
  );
}
