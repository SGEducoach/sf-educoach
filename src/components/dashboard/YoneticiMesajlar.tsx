"use client";

import { useEffect, useState, useTransition } from "react";
import { yoneticiMesajlariniGetir, yoneticiMesajGonder } from "@/app/dashboard/yonetici-mesaj-actions";
import type { KurumYetkilisi } from "@/app/dashboard/yonetici-mesaj-actions";
import { MessagesSquare, RefreshCw } from "lucide-react";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

type Mesaj = { id: string; kurum_yetkilisi_id: string; gonderen_id: string; mesaj: string; created_at: string; profiles: { ad: string } | null; schools: { ad: string } | null };
export function YoneticiMesajlar() {
  const [mesajlar, setMesajlar] = useState<Mesaj[]>([]);
  const [adminMi, setAdminMi] = useState(false);
  const [kisiler, setKisiler] = useState<KurumYetkilisi[]>([]);
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
    setKisiler(sonuc.kisiler ?? []);
    if (!sonuc.adminMi) setHedef(sonuc.userId);
  }
  useEffect(() => { baslat(() => yenile()); }, []);
  const konusmalar = Array.from(new Map(mesajlar.map(m => [m.kurum_yetkilisi_id, m])).values());
  // Kullanıcı kararı (28.09.2026): hat moderatör/müdür ile admin arasında.
  // Admin artık hiç yazışmamış bir moderatöre de ilk mesajı atabiliyor.
  const rolEtiketi = (id: string) => {
    const k = kisiler.find(x => x.id === id);
    return k ? (k.rol === "moderator" ? "Moderatör" : "Müdür") : "Kurum yetkilisi";
  };
  const yazisilanlar = new Set(konusmalar.map(m => m.kurum_yetkilisi_id));
  const yeniler = kisiler.filter(k => !yazisilanlar.has(k.id));
  const secili = mesajlar.filter(m => m.kurum_yetkilisi_id === hedef).slice().reverse();
  return <div className="sfec-fade flex flex-col gap-3 rounded-3xl p-5" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER}` }}>
    <div className="flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: MINT_BG }}>
        <MessagesSquare size={16} color={MINT} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-bold" style={{ fontFamily: "var(--font-baloo)" }}>{adminMi ? "Kurum Yazışmaları" : "Yöneticiyle İletişim"}</h2>
        <p className="text-xs" style={{ color: TEXT_MUTED }}>
          {adminMi ? "Kurum müdürleri ve moderatörleriyle yazışmalar. Yeni bir konuşmayı listeden başlatabilirsiniz." : "SeFu Koç yönetimine buradan yazabilirsiniz."}
        </p>
      </div>
      <button type="button" disabled={bekliyor} onClick={() => baslat(() => yenile())} aria-label="Mesajları yenile" title="Mesajları yenile"
        className="sfec-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full disabled:opacity-50" style={{ border: `2px solid ${BORDER_STRONG}` }}>
        <RefreshCw size={14} color={TEXT_MUTED} aria-hidden="true" className={bekliyor ? "animate-spin" : undefined} />
      </button>
    </div>
    {adminMi && <select aria-label="Konuşma seç" value={hedef} onChange={e => { setHedef(e.target.value); setMetin(""); }} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
      <option value="">{konusmalar.length || yeniler.length ? "Konuşma seçin" : "Henüz kurum yetkilisi yok"}</option>
      {konusmalar.length > 0 && <optgroup label="Yazışmalar">
        {konusmalar.map(m => <option key={m.kurum_yetkilisi_id} value={m.kurum_yetkilisi_id}>{m.profiles?.ad ?? "Kurum yetkilisi"} · {m.schools?.ad ?? "Kurum"} · {rolEtiketi(m.kurum_yetkilisi_id)}</option>)}
      </optgroup>}
      {yeniler.length > 0 && <optgroup label="Yeni konuşma başlat">
        {yeniler.map(k => <option key={k.id} value={k.id}>{k.ad} · {k.okul} · {k.rol === "moderator" ? "Moderatör" : "Müdür"}</option>)}
      </optgroup>}
    </select>}
    <div className="max-h-[45dvh] overflow-y-auto flex flex-col gap-3">
      {secili.map(m => <article key={m.id} className="rounded-xl p-3" style={{ background: BG0, border: `1px solid ${BORDER}` }}>
        <p className="text-xs mb-2" style={{ color: TEXT_MUTED }}>{m.gonderen_id === userId ? "Siz" : m.gonderen_id === m.kurum_yetkilisi_id ? m.profiles?.ad : "Yönetici"} · {new Date(m.created_at).toLocaleString("tr-TR")}</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6">{m.mesaj}</p>
      </article>)}
      {hazir && hedef && !secili.length && <p className="text-sm" style={{ color: TEXT_MUTED }}>
        {adminMi ? "Bu kişiyle henüz yazışma yok. İlk mesajı aşağıdan gönderebilirsiniz." : "Henüz mesaj yok. Yöneticiye aşağıdan yazabilirsiniz."}
      </p>}
    </div>
    {hazir && hedef && <form onSubmit={e => { e.preventDefault(); baslat(async () => { try { const sonuc = await yoneticiMesajGonder(metin, hedef); setHata(sonuc.error); if (!sonuc.error) { setMetin(""); await yenile(); } } catch { setHata("İşlem tamamlanamadı. Tekrar deneyin."); } }); }} className="flex flex-col gap-3">
      <textarea aria-label="Mesajınız" required maxLength={4000} rows={4} value={metin} onChange={e => setMetin(e.target.value)} placeholder="Mesajınızı yazın…" className="w-full rounded-xl p-3 text-sm outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
      <button disabled={bekliyor || !metin.trim()} className="sfec-btn self-start rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>{bekliyor ? "İşleniyor…" : adminMi ? "Yanıt Gönder" : "Gönder"}</button>
    </form>}
    {hata && <p role="alert" className="text-sm" style={{ color: BLUSH }}>{hata}</p>}
  </div>;
}
