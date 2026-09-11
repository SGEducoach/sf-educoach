"use client";

import { useState, useEffect } from "react";
import { akilliTahminV1 } from "@/lib/yazili-estimation-algoritmasi";

const tableStyle = "w-full border-collapse";
const thStyle = "border p-2 text-left text-xs font-medium text-TEXT_MUTED bg-bg1";
const tdStyle = "border p-2 text-sm";

export function YaziliAnaliziPanel({
  ogrenciler,
  temsiliOgrenciIds,
  temsiliOgrenciSkorlar,
  maxPuanlar,
  kazanimlar,
  onSave,
}: {
  ogrenciler: { id: string; toplamPuan: number }[];
  temsiliOgrenciIds: string[];
  temsiliOgrenciSkorlar: Record<string, number[]>;
  maxPuanlar: number[];
  kazanimlar: string[];
  onSave: () => Promise<void>;
}) {
  const [tahminSonucu, setTahminSonucu] = useState<Record<string, number[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate estimated scores whenever inputs change
  useEffect(() => {
    if (ogrenciler.length === 0 || maxPuanlar.length === 0) return;
    // Prepare data for algorithm
    const ogrencilerToplam: { id: string; toplam: number }[] = ogrenciler.map((o) => ({
      id: o.id,
      toplam: o.toplamPuan,
    }));
    const temsiliOgrenciler: { id: string; toplam: number; skorlar: number[] }[] =
      temsiliOgrenciIds.map((oid) => {
        const ogr = ogrenciler.find((o) => o.id === oid)!;
        return {
          id: oid,
          toplam: ogr.toplamPuan,
          skorlar: temsiliOgrenciSkorlar[oid] ?? [],
        };
      });
    try {
      const result = akilliTahminV1(ogrencilerToplam, temsiliOgrenciler, maxPuanlar);
      // The estimate is derived whenever the complete input set changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTahminSonucu(result);
      setError(null);
    } catch (err: unknown) {
      setError(`Estimation failed: ${err instanceof Error ? err.message : "Unknown error"}`);
      setTahminSonucu({});
    }
  }, [ogrenciler, temsiliOgrenciIds, temsiliOgrenciSkorlar, maxPuanlar]);

  const handleSave = async () => {
    setError(null);
    setIsLoading(true);
    try {
      // For now, just call the provided onSave function (wizard will implement actual save)
      await onSave();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Compute statistics
  const toplamlar = ogrenciler.map((o) => o.toplamPuan);
  const sorted = [...toplamlar].sort((a, b) => a - b);
  const mean =
    toplamlar.reduce((sum, v) => sum + v, 0) / toplamlar.length;
  const median =
    sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
  const variance =
    toplamlar.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    toplamlar.length;
  const stdDev = Math.sqrt(variance);

  return (
    <div>
      <h2>Analysis Preview</h2>

      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Class Statistics (Real Totals)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-TEXT_MUTED">Count</p>
            <p className="font-mono">{ogrenciler.length}</p>
          </div>
          <div>
            <p className="text-TEXT_MUTED">Mean</p>
            <p className="font-mono">{mean.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-TEXT_MUTED">Median</p>
            <p className="font-mono">{median.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-TEXT_MUTED">Std. Dev.</p>
            <p className="font-mono">{stdDev.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-TEXT_MUTED">Min</p>
            <p className="font-mono">{Math.min(...toplamlar)}</p>
          </div>
          <div>
            <p className="text-TEXT_MUTED">Max</p>
            <p className="font-mono">{Math.max(...toplamlar)}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-peach-bg rounded text-peach text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-medium mb-2">Estimated Scores per Question</h3>
        <p className="text-TEXT_MUTED mb-2">
          Actual scores are shown for selected representatives; others are estimated.
        </p>
        <table className={tableStyle}>
          <thead>
            <tr>
              <th className={thStyle}>Student</th>
              {maxPuanlar.map((_, idx) => (
                <th key={idx} className={thStyle}>
                  Soru {idx + 1}<span className="block font-normal">{kazanimlar[idx]}</span>
                </th>
              ))}
              <th className={thStyle}>Total</th>
              <th className={thStyle}>Source</th>
            </tr>
          </thead>
          <tbody>
            {ogrenciler.map((ogr) => {
              const isTemsili = temsiliOgrenciIds.includes(ogr.id);
              const actualSkorlar = temsiliOgrenciSkorlar[ogr.id];
              const estimatedSkorlar = tahminSonucu[ogr.id];
              const skorlar = isTemsili && actualSkorlar ? actualSkorlar : estimatedSkorlar;
              const total = skorlar?.reduce((sum, v) => sum + v, 0) ?? 0;
              return (
                <tr key={ogr.id}>
                  <td className={tdStyle}>
                    {ogr.id} ({ogr.toplamPuan})
                  </td>
                  {maxPuanlar.map((_, idx) => {
                    const val = skorlar?.[idx];
                    return (
                      <td key={idx} className={tdStyle}>
                        {val !== null && val !== undefined ? val : "-"}
                        {isTemsili && actualSkorlar ? "*" : ""}
                      </td>
                    );
                  })}
                  <td className={tdStyle}>
                    {total}
                  </td>
                  <td className={tdStyle}>
                    {isTemsili ? "Actual" : "Estimated"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="text-TEXT_MUTED mt-2">
          * Actual score (representative)
        </p>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="sfec-btn w-fit rounded-xl px-4 py-2"
          disabled={Object.keys(tahminSonucu).length === 0}
        >
          {isLoading ? "Saving..." : "Save and Finish"}
        </button>
      </div>
    </div>
  );
}
