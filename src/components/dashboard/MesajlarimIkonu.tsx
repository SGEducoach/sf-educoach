"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

interface DuyuruSatiri {
  id: string;
  baslik: string;
  mesaj: string;
  created_at: string;
}

// Push bildirimine ek olarak, duyuruGonder (bkz. src/lib/push-send.ts)
// tarafından yazılan mesajları gösteren "mesajınız var" kutusu. RLS zaten
// sadece kendi alıcı satırlarını görmeye/güncellemeye izin verdiği için
// (duyurular_select_alici, duyuru_aliciler_select_own/update_own) burada
// doğrudan client'tan sorgulanıyor, ayrı bir server action gerekmiyor.
export function MesajlarimIkonu({ baslangicSayisi }: { baslangicSayisi: number }) {
  const supabase = createClient();
  const [acik, setAcik] = useState(false);
  const [sayisi, setSayisi] = useState(baslangicSayisi);
  const [duyurular, setDuyurular] = useState<DuyuruSatiri[] | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function ac() {
    const yeniAcik = !acik;
    setAcik(yeniAcik);
    if (!yeniAcik || duyurular !== null) return;

    setYukleniyor(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("duyurular")
        .select("id, baslik, mesaj, created_at, duyuru_aliciler!inner(profile_id)")
        .eq("duyuru_aliciler.profile_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setDuyurular(((data ?? []) as unknown as DuyuruSatiri[]).map((d) => ({ id: d.id, baslik: d.baslik, mesaj: d.mesaj, created_at: d.created_at })));

      if (sayisi > 0) {
        await supabase.from("duyuru_aliciler").update({ okundu: true }).eq("profile_id", user.id).eq("okundu", false);
        setSayisi(0);
      }
    }
    setYukleniyor(false);
  }

  return (
    <div className="relative">
      <button type="button" onClick={ac} title="Mesajlarım"
        className="sgec-btn w-8 h-8 rounded-full flex items-center justify-center relative"
        style={{ background: sayisi > 0 ? "rgba(124,232,176,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}>
        <Mail size={14} color={sayisi > 0 ? MINT : TEXT_MUTED} />
        {sayisi > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: MINT, color: MINT_ON }}>
            {sayisi > 9 ? "9+" : sayisi}
          </span>
        )}
      </button>

      {acik && (
        <>
          <div className="fixed inset-0 z-[150]" ... />
          <div className="fixed right-4 top-16 z-[160] ...">
            style={{ background: BG1, border: `1px solid ${BORDER_STRONG}`, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-sm font-bold px-1">Mesajlarım</span>
            {yukleniyor && <p style={{ color: TEXT_MUTED }} className="text-xs text-center py-4">Yükleniyor...</p>}
            {!yukleniyor && duyurular?.length === 0 && <p style={{ color: TEXT_MUTED }} className="text-xs text-center py-4">Henüz mesaj yok.</p>}
            {duyurular?.map((d) => (
              <div key={d.id} className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}>
                <div style={{ color: TEXT }} className="text-xs font-bold mb-0.5">{d.baslik}</div>
                <div style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">{d.mesaj}</div>
                <div style={{ color: TEXT_MUTED }} className="text-[10px] mt-1">{new Date(d.created_at).toLocaleString("tr-TR")}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
