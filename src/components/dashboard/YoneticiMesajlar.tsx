"use client";

import { useEffect, useState, useTransition } from "react";
import { yoneticiMesajlariniGetir, yoneticiMesajGonder } from "@/app/dashboard/yonetici-mesaj-actions";
import { BG0, BG1, BORDER, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

type Mesaj = { id: string; kurum_yetkilisi_id: string; gonderen_id: string; mesaj: string; created_at: string; profiles: { ad: string } | null; schools: { ad: string } | null };
export function YoneticiMesajlar() {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [adminMi, setAdminMi] = useState(false);
  const [userId, setUserId] = useState("");
  const [hedef, setHedef] = useState("");
  const [metin, setMetin] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [hazir, setHazir] = useState(false);
  const [bekliyor, baslat] = useTransition();
  async function yenile() {
    const sonuc = await yoneticiMesajlariniGetir();
    setHata(sonuc.error);
    setMesajlar(sonuc.mesajlar as unknown as Mesaj[]);
    setAdminMi(sonuc.adminMi); setUserId(sonuc.userId); setHazir(!sonuc.error);
    if (!sonuc.adminMi) setHedef(sonuc.userId);
  }
  useEffect(() => { baslat(() => yenile()); }, []);
  const konusmalar = Array.from(new Map(mesajlar.map(m => [m.kurum_yetkilisi_id, m])).values());
  const secili = mesajlar.filter(m => m.kurum_yetkilisi_id === hedef).slice().reverse();
  return <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: BG1, color: TEXT, border: `1px solid ${BORDER}` }}>
    <h2 className="text-lg font-bold">{adminMi ? "Mesajlar" : "Yöneticiyle iletişim"}</h2>
    <button type="button" disabled={bekliyor} onClick={() => baslat(() => yenile())} className="self-start text-sm underline" style={{ color: MINT }}>Mesajları yenile</button>
    {adminMi && <select aria-label="Konuşma seç" value={hedef} onChange={e => { setHedef(e.target.value); setMetin(""); }} className="rounded-xl p-3 w-full" style={{ background: BG0, color: TEXT }}>
      <option value="">{konusmalar.length ? "Konuşma seçin" : "Henüz mesaj yok"}</option>
      {konusmalar.map(m => <option key={m.kurum_yetkilisi_id} value={m.kurum_yetkilisi_id}>{m.profiles?.ad ?? "Kurum yetkilisi"} · {m.schools?.ad ?? "Kurum"}</option>)}
    </select>}
    <div className="max-h-[45dvh] overflow-y-auto flex flex-col gap-3">
      {secili.map(m => <article key={m.id} className="rounded-xl p-3" style={{ background: BG0, border: `1px solid ${BORDER}` }}>
        <p className="text-xs mb-2" style={{ color: TEXT_MUTED }}>{m.gonderen_id === userId ? "Siz" : m.gonderen_id === m.kurum_yetkilisi_id ? m.profiles?.ad : "Yönetici"} · {new Date(m.created_at).toLocaleString("tr-TR")}</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6">{m.mesaj}</p>
      </article>)}
      {hazir && hedef && !secili.length && <p className="text-sm" style={{ color: TEXT_MUTED }}>Henüz mesaj yok. Yöneticiye aşağıdan yazabilirsiniz.</p>}
    </div>
    {hazir && hedef && <form onSubmit={e => { e.preventDefault(); baslat(async () => { try { const sonuc = await yoneticiMesajGonder(metin, hedef); setHata(sonuc.error); if (!sonuc.error) { setMetin(""); await yenile(); } } catch { setHata("İşlem tamamlanamadı. Tekrar deneyin."); } }); }} className="flex flex-col gap-3">
      <textarea aria-label="Mesajınız" required maxLength={4000} rows={4} value={metin} onChange={e => setMetin(e.target.value)} placeholder="Mesajınızı yazın…" className="w-full rounded-xl p-3 text-sm" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }} />
      <button disabled={bekliyor || !metin.trim()} className="self-start rounded-xl px-4 py-2 font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>{bekliyor ? "İşleniyor…" : adminMi ? "Yanıt gönder" : "Gönder"}</button>
    </form>}
    {hata && <p role="alert" className="text-sm" style={{ color: BLUSH }}>{hata}</p>}
  </div>;
}
