"use client";

// Veli davet formu (migration 0187): ad, telefon, şifre ve KVKK onayıyla
// hesap açılır, veli öğrenciye otomatik bağlanır ve oturum açılır.
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CircleAlert, ShieldCheck } from "lucide-react";
import { BG0, BG1, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { SIFRE_IPUCU, adNormalize, telefonSanitize } from "@/lib/validators";

const girdi = { border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT };
const etiket = "text-[10px] font-semibold uppercase tracking-wide";

export function VeliDavetFormu({ token, davet, kvkkMetni, baskaOturumAcik }: {
  token: string; davet: { ogrenciAdi: string; kurumAdi: string } | null; kvkkMetni: string; baskaOturumAcik: boolean;
}) {
  const router = useRouter();
  const [ad, setAd] = useState("");
  const [telefon, setTelefon] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifre2, setSifre2] = useState("");
  const [kvkk, setKvkk] = useState(false);
  const [kvkkAcik, setKvkkAcik] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (sifre !== sifre2) return setHata("Şifreler aynı değil.");
    if (!kvkk) return setHata("Devam etmek için KVKK aydınlatma metnini onaylayın.");
    setGonderiliyor(true);
    try {
      const res = await fetch("/api/veli/davet", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, veliAd: adNormalize(ad), telefon, sifre, kvkkOnay: true }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setHata(body.error ?? "Hesap açılamadı."); return; }
      router.replace(body.girisYapildi ? "/dashboard" : "/login?rol=veli");
      router.refresh();
    } catch {
      setHata("Bağlantı sorunu. Tekrar deneyin.");
    } finally {
      setGonderiliyor(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-start justify-center px-4 py-10" style={{ background: BG0 }}>
      <div className="w-full max-w-md">
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <Image src="/icon-192.png" alt="SeFu Koç" width={56} height={56} />
          <h1 className="text-lg font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Veli Hesabı Oluştur</h1>
        </div>

        {!davet ? (
          <div className="rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <CircleAlert size={28} color={BLUSH} className="mx-auto" aria-hidden="true" />
            <h2 className="mt-2 text-base font-bold" style={{ color: TEXT }}>Bağlantı Geçersiz</h2>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
              Bu davet bağlantısı geçersiz, süresi dolmuş ya da daha önce kullanılmış. Öğrencinizden panelindeki <strong>Profilim → Velimi Davet Et</strong> bölümünden yeni bir bağlantı göndermesini isteyin.
            </p>
            <Link href="/login?rol=veli" className="sfec-btn mt-4 inline-block rounded-xl px-4 py-2 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>Zaten hesabım var, giriş yap</Link>
          </div>
        ) : (
          <form onSubmit={gonder} className="flex flex-col gap-3 rounded-3xl p-6" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}`, color: TEXT }}>
              <strong>{davet.ogrenciAdi}</strong>{davet.kurumAdi ? <> ({davet.kurumAdi})</> : null} sizi veli olarak davet etti. Hesabınız açılınca öğrencinin gelişimini kendi panelinizden izleyebilirsiniz.
            </div>
            {baskaOturumAcik && (
              <p className="text-[11px] font-semibold leading-relaxed" style={{ color: BLUSH }}>
                Bu cihazda başka bir hesap açık. Devam ederseniz o hesaptan çıkılır ve veli hesabınız açılır.
              </p>
            )}
            <label className="flex flex-col gap-1">
              <span className={etiket} style={{ color: TEXT_MUTED }}>Adınız Soyadınız</span>
              <input required value={ad} onChange={(e) => setAd(e.target.value)} maxLength={80} autoComplete="name"
                className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={etiket} style={{ color: TEXT_MUTED }}>Cep Telefonunuz</span>
              <input required value={telefon} onChange={(e) => setTelefon(telefonSanitize(e.target.value))} inputMode="numeric"
                placeholder="05321234567" autoComplete="tel" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={etiket} style={{ color: TEXT_MUTED }}>Şifre</span>
              <input required type="password" value={sifre} onChange={(e) => setSifre(e.target.value)} autoComplete="new-password"
                className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
              <span className="text-[10px]" style={{ color: TEXT_MUTED }}>{SIFRE_IPUCU}</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className={etiket} style={{ color: TEXT_MUTED }}>Şifre (Tekrar)</span>
              <input required type="password" value={sifre2} onChange={(e) => setSifre2(e.target.value)} autoComplete="new-password"
                className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
            </label>
            <div className="flex items-start gap-2 text-xs" style={{ color: TEXT }}>
              <input id="kvkk" type="checkbox" checked={kvkk} onChange={(e) => setKvkk(e.target.checked)} className="mt-0.5" />
              <label htmlFor="kvkk" className="leading-relaxed">
                <button type="button" onClick={() => setKvkkAcik((v) => !v)} className="font-bold underline" style={{ color: MINT }}>KVKK aydınlatma metnini</button> okudum ve anladım.
              </label>
            </div>
            {kvkkAcik && (
              <div className="max-h-56 overflow-y-auto whitespace-pre-line rounded-xl p-3 text-[11px] leading-relaxed" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}`, color: TEXT_MUTED }}>{kvkkMetni}</div>
            )}
            {hata && <p role="alert" className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
            <button type="submit" disabled={gonderiliyor} className="sfec-btn rounded-xl py-2.5 text-sm font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
              {gonderiliyor ? "Hesabınız açılıyor..." : "Hesabımı oluştur"}
            </button>
            <p className="flex items-start gap-1.5 text-[10px] leading-relaxed" style={{ color: TEXT_MUTED }}>
              <ShieldCheck size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
              Bu bağlantı tek kullanımlıktır. Sonraki girişlerinizde Veli girişinden okulu, öğrencinin numarasını ve bu şifreyi kullanırsınız.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
