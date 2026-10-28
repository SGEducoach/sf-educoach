// Veli telefonları serbest metin olarak girilmiş olabilir ("0 532 123 45 67",
// "+90 532...", "5321234567"). Sağlayıcılara ortak biçim: 90 + 10 hane (905321234567).

/** Geçerli bir Türkiye cep numarasını "905XXXXXXXXX" yapar; geçersizse null. */
export function telefonuNormallestir(ham: string | null | undefined): string | null {
  if (!ham) return null;
  let rakam = ham.replace(/\D/g, "");
  if (rakam.startsWith("00")) rakam = rakam.slice(2);
  if (rakam.startsWith("90") && rakam.length === 12) rakam = rakam.slice(2);
  else if (rakam.startsWith("0") && rakam.length === 11) rakam = rakam.slice(1);
  return /^5\d{9}$/.test(rakam) ? `90${rakam}` : null;
}

/** Sağlayıcının on haneli (5XXXXXXXXX) biçimi. */
export function telefonOnHane(normal: string): string {
  return normal.slice(2);
}

/** Aynı numarayı (kardeşler) bir kez tutar; geçersizleri sayar. */
export function telefonlariHazirla(hamlar: (string | null | undefined)[]): { numaralar: string[]; gecersiz: number; tekrar: number } {
  const goruldu = new Set<string>();
  let gecersiz = 0;
  let tekrar = 0;
  for (const ham of hamlar) {
    const n = telefonuNormallestir(ham);
    if (!n) { gecersiz++; continue; }
    if (goruldu.has(n)) { tekrar++; continue; }
    goruldu.add(n);
  }
  return { numaralar: [...goruldu], gecersiz, tekrar };
}
