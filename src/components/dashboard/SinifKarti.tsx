import Link from "next/link";
import type { SinifKartOzeti } from "@/lib/sinif-kart-ozeti";

// Sınıflarım kartı (kullanıcı kararı 18.10.2026): "Nabız" içeriği (sınıf
// adı, son 7 günde veri giren öğrenci halkası, bekleyen onay) "Seviye
// tonu" zemininde — seviyeye göre renk, SeFu amblemi filigran. Zemin ve
// efektler globals.css'te (.sfec-sinif-karti). Halka renkleri koyu mavi
// zeminde okunsun diye parlak tonlar.
const HALKA_YARICAP = 20;
const CEVRE = 2 * Math.PI * HALKA_YARICAP;

function halkaRengi(oran: number): string {
  if (oran >= 0.7) return "#8ef0c0";
  if (oran >= 0.45) return "#ffd479";
  return "#ffa3b5";
}

export function SinifKarti({ id, seviye, sube, benim, ozet }: {
  id: string; seviye: string; sube: string; benim: boolean; ozet?: SinifKartOzeti;
}) {
  const ad = `${seviye}-${sube}`;
  const oran = ozet && ozet.ogrenci > 0 ? ozet.aktif / ozet.ogrenci : null;
  const etiket = [
    `${ad} sınıfı`,
    benim ? "sınıfınız" : null,
    ozet ? `${ozet.ogrenci} öğrenci` : null,
    oran !== null && ozet ? `son 7 günde ${ozet.aktif} öğrenci veri girdi` : null,
    ozet?.onay ? `${ozet.onay} soru çözümü onay bekliyor` : null,
  ].filter(Boolean).join(", ");

  return (
    <Link href={`/dashboard?bolum=ozet&sinif=${id}`} className="sfec-sinif-karti" data-seviye={seviye} aria-label={etiket}>
      <div className="min-w-0">
        <div className="sfec-sinif-karti__ad">{ad}</div>
        {benim && <span className="sfec-sinif-karti__benim">Sınıfınız</span>}
      </div>
      {oran !== null && (
        <svg viewBox="0 0 52 52" className="sfec-sinif-karti__halka" aria-hidden="true">
          <circle cx="26" cy="26" r={HALKA_YARICAP} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="6" />
          <circle cx="26" cy="26" r={HALKA_YARICAP} fill="none" stroke={halkaRengi(oran)} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={CEVRE} strokeDashoffset={CEVRE * (1 - oran)} transform="rotate(-90 26 26)" />
          <text x="26" y="30" textAnchor="middle" fontSize="11" fontWeight="800" fill="#fff">%{Math.round(oran * 100)}</text>
        </svg>
      )}
      <div className="sfec-sinif-karti__alt">
        <span>{ozet ? (ozet.ogrenci > 0 ? `son 7 gün ${ozet.aktif}/${ozet.ogrenci}` : "öğrenci yok") : ""}</span>
        {!!ozet?.onay && <span className="sfec-sinif-karti__onay">{ozet.onay} onay</span>}
      </div>
    </Link>
  );
}
