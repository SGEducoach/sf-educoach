"use client";

import { useMemo, useState } from "react";
import {
  GIRIS_MODLARI,
  GIRIS_MODU_ETIKET,
  soruPuaniGerekenler,
  soruPuaniHatasi,
  temsilcileriSec,
  TEMSILI_KISI_SAYISI,
  type GirisModu,
  type TemsilciGrubu,
} from "@/lib/yazili-soru-puanlari";
import { BG0, BLUSH, BORDER_STRONG, MINT, MINT_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

const GRUP_ETIKET: Record<TemsilciGrubu, string> = { "en-iyi": "En iyi", orta: "Orta", "en-dusuk": "En düşük" };

// Yazılı analizi 3. adım — soru puanlarının nasıl girileceği (kullanıcı
// kararı 11.09.2026: tek tek / en iyi 2 · orta 2 · kötü 2 / otomatik
// yerleştir). Hesap ve doğrulama lib/yazili-soru-puanlari.ts'te; sunucu da
// aynı kuralları uygular. Devam et doğrulamadan geçmeden ilerlemez.
export function TemsiliOgrenciSecici({
  ogrenciler,
  toplamlar,
  maxPuanlar,
  kazanimlar,
  baslangicModu,
  baslangicSkorlar,
  onTamam,
  onGeri,
}: {
  ogrenciler: { id: string; ad: string }[];
  toplamlar: Record<string, number>;
  maxPuanlar: number[];
  kazanimlar: string[];
  baslangicModu: GirisModu | null;
  baslangicSkorlar: Record<string, number[]>;
  onTamam: (mod: GirisModu, skorlar: Record<string, number[]>) => void;
  onGeri: () => void;
}) {
  const [mod, setMod] = useState<GirisModu | null>(baslangicModu);
  const [girdiler, setGirdiler] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(Object.entries(baslangicSkorlar).map(([id, skorlar]) => [id, skorlar.map(String)]))
  );
  const [hata, setHata] = useState<string | null>(null);

  const ogrenciToplamlari = useMemo(
    () => ogrenciler.map((o) => ({ id: o.id, toplam: toplamlar[o.id] ?? 0 })),
    [ogrenciler, toplamlar]
  );
  const adlar = useMemo(() => Object.fromEntries(ogrenciler.map((o) => [o.id, o.ad])), [ogrenciler]);
  const gruplar = useMemo(
    () => new Map(temsilcileriSec(ogrenciToplamlari).map((t) => [t.id, t.grup])),
    [ogrenciToplamlari]
  );
  const gerekenler = mod ? soruPuaniGerekenler(mod, ogrenciToplamlari) : [];
  const n = ogrenciler.length;

  const sayilar = (id: string) =>
    maxPuanlar.map((_, j) => {
      const deger = girdiler[id]?.[j];
      return deger === undefined || deger === "" ? NaN : Number(deger);
    });

  const hucreDegistir = (id: string, j: number, deger: string) => {
    setHata(null);
    setGirdiler((onceki) => {
      const satir = [...(onceki[id] ?? maxPuanlar.map(() => ""))];
      satir[j] = deger.replace(/[^0-9]/g, "");
      return { ...onceki, [id]: satir };
    });
  };

  const devamEt = () => {
    if (!mod) {
      setHata("Bir giriş yöntemi seçin.");
      return;
    }
    const skorlar = Object.fromEntries(gerekenler.map((id) => [id, sayilar(id)]));
    const hataMesaji = soruPuaniHatasi({ mod, ogrenciler: ogrenciToplamlari, temsiliSkorlar: skorlar, maxPuanlar, adlar });
    if (hataMesaji) {
      setHata(hataMesaji);
      return;
    }
    onTamam(mod, skorlar);
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: TEXT }}>Soru puanları</h2>
        <p className="mt-1 text-sm" style={{ color: TEXT_MUTED }}>Soru ve kazanım analizi için puanların nasıl girileceğini seçin.</p>
      </div>

      <div role="radiogroup" aria-label="Soru puanı giriş yöntemi" className="grid gap-2 sm:grid-cols-3">
        {GIRIS_MODLARI.map((m) => {
          const secili = mod === m;
          return (
            <label key={m} className="flex cursor-pointer flex-col gap-1 rounded-xl p-3"
              style={{ border: `2px solid ${secili ? MINT : BORDER_STRONG}`, background: secili ? MINT_BG : "transparent" }}>
              <span className="flex items-center gap-2 text-sm font-bold" style={{ color: TEXT }}>
                <input type="radio" name="yazili-giris-modu" checked={secili} onChange={() => { setMod(m); setHata(null); }} />
                {GIRIS_MODU_ETIKET[m].baslik}
              </span>
              <span className="text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>{GIRIS_MODU_ETIKET[m].aciklama}</span>
            </label>
          );
        })}
      </div>

      {mod === "otomatik" && (
        <p className="rounded-xl p-3 text-sm leading-relaxed" style={{ border: `1px solid ${BLUSH}`, color: TEXT }}>
          Bu seçenekte soru puanı girilmez. Soru ve kazanım başarı oranları gerçek veriye dayanmaz — herkesin puanı sorulara
          aynı oranda dağıtılır. Yalnızca toplam puan istatistikleri anlamlıdır; kazanım analizi istiyorsanız diğer iki
          seçenekten birini kullanın.
        </p>
      )}

      {mod && mod !== "otomatik" && (
        <>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>
            {mod === "tek-tek"
              ? `${n} öğrencinin her sorudan aldığı puanı girin.`
              : n <= TEMSILI_KISI_SAYISI
                ? `Sınıfta ${n} öğrenci olduğu için herkesin soru puanı girilir.`
                : `Toplam puana göre seçilen 6 öğrenci: en iyi 2, orta 2, en düşük 2. Diğer ${n - TEMSILI_KISI_SAYISI} öğrencinin soru puanları bu örneğe göre tahmin edilir.`}{" "}
            Her satırın toplamı, önceki adımdaki toplam puana eşit olmalı.
          </p>

          <div className="flex flex-col gap-2">
            {gerekenler.map((id) => {
              const puanlar = sayilar(id);
              const girilenToplam = puanlar.reduce((t, v) => t + (Number.isFinite(v) ? v : 0), 0);
              const beklenen = toplamlar[id] ?? 0;
              const hepsiGirildi = puanlar.every((v) => Number.isFinite(v));
              const tutuyor = hepsiGirildi && girilenToplam === beklenen;
              const grup = gruplar.get(id);
              return (
                <div key={id} className="rounded-xl p-3" style={{ border: `1px solid ${BORDER_STRONG}` }}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold" style={{ color: TEXT }}>
                      {adlar[id]}
                      {mod === "temsili" && grup && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: MINT_BG, color: TEXT }}>
                          {GRUP_ETIKET[grup]}
                        </span>
                      )}
                    </span>
                    <span className="text-xs font-semibold tabular-nums" style={{ color: tutuyor ? MINT : hepsiGirildi ? BLUSH : TEXT_MUTED }}>
                      Soru toplamı {girilenToplam} / {beklenen}
                    </span>
                  </div>
                  <div className="mt-2 overflow-x-auto">
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${maxPuanlar.length}, minmax(3.25rem, 1fr))` }}>
                      {maxPuanlar.map((max, j) => {
                        const deger = puanlar[j];
                        const aralikDisi = Number.isFinite(deger) && deger > max;
                        return (
                          <label key={j} className="flex flex-col gap-1 text-[11px]" style={{ color: TEXT_MUTED }} title={kazanimlar[j]}>
                            <span>S{j + 1} <span className="tabular-nums">/ {max}</span></span>
                            <input
                              inputMode="numeric"
                              value={girdiler[id]?.[j] ?? ""}
                              onChange={(e) => hucreDegistir(id, j, e.target.value)}
                              aria-label={`${adlar[id]}, ${j + 1}. soru, en fazla ${max}`}
                              className="rounded-lg px-2 py-1.5 text-sm tabular-nums"
                              style={{ background: BG0, color: TEXT, border: `1px solid ${aralikDisi ? BLUSH : BORDER_STRONG}` }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {hata && <p className="rounded-xl p-3 text-sm" style={{ border: `1px solid ${BLUSH}`, color: BLUSH }} role="alert">{hata}</p>}

      <div className="flex justify-between">
        <button type="button" onClick={onGeri} className="sfec-btn rounded-xl px-4 py-2">Geri</button>
        <button type="button" onClick={devamEt} className="sfec-btn rounded-xl px-4 py-2">Devam et</button>
      </div>
    </div>
  );
}
