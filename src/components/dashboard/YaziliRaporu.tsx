import type { YaziliRapor } from "@/lib/yazili-rapor-hesap";
import { DUSUK_BASARI_ESIGI, LISE_NOT_ARALIKLARI, NOT_SIRASI, dersGorunenAd } from "@/lib/yazili-rapor-hesap";
import { YaziliRaporAraclari } from "@/components/dashboard/YaziliRaporAraclari";
import { YaziliRaporGrafigi } from "@/components/dashboard/YaziliRaporGrafigi";

const sayi = (v: number, basamak = 2) => v.toLocaleString("tr-TR", { maximumFractionDigits: basamak });
const yuzde = (v: number) => `%${sayi(v, 1)}`;
const tarihTR = (iso: string) => {
  const [yil, ay, gun] = iso.split("-");
  return `${gun}.${ay}.${yil}`;
};

const hucre = "border border-[#6c757d] px-1.5 py-1";
const baslikHucre = `${hucre} bg-[#e9ecef] font-bold`;
const etiketHucre = `${hucre} w-[15%] font-bold`;

// "Soru Analizi ve Sınav Başarı Değerlendirmesi" — kullanıcının örnek Excel
// şablonundaki sınav sayfasıyla aynı bölümler, A4 dikey yaprağa basılacak
// şekilde (11.09.2026). Panel koyu temalı olsa da rapor her zaman beyaz kâğıt
// görünümünde; globals.css'teki #rapor-icerigi kuralı bilerek kullanılmadı —
// o kural içerideki her rengi beyaza zorluyor, GEÇMEZ (sarı) ve %50 altı
// (kırmızı) vurgularını da silerdi.
export function YaziliRaporu({ rapor }: { rapor: YaziliRapor }) {
  const b = rapor.baslik;
  const bugun = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  const soruSayisi = rapor.sorular.length;

  return (
    <main className="min-h-dvh w-full bg-[#dee2e6] px-3 py-6 text-[#111] print:bg-white print:p-0">
      <style>{"@page { size: A4 portrait; margin: 8mm; }"}</style>
      <YaziliRaporAraclari />

      <article
        className="mx-auto w-full max-w-[210mm] bg-white p-[8mm] text-[10.5px] leading-snug text-[#111] shadow-lg print:max-w-none print:p-0 print:shadow-none"
        style={{ printColorAdjust: "exact", WebkitPrintColorAdjust: "exact" }}
      >
        <h1 className="mb-2 text-center text-[14px] font-bold tracking-wide">SORU ANALİZİ VE SINAV BAŞARI DEĞERLENDİRMESİ</h1>

        <table className="mb-2 w-full border-collapse">
          <tbody>
            <tr>
              <td className={etiketHucre}>Okul</td><td className={hucre}>{b.okulAdi}</td>
              <td className={etiketHucre}>Sınıf</td><td className={hucre}>{b.sinifAdi}</td>
            </tr>
            <tr>
              <td className={etiketHucre}>Öğretim Yılı</td><td className={hucre}>{b.ogretimYili}</td>
              <td className={etiketHucre}>Sınav</td><td className={hucre}>{b.sinavAdi} ({tarihTR(b.tarih)})</td>
            </tr>
            <tr>
              <td className={etiketHucre}>Dönem</td><td className={hucre}>{b.donem}. Dönem</td>
              <td className={etiketHucre}>Ders</td><td className={hucre}>{dersGorunenAd(b.ders)}</td>
            </tr>
            <tr>
              <td className={etiketHucre}>Öğretmen</td><td className={hucre}>{b.ogretmenAdi}</td>
              <td className={etiketHucre}>Öğrenci</td><td className={`${hucre} tabular-nums`}>{rapor.ogrenciler.length}</td>
            </tr>
          </tbody>
        </table>

        <div className="mb-2 grid grid-cols-[1.35fr_1fr] items-start gap-2 break-inside-avoid">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${baslikHucre} w-8`}>No</th>
                <th className={`${baslikHucre} text-left`}>Soruların ilgili olduğu kazanımlar</th>
                <th className={`${baslikHucre} w-10`}>Puan</th>
                <th className={`${baslikHucre} w-14`}>Başarı</th>
              </tr>
            </thead>
            <tbody>
              {rapor.sorular.map((s) => {
                const dusuk = s.basari !== null && s.basari < DUSUK_BASARI_ESIGI;
                return (
                  <tr key={s.sira}>
                    <td className={`${hucre} text-center tabular-nums`}>{s.sira}</td>
                    <td className={hucre}>{s.kazanim}</td>
                    <td className={`${hucre} text-center tabular-nums`}>{s.maxPuan}</td>
                    <td className={`${hucre} text-center tabular-nums ${dusuk ? "bg-[#ffd6d6] font-bold text-[#a00000]" : ""}`}>
                      {s.basari === null ? "-" : yuzde(s.basari)}
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td className={`${baslikHucre} text-right`} colSpan={2}>TOPLAM</td>
                <td className={`${baslikHucre} text-center tabular-nums`}>{rapor.maxToplam}</td>
                <td className={baslikHucre} />
              </tr>
            </tbody>
          </table>

          <table className="w-full border-collapse">
            <thead>
              <tr><th className={baslikHucre} colSpan={2}>SINAV ANALİZİ</th></tr>
            </thead>
            <tbody>
              {NOT_SIRASI.map((sonuc) => (
                <tr key={sonuc}>
                  <td className={hucre}>{sonuc} alan öğrenci sayısı</td>
                  <td className={`${hucre} w-14 text-center font-bold tabular-nums`}>{rapor.dagilim[sonuc]}</td>
                </tr>
              ))}
              <tr>
                <td className={hucre}>Alınan puanların ortalaması</td>
                <td className={`${hucre} text-center font-bold tabular-nums`}>
                  {sayi(rapor.ortalama)}{rapor.maxToplam !== 100 && ` / ${rapor.maxToplam}`}
                </td>
              </tr>
              <tr>
                <td className={hucre}>Sınıfın başarı yüzdesi</td>
                <td className={`${hucre} text-center font-bold tabular-nums`}>{yuzde(rapor.basariYuzdesi)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="mb-2 border border-[#6c757d] p-2 break-inside-avoid">
          <h2 className="mb-1 text-center text-[11px] font-bold">SINAVIN DEĞERLENDİRİLMESİ</h2>
          <p>Yapılan sınavda sınıfın genel başarı yüzdesi <strong>{yuzde(rapor.basariYuzdesi)}</strong> olmuştur.</p>
          {rapor.dusukKonular.length > 0 ? (
            <>
              <p className="mt-1">Aşağıdaki kazanımlarda başarı oranı %{DUSUK_BASARI_ESIGI}&apos;nin altında kalmıştır:</p>
              <ul className="ml-4 list-disc">
                {rapor.dusukKonular.map((k) => (
                  <li key={k.sira}>{k.sira}. soru — {k.kazanim} ({yuzde(k.basari)})</li>
                ))}
              </ul>
              <p className="mt-1">
                Başarının düşük olduğu bu konular sınıfla paylaşıldı; sınav soruları sınıfta çözülerek bu konular üzerinde
                ayrıntılı açıklama yapıldı ve yapılan hatalar vurgulandı.
              </p>
            </>
          ) : (
            <p className="mt-1">Tüm kazanımlarda başarı oranı %{DUSUK_BASARI_ESIGI} ve üzerindedir.</p>
          )}
        </section>

        <section className="mb-2 break-inside-avoid">
          <h2 className={`${baslikHucre} mb-1 text-center text-[11px]`}>GRAFİK ANALİZ</h2>
          <YaziliRaporGrafigi soruBasari={rapor.sorular.map((s) => s.basari)} dagilim={rapor.dagilim} />
        </section>

        <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full border-collapse text-[9.5px]">
            <thead>
              <tr>
                <th className={baslikHucre} rowSpan={2}>Sıra</th>
                <th className={baslikHucre} rowSpan={2}>Okul No</th>
                <th className={`${baslikHucre} text-left`} rowSpan={2}>Adı Soyadı</th>
                <th className={baslikHucre} colSpan={soruSayisi}>SORULAR</th>
                <th className={baslikHucre} rowSpan={2}>Puan</th>
                <th className={baslikHucre} rowSpan={2}>Sonuç</th>
              </tr>
              <tr>
                {rapor.sorular.map((s) => (
                  <th key={s.sira} className={`${baslikHucre} tabular-nums`}>
                    {s.sira}<span className="block font-normal">/{s.maxPuan}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rapor.ogrenciler.map((o) => (
                <tr key={o.id} className="break-inside-avoid">
                  <td className={`${hucre} text-center tabular-nums`}>{o.sira}</td>
                  <td className={`${hucre} text-center tabular-nums`}>{o.okulNo}</td>
                  <td className={`${hucre} whitespace-nowrap`}>{o.ad}</td>
                  {o.puanlar.map((p, j) => (
                    <td key={j} className={`${hucre} text-center tabular-nums ${o.tahmini[j] ? "italic text-[#6c757d]" : ""}`}>{p ?? "-"}</td>
                  ))}
                  <td className={`${hucre} text-center font-bold tabular-nums`}>{o.toplam}</td>
                  <td className={`${hucre} text-center font-bold ${o.sonuc === "GEÇMEZ" ? "bg-[#fff3a0]" : ""}`}>{o.sonuc}</td>
                </tr>
              ))}
              <tr>
                <td className={`${baslikHucre} text-right`} colSpan={3}>SORULARA GÖRE BAŞARI (%)</td>
                {rapor.sorular.map((s) => {
                  const dusuk = s.basari !== null && s.basari < DUSUK_BASARI_ESIGI;
                  return (
                    <td key={s.sira} className={`${hucre} text-center font-bold tabular-nums ${dusuk ? "bg-[#ffd6d6] text-[#a00000]" : "bg-[#e9ecef]"}`}>
                      {s.basari === null ? "-" : sayi(s.basari, 1)}
                    </td>
                  );
                })}
                <td className={baslikHucre} colSpan={2} />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-1.5 space-y-0.5 text-[9px] text-[#495057]">
          <p>Değerlendirme lise not sistemine göredir: {LISE_NOT_ARALIKLARI.map((a) => `${a.etiket} ${a.sonuc}`).join(" · ")}.</p>
          {rapor.maxToplam !== 100 && (
            <p>Sınavın toplamı {rapor.maxToplam} puan olduğu için notlar 100 puan üzerinden hesaplanmıştır (puan × 100 ÷ {rapor.maxToplam}).</p>
          )}
          {rapor.yontem === "temsili" && (
            <p>
              Gri ve italik soru puanları tahminidir: {rapor.ogrenciler.length - rapor.tahminiOgrenciSayisi} öğrencinin soru puanları
              öğretmence girildi, {rapor.tahminiOgrenciSayisi} öğrencininki bu örneğe göre tahmin edildi. Toplam puanlar ve sonuçlar
              gerçektir; soru başarı oranları tahminleri de içerir.
            </p>
          )}
          {rapor.yontem === "otomatik" && (
            <p>
              Soru puanları, her öğrencinin toplam puanının sorulara oransal dağılımıdır; soru ve kazanım başarı oranları gerçek
              veriye dayanmaz. Toplam puanlar ve sonuçlar gerçektir.
            </p>
          )}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-8 text-center break-inside-avoid">
          <div>
            <p className="font-bold">{b.ogretmenAdi}</p>
            <p>{b.ogretmenBransi ? `${b.ogretmenBransi} Öğretmeni` : "Ders Öğretmeni"}</p>
          </div>
          <div>
            <p>{bugun}</p>
            <p className="mt-1 font-bold">{b.mudurAdi ?? "…………………………"}</p>
            <p>Okul Müdürü</p>
          </div>
        </div>
      </article>
    </main>
  );
}
