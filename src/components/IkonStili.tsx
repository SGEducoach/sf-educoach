"use client";

import type { ReactNode } from "react";
import { LucideProvider } from "lucide-react";

// Kullanıcı isteği (25.09.2026): herkese açık sayfalardaki çizgi ikonlar
// ince/basit görünüyordu. Lucide'ın varsayılan 2'lik çizgisi hafifçe
// kalınlaştırıldı; boyut ve renk her ikonun kendi prop'unda kalıyor, burada
// yalnızca çizgi kalınlığı ortaklaştırılıyor ki tüm ikonlar aynı görsel
// ağırlıkta dursun. Dolu ikona dönüştürme yok.
export const IKON_CIZGI_KALINLIGI = 2.25;

export function IkonStili({ children }: { children: ReactNode }) {
  return <LucideProvider strokeWidth={IKON_CIZGI_KALINLIGI}>{children}</LucideProvider>;
}
