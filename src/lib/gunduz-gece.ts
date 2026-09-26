// Gece/gündüz modu (kullanıcı isteği, 27.09.2026 — 24.08'de kaldırılmıştı,
// bkz. commit c7df80d). Gece = sitenin koyu teması (admin seçimi; açık bir
// tema seçildiyse Gece Siyahı), gündüz = en açık tema (Pamukkale).
//
// 24.08'deki "yanlış tema parlaması" hatasının kökü iki ayrı mantığın
// (saat bazlı ilk betik ↔ sistem tercihli bileşen) çelişmesiydi. Burada TEK
// kaynak var: modBelirle(). İlk boyamadan önce çalışan TEMA_BETIGI aynı
// sabitlerle aynı hesabı yapar; istemci bileşeni de modBelirle'yi kullanır.

export type TemaTercihi = "otomatik" | "gunduz" | "gece";
export type TemaModu = "gunduz" | "gece";

export const TEMA_TERCIH_ANAHTARI = "sfec_tema_tercihi";
// Otomatik modda Türkiye saatiyle gündüz aralığı: [07:00, 19:00).
export const GUNDUZ_BASLANGIC_SAATI = 7;
export const GUNDUZ_BITIS_SAATI = 19;

export function tercihOku(deger: string | null | undefined): TemaTercihi {
  return deger === "gunduz" || deger === "gece" ? deger : "otomatik";
}

export function modBelirle(tercih: TemaTercihi, saatTR: number): TemaModu {
  if (tercih !== "otomatik") return tercih;
  return saatTR >= GUNDUZ_BASLANGIC_SAATI && saatTR < GUNDUZ_BITIS_SAATI ? "gunduz" : "gece";
}

export function simdikiSaatTR(tarih = new Date()): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", hour: "2-digit", hourCycle: "h23" }).format(tarih));
}

// <head>'e satır içi konan, sayfa boyanmadan önce çalışan betik — modBelirle
// ile birebir aynı kural (sabitler buradan gömülür).
export const TEMA_BETIGI = `(function(){try{var t=localStorage.getItem(${JSON.stringify(TEMA_TERCIH_ANAHTARI)});var m=(t==="gunduz"||t==="gece")?t:null;if(!m){var s=Number(new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Istanbul",hour:"2-digit",hourCycle:"h23"}).format(new Date()));m=(s>=${GUNDUZ_BASLANGIC_SAATI}&&s<${GUNDUZ_BITIS_SAATI})?"gunduz":"gece";}document.documentElement.setAttribute("data-tema",m);}catch(e){}})();`;
