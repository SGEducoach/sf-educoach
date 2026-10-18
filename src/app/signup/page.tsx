export const dynamic = "force-dynamic";

import Link from "next/link";
import SignupForm from "./SignupForm";
import { MINT, TEXT_MUTED } from "@/lib/theme";
import { appAyariGetir } from "@/lib/app-ayarlari";
import { VARSAYILAN_KURALLAR_METNI, VARSAYILAN_KURALLAR_VERSIYON } from "./kurallar-varsayilan";

export default async function SignupPage() {
  const [metin, versiyon] = await Promise.all([
    appAyariGetir("kurallar_metni"),
    appAyariGetir("kurallar_versiyon"),
  ]);

  // Kurum dışı belletmen kaydı ayrı sayfada (Faz 4) — kayıt formunun altında bağlantı.
  return (
    <>
      <SignupForm
        kurallarMetni={metin ?? VARSAYILAN_KURALLAR_METNI}
        kurallarVersiyon={versiyon ?? VARSAYILAN_KURALLAR_VERSIYON}
      />
      <p className="pb-8 text-center text-xs" style={{ color: TEXT_MUTED }}>
        Yurtlu okulda kurum dışı belletmen misiniz?{" "}
        <Link href="/belletmen-kayit" className="font-semibold" style={{ color: MINT }}>Belletmen kaydı</Link>
      </p>
    </>
  );
}
