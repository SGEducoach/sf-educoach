"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BORDER, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { MaskotKonusmaBalonu } from "@/components/dashboard/MaskotKonusmaBalonu";

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
//
// Kullanıcı geri bildirimi (2026-08-25): "mesajlar duruyor, okunacak
// halde olsun, okununca silinsin" — liste artık SADECE okunmamış
// mesajları çekiyor (duyuru_aliciler.okundu = false). Panel açılınca
// gösterilenler o an için hâlâ ekranda kalır (state zaten çekilmiş), ama
// "okundu" işaretlenip sonraki açılışta bu sorgudan bir daha hiç
// dönmezler — yani öğrenci/veli için mesaj "okununca kayboluyor". Gerçek
// satır SİLİNMİYOR (bkz. gonderilenDuyurularGetir, dashboard/actions.ts —
// gönderenin "kaç kişiye gitti" sayısı hâlâ duyuru_aliciler satır sayısına
// dayanıyor; silseydik o sayı okundukça küçülürdü).
export function MesajlarimIkonu({ baslangicSayisi }: { baslangicSayisi: number }) {
  const supabase = createClient();
  const [acik, setAcik] = useState(false);
  const [sayisi, setSayisi] = useState(baslangicSayisi);
  const [duyurular, setDuyurular] = useState<DuyuruSatiri[] | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  // Kullanıcı isteği (26.08.2026): "Gelen mesaja tıklayıp herhangi bir
  // mesajı büyük boyutta detaylı şekilde görülecek."
  const [secilenMesaj, setSecilenMesaj] = useState<DuyuruSatiri | null>(null);

  async function ac() {
    const yeniAcik = !acik;
    setAcik(yeniAcik);
    if (!yeniAcik) { setSecilenMesaj(null); return; }
    if (duyurular !== null) return;

    setYukleniyor(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("duyurular")
        .select("id, baslik, mesaj, created_at, duyuru_aliciler!inner(profile_id, okundu)")
        .is("silindi_at", null)
        .eq("duyuru_aliciler.profile_id", user.id)
        .eq("duyuru_aliciler.okundu", false)
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
        className="sfec-btn h-11 w-11 sm:h-8 sm:w-8 rounded-full flex items-center justify-center relative shrink-0"
        style={{ background: sayisi > 0 ? MINT_BG : "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
        <Mail size={17} color={sayisi > 0 ? MINT : TEXT_MUTED} />
        {sayisi > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: MINT, color: MINT_ON }}>
            {sayisi > 9 ? "9+" : sayisi}
          </span>
        )}
      </button>

      {acik && createPortal(
        <MaskotKonusmaBalonu onKapat={() => setAcik(false)} ariaLabel="Mesajlarım" genis>
            {secilenMesaj ? (
              <>
                <button type="button" onClick={() => setSecilenMesaj(null)}
                  className="sfec-btn mb-3 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
                  style={{ color: TEXT_MUTED, border: `2px solid ${BORDER}` }}>
                  <ArrowLeft size={13} /> Mesajlarıma dön
                </button>
                <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="block text-lg font-bold">{secilenMesaj.baslik}</span>
                <span style={{ color: TEXT_MUTED }} className="block text-xs mt-1 mb-3">{new Date(secilenMesaj.created_at).toLocaleString("tr-TR")}</span>
                <p style={{ color: TEXT }} className="text-sm leading-relaxed whitespace-pre-wrap">{secilenMesaj.mesaj}</p>
              </>
            ) : (
              <>
                <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="block pr-9 text-sm font-bold">Mesajlarım</span>
                {yukleniyor && <p style={{ color: TEXT_MUTED }} className="text-xs text-center py-4">Yükleniyor...</p>}
                {!yukleniyor && duyurular?.length === 0 && <p style={{ color: TEXT_MUTED }} className="text-xs text-center py-4">Yeni mesajınız yok.</p>}
                <div className="mt-2 flex flex-col gap-2">
                  {duyurular?.map((d) => (
                  <button key={d.id} type="button" onClick={() => setSecilenMesaj(d)}
                    className="sfec-btn w-full rounded-xl p-2.5 text-left" style={{ background: "rgba(13,148,136,0.05)", border: `2px solid ${BORDER}` }}>
                    <div style={{ color: TEXT }} className="text-xs font-bold mb-0.5">{d.baslik}</div>
                    <div style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed line-clamp-2">{d.mesaj}</div>
                    <div style={{ color: TEXT_MUTED }} className="text-[10px] mt-1">{new Date(d.created_at).toLocaleString("tr-TR")}</div>
                  </button>
                  ))}
                </div>
              </>
            )}
        </MaskotKonusmaBalonu>,
        document.body,
      )}
    </div>
  );
}
