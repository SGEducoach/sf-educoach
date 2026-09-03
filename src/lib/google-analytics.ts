import "server-only";
import { GoogleAuth } from "google-auth-library";

type Rapor = { rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[] };
export type AnalyticsSonucu =
  | { durum: "kurulum" | "hata"; mesaj: string }
  | { durum: "hazir"; gun: number; ozet: number[]; gunler: { etiket: string; deger: number }[]; kaynaklar: { etiket: string; deger: number }[]; sayfalar: { etiket: string; deger: number }[] };

// Yalnızca admin yetkisi doğrulandıktan sonra çağrılır. Tarayıcıya anahtar,
// erişim token'ı veya Google'ın ham hata yanıtı gönderilmez.
export async function googleAnalyticsGetir(gun: number): Promise<AnalyticsSonucu> {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const clientEmail = process.env.GA4_CLIENT_EMAIL;
  const privateKey = process.env.GA4_PRIVATE_KEY;
  if (!propertyId || !clientEmail || !privateKey) return {
    durum: "kurulum", mesaj: "Google Analytics bağlantısı henüz kurulmadı. GA4 mülk kimliği ve okuma yetkili hizmet hesabı sunucu ayarlarına eklenmeli."
  };
  if (!/^\d+$/.test(propertyId)) return { durum: "kurulum", mesaj: "GA4 mülk kimliği sayısal olmalı; G- ile başlayan ölçüm kimliğinden farklıdır." };
  const donem = [7, 28, 90].includes(gun) ? gun : 28;
  try {
    const auth = new GoogleAuth({ credentials: { client_email: clientEmail, private_key: privateKey.replace(/\\n/g, "\n") },
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"] });
    const token = await auth.getAccessToken();
    if (!token) throw new Error("Token missing");
    async function rapor(metrics: string[], dimension?: string, limit?: number): Promise<Rapor> {
      const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
        method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        cache: "no-store", signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ dateRanges: [{ startDate: `${donem}daysAgo`, endDate: "yesterday" }],
          metrics: metrics.map(name => ({ name })),
          ...(dimension ? { dimensions: [{ name: dimension }], orderBys: dimension === "date"
            ? [{ dimension: { dimensionName: "date" } }]
            : [{ metric: { metricName: metrics[0] }, desc: true }] } : {}),
          ...(limit ? { limit } : {}) }),
      });
      if (!response.ok) throw new Error(`GA status ${response.status}`);
      return response.json() as Promise<Rapor>;
    }
    const [ozet, gunler, kaynaklar, sayfalar] = await Promise.all([
      rapor(["activeUsers", "sessions", "screenPageViews", "engagementRate"]),
      rapor(["sessions"], "date"), rapor(["sessions"], "sessionDefaultChannelGroup", 8),
      rapor(["screenPageViews"], "pagePath", 8),
    ]);
    const sayi = (v?: string) => { const n = Number(v ?? 0); return Number.isFinite(n) ? n : 0; };
    const satirlar = (r: Rapor) => (r.rows ?? []).map(row => ({ etiket: row.dimensionValues?.[0]?.value ?? "—", deger: sayi(row.metricValues?.[0]?.value) }));
    return { durum: "hazir", gun: donem,
      ozet: [0, 1, 2, 3].map(i => sayi(ozet.rows?.[0]?.metricValues?.[i]?.value)),
      gunler: satirlar(gunler), kaynaklar: satirlar(kaynaklar), sayfalar: satirlar(sayfalar) };
  } catch {
    return { durum: "hata", mesaj: "Google Analytics verileri alınamadı. Hizmet hesabının mülkte Görüntüleyici erişimini, Analytics Data API'nin açık olduğunu ve sunucu bağlantısını kontrol edin." };
  }
}
