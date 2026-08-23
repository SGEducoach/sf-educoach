"use client";

import { useState, useTransition } from "react";
import { Check, UserRound } from "lucide-react";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { telefonSanitize, TELEFON_IPUCU } from "@/lib/validators";

// Paylaşılan kişisel bilgi düzenleme formu — admin ve moderatör "Profilim"
// sayfalarında kullanılıyor (bkz. AdminProfilim.tsx, ModeratorProfilim.tsx).
// `guncelle` bir server action referansı — çağıran server component hangi
// role ait action'ı (adminKendiBilgileriniGuncelle / moderatorKendi...)
// geçerse o çalışır, form kendisi role'e bakmıyor.
export function KisiselBilgilerFormu({ baslangic, guncelle }: {
  baslangic: { ad: string; email: string; telefon: string };
  guncelle: (input: { ad: string; email: string; telefon: string }) => Promise<{ error: string | null }>;
}) {
  const [ad, setAd] = useState(baslangic.ad);
  const [email, setEmail] = useState(baslangic.email);
  const [telefon, setTelefon] = useState(baslangic.telefon);
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);
  const [pending, startTransition] = useTransition();

  function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasarili(false);
    startTransition(async () => {
      const res = await guncelle({ ad, email, telefon });
      if (res.error) return setHata(res.error);
      setBasarili(true);
    });
  }

  return (
    <div className="rounded-3xl p-5 max-w-sm" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <UserRound size={13} color={TEXT_MUTED} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[14px] font-bold">Kişisel bilgiler</span>
      </div>
      <form onSubmit={kaydet} className="flex flex-col gap-2.5">
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ad Soyad</span>
          <input value={ad} onChange={(e) => setAd(e.target.value)} required
            className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">E-posta</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Telefon</span>
          <input value={telefon} onChange={(e) => setTelefon(telefonSanitize(e.target.value))} type="tel" inputMode="numeric" placeholder={TELEFON_IPUCU}
            className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>

        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        {basarili && (
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: MINT }}>
            <Check size={13} /> Bilgileriniz güncellendi.
          </div>
        )}

        <button type="submit" disabled={pending}
          className="sfec-btn self-start text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </form>
    </div>
  );
}
