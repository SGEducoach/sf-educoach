"use client";

import { useState, useTransition } from "react";
import { BG0, BG1, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { mezunKendiBilgileriniGuncelle, type MezunKendiBilgisi } from "@/app/dashboard/mezun-hesap-actions";

const ALANLAR: { anahtar: Exclude<keyof MezunKendiBilgisi, "iletisimOnayi">; etiket: string; tip?: string; ipucu?: string }[] = [
  { anahtar: "telefon", etiket: "Cep telefonu", tip: "tel", ipucu: "05321234567" },
  { anahtar: "eposta", etiket: "E-posta", tip: "email" },
  { anahtar: "il", etiket: "İl" },
  { anahtar: "ilce", etiket: "İlçe" },
  { anahtar: "universite", etiket: "Üniversite / bölüm" },
  { anahtar: "meslek", etiket: "Meslek / çalıştığın yer" },
];

export function MezunBilgiFormu({ baslangic, kayitVar }: { baslangic: MezunKendiBilgisi; kayitVar: boolean }) {
  const [deger, setDeger] = useState<MezunKendiBilgisi>(baslangic);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setMesaj(null); setHata(null);
    start(async () => {
      const r = await mezunKendiBilgileriniGuncelle(deger);
      if (r.error) return setHata(r.error);
      setMesaj(["Bilgilerin kaydedildi.", ...r.uyarilar].join(" "));
    });
  }

  return (
    <form onSubmit={kaydet} className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>İletişim ve Güncel Durum</h2>
      {!kayitVar ? (
        <p className="mt-2 text-xs" style={{ color: TEXT_MUTED }}>Mezun kaydın henüz oluşturulmamış. Okulunla iletişime geç.</p>
      ) : <>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ALANLAR.map((a) => (
            <label key={a.anahtar} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{a.etiket}</span>
              <input type={a.tip ?? "text"} value={deger[a.anahtar]} placeholder={a.ipucu} maxLength={160}
                onChange={(e) => setDeger((d) => ({ ...d, [a.anahtar]: e.target.value }))}
                className="rounded-xl px-3 py-2 text-sm outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
            </label>
          ))}
        </div>
        <label className="mt-3 flex items-start gap-2 text-xs leading-relaxed" style={{ color: TEXT }}>
          <input type="checkbox" checked={deger.iletisimOnayi} onChange={(e) => setDeger((d) => ({ ...d, iletisimOnayi: e.target.checked }))} className="mt-0.5" />
          <span>Okulumun bana mezun duyurularıyla ilgili <strong>SMS ve e-posta</strong> göndermesine onay veriyorum. <span style={{ color: TEXT_MUTED }}>(İsteğe bağlı; işaretlemezsen sana SMS gönderilmez, onayını istediğin zaman geri alabilirsin.)</span></span>
        </label>
        <p className="mt-2 text-[11px] leading-relaxed" style={{ color: TEXT_MUTED }}>
          Bu bilgileri yalnız okulunun rehberlik servisi ve müdürü görür.
        </p>
        {hata && <p role="alert" className="mt-2 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
        {mesaj && <p role="status" className="mt-2 text-xs font-semibold" style={{ color: MINT }}>{mesaj}</p>}
        <button type="submit" disabled={pending} className="sfec-btn mt-3 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      </>}
    </form>
  );
}
