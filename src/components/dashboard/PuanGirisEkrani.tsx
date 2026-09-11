"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Upload } from "lucide-react";
import { yaziliPuanlariniExceldenOku, type ExcelPuanSonucu } from "@/app/dashboard/yazili-puan-excel-actions";

const inputStyle = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-MINT focus:ring-offset-2";
const labelStyle = "block text-sm font-medium text-TEXT_MUTED mb-1";

export function PuanGirisEkrani({
  ogrenciler,
  maxPuanlar,
  sinifId,
  onChange,
}: {
  ogrenciler: { id: string; ad: string }[];
  maxPuanlar: number[];
  sinifId: string;
  onChange: (ogrencilerWithTotals: { id: string; toplamPuan: number }[]) => void;
}) {
  const [ogrenciPuanlar, setOgrenciPuanlar] = useState<Record<string, number>>(
    () => Object.fromEntries(ogrenciler.map((o) => [o.id, 0]))
  );
  const [error, setError] = useState<string | null>(null);
  const [yukleme, setYukleme] = useState<ExcelPuanSonucu | null>(null);
  const [yukleniyor, startYukleme] = useTransition();
  const dosyaRef = useRef<HTMLInputElement>(null);
  const maxTotal = maxPuanlar.reduce((sum, p) => sum + p, 0);

  const handleChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 0 || num > maxTotal) {
      setError(`Puan 0 ile ${maxTotal} arasında olmalıdır.`);
      return;
    }
    setError(null);
    setOgrenciPuanlar((prev) => ({ ...prev, [id]: num }));
  };

  // Kullanıcı isteği (11.09.2026): puanlar toplu öğrenci ekleme mantığıyla
  // Excel'den yüklenebilsin. Şablon sınıfın öğrencileriyle dolu iner
  // (api/yazili-analizi/puan-sablonu); yüklenen dosya yalnızca bu ekrandaki
  // puanları doldurur, kayıt yine son adımda yapılır.
  const excelYukle = (dosya: File | undefined) => {
    if (!dosya) return;
    setError(null);
    setYukleme(null);
    const veri = new FormData();
    veri.append("dosya", dosya);
    veri.append("sinifId", sinifId);
    veri.append("maxToplam", String(maxTotal));
    startYukleme(async () => {
      const sonuc = await yaziliPuanlariniExceldenOku(veri);
      if (dosyaRef.current) dosyaRef.current.value = "";
      if (sonuc.error) {
        setError(sonuc.error);
        return;
      }
      setOgrenciPuanlar((prev) => ({ ...prev, ...sonuc.puanlar }));
      setYukleme(sonuc);
    });
  };

  const handleSubmit = () => {
    // Ensure all students have a score
    const missing = ogrenciler.find((o) => !(o.id in ogrenciPuanlar));
    if (missing) {
      setError("Tüm öğrenciler için puan girin.");
      return;
    }
    // Validate each score — hata mesajı öğrenciyi ADIYLA anıyor; ham kimlik
    // (UUID) öğretmen için anlamsız.
    for (const o of ogrenciler) {
      const puan = ogrenciPuanlar[o.id];
      if (puan < 0 || puan > maxTotal) {
        setError(`${o.ad} için girilen puan geçersiz (0-${maxTotal} arası olmalı).`);
        return;
      }
    }
    setError(null);
    const ogrencilerWithTotals = ogrenciler.map((o) => ({
      id: o.id,
      toplamPuan: ogrenciPuanlar[o.id],
    }));
    onChange(ogrencilerWithTotals);
  };

  const sablonAdresi = `/api/yazili-analizi/puan-sablonu?sinif=${encodeURIComponent(sinifId)}&max=${maxTotal}`;
  const yuklenenSayi = yukleme ? Object.keys(yukleme.puanlar).length : 0;

  return (
    <div>
      <h2>Öğrenci toplam puanları</h2>
      <p className="text-TEXT_MUTED mb-4">
        Alınabilecek en yüksek toplam puan: {maxTotal}
      </p>

      <div className="mb-4 flex flex-col gap-2 rounded border p-3">
        <p className="text-sm">
          Puanları tek tek girmek yerine Excel ile yükleyebilirsiniz: şablon bu sınıfın öğrencileriyle dolu iner,
          yalnızca Puan sütununu doldurup geri yüklersiniz.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={sablonAdresi} className="sfec-btn inline-flex w-fit items-center gap-1.5 rounded-xl px-4 py-2 text-sm">
            <Download size={15} /> Excel şablonunu indir
          </a>
          <label className="sfec-btn inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-xl px-4 py-2 text-sm">
            <Upload size={15} /> {yukleniyor ? "Yükleniyor…" : "Excel'den yükle"}
            <input
              ref={dosyaRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              disabled={yukleniyor}
              onChange={(e) => excelYukle(e.target.files?.[0])}
            />
          </label>
        </div>

        {yukleme && (
          <div className="mt-1 flex flex-col gap-1.5 text-sm" role="status">
            <p>
              <strong>{yuklenenSayi}</strong> öğrencinin puanı Excel&apos;den yüklendi. Aşağıda kontrol edip &quot;Devam et&quot;e basın.
            </p>
            {yukleme.bosBirakilanlar.length > 0 && (
              <p>
                Puanı boş bırakılan {yukleme.bosBirakilanlar.length} öğrencinin puanı 0 olarak kaldı, ekrandan girebilirsiniz:{" "}
                {yukleme.bosBirakilanlar.join(", ")}.
              </p>
            )}
            {yukleme.eslesmeyenler.length > 0 && (
              <div>
                <p>Bu sınıfta bulunamayan satırlar (yüklenmedi):</p>
                <ul className="list-disc pl-5">
                  {yukleme.eslesmeyenler.map((s) => (
                    <li key={s.satir}>{s.satir}. satır — {s.okulNo || "numara yok"} {s.ad}</li>
                  ))}
                </ul>
              </div>
            )}
            {yukleme.hatalar.length > 0 && (
              <div>
                <p>Hatalı satırlar (yüklenmedi):</p>
                <ul className="list-disc pl-5">
                  {yukleme.hatalar.map((h) => (
                    <li key={h.satir}>{h.satir}. satır ({h.ad}): {h.mesaj}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {ogrenciler.map((ogr) => (
          <div key={ogr.id} className="border p-3 rounded">
            <div className="flex justify-between items-center">
              <label htmlFor={`puan-${ogr.id}`} className={labelStyle}>{ogr.ad}</label>
              <div className="w-20">
                <input
                  id={`puan-${ogr.id}`}
                  type="number"
                  value={ogrenciPuanlar[ogr.id] ?? 0}
                  onChange={(e) => handleChange(ogr.id, e.target.value)}
                  min={0}
                  max={maxTotal}
                  className={inputStyle}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-2 p-3 bg-peach-bg rounded text-peach text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={handleSubmit} className="sfec-btn w-fit rounded-xl px-4 py-2">
          Devam et
        </button>
      </div>
    </div>
  );
}
