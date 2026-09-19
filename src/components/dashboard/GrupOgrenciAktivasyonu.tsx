"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles } from "lucide-react";
import { grupAktivasyonuTamamla } from "@/app/dashboard/grup-aktivasyon-actions";
import { AYT_ALAN_ETIKET, type AytAlan } from "@/lib/types";
import { GRUP_KVKK_METNI } from "@/lib/grup-kvkk";
import { SIFRE_IPUCU } from "@/lib/validators";
import { BG0, BG1, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Grup Koçluk — Faz 5 (kullanıcı kararları 18.09.2026): grup öğrencisinin
// ilk girişi. Tamamlanmadan panel açılmaz (kapatma düğmesi yok, bilinçli).
// 9-10. sınıfta alan sorulmaz (Branş Denemesi modeli; kayıt ekranıyla aynı).

const girdi = { border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT };

function Etiket({ children }: { children: React.ReactNode }) {
  return <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{children}</span>;
}

export function GrupOgrenciAktivasyonu({ ad, alanSorulur }: { ad: string; alanSorulur: boolean }) {
  const router = useRouter();
  const [pending, startIslem] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [epostaNotu, setEpostaNotu] = useState<string | null>(null);
  const [f, setF] = useState({ sifre: "", sifreTekrar: "", email: "", alan: "" as AytAlan | "", hedefBolum: "", kvkkOnay: false, veliOnay: false });

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startIslem(async () => {
      const r = await grupAktivasyonuTamamla({ ...f, alan: (f.alan || "SAY") as AytAlan });
      if (r.error) return setHata(r.error);
      if (f.email.trim()) {
        setEpostaNotu(r.epostaGonderildi
          ? `${f.email.trim()} adresine doğrulama bağlantısı gönderdik. Bağlantıya tıklayınca e-postan hesabına eklenecek.`
          : "Hesabın hazır, ama doğrulama e-postası gönderilemedi. E-postanı daha sonra yeniden ekleyebilirsin.");
        return;
      }
      router.refresh();
    });
  }

  if (epostaNotu) {
    return (
      <div className="fixed inset-0 z-[450] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
        <div className="sfec-fade flex w-full max-w-sm flex-col gap-3 rounded-3xl p-6" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <h2 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Hesabın hazır 🎉</h2>
          <p className="text-sm" style={{ color: TEXT_MUTED }}>{epostaNotu}</p>
          <button type="button" onClick={() => router.refresh()} className="sfec-btn rounded-xl py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>
            Panele geç
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[450] flex items-start justify-center overflow-y-auto px-4 py-8"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
      <form onSubmit={gonder} className="sfec-fade flex w-full max-w-md flex-col gap-3 rounded-3xl p-6" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full" style={{ background: MINT_BG }}>
          <Sparkles size={18} color={MINT} />
        </div>
        <h2 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Hoş geldin{ad ? `, ${ad.split(" ")[0]}` : ""}!</h2>
        <p className="text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
          Koçun seni SeFu Koç&apos;a ekledi. Başlamadan önce kendi şifreni belirle ve birkaç bilgini tamamla.
        </p>

        <label className="flex flex-col gap-1">
          <Etiket>Yeni şifre</Etiket>
          <input type="password" required autoFocus value={f.sifre} onChange={(e) => setF({ ...f, sifre: e.target.value })} className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
          <span className="text-[10px]" style={{ color: TEXT_MUTED }}>{SIFRE_IPUCU}</span>
        </label>
        <label className="flex flex-col gap-1">
          <Etiket>Yeni şifre (tekrar)</Etiket>
          <input type="password" required value={f.sifreTekrar} onChange={(e) => setF({ ...f, sifreTekrar: e.target.value })} className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
        </label>

        <label className="flex flex-col gap-1">
          <Etiket>E-posta (isteğe bağlı)</Etiket>
          <input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="ornek@mail.com" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
          <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
            Eklersen şifreni unuttuğunda koçunu beklemeden kendin sıfırlayabilirsin. Doğrulama bağlantısı gönderilir.
          </span>
        </label>

        {alanSorulur && (
          <label className="flex flex-col gap-1">
            <Etiket>Alanın</Etiket>
            <select required value={f.alan} onChange={(e) => setF({ ...f, alan: e.target.value as AytAlan })} className="rounded-xl px-3 py-2 text-sm font-bold outline-none" style={girdi}>
              <option value="">Seç</option>
              {(Object.entries(AYT_ALAN_ETIKET) as [AytAlan, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <Etiket>Hedef bölümün</Etiket>
          <input required value={f.hedefBolum} autoCapitalize="characters" onChange={(e) => setF({ ...f, hedefBolum: e.target.value.toLocaleUpperCase("tr-TR") })}
            placeholder="Örn. TIP, BİLGİSAYAR MÜHENDİSLİĞİ" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
        </label>

        <div className="flex flex-col gap-1.5">
          <Etiket>KVKK Aydınlatma Metni</Etiket>
          <div className="max-h-36 overflow-y-auto whitespace-pre-line rounded-xl p-3 text-[11px] leading-relaxed" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}`, color: TEXT_MUTED }}>
            {GRUP_KVKK_METNI}
          </div>
        </div>
        <label className="flex cursor-pointer items-start gap-2">
          <input type="checkbox" checked={f.kvkkOnay} onChange={(e) => setF({ ...f, kvkkOnay: e.target.checked })} className="mt-0.5" />
          <span className="text-xs leading-snug" style={{ color: TEXT }}>Aydınlatma metnini okudum; kişisel verilerimin bu kapsamda işlenmesini kabul ediyorum.</span>
        </label>
        <label className="flex cursor-pointer items-start gap-2">
          <input type="checkbox" checked={f.veliOnay} onChange={(e) => setF({ ...f, veliOnay: e.target.checked })} className="mt-0.5" />
          <span className="text-xs leading-snug" style={{ color: TEXT }}>18 yaşından küçüksem SeFu Koç&apos;u velimin/vasimin bilgisi ve onayıyla kullandığımı beyan ederim.</span>
        </label>

        {hata && <div className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</div>}
        <button type="submit" disabled={pending} className="sfec-btn rounded-xl py-2.5 text-sm font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Tamamla ve başla"}
        </button>
      </form>
    </div>
  );
}
