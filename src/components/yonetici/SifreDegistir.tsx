"use client";

import { useState } from "react";
import { KeyRound, Check, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { sifreGecerliMi, SIFRE_IPUCU } from "@/lib/validators";

// Admin kendi şifresini burada değiştirir — supabase.auth.updateUser
// tarayıcıdan doğrudan çağrılıyor, yeni şifre hiçbir sunucu action'ından ya
// da script'ten geçmiyor (ekrana da geri yazılmıyor).
export function SifreDegistir() {
  const supabase = createClient();
  const [acik, setAcik] = useState(false);
  const [yeniSifre, setYeniSifre] = useState("");
  const [tekrar, setTekrar] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);
  const [pending, setPending] = useState(false);

  async function degistir(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasarili(false);
    if (!sifreGecerliMi(yeniSifre)) return setHata(SIFRE_IPUCU);
    if (yeniSifre !== tekrar) return setHata("Şifreler eşleşmiyor.");

    setPending(true);
    const { error } = await supabase.auth.updateUser({ password: yeniSifre });
    setPending(false);
    if (error) return setHata(error.message);

    setBasarili(true);
    setYeniSifre("");
    setTekrar("");
  }

  if (!acik) {
    return (
      <button type="button" onClick={() => setAcik(true)}
        className="sgec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl self-start"
        style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
        <KeyRound size={13} /> Şifremi değiştir
      </button>
    );
  }

  return (
    <div className="sgec-fade rounded-3xl p-5 max-w-sm" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <button type="button" onClick={() => setAcik(false)}
        className="sgec-btn w-full flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
            <KeyRound size={13} color={LILAC} />
          </div>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[14px] font-bold">Şifremi değiştir</span>
        </div>
        <ChevronUp size={15} color={TEXT_MUTED} />
      </button>

      <form onSubmit={degistir} className="flex flex-col gap-2.5">
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Yeni şifre</span>
          <input type="password" required value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Yeni şifre (tekrar)</span>
          <input type="password" required value={tekrar} onChange={(e) => setTekrar(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <p style={{ color: TEXT_MUTED }} className="text-[10px]">{SIFRE_IPUCU}</p>

        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        {basarili && (
          <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: MINT }}>
            <Check size={13} /> Şifreniz güncellendi.
          </div>
        )}

        <button type="submit" disabled={pending}
          className="sgec-btn self-start text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Güncelleniyor..." : "Şifreyi güncelle"}
        </button>
      </form>
    </div>
  );
}
