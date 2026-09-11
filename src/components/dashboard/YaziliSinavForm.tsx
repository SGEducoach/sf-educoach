"use client";

import { useState, useEffect } from "react";
import { getOgretmenDersleri } from "@/app/dashboard/yazili-analizi-actions";

const inputStyle = "border rounded px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-MINT focus:ring-offset-2";
const labelStyle = "block text-sm font-medium text-TEXT_MUTED mb-1";

export function YaziliSinavForm({
  onChange,
  onComplete,
  formData,
}: {
  onChange: (data: Partial<typeof formData>) => void;
  onComplete: () => void;
  formData: {
    sinifId: string;
    ders: string;
    ad: string;
    tarih: string;
    ogretmenId: string;
    ogrenciler: { id: string; ad: string }[];
    temsiliOgrenciIds: string[];
    temsiliOgrenciSkorlar: Record<string, number[]>;
    maxPuanlar: number[];
    kazanimlar: string[];
  };
}) {
  const [sinifOptions, setSinifOptions] = useState<{ id: string; ad: string }[]>([]);
  const [dersOptions, setDersOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    sinifId: formData.sinifId,
    ders: formData.ders,
    ad: formData.ad,
    tarih: formData.tarih || "",
    sorular: formData.maxPuanlar.length
      ? formData.maxPuanlar.map((maxPuan, index) => ({ maxPuan, kazanim: formData.kazanimlar[index] ?? "" }))
      : [{ maxPuan: 10, kazanim: "" }],
  });

  // Fetch teacher's classes and subjects
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const ogretmenId = formData.ogretmenId; // from props
        const data = await getOgretmenDersleri(ogretmenId);
        if (data.error) {
          setError(data.error);
        } else {
          setSinifOptions(data.siniflar ?? []);
          setDersOptions(data.dersler ?? []);
          if (!form.sinifId && data.siniflar?.[0]) {
            setForm((prev) => ({ ...prev, sinifId: data.siniflar[0].id }));
          }
          if (!form.ders && data.dersler?.[0]) {
            setForm((prev) => ({ ...prev, ders: data.dersler[0] }));
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [formData.ogretmenId]); // form defaults are intentionally applied only when the teacher changes

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    onChange({ [name]: value });
  };

  const soruSayisiniDegistir = (value: string) => {
    const count = Math.max(1, Math.min(100, Number.parseInt(value, 10) || 1));
    setForm((prev) => ({
      ...prev,
      sorular: Array.from({ length: count }, (_, index) => prev.sorular[index] ?? { maxPuan: 10, kazanim: "" }),
    }));
  };

  const soruyuDegistir = (index: number, alan: "maxPuan" | "kazanim", value: string) => {
    setForm((prev) => ({
      ...prev,
      sorular: prev.sorular.map((soru, i) =>
        i === index ? { ...soru, [alan]: alan === "maxPuan" ? Number.parseInt(value, 10) || 0 : value } : soru
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
    if (!form.sinifId || !form.ders || !form.ad || !form.tarih) {
      setError("All fields are required");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.tarih)) {
      setError("Date must be in YYYY-MM-DD format");
      return;
    }
    if (form.sorular.some((soru) => soru.maxPuan <= 0)) {
      setError("Her sorunun maksimum puanı pozitif olmalıdır");
      return;
    }
    if (form.sorular.some((soru) => !soru.kazanim.trim())) {
      setError("Her soru için kazanım yazılmalıdır");
      return;
    }
    onChange({
      sinifId: form.sinifId,
      ders: form.ders,
      ad: form.ad,
      tarih: form.tarih,
      maxPuanlar: form.sorular.map((soru) => soru.maxPuan),
      kazanimlar: form.sorular.map((soru) => soru.kazanim.trim()),
    });
    setError(null);
    onComplete();
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelStyle}>S��n��f</label>
        <select
          name="sinifId"
          value={form.sinifId}
          onChange={handleChange}
          className={inputStyle}
          disabled={loading}
        >
          <option value="">Select a class</option>
          {sinifOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ad}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelStyle}>Ders</label>
        <select
          name="ders"
          value={form.ders}
          onChange={handleChange}
          className={inputStyle}
          disabled={loading}
        >
          <option value="">Select a subject</option>
          {dersOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelStyle}>S��nav Ad��</label>
        <input
          name="ad"
          value={form.ad}
          onChange={handleChange}
          className={inputStyle}
          placeholder="Example: Yaz��l�� Deneme 1"
        />
      </div>

      <div>
        <label className={labelStyle}>Tarih (YYYY-MM-DD)</label>
        <input
          name="tarih"
          type="date"
          value={form.tarih}
          onChange={handleChange}
          className={inputStyle}
        />
      </div>

      <div className="space-y-3">
        <label className={labelStyle}>Soru sayısı</label>
        <input type="number" min={1} max={100} value={form.sorular.length}
          onChange={(event) => soruSayisiniDegistir(event.target.value)} className={inputStyle} />
        {form.sorular.map((soru, index) => (
          <div key={index} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[120px_1fr]">
            <label className={labelStyle}>
              Soru {index + 1} puanı
              <input type="number" min={1} value={soru.maxPuan}
                onChange={(event) => soruyuDegistir(index, "maxPuan", event.target.value)} className={inputStyle} />
            </label>
            <label className={labelStyle}>
              Soru {index + 1} kazanımı
              <input value={soru.kazanim}
                onChange={(event) => soruyuDegistir(index, "kazanim", event.target.value)}
                className={inputStyle} placeholder="Örn. Birinci dereceden denklemleri çözer." />
            </label>
          </div>
        ))}
        {error && (
          <div className="mt-1 text-xs text-peach">
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button type="submit" className="sfec-btn w-fit rounded-xl px-4 py-2">
          Devam Et
        </button>
      </div>
    </form>
  );
}
