"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Kullanıcı isteği (24.09.2026): haftalık program çıktısı "kesinlikle bir
// sayfaya sığsın". İçerik sayfa kutusundan uzunsa orantılı küçültülür —
// yazdırma ölçeği tarayıcı ayarına bırakılmaz, ölçek satır içi stil olarak
// yazıldığı için ekranda da çıktıda da aynıdır.
//
// Kullanıcı geri bildirimi (25.09.2026): "sağda boşluk kalmış" — küçültme
// genişliği de daralttığı için sayfanın sağı boş kalıyordu. Artık içerik
// ölçeğin tersiyle genişletiliyor (genişlik / ölçek), böylece küçültme
// SADECE dikeyde hissediliyor ve tablo sayfanın tam enini kaplıyor.
// Genişleyen içerik daha kısa sardığı için ölçek birkaç kez yinelenerek
// bulunuyor (en büyük sığan ölçek).
const MM = 96 / 25.4;
const EN_KUCUK_OLCEK = 0.55;
// İkili arama adımı: ölçek küçüldükçe içerik genişler ve kısalır, yani
// "sığıyor mu" sorusu ölçeğe göre tek yönlü — sığan EN BÜYÜK ölçeği ikili
// aramayla buluyoruz (yineleyerek denemek salınıma giriyordu).
const ARAMA_ADIMI = 12;

export function TekSayfaOlcek({ genislikMm, yukseklikMm, children }: {
  genislikMm: number;
  yukseklikMm: number;
  children: React.ReactNode;
}) {
  const icerikRef = useRef<HTMLDivElement>(null);
  const [olcek, setOlcek] = useState(1);
  const [tasiyor, setTasiyor] = useState(false);

  const hesapla = useCallback(() => {
    const el = icerikRef.current;
    if (!el) return;
    const hedef = yukseklikMm * MM;

    // Verilen ölçekte içerik sayfaya sığıyor mu? (Genişlik ölçeğin tersiyle
    // büyütülür ki küçültme sonrası tam eni kaplasın.)
    const sigiyorMu = (k: number) => {
      el.style.transform = "none";
      el.style.width = `${genislikMm / k}mm`;
      return el.scrollHeight * k <= hedef;
    };

    let k = EN_KUCUK_OLCEK;
    if (sigiyorMu(1)) {
      k = 1;
    } else {
      let alt = EN_KUCUK_OLCEK;
      let ust = 1;
      for (let i = 0; i < ARAMA_ADIMI; i++) {
        const orta = (alt + ust) / 2;
        if (sigiyorMu(orta)) alt = orta; else ust = orta;
      }
      k = alt;
    }

    const sigdi = sigiyorMu(k);
    el.style.width = `${genislikMm / k}mm`;
    el.style.transform = `scale(${k})`;
    setOlcek(k);
    setTasiyor(!sigdi);
  }, [genislikMm, yukseklikMm]);

  useLayoutEffect(() => { hesapla(); }, [hesapla]);

  useEffect(() => {
    const gozlemci = new ResizeObserver(() => hesapla());
    if (icerikRef.current) gozlemci.observe(icerikRef.current);
    window.addEventListener("beforeprint", hesapla);
    return () => { gozlemci.disconnect(); window.removeEventListener("beforeprint", hesapla); };
  }, [hesapla]);

  return (
    <>
      {tasiyor && (
        <p className="tasma-uyarisi">
          Bu haftada çok fazla kalem var; çıktı tek sayfaya sığması için en fazla küçültüldü. Daha rahat okumak için haftayı sadeleştirebilirsin.
        </p>
      )}
      <div style={{ width: `${genislikMm}mm`, height: `${yukseklikMm}mm`, overflow: "hidden" }}>
        <div ref={icerikRef} style={{ width: `${genislikMm / olcek}mm`, transformOrigin: "top left", transform: `scale(${olcek})` }}>
          {children}
        </div>
      </div>
    </>
  );
}
