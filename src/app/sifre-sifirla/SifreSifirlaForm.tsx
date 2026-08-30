"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { YukleniyorOverlay } from "@/components/YukleniyorOverlay";
import { SeFuMarkaAdi, SeFuSlogan } from "@/components/SeFuWordmark";

// Öğretmen/müdür LoginForm'daki "Şifremi unuttum" akışıyla buraya
// (supabase.auth.resetPasswordForEmail'in redirectTo'su) yönlendiriliyor.
// Supabase JS istemcisi, URL'deki kurtarma token'ını (PKCE ya da implicit
// akış farketmeksizin) otomatik ayrıştırıp bir PASSWORD_RECOVERY olayı
// yayınlıyor — resmi önerilen desen bu, flow-type'a özel bir kod
// yazmaya gerek yok.
export default function SifreSifirlaForm() {
  const router = useRouter();
  const supabase = createClient();

  const [durum, setDurum] = useState<"kontrol" | "hazir" | "gecersiz" | "tamam">("kontrol");
  const [sifre1, setSifre1] = useState("");
  const [sifre2, setSifre2] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);

  useEffect(() => {
    const { data: dinleyici } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setDurum("hazir");
    });
    // Olay abone olunmadan önce zaten işlenmiş olabilir — mevcut oturumu
    // da ayrıca kontrol ediyoruz (yarış durumuna karşı).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setDurum((onceki) => (onceki === "kontrol" ? "hazir" : onceki));
    });
    const zamanAsimi = setTimeout(() => {
      setDurum((onceki) => (onceki === "kontrol" ? "gecersiz" : onceki));
    }, 5000);
    return () => { dinleyici.subscription.unsubscribe(); clearTimeout(zamanAsimi); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sifreGuncelle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (sifre1.length < 6) return setHata("Şifre en az 6 karakter olmalı.");
    if (sifre1 !== sifre2) return setHata("Şifreler eşleşmiyor.");

    setGonderiliyor(true);
    const { error } = await supabase.auth.updateUser({ password: sifre1 });
    setGonderiliyor(false);
    if (error) return setHata("Şifre güncellenemedi. Lütfen tekrar deneyin.");
    setDurum("tamam");
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <Image src="/logo.png" alt="www.sefukoc.com" width={1258} height={837} className="sfec-brand-logo h-28 w-auto max-w-full object-contain mb-2" priority />
          <SeFuMarkaAdi as="h1" className="text-2xl font-extrabold leading-none" />
          <p className="text-xs mt-1 italic"><SeFuSlogan /></p>
        </div>

        <div className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          {durum === "kontrol" && (
            <p style={{ color: TEXT_MUTED }} className="text-sm text-center">Bağlantı doğrulanıyor...</p>
          )}

          {durum === "gecersiz" && (
            <>
              <p style={{ color: BLUSH }} className="text-sm font-semibold text-center">
                Bu bağlantı geçersiz veya süresi dolmuş.
              </p>
              <p style={{ color: TEXT_MUTED }} className="text-xs text-center">
                Giriş sayfasından &quot;Şifremi unuttum&quot; ile yeni bir bağlantı isteyebilirsiniz.
              </p>
              <Link href="/login" className="sfec-btn text-sm font-bold py-2.5 rounded-xl text-center"
                style={{ background: MINT, color: MINT_ON }}>
                Giriş sayfasına dön
              </Link>
            </>
          )}

          {durum === "hazir" && (
            <form onSubmit={sifreGuncelle} className="flex flex-col gap-4">
              <p style={{ color: TEXT_MUTED }} className="text-xs">Yeni şifrenizi belirleyin.</p>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Yeni şifre</span>
                <input type="password" required minLength={6} value={sifre1} onChange={(e) => setSifre1(e.target.value)}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Yeni şifre (tekrar)</span>
                <input type="password" required minLength={6} value={sifre2} onChange={(e) => setSifre2(e.target.value)}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
              <button type="submit" disabled={gonderiliyor}
                className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
                style={{ background: MINT, color: MINT_ON }}>
                {gonderiliyor ? "Güncelleniyor..." : "Şifreyi güncelle"}
              </button>
            </form>
          )}

          {durum === "tamam" && (
            <p style={{ color: TEXT }} className="text-sm font-semibold text-center">
              Şifreniz güncellendi 🎉 Giriş sayfasına yönlendiriliyorsunuz...
            </p>
          )}
        </div>
      </div>
      <YukleniyorOverlay visible={gonderiliyor} mesaj="Güncelleniyor..." />
    </div>
  );
}
