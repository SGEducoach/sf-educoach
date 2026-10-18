"use client";

// Kurum dışı belletmen kayıt formu (kullanıcı isteği 18.10.2026, Faz 4).
import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, BedDouble } from "lucide-react";
import { BG0, BG1, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { SIFRE_IPUCU } from "@/lib/validators";
import { belletmenBasvurusuGonder } from "./actions";

const girdi = { border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT };
const etiket = "text-[10px] font-semibold uppercase tracking-wide";

export function BelletmenKayitFormu({ okullar, kurallarMetni, kurallarVersiyon }: {
  okullar: { id: string; ad: string }[]; kurallarMetni: string; kurallarVersiyon: string;
}) {
  const [hata, setHata] = useState<string | null>(null);
  const [tamam, setTamam] = useState(false);
  const [kurallarAcik, setKurallarAcik] = useState(false);
  const [pending, start] = useTransition();

  function gonder(fd: FormData) {
    setHata(null);
    fd.set("kurallarVersiyon", kurallarVersiyon);
    start(async () => {
      const r = await belletmenBasvurusuGonder(fd);
      if (r.error) setHata(r.error);
      else setTamam(true);
    });
  }

  return (
    <div className="flex min-h-dvh items-start justify-center px-4 py-10" style={{ background: BG0 }}>
      <div className="w-full max-w-md">
        <Link href="/signup" className="mb-4 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: TEXT_MUTED }}>
          <ArrowLeft size={14} /> Kayıt ekranına dön
        </Link>
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <Image src="/icon-192.png" alt="SeFu Koç" width={56} height={56} />
          <h1 className="text-lg font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Kurum Dışı Belletmen Kaydı</h1>
          <p className="text-xs" style={{ color: TEXT_MUTED }}>Yurtlu okullarda nöbet tutan, okul kadrosunda olmayan belletmenler içindir. Başvurunuz yönetici onayından sonra etkinleşir.</p>
        </div>

        {tamam ? (
          <div className="rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <BedDouble size={28} color={MINT} className="mx-auto" aria-hidden="true" />
            <h2 className="mt-2 text-base font-bold" style={{ color: TEXT }}>Başvurunuz Alındı</h2>
            <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
              Yönetici onayladığında e-posta adresiniz ve şifrenizle Öğretmen girişinden girebilirsiniz. Panelinizde yoklama listesi ve nöbet bilgileriniz yer alır.
            </p>
            <Link href="/login?rol=ogretmen" className="sfec-btn mt-4 inline-block rounded-xl px-4 py-2 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>Girişe git</Link>
          </div>
        ) : (
          <form action={gonder} className="flex flex-col gap-3 rounded-3xl p-6" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <label className="flex flex-col gap-1">
              <span className={etiket} style={{ color: TEXT_MUTED }}>Okul</span>
              <select name="okul" required defaultValue="" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi}>
                <option value="" disabled>Seçiniz</option>
                {okullar.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
              </select>
              {okullar.length === 0 && <span className="text-[11px]" style={{ color: BLUSH }}>Şu an kayıt alan yurtlu okul yok.</span>}
            </label>
            <label className="flex flex-col gap-1">
              <span className={etiket} style={{ color: TEXT_MUTED }}>Ad Soyad</span>
              <input name="ad" required maxLength={80} autoComplete="name" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
            </label>
            <fieldset className="flex flex-col gap-1">
              <legend className={etiket} style={{ color: TEXT_MUTED }}>Cinsiyet</legend>
              <div className="flex gap-2 text-sm" style={{ color: TEXT }}>
                <label className="flex items-center gap-1.5"><input type="radio" name="cinsiyet" value="kadin" required /> Kadın</label>
                <label className="flex items-center gap-1.5"><input type="radio" name="cinsiyet" value="erkek" /> Erkek</label>
              </div>
              <span className="text-[11px]" style={{ color: TEXT_MUTED }}>Kadın belletmen kız, erkek belletmen erkek öğrencilerin yoklamasını alır.</span>
            </fieldset>
            <label className="flex flex-col gap-1">
              <span className={etiket} style={{ color: TEXT_MUTED }}>E-posta</span>
              <input name="email" type="email" required autoComplete="email" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={etiket} style={{ color: TEXT_MUTED }}>Cep Telefonu</span>
              <input name="telefon" required inputMode="numeric" placeholder="05xx xxx xx xx" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={etiket} style={{ color: TEXT_MUTED }}>Şifre</span>
              <input name="sifre" type="password" required autoComplete="new-password" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
              <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{SIFRE_IPUCU}</span>
            </label>
            <label className="flex flex-col gap-1">
              <span className={etiket} style={{ color: TEXT_MUTED }}>Şifre (Tekrar)</span>
              <input name="sifreTekrar" type="password" required autoComplete="new-password" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
            </label>
            <div className="flex flex-col gap-1">
              <label className="flex items-start gap-2 text-xs" style={{ color: TEXT }}>
                <input type="checkbox" name="kurallar" required className="mt-0.5" />
                <span>Kayıt ve kullanım kurallarını okudum, kabul ediyorum.{" "}
                  <button type="button" onClick={() => setKurallarAcik((a) => !a)} className="font-semibold" style={{ color: MINT }}>{kurallarAcik ? "Gizle" : "Kuralları oku"}</button>
                </span>
              </label>
              {kurallarAcik && (
                <div className="max-h-48 overflow-y-auto whitespace-pre-line rounded-xl p-3 text-[11px]" style={{ background: BG0, color: TEXT_MUTED, border: `1px solid ${BORDER}` }}>{kurallarMetni}</div>
              )}
            </div>
            {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
            <button type="submit" disabled={pending || okullar.length === 0} className="sfec-btn rounded-xl py-2.5 text-sm font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
              {pending ? "Gönderiliyor…" : "Başvuruyu Gönder"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
