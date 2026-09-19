import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { epostaDogrula } from "@/lib/eposta-dogrulama";
import { BG0, BG1, BLUSH, BORDER, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Kullanıcının eklediği e-postanın doğrulama bağlantısı (Grup Koçluk Faz 5,
// bkz. lib/eposta-dogrulama.ts). Oturum gerektirmez: belirtecin kendisi
// kanıttır (tek kullanımlık, 48 saat).
export const metadata: Metadata = { title: "E-posta doğrulama | SeFu Koç", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function EpostaDogrulaSayfasi({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const sonuc = t ? await epostaDogrula(createAdminClient(), t) : { error: "Bağlantı geçersiz.", email: null };
  const basarili = !sonuc.error;

  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        {basarili ? <CheckCircle2 size={36} color={MINT} /> : <XCircle size={36} color={BLUSH} />}
        <h1 className="text-lg font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
          {basarili ? "E-postan doğrulandı" : "E-posta doğrulanamadı"}
        </h1>
        <p className="text-sm" style={{ color: TEXT_MUTED }}>
          {basarili
            ? `${sonuc.email} artık hesabına bağlı. Şifreni unutursan bu adrese geçici şifre isteyebilirsin.`
            : sonuc.error}
        </p>
        <Link href="/dashboard" className="sfec-btn mt-2 rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>
          SeFu Koç&apos;a git
        </Link>
      </div>
    </div>
  );
}
