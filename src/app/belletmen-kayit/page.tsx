export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { appAyariGetir } from "@/lib/app-ayarlari";
import { VARSAYILAN_KURALLAR_METNI, VARSAYILAN_KURALLAR_VERSIYON } from "@/app/signup/kurallar-varsayilan";
import { BelletmenKayitFormu } from "./BelletmenKayitFormu";

export const metadata: Metadata = { title: "Kurum Dışı Belletmen Kaydı | SeFu Koç" };

// Kurum dışı belletmen kaydı (kullanıcı isteği 18.10.2026, Faz 4): yalnız
// yurtlu okullar listelenir; başvuru admin onayından sonra etkinleşir.
export default async function BelletmenKayitPage() {
  const admin = createAdminClient();
  const [{ data: okullar }, metin, versiyon] = await Promise.all([
    admin.from("schools").select("id, ad").eq("tur", "okul").eq("yurtlu", true).neq("aktif", false).is("grup_kapasitesi", null).order("ad"),
    appAyariGetir("kurallar_metni"),
    appAyariGetir("kurallar_versiyon"),
  ]);
  return (
    <BelletmenKayitFormu okullar={(okullar ?? []) as { id: string; ad: string }[]}
      kurallarMetni={metin ?? VARSAYILAN_KURALLAR_METNI} kurallarVersiyon={versiyon ?? VARSAYILAN_KURALLAR_VERSIYON} />
  );
}
