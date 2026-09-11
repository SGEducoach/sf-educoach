"use client";

import { useState, useEffect } from "react";
import { getOgretmenDersleri } from "@/app/dashboard/yazili-analizi-actions";
import { BG0, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

const inputClass = "w-full rounded-xl px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-offset-1";
const inputStyle = { background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}`, "--tw-ring-color": MINT } as React.CSSProperties;
const labelClass = "mb-1.5 block text-xs font-bold";

export function YaziliSinavForm({
  onChange,
  onComplete,
  formData,
  hazirSiniflar,
  hazirDersler,
}: {
  onChange: (data: Partial<typeof formData>) => void;
  onComplete: () => void;
  hazirSiniflar?: { id: string; ad: string }[];
  hazirDersler?: string[];
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
  const [sinifOptions, setSinifOptions] = useState<{ id: string; ad: string }[]>(hazirSiniflar ?? []);
  const [dersOptions, setDersOptions] = useState<string[]>(hazirDersler ?? []);
  const [loading, setLoading] = useState(!hazirSiniflar);
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
    if (hazirSiniflar && hazirDersler) return;
    if (!formData.ogretmenId) {
      return;
    }
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
          setForm((prev) => ({
            ...prev,
            sinifId: prev.sinifId || data.siniflar[0]?.id || "",
            ders: prev.ders || data.dersler[0] || "",
          }));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [formData.ogretmenId, hazirDersler, hazirSiniflar]); // form defaults are intentionally applied only when the teacher changes

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
      setError("Sınıf, ders, sınav adı ve tarih alanları zorunludur.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.tarih)) {
      setError("Geçerli bir sınav tarihi seçin.");
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
    return <div className="rounded-2xl p-6 text-center text-sm" style={{ background: BG1_ALT, color: TEXT_MUTED }}>Sınıf ve ders bilgileri yükleniyor…</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass} style={{ color: TEXT_MUTED }}>Sınıf</label>
        <select
          name="sinifId"
          value={form.sinifId}
          onChange={handleChange}
          className={inputClass}
          style={inputStyle}
          disabled={loading}
        >
          <option value="">Sınıf seçin</option>
          {sinifOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.ad}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} style={{ color: TEXT_MUTED }}>Ders</label>
        <select
          name="ders"
          value={form.ders}
          onChange={handleChange}
          className={inputClass}
          style={inputStyle}
          disabled={loading}
        >
          <option value="">Ders seçin</option>
          {dersOptions.map((d) => (
            <option key={d} value={d}>
              {d === "Türkçe" ? "Türk Dili ve Edebiyatı" : d}
            </option>
          ))}
        </select>
      </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass} style={{ color: TEXT_MUTED }}>Sınav adı</label>
        <input
          name="ad"
          value={form.ad}
          onChange={handleChange}
          className={inputClass}
          style={inputStyle}
          placeholder="Örn. 1. dönem 1. yazılı"
        />
      </div>

      <div>
        <label className={labelClass} style={{ color: TEXT_MUTED }}>Sınav tarihi</label>
        <input
          name="tarih"
          type="date"
          value={form.tarih}
          onChange={handleChange}
          className={inputClass}
          style={inputStyle}
        />
      </div>
      </div>

      <div className="space-y-3 rounded-2xl p-4" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
        <div className="max-w-40"><label className={labelClass} style={{ color: TEXT_MUTED }}>Soru sayısı</label>
        <input type="number" min={1} max={100} value={form.sorular.length}
          onChange={(event) => soruSayisiniDegistir(event.target.value)} className={inputClass} style={inputStyle} /></div>
        {form.sorular.map((soru, index) => (
          <div key={index} className="grid gap-3 rounded-xl p-3 sm:grid-cols-[140px_1fr]" style={{ background: BG0, border: `1px solid ${BORDER}` }}>
            <label className={labelClass} style={{ color: TEXT_MUTED }}>
              {index + 1}. soru puanı
              <input type="number" min={1} value={soru.maxPuan}
                onChange={(event) => soruyuDegistir(index, "maxPuan", event.target.value)} className={inputClass} style={inputStyle} />
            </label>
            <label className={labelClass} style={{ color: TEXT_MUTED }}>
              {index + 1}. soru kazanımı
              <input value={soru.kazanim}
                onChange={(event) => soruyuDegistir(index, "kazanim", event.target.value)}
                className={inputClass} style={inputStyle} placeholder="Örn. Birinci dereceden denklemleri çözer." />
            </label>
          </div>
        ))}
        {error && (
          <div role="alert" className="mt-1 rounded-xl px-3 py-2 text-xs" style={{ color: BLUSH, border: `1px solid ${BLUSH}` }}>
            {error}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button type="submit" className="sfec-btn w-fit rounded-full px-5 py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>
          Devam Et
        </button>
      </div>
    </form>
  );
}
