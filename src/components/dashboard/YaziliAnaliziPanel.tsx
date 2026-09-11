"use client";

import { useMemo, useState } from "react";
import { GIRIS_MODU_ETIKET, soruPuanlariniHesapla, type GirisModu } from "@/lib/yazili-soru-puanlari";
import { BLUSH, BORDER_STRONG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

const hucre = "border p-2 text-sm";
const baslikHucre = "border p-2 text-left text-xs font-semibold";

// Yazılı analizi 4. adım — önizleme ve kayıt. Soru puanları kayıtla AYNI
// fonksiyondan (lib/yazili-soru-puanlari.ts soruPuanlariniHesapla) gelir.
export function YaziliAnaliziPanel({
  ogrenciler,
  mod,
  temsiliOgrenciSkorlar,
  maxPuanlar,
  kazanimlar,
  kaydedildi,
  onSave,
}: {
  ogrenciler: { id: string; ad: string; toplamPuan: number }[];
  mod: GirisModu;
  temsiliOgrenciSkorlar: Record<string, number[]>;
  maxPuanlar: number[];
  kazanimlar: string[];
  kaydedildi: boolean;
  onSave: () => Promise<void>;
}) {
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const { hesap, hesapHatasi } = useMemo(() => {
    try {
      return {
        hesap: soruPuanlariniHesapla({
          mod,
          ogrenciler: ogrenciler.map((o) => ({ id: o.id, toplam: o.toplamPuan })),
          temsiliSkorlar: temsiliOgrenciSkorlar,
          maxPuanlar,
        }),
        hesapHatasi: null,
      };
    } catch (err: unknown) {
      return { hesap: null, hesapHatasi: err instanceof Error ? err.message : "Soru puanları hesaplanamadı." };
    }
  }, [mod, ogrenciler, temsiliOgrenciSkorlar, maxPuanlar]);

  const kaydet = async () => {
    setKaydediliyor(true);
    try {
      await onSave();
    } finally {
      setKaydediliyor(false);
    }
  };

  const toplamlar = ogrenciler.map((o) => o.toplamPuan);
  const sirali = [...toplamlar].sort((a, b) => a - b);
  const n = toplamlar.length;
  const ortalama = toplamlar.reduce((t, v) => t + v, 0) / n;
  const medyan = n % 2 === 0 ? (sirali[n / 2 - 1] + sirali[n / 2]) / 2 : sirali[Math.floor(n / 2)];
  const sapma = Math.sqrt(toplamlar.reduce((t, v) => t + (v - ortalama) ** 2, 0) / n);
  const istatistikler: [string, string][] = [
    ["Öğrenci", String(n)],
    ["Ortalama", ortalama.toFixed(1)],
    ["Medyan", medyan.toFixed(1)],
    ["Std. sapma", sapma.toFixed(1)],
    ["En düşük", String(Math.min(...toplamlar))],
    ["En yüksek", String(Math.max(...toplamlar))],
  ];

  const soruBasarisi = hesap
    ? maxPuanlar.map((max, j) => {
        const alinan = ogrenciler.reduce((t, o) => t + (hesap.skorlar[o.id]?.[j] ?? 0), 0);
        return n > 0 && max > 0 ? Math.round((alinan / (max * n)) * 100) : 0;
      })
    : [];

  const kaynakEtiketi = (id: string) =>
    hesap?.gercekIdler.has(id) ? "Girilen" : mod === "otomatik" ? "Otomatik" : "Tahmini";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: TEXT }}>Analiz önizlemesi</h2>
        <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>Giriş yöntemi: {GIRIS_MODU_ETIKET[mod].baslik}</p>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold" style={{ color: TEXT }}>Sınıf istatistikleri (gerçek toplam puanlar)</h3>
        <dl className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {istatistikler.map(([etiket, deger]) => (
            <div key={etiket}>
              <dt className="text-xs" style={{ color: TEXT_MUTED }}>{etiket}</dt>
              <dd className="font-mono text-sm" style={{ color: TEXT }}>{deger}</dd>
            </div>
          ))}
        </dl>
      </section>

      {mod === "otomatik" && (
        <p className="rounded-xl p-3 text-sm" style={{ border: `1px solid ${BLUSH}`, color: TEXT }}>
          Otomatik yerleştirmede soru ve kazanım başarı oranları gerçek veriye dayanmaz; aşağıdaki soru puanları toplamın
          oransal dağılımıdır. Yalnızca yukarıdaki toplam puan istatistikleri anlamlıdır.
        </p>
      )}

      {hesapHatasi && <p className="rounded-xl p-3 text-sm" style={{ border: `1px solid ${BLUSH}`, color: BLUSH }} role="alert">{hesapHatasi}</p>}

      {hesap && (
        <section>
          <h3 className="mb-2 text-sm font-semibold" style={{ color: TEXT }}>Soru bazlı puanlar</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ color: TEXT, borderColor: BORDER_STRONG }}>
              <thead>
                <tr>
                  <th className={baslikHucre}>Öğrenci</th>
                  {maxPuanlar.map((max, j) => (
                    <th key={j} className={baslikHucre} title={kazanimlar[j]}>
                      S{j + 1} <span className="font-normal" style={{ color: TEXT_MUTED }}>/ {max}</span>
                      <span className="block max-w-[10rem] truncate font-normal" style={{ color: TEXT_MUTED }}>{kazanimlar[j]}</span>
                    </th>
                  ))}
                  <th className={baslikHucre}>Toplam</th>
                  <th className={baslikHucre}>Kaynak</th>
                </tr>
              </thead>
              <tbody>
                {ogrenciler.map((o) => (
                  <tr key={o.id}>
                    <td className={hucre}>{o.ad}</td>
                    {maxPuanlar.map((_, j) => (
                      <td key={j} className={`${hucre} tabular-nums`}>{hesap.skorlar[o.id]?.[j] ?? "-"}</td>
                    ))}
                    <td className={`${hucre} tabular-nums font-semibold`}>{o.toplamPuan}</td>
                    <td className={hucre} style={{ color: hesap.gercekIdler.has(o.id) ? MINT : TEXT_MUTED }}>{kaynakEtiketi(o.id)}</td>
                  </tr>
                ))}
                <tr>
                  <td className={`${hucre} font-semibold`}>Soru başarısı</td>
                  {soruBasarisi.map((oran, j) => (
                    <td key={j} className={`${hucre} tabular-nums font-semibold`}>%{oran}</td>
                  ))}
                  <td className={hucre} colSpan={2} style={{ color: TEXT_MUTED }}>{mod === "otomatik" ? "gerçek veriye dayanmaz" : ""}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={kaydet} disabled={!hesap || kaydediliyor || kaydedildi}
          className="sfec-btn w-fit rounded-xl px-4 py-2 disabled:opacity-60">
          {kaydedildi ? "Kaydedildi" : kaydediliyor ? "Kaydediliyor…" : "Kaydet ve bitir"}
        </button>
      </div>
    </div>
  );
}
