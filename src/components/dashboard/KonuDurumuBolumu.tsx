import { createAdminClient } from "@/lib/supabase/admin";
import { konuDurumuGetir, type KonuDurumuKapsami } from "@/lib/konu-durumu-verisi";
import { KonuDurumuEkrani } from "@/components/dashboard/KonuDurumuEkrani";

// Konu Durumu'nun sunucu tarafı: seçili kapsamı (URL ?kapsam=) sunucuda
// kurulmuş listeden bulur, yoksa ilkini kullanır; veriyi çekip ekrana verir.
// Kapsam listesi çağıranın yetkisinden kurulduğu için service-role güvenli.
export async function KonuDurumuBolumu({ schoolId, kapsamlar, seciliAnahtar, ogrenciLinki = true, bosMesaj }: {
  schoolId: string;
  kapsamlar: KonuDurumuKapsami[];
  seciliAnahtar?: string | null;
  ogrenciLinki?: boolean;
  bosMesaj?: string;
}) {
  const secili = kapsamlar.find((k) => k.anahtar === seciliAnahtar) ?? kapsamlar[0];
  const secenekler = kapsamlar.map(({ anahtar, etiket }) => ({ anahtar, etiket }));
  if (!secili) {
    return <KonuDurumuEkrani veri={null} kapsamlar={[]} seciliAnahtar="" ogrenciLinki={ogrenciLinki} bosMesaj={bosMesaj} />;
  }
  const { veri, error } = await konuDurumuGetir(createAdminClient(), schoolId, secili);
  return (
    <KonuDurumuEkrani key={secili.anahtar} veri={veri} hata={error} kapsamlar={secenekler} seciliAnahtar={secili.anahtar}
      ogrenciLinki={ogrenciLinki} bosMesaj={bosMesaj} />
  );
}
