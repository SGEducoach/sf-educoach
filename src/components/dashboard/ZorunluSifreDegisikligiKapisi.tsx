"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sifreGecerliMi, SIFRE_IPUCU } from "@/lib/validators";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, MINT_BG, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// Öğrenci kayıt olurken kendi şifresini seçmiyor — sistem rastgele bir
// "geçici şifre" üretip ekranda gösteriyor (bkz. SignupForm.tsx,
// profiles.gecici_sifre). Bu bileşen, gecici_sifre=true olan bir hesap
// dashboard'a girdiğinde tüm içeriği kapatıp kendi şifresini belirlemesini
// zorunlu kılıyor. Kapatma (X) tuşu yok — bilinçli olarak atlanamaz.
export function ZorunluSifreDegisikligiKapisi({ gecici }: { gecici: boolean }) {
  const [acik, setAcik] = useState(gecici);
  if (!acik) return null;
  return <ZorunluSifreDegisikligi onTamam={() => setAcik(false)} />;
}

function ZorunluSifreDegisikligi({ onTamam }: { onTamam: () => void }) {
  const supabase = createClient();
  const [sifre, setSifre] = useState("");
  const [sifre2, setSifre2] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!sifreGecerliMi(sifre)) return setHata("Şifre geçersiz. " + SIFRE_IPUCU);
    if (sifre !== sifre2) return setHata("Şifreler eşleşmiyor.");

    setYukleniyor(true);
    const { error: guncelleHatasi } = await supabase.auth.updateUser({ password: sifre });
    if (guncelleHatasi) {
      setYukleniyor(false);
      return setHata(guncelleHatasi.message);
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ gecici_sifre: false }).eq("id", user.id);
    }
    setYukleniyor(false);
    onTamam();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
      <form onSubmit={gonder} className="sgec-fade rounded-3xl p-6 max-w-sm w-full flex flex-col gap-3" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1" style={{ background: MINT_BG }}>
          <KeyRound size={18} color={MINT} />
        </div>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Yeni şifrenizi belirleyin</h2>
        <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed mb-1">
          Geçici şifreyle giriş yaptınız. Devam etmeden önce yeni şifrenizi iki alana da aynı şekilde yazarak belirlemeniz gerekiyor.
        </p>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Yeni şifre</span>
          <input type="password" required minLength={8} autoFocus value={sifre} onChange={(e) => setSifre(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl outline-none w-full" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          <span style={{ color: TEXT_MUTED }} className="text-[10px]">{SIFRE_IPUCU}</span>
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Yeni şifre (tekrar)</span>
          <input type="password" required minLength={8} value={sifre2} onChange={(e) => setSifre2(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl outline-none w-full" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <button type="submit" disabled={yukleniyor}
          className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {yukleniyor ? "Kaydediliyor..." : "Şifreyi belirle ve devam et"}
        </button>
      </form>
    </div>
  );
}
