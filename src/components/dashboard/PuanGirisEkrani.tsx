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
      setError(`Score must be between 0 and ${maxTotal}`);
      return;
    }
    setError(null);
    setOgrenciPuanlar((prev) => ({ ...prev, [id]: num }));
  };

  const handleSubmit = () => {
    // Ensure all students have a score
    const missing = ogrenciler.find((o) => !(o.id in ogrenciPuanlar));
    if (missing) {
      setError("Please enter a score for all students");
      return;
    }
    // Validate each score
    for (const [id, puan] of Object.entries(ogrenciPuanlar)) {
      if (puan < 0 || puan > maxTotal) {
        setError(`Student ${id} score is out of range`);
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
      <h2>Enter Total Scores for Each Student</h2>
      <p className="text-TEXT_MUTED mb-4">
        Maximum possible total score: {maxTotal}
      </p>
      <div className="space-y-4">
        {ogrenciler.map((ogr) => (
          <div key={ogr.id} className="border p-3 rounded">
            <div className="flex justify-between items-start">
              <div>
                <label className={labelStyle}>{ogr.ad}</label>
                <p className="text-xs text-TEXT_MUTED">ID: {ogr.id}</p>
              </div>
              <div className="w-20">
                <input
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
          Continue
        </button>
      </div>
    </div>
  );
}
