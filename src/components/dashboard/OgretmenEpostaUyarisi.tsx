"use client";

import { useState, useTransition } from "react";
import { Check, MailWarning } from "lucide-react";
import { ogretmenEpostasiniTeyitEt } from "@/app/dashboard/profil-actions";
import { MaskotKonusmaBalonu } from "@/components/dashboard/MaskotKonusmaBalonu";
import { BG0, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { teslimEdilebilirEpostaMi } from "@/lib/validators";

export function OgretmenEpostaUyarisi({ email, goster }: { email: string | null; goster: boolean }) {
  const ilkEmailGecerli = teslimEdilebilirEpostaMi(email);
  const [acik, setAcik] = useState(goster);
  const [duzenliyor, setDuzenliyor] = useState(!ilkEmailGecerli);
  const [yeniEmail, setYeniEmail] = useState(ilkEmailGecerli ? email ?? "" : "");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function teyitEt() {
    setHata(null);
    startTransition(async () => {
      const sonuc = await ogretmenEpostasiniTeyitEt(duzenliyor ? yeniEmail : undefined);
      if (sonuc.error) return setHata(sonuc.error);
      setAcik(false);
    });
  }

  if (!acik) return null;

  return (
    <MaskotKonusmaBalonu onKapat={() => setAcik(false)} ariaLabel="Öğretmen e-posta teyidi">
      <div className="pt-1">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "rgba(225,29,72,0.10)" }}>
          <MailWarning size={18} color={BLUSH} />
        </div>
        <p className="mb-2 text-sm font-semibold leading-relaxed" style={{ color: TEXT }}>
          Bundan sonra şifre sıfırlamaları e-posta üzerinden yapılacağı için kullandığınız e-posta adresini tanımlayın veya doğruluğunu teyit edin.
        </p>

        {ilkEmailGecerli && !duzenliyor ? (
          <div className="mb-3 rounded-xl p-3" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Kayıtlı e-posta</p>
            <p className="mt-1 break-all text-sm font-bold" style={{ color: TEXT }}>{email}</p>
          </div>
        ) : (
          <label className="mb-3 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Kullandığınız e-posta adresi</span>
            <input type="email" required value={yeniEmail} onChange={(e) => setYeniEmail(e.target.value)} placeholder="adiniz@ornek.com"
              className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          </label>
        )}

        {hata && <p className="mb-3 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          {ilkEmailGecerli && !duzenliyor && (
            <button type="button" onClick={() => setDuzenliyor(true)} disabled={pending}
              className="sfec-btn flex-1 rounded-xl py-2 text-xs font-bold" style={{ color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
              Adresi değiştir
            </button>
          )}
          <button type="button" onClick={teyitEt} disabled={pending || (duzenliyor && !yeniEmail.trim())}
            className="sfec-btn flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            <Check size={13} /> {pending ? "Kaydediliyor..." : duzenliyor ? "E-postayı kaydet ve teyit et" : "Mail adresim doğru"}
          </button>
        </div>
      </div>
    </MaskotKonusmaBalonu>
  );
}
