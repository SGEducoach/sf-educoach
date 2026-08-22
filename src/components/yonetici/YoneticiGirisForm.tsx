"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { YukleniyorOverlay } from "@/components/YukleniyorOverlay";

// /yonetici'nin kendi bağımsız giriş formu — normal /login akışıyla hiçbir
// ilişkisi yok (rol seçimi yok, sadece e-posta/şifre). Giriş başarılı olsa
// bile profildeki rol 'admin' değilse oturum hemen kapatılır ve aynı generic
// hata gösterilir — böylece bu formdan "hesap var ama admin değil" bilgisi
// hiçbir şekilde dışarı sızmaz.
export function YoneticiGirisForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function girisYap(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);

    const response = await fetch("/api/giris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "admin", email: email.trim().toLowerCase(), password }),
    });
    const sonuc = await response.json() as { error?: string };
    if (!response.ok) {
      setYukleniyor(false);
      setHata(sonuc.error ?? "Giriş bilgileri hatalı.");
      return;
    }

    router.push("/yonetici");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <Image src="/logo.png" alt="SeFu Koç" width={800} height={395} className="h-28 w-auto max-w-full object-contain mb-2" priority />
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold">Yönetim Girişi</h1>
        </div>

        <form onSubmit={girisYap} className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">E-posta</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Şifre</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          </label>

          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}

          <button type="submit" disabled={yukleniyor}
            className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}>
            {yukleniyor ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>
      </div>
      <YukleniyorOverlay visible={yukleniyor} mesaj="Giriş yapılıyor..." />
    </div>
  );
}
