"use client";

import { useState } from "react";

const inputStyle = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-MINT focus:ring-offset-2";
const labelStyle = "block text-sm font-medium text-TEXT_MUTED mb-1";

export function PuanGirisEkrani({
  ogrenciler,
  maxPuanlar,
  onChange,
}: {
  ogrenciler: { id: string; ad: string }[];
  maxPuanlar: number[];
  onChange: (ogrencilerWithTotals: { id: string; toplamPuan: number }[]) => void;
}) {
  const [ogrenciPuanlar, setOgrenciPuanlar] = useState<Record<string, number>>(
    () => Object.fromEntries(ogrenciler.map((o) => [o.id, 0]))
  );
  const [error, setError] = useState<string | null>(null);
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

  return (
    <div>
      <h2>Öğrenci toplam puanları</h2>
      <p className="text-TEXT_MUTED mb-4">
        Alınabilecek en yüksek toplam puan: {maxTotal}
      </p>
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
