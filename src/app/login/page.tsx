"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function girisYap(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setYukleniyor(false);
    if (error) {
      setHata(error.message === "Invalid login credentials"
        ? "E-posta veya şifre hatalı."
        : error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div style={{ background: MINT, boxShadow: "0 4px 16px rgba(124,232,176,0.28)" }} className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3">
            <GraduationCap size={22} color={MINT_ON} />
          </div>
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold">SG EduCoach</h1>
          <p style={{ color: TEXT_MUTED }} className="text-xs mt-1">Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={girisYap} className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">E-posta</span>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none"
              style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Şifre</span>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none"
              style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
            />
          </label>

          {hata && (
            <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>
          )}

          <button type="submit" disabled={yukleniyor}
            className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}>
            {yukleniyor ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>

        <p style={{ color: TEXT_MUTED }} className="text-xs text-center mt-5">
          Hesabınız yok mu?{" "}
          <Link href="/signup" style={{ color: MINT }} className="font-semibold">Kayıt olun</Link>
        </p>
      </div>
    </div>
  );
}
