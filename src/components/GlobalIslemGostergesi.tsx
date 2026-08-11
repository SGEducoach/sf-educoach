"use client";

import { useEffect, useRef, useState } from "react";
import { YukleniyorOverlay } from "@/components/YukleniyorOverlay";

// Tarayıcıdaki tüm eşzamanlı veri isteklerini izler. Kısa isteklerde ekranın
// yanıp sönmemesi için gösterge 180 ms gecikmeyle açılır.
export function GlobalIslemGostergesi() {
  const [visible, setVisible] = useState(false);
  const devamEden = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const asilFetch = window.fetch;

    window.fetch = async (...args) => {
      devamEden.current += 1;
      if (devamEden.current === 1) {
        timer.current = setTimeout(() => setVisible(true), 180);
      }

      try {
        return await asilFetch(...args);
      } finally {
        devamEden.current = Math.max(0, devamEden.current - 1);
        if (devamEden.current === 0) {
          if (timer.current) clearTimeout(timer.current);
          timer.current = null;
          setVisible(false);
        }
      }
    };

    return () => {
      window.fetch = asilFetch;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return <YukleniyorOverlay visible={visible} mesaj="İşlem sürüyor..." />;
}
