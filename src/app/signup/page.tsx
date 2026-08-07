export const dynamic = "force-dynamic";

import SignupForm from "./SignupForm";
import { appAyariGetir } from "@/lib/app-ayarlari";
import { VARSAYILAN_KURALLAR_METNI, VARSAYILAN_KURALLAR_VERSIYON } from "./kurallar-varsayilan";

export default async function SignupPage() {
  const [metin, versiyon] = await Promise.all([
    appAyariGetir("kurallar_metni"),
    appAyariGetir("kurallar_versiyon"),
  ]);

  return (
    <SignupForm
      kurallarMetni={metin ?? VARSAYILAN_KURALLAR_METNI}
      kurallarVersiyon={versiyon ?? VARSAYILAN_KURALLAR_VERSIYON}
    />
  );
}
