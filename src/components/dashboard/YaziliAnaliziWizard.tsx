"use client";

import { useState, useEffect } from "react";
import { YaziliSinavForm } from "./YaziliSinavForm";
import { PuanGirisEkrani } from "./PuanGirisEkrani";
import { TemsiliOgrenciSecici } from "./TemsiliOgrenciSecici";
import { YaziliAnaliziPanel } from "./YaziliAnaliziPanel";
import { getAktifKullaniciId, yaziliSinavOlustur } from "@/app/dashboard/yazili-analizi-actions";
import { getSinifOgrencileri } from "@/app/dashboard/yazili-analizi-actions";
import { soruPuaniGerekenler, type GirisModu } from "@/lib/yazili-soru-puanlari";

const BOS_FORM = {
  sinifId: "",
  ders: "",
  ad: "",
  tarih: "",
  ogretmenId: "", // will be filled from auth
  ogrenciler: [] as { id: string; ad: string }[], // list of students in class (with name)
  ogrenciPuanlar: {} as Record<string, number>, // map of student id to total score
  mod: null as GirisModu | null, // soru puanı giriş yöntemi (3. adım)
  temsiliOgrenciIds: [] as string[],
  temsiliOgrenciSkorlar: {} as Record<string, number[]>,
  maxPuanlar: [] as number[],
  kazanimlar: [] as string[],
};

export function YaziliAnaliziWizard({
  sinifOptions,
  dersOptions,
}: {
  sinifOptions?: { id: string; ad: string }[];
  dersOptions?: string[];
} = {}) {
  const [step, setStep] = useState(1); // 1: Sınav bilgisi, 2: Toplam puanlar, 3: Soru puanları, 4: Analiz / Kayıt
  const [error, setError] = useState<string | null>(null);
  const [kaydedildi, setKaydedildi] = useState(false);
  const [formData, setFormData] = useState(BOS_FORM);

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
          // Sınıf değişince önceki sınıfın puanları ve seçimleri sıfırlanır.
          setFormData((prev) => ({
            ...prev,
            ogrenciler: result.ogrenciler,
            ogrenciPuanlar: {},
            mod: null,
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

  const yeniAnaliz = () => {
    setFormData((prev) => ({ ...BOS_FORM, ogretmenId: prev.ogretmenId }));
    setKaydedildi(false);
    setError(null);
    setStep(1);
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      if (!formData.ogretmenId) throw new Error("Oturum bulunamadı.");
      if (!formData.mod) throw new Error("Soru puanı giriş yöntemini seçin.");
      const result = await yaziliSinavOlustur({
        sinifId: formData.sinifId,
        ders: formData.ders,
        ad: formData.ad,
        tarih: formData.tarih,
        ogretmenId: formData.ogretmenId,
        ogrenciler: formData.ogrenciler.map((ogr) => ({ id: ogr.id, toplamPuan: formData.ogrenciPuanlar[ogr.id] ?? 0 })),
        mod: formData.mod,
        temsiliOgrenciSkorlar: formData.temsiliOgrenciSkorlar,
        maxPuanlar: formData.maxPuanlar,
        kazanimlar: formData.kazanimlar,
      });
      if (result.error) throw new Error(result.error);
      setKaydedildi(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
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
        baslangicPuanlar={formData.ogrenciPuanlar}
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

  const renderStep3 = () =>
    formData.ogrenciler.length === 0 ? (
      <p className="text-TEXT_MUTED">Önce bir sınıf seçin.</p>
    ) : (
      <TemsiliOgrenciSecici
        ogrenciler={formData.ogrenciler}
        toplamlar={formData.ogrenciPuanlar}
        maxPuanlar={formData.maxPuanlar}
        kazanimlar={formData.kazanimlar}
        baslangicModu={formData.mod}
        baslangicSkorlar={formData.temsiliOgrenciSkorlar}
        onGeri={goToPrev}
        onTamam={(mod, skorlar) => {
          const toplamlar = formData.ogrenciler.map((o) => ({ id: o.id, toplam: formData.ogrenciPuanlar[o.id] ?? 0 }));
          setFormData((prev) => ({
            ...prev,
            mod,
            temsiliOgrenciSkorlar: skorlar,
            temsiliOgrenciIds: soruPuaniGerekenler(mod, toplamlar),
          }));
          goToNext();
        }}
      />
    );

  const renderStep4 = () => (
    <div>
      {formData.ogrenciler.length === 0 || Object.keys(formData.ogrenciPuanlar).length === 0 || !formData.mod ? (
        <p className="text-TEXT_MUTED">Önceki adımları tamamlayın.</p>
      ) : (
        <YaziliAnaliziPanel
          ogrenciler={formData.ogrenciler.map((o) => ({
            id: o.id,
            ad: o.ad,
            toplamPuan: formData.ogrenciPuanlar[o.id] ?? 0,
          }))}
          mod={formData.mod}
          temsiliOgrenciSkorlar={formData.temsiliOgrenciSkorlar}
          maxPuanlar={formData.maxPuanlar}
          kazanimlar={formData.kazanimlar}
          kaydedildi={kaydedildi}
          onSave={handleSubmit}
        />
      )}
      {kaydedildi && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm" role="status">
          <span>Yazılı analizi kaydedildi.</span>
          <button type="button" onClick={yeniAnaliz} className="sfec-btn rounded-xl px-4 py-2">Yeni yazılı analizi</button>
        </div>
      )}
      {!kaydedildi && (
        <div className="mt-4 flex justify-start">
          <button type="button" onClick={goToPrev} className="sfec-btn rounded-xl px-4 py-2">Geri</button>
        </div>
      )}
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
      {error && <p className="text-sm text-peach" role="alert">{error}</p>}
      {renderBody()}
    </div>
  );
}
