"use client";

import { useState } from "react";

const inputStyle = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-MINT focus:ring-offset-2";
const labelStyle = "block text-sm font-medium text-TEXT_MUTED mb-1";

export function TemsiliOgrenciSecici({
  ogrenciler,
  maxPuanlar,
  onOgrenciSec,
  onSkorDegisti,
}: {
  ogrenciler: { id: string; ad: string }[];
  maxPuanlar: number[];
  onOgrenciSec: (ids: string[]) => void;
  onSkorDegisti: (ogrenciId: string, skorlar: number[]) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => ogrenciler.length <= 6 ? ogrenciler.map((o) => o.id) : []
  );
  const [scores, setScores] = useState<Record<string, number[]>>(
    () => Object.fromEntries(selectedIds.map((id) => [id, maxPuanlar.map(() => 0)]))
  );
  const [error, setError] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    if (ogrenciler.length <= 6) {
      // Cannot deselect when auto-selected
      return;
    }
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleScoreChange = (ogrenciId: string, index: string, value: string) => {
    const numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0 || numValue > maxPuanlar[parseInt(index, 10)]) {
      setError(`Score must be between 0 and ${maxPuanlar[parseInt(index, 10)]}`);
      return;
    }
    setError(null);
    setScores((prev) => {
      const newScores = { ...prev };
      if (!newScores[ogrenciId]) {
        newScores[ogrenciId] = Array(maxPuanlar.length).fill(0);
      }
      newScores[ogrenciId][parseInt(index, 10)] = numValue;
      return newScores;
    });
  };

  const handleSubmit = () => {
    // Validate that all selected representatives have complete scores
    const missing = selectedIds.filter(
      (id) => !scores[id] || scores[id].length !== maxPuanlar.length
    );
    if (missing.length > 0) {
      setError("Please enter scores for all selected representatives");
      return;
    }
    // Validate each score within range
    for (const id of selectedIds) {
      const skorlar = scores[id];
      for (let i = 0; i < maxPuanlar.length; i++) {
        const val = skorlar[i];
        if (val < 0 || val > maxPuanlar[i]) {
          setError(`Representative ${id} score for question ${i + 1} is out of range`);
          return;
        }
      }
    }
    setError(null);
    onOgrenciSec(selectedIds);
    selectedIds.forEach((id) => {
      onSkorDegisti(id, scores[id]);
    });
  };

  // Auto-submit when scores change? We'll let user click a button.
  // But we can also update on the fly; however the wizard expects to move to next step after finishing.
  // We'll keep a button to confirm.

  return (
    <div>
      <h2>Select Representative Students</h2>
      {ogrenciler.length <= 6 && (
        <p className="text-TEXT_MUTED">
          Since there are {ogrenciler.length} students or fewer, all are automatically selected as representatives.
        </p>
      )}
      <div className="mt-4 space-y-2">
        {ogrenciler.map((ogr) => {
          const isSelected = selectedIds.includes(ogr.id);
          const disabledAuto = ogrenciler.length <= 6;
          return (
            <div key={ogr.id} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(ogr.id)}
                disabled={disabledAuto}
                className="h-4 w-4 text-MINT focus:ring-MINT border-gray-300 rounded"
              />
              <label className="cursor-pointer select-none">{ogr.ad}</label>
              {(!disabledAuto && isSelected) || (!disabledAuto && ogrenciler.length > 6) ? (
                <div className="ml-4 flex flex-col space-y-2">
                  <label className={labelStyle}>Scores per question</label>
                  <div className="grid grid-cols-[repeat({maxPuanlar.length},minmax(60px,1fr))] gap-2">
                    {maxPuanlar.map((max, idx) => (
                      <div key={idx}>
                        <label className="text-xs text-TEXT_MUTED block">
                          Q{idx + 1}
                        </label>
                        <input
                          type="number"
                          value={scores[ogr.id]?.[idx] ?? 0}
                          onChange={(e) => handleScoreChange(ogr.id, idx.toString(), e.target.value)}
                          min={0}
                          max={max}
                          className={inputStyle}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-2 p-3 bg-peach-bg rounded text-peach text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          className="sfec-btn w-fit rounded-xl px-4 py-2"
          disabled={selectedIds.length === 0}
        >
          {ogrenciler.length <= 6 ? "Confirm" : "Select Representatives"}
        </button>
      </div>
    </div>
  );
}
