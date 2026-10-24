"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { MessageSquareShare } from "lucide-react";
import { adminWhatsappStudyoAyarlari } from "@/lib/admin-whatsapp-duyuru";
import type { SablonAyari } from "@/lib/whatsapp-sablon-ayarlari";
import { BG1, BORDER, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

const Studyo = dynamic(() => import("@/components/dashboard/WhatsappDuyuruStudyosu").then((m) => m.WhatsappDuyuruStudyosu), {
  ssr: false, loading: () => <p role="status" className="p-4 text-sm" style={{ color: TEXT_MUTED }}>Duyuru hazırlama alanı yükleniyor…</p>,
});

// Yalnız admin korumalı /yonetici/iletisim?sekme=whatsapp altında kullanılır.
// Görsel ve ekler cihazda hazırlanır; otomatik WhatsApp gönderimi yapılmaz.
export function AdminWhatsappDuyurusu({ ayarlar }: { ayarlar: SablonAyari[] }) {
  const [acik, setAcik] = useState(false);
  const [acildi, setAcildi] = useState(false);
  const props = useMemo(() => adminWhatsappStudyoAyarlari(ayarlar), [ayarlar]);
  return <section aria-label="SeFu Koç genel WhatsApp duyurusu" className="flex flex-col gap-3">
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <MessageSquareShare size={18} aria-hidden="true" style={{ color: MINT }} />
        <h2 className="text-base font-bold" style={{ color: TEXT }}>SeFu Koç Genel WhatsApp Duyurusu</h2>
      </div>
      <p className="mt-2 text-sm" style={{ color: TEXT_MUTED }}>Kurum seçmeden SeFu Koç logosuyla genel duyuru hazırlayın. Başlık, metin, fotoğraf ve isteğe bağlı dosya eklerini düzenleyebilirsiniz.</p>
      <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>Telefonda Paylaş ile WhatsApp&apos;ı ve alıcıyı seçin. Paylaşım desteklenmiyorsa PNG&apos;yi indirip WhatsApp&apos;tan gönderin. Otomatik toplu mesaj gönderilmez.</p>
      <button type="button" aria-expanded={acik} onClick={() => { setAcildi(true); setAcik((v) => !v); }}
        className="sfec-btn mt-3 rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>
        {acik ? "Hazırlama alanını gizle" : "SeFu Koç duyurusu hazırla"}
      </button>
    </div>
    {/* İlk açılıştan sonra gizlemede unmount etmeyerek taslağı koruruz. */}
    {acildi && <div hidden={!acik}><Studyo {...props} /></div>}
  </section>;
}
