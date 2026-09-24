"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Kullanıcı isteği (24.09.2026): haftalık program çıktısı "kesinlikle bir
// sayfaya sığsın". İçerik sayfa kutusundan uzunsa orantılı küçültülür —
// yazdırma ölçeği tarayıcı ayarına bırakılmaz, ölçek satır içi stil olarak
// yazıldığı için ekranda da çıktıda da aynıdır.
//
// Ölçüm: CSS'te 1mm = 96/25.4 px olduğundan mm cinsinden hedef yükseklik
// doğrudan px'e çevrilebilir.
const MM = 96 / 25.4;
// En fazla bu kadar küçültülür; daha da taşıyorsa (aşırı dolu hafta) alt
// kenardan kırpmak yerine okunaklılık korunur ve uyarı gösterilir.
const EN_KUCUK_OLCEK = 0.55;

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
    // Önce ölçeksiz gerçek yüksekliği ölç.
    el.style.transform = "none";
    const gercek = el.scrollHeight;
    const hedef = yukseklikMm * MM;
    const oran = gercek > 0 ? hedef / gercek : 1;
    const yeni = Math.min(1, Math.max(EN_KUCUK_OLCEK, oran));
    el.style.transform = `scale(${yeni})`;
    setOlcek(yeni);
    setTasiyor(oran < EN_KUCUK_OLCEK);
  }, [yukseklikMm]);

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
        <div ref={icerikRef} style={{ width: `${genislikMm}mm`, transformOrigin: "top left", transform: `scale(${olcek})` }}>
          {children}
        </div>
      </div>
    </>
  );
}
