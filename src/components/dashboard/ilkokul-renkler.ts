// İlkokul gelişim raporu düzey renkleri (giriş ve rapor ekranları ortak).
// "Geliştirilmeli" akademik bir eksik: kırmızı değil sıcak nötr (ortaokulla
// aynı ilke).
import type { GelisimDuzeyi, SdoDuzeyi } from "@/lib/ilkokul-gelisim";
import { BUTTER, BUTTER_BG, MINT, MINT_BG, PEACH, PEACH_BG, SKY, SKY_BG } from "@/lib/theme";

export const DUZEY_RENK: Record<GelisimDuzeyi, { arka: string; yazi: string }> = {
  gelistirilmeli: { arka: PEACH_BG, yazi: PEACH },
  yeterli: { arka: BUTTER_BG, yazi: BUTTER },
  iyi: { arka: SKY_BG, yazi: SKY },
  cok_iyi: { arka: MINT_BG, yazi: MINT },
};

export const SDO_RENK: Record<SdoDuzeyi, { arka: string; yazi: string }> = {
  dusuk: { arka: PEACH_BG, yazi: PEACH },
  orta: { arka: BUTTER_BG, yazi: BUTTER },
  yuksek: { arka: SKY_BG, yazi: SKY },
  cok_yuksek: { arka: MINT_BG, yazi: MINT },
};
