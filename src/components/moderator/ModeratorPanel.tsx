"use client";

import { useState, useTransition } from "react";
import { KeyRound, ShieldCheck, Trash2, UserCheck, UserX } from "lucide-react";
import { moderatorAktiflikDegistir, moderatorHesapSil, moderatorSifreSifirla, type ModeratorKullanici } from "@/app/moderator/actions";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

export function ModeratorPanel({ okulAdi, kullanicilar }: { okulAdi: string; kullanicilar: ModeratorKullanici[] }) {
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);
  return <div className="flex flex-col gap-5">
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2"><ShieldCheck size={18} color={MINT} /><h1 style={{ color: TEXT }} className="font-bold">{okulAdi} Moderatör Paneli</h1></div>
      <p style={{ color: TEXT_MUTED }} className="mt-2 text-xs leading-relaxed">Yetkiniz yalnız bu okulun öğrenci, öğretmen, müdür ve bağlı velileriyle sınırlıdır. Başka okulların kayıtları görüntülenmez veya değiştirilemez.</p>
    </div>
    {mesaj && <div className="rounded-xl p-3 text-xs font-bold" style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT, background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>{mesaj}</div>}
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {kullanicilar.map(k => <div key={k.id} className="rounded-2xl p-3.5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div style={{ color: TEXT }} className="text-sm font-bold">{k.ad}</div><div style={{ color: TEXT_MUTED }} className="text-xs">{k.detay}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button disabled={pending} onClick={() => startTransition(async () => { const r = await moderatorSifreSifirla(k.id); setMesaj(r.error ? `Hata: ${r.error}` : `Geçici şifre (${k.ad}): ${r.sifre}`); })} className="sgec-btn flex-1 rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}><KeyRound className="mr-1 inline" size={12}/>Şifre sıfırla</button>
          <button disabled={pending} onClick={() => startTransition(async () => { const r = await moderatorAktiflikDegistir(k.id, !k.aktif); setMesaj(r.error ? `Hata: ${r.error}` : "İşlem tamamlandı."); })} className="sgec-btn flex-1 rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: k.aktif ? BLUSH : MINT, border: `2px solid ${BORDER_STRONG}` }}>{k.aktif ? <UserX className="mr-1 inline" size={12}/> : <UserCheck className="mr-1 inline" size={12}/>} {k.aktif ? "Pasifleştir" : "Aktifleştir"}</button>
          <button disabled={pending} onClick={() => { if (!window.confirm(`${k.ad} hesabı kalıcı olarak silinsin mi?`)) return; startTransition(async () => { const r = await moderatorHesapSil(k.id); setMesaj(r.error ? `Hata: ${r.error}` : "Hesap silindi."); }); }} className="sgec-btn rounded-lg px-3 py-2 text-[11px] font-bold" style={{ color: BLUSH, border: `2px solid ${BORDER_STRONG}` }}><Trash2 className="mr-1 inline" size={12}/>Sil</button>
        </div>
      </div>)}
    </div>
  </div>;
}
