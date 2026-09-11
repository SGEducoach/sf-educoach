"use client";

import { useState, useEffect } from "react";
import { YaziliSinavForm } from "./YaziliSinavForm";
import { PuanGirisEkrani } from "./PuanGirisEkrani";
import { TemsiliOgrenciSecici } from "./TemsiliOgrenciSecici";
import { YaziliAnaliziPanel } from "./YaziliAnaliziPanel";
import { getAktifKullaniciId, yaziliSinavOlustur } from "@/app/dashboard/yazili-analizi-actions";
import { getSinifOgrencileri } from "@/app/dashboard/yazili-analizi-actions";

export function YaziliAnaliziWizard({
  sinifOptions,
  dersOptions,
}: {
  sinifOptions?: { id: string; ad: string }[];
  dersOptions?: string[];
} = {}) {
  const [step, setStep] = useState(1); // 1: Exam Info, 2: Student Totals, 3: Rep Scores, 4: Analysis / Save
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sinifId: "",
    ders: "",
    ad: "",
    tarih: "",
    ogretmenId: "", // will be filled from auth
    ogrenciler: [] as { id: string; ad: string }[], // list of students in class (with name)
    ogrenciPuanlar: {} as Record<string, number>, // map of student id to total score
    temsiliOgrenciIds: [] as string[],
    temsiliOgrenciSkorlar: {} as Record<string, number[]>,
    maxPuanlar: [] as number[],
    kazanimlar: [] as string[],
  });

  // Fetch logged-in teacher ID
  useEffect(() => {
    const loadUser = async () => {
      try {
        const result = await getAktifKullaniciId();
        if (result.error) throw new Error(result.error);
        if (!result.userId) {
          setError("Oturum bilgisi alınamadı.");
          return;
        }
        setFormData((prev) => ({ ...prev, ogretmenId: result.userId! }));
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Oturum bilgisi alınamadı.");
      }
    };
    loadUser();
  }, []);

  // Fetch students when sinifId changes
  useEffect(() => {
    const loadStudents = async () => {
      if (!formData.sinifId) {
        setFormData((prev) => ({ ...prev, ogrenciler: [] }));
        return;
      }
      try {
        const result = await getSinifOgrencileri(formData.sinifId);
        if (result.error) {
          setError(result.error);
        } else {
          setFormData((prev) => ({ ...prev, ogrenciler: result.ogrenciler }));
          // Reset totals when class changes
          setFormData((prev) => ({
            ...prev,
            ogrenciPuanlar: {},
            temsiliOgrenciIds: [],
            temsiliOgrenciSkorlar: {},
          }));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Öğrenciler yüklenemedi.");
      }
    };
    loadStudents();
  }, [formData.sinifId]);

  const goToNext = () => {
    setStep((prev) => Math.min(prev + 1, 4));
  };
  const goToPrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure we have ogretmenId (should be set from useEffect)
      if (!formData.ogretmenId) {
        throw new Error("Oturum bulunamadı.");
      }
      // Prepare ogrenciler with totals
      const ogrencilerWithTotals = formData.ogrenciler.map((ogr) => ({
        id: ogr.id,
        toplamPuan: formData.ogrenciPuanlar[ogr.id] ?? 0,
      }));
      // Validate that all students have a score (should be already validated in step 2)
      const missingScore = ogrencilerWithTotals.some((o) => o.toplamPuan === null || o.toplamPuan === undefined);
      if (missingScore) {
        throw new Error("Tüm öğrencilerin puanlarını girin.");
      }
      const result = await yaziliSinavOlustur({
        sinifId: formData.sinifId,
        ders: formData.ders,
        ad: formData.ad,
        tarih: formData.tarih,
        ogretmenId: formData.ogretmenId,
        ogrenciler: ogrencilerWithTotals,
        temsiliOgrenciIds: formData.temsiliOgrenciIds,
        temsiliOgrenciSkorlar: formData.temsiliOgrenciSkorlar,
        maxPuanlar: formData.maxPuanlar,
        kazanimlar: formData.kazanimlar,
      });
      if (result.error) throw new Error(result.error);
      // Success
      alert("Yazılı analizi başarıyla kaydedildi.");
      // Redirect to the saved exam view
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div>
      <div className="mb-5"><h1 className="text-xl font-extrabold">Yazılı analizi</h1><p className="mt-1 text-sm text-TEXT_MUTED">Sınav bilgilerini, soru puanlarını ve kazanımları girin.</p></div>
      <YaziliSinavForm
        onChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
        onComplete={goToNext}
        formData={formData}
        hazirSiniflar={sinifOptions}
        hazirDersler={dersOptions}
      />
    </div>
  );

  const renderStep2 = () => (
    <div>
      <PuanGirisEkrani
        ogrenciler={formData.ogrenciler}
        maxPuanlar={formData.maxPuanlar}
        sinifId={formData.sinifId}
        onChange={(ogrenciler) => {
          setFormData((prev) => ({
            ...prev,
            ogrenciPuanlar: Object.fromEntries(ogrenciler.map((ogrenci) => [ogrenci.id, ogrenci.toplamPuan])),
          }));
          goToNext();
        }}
      />
      <button type="button" onClick={goToPrev} className="sfec-btn mt-4 rounded-xl px-4 py-2">Geri</button>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <h2>Temsilî öğrenci puanları</h2>
      {formData.ogrenciler.length === 0 ? (
        <p className="text-TEXT_MUTED">Önce bir sınıf seçin.</p>
      ) : (
        <TemsiliOgrenciSecici
          ogrenciler={formData.ogrenciler}
          maxPuanlar={formData.maxPuanlar}
          onOgrenciSec={(ids) => {
            setFormData((prev) => ({
              ...prev,
              temsiliOgrenciIds: ids,
            }));
          }}
          onSkorDegisti={(id, skorlar) => {
            setFormData((prev) => ({
              ...prev,
              temsiliOgrenciSkorlar: {
                ...prev.temsiliOgrenciSkorlar,
                [id]: skorlar,
              },
            }));
          }}
        />
      )}
      <div className="flex justify-between mt-4">
        <button type="button" onClick={goToPrev} className="sfec-btn rounded-xl px-4 py-2">Geri</button>
        <button type="button" onClick={goToNext} className="sfec-btn rounded-xl px-4 py-2">Devam et</button>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div>
      <h2>Analiz ve kayıt</h2>
      {formData.ogrenciler.length === 0 || Object.keys(formData.ogrenciPuanlar).length === 0 ? (
        <p className="text-TEXT_MUTED">Önceki adımları tamamlayın.</p>
      ) : (
        <YaziliAnaliziPanel
          ogrenciler={formData.ogrenciler.map((o) => ({
            id: o.id,
            toplamPuan: formData.ogrenciPuanlar[o.id] ?? 0,
          }))}
          temsiliOgrenciIds={formData.temsiliOgrenciIds}
          temsiliOgrenciSkorlar={formData.temsiliOgrenciSkorlar}
          maxPuanlar={formData.maxPuanlar}
          kazanimlar={formData.kazanimlar}
          onSave={handleSubmit}
        />
      )}
      <div className="flex justify-between mt-4">
        <button type="button" onClick={goToPrev} className="sfec-btn rounded-xl px-4 py-2">Geri</button>
        <button type="button" onClick={handleSubmit} disabled={isLoading} className="sfec-btn rounded-xl px-4 py-2">
          {isLoading ? "Kaydediliyor…" : "Kaydet ve bitir"}
        </button>
      </div>
    </div>
  );

  const renderBody = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      case 4:
        return renderStep4();
      default:
        return renderStep1();
    }
  };

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-peach">{error}</p>}
      {renderBody()}
    </div>
  );
}
