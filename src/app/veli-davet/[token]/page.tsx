export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { davetTokenOzeti, davetTokeniBicimliMi, davetteOgrenciAdi } from "@/lib/veli-davet-baglantisi";
import { VELI_KVKK_METNI } from "@/lib/veli-kvkk";
import { VeliDavetFormu } from "./VeliDavetFormu";

// Arama motorları davet bağlantılarını dizine eklemesin.
export const metadata: Metadata = { title: "Veli Daveti | SeFu Koç", robots: { index: false, follow: false } };

// Öğrencinin gönderdiği davet bağlantısı (migration 0187). Burada davet
// yalnız OKUNUR; sahiplenme ve hesap açma /api/veli/davet'te atomik yapılır.
export default async function VeliDavetSayfasi({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let davet: { ogrenciAdi: string; kurumAdi: string } | null = null;
  if (davetTokeniBicimliMi(token)) {
    const admin = createAdminClient();
    const { data } = await admin.from("veli_davetleri").select("student_id")
      .eq("token_ozeti", davetTokenOzeti(token))
      .is("kullanildi_at", null).is("iptal_at", null).gt("son_kullanma", new Date().toISOString())
      .maybeSingle();
    if (data) {
      const [{ data: profil }, { data: ogrenci }] = await Promise.all([
        admin.from("profiles").select("ad").eq("id", data.student_id).maybeSingle(),
        admin.from("students").select("schools(ad)").eq("id", data.student_id).maybeSingle(),
      ]);
      const okul = ogrenci?.schools as unknown as { ad: string } | null;
      if (profil) davet = { ogrenciAdi: davetteOgrenciAdi(profil.ad), kurumAdi: okul?.ad ?? "" };
    }
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return <VeliDavetFormu token={token} davet={davet} kvkkMetni={VELI_KVKK_METNI} baskaOturumAcik={!!user} />;
}
