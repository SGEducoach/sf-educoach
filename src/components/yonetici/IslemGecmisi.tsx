"use client";

import { startTransition, useEffect, useState } from "react";
import { ChevronDown, History, ShieldCheck } from "lucide-react";
import { islemGecmisiGetir, type IslemKaydiDetayli } from "@/app/yonetici/actions";
import { EYLEM_ETIKET } from "@/lib/islem-gecmisi";
import { BG1, BG1_ALT, BLUSH_BG, BLUSH, BORDER, BORDER_STRONG, LILAC, LILAC_BG, TEXT, TEXT_MUTED } from "@/lib/theme";

// Faz 3 (2026-08-26 kullanıcı isteği) — "Okullar & Duyuru kategorisindeki
// Son işlemler kısmı İşlem Geçmişi'ne taşınacak. Admin burada bir işleme
// tıklayıp işlem detayını görebilecek. ... Eğer işlemi bir admin ya da
// moderatör yaptıysa son işlemlerde işlemi yapan kişi bilgisinin yanına
// admin ya da moderatör ibaresi eklenecek."
export function IslemGecmisi() {
  const [kayitlar, setKayitlar] = useState<IslemKaydiDetayli[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [acikId, setAcikId] = useState<string | null>(null);

  useEffect(() => {
    startTransition(() => {
      islemGecmisiGetir().then((r) => {
        if (r.error) setHata(r.error);
        setKayitlar(r.kayitlar);
      });
    });
  }, []);

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <History size={16} color={TEXT_MUTED} />
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">İşlem Geçmişi</h2>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">Son 150 işlem. Duyuru gönderimlerinde içeriği görmek için satıra tıklayın.</p>
      {hata && <p style={{ color: BLUSH }} className="text-xs font-semibold mb-2">{hata}</p>}
      {kayitlar === null ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Yükleniyor...</p>
      ) : kayitlar.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Henüz işlem kaydı yok.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {kayitlar.map((k) => {
            const acik = acikId === k.id;
            // Kullanıcı isteği (2026-08-26): "İşlem detayı kod olarak
            // gösterilmeyecek. Sadece duyuruların içeriği detaylarda
            // görünecek." — ham jsonb artık hiç render edilmiyor, sadece
            // duyuru mesajı düz metin olarak gösteriliyor.
            const duyuruMesajiVarMi = k.eylem === "admin_duyuru_gonder" || k.eylem === "rehber_mesaj_gonder";
            const duyuruMesaji = duyuruMesajiVarMi && typeof k.detay?.mesaj === "string" ? k.detay.mesaj : null;
            return (
              <div key={k.id} className="rounded-xl overflow-hidden" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
                <button type="button" onClick={() => duyuruMesaji && setAcikId(acik ? null : k.id)}
                  className="w-full flex items-center justify-between flex-wrap gap-1.5 px-3.5 py-2 text-xs text-left" style={{ cursor: duyuruMesaji ? "pointer" : "default" }}>
                  <span style={{ color: TEXT }} className="font-semibold flex items-center gap-1.5 flex-wrap">
                    {EYLEM_ETIKET[k.eylem] ?? k.eylem}
                    <span style={{ color: TEXT_MUTED }} className="font-normal">· {k.aktorAdi}</span>
                    {k.aktorRutbe === "admin" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: LILAC_BG, color: LILAC }}>Admin</span>
                    )}
                    {k.aktorRutbe === "moderator" && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: BLUSH_BG, color: BLUSH }}>
                        <ShieldCheck size={9} /> Moderatör
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: TEXT_MUTED }}>
                    {new Date(k.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    {duyuruMesaji && <ChevronDown size={13} style={{ transform: acik ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} />}
                  </span>
                </button>
                {acik && duyuruMesaji && (
                  <div className="px-3.5 pb-3 text-xs leading-relaxed" style={{ color: TEXT }}>
                    &ldquo;{duyuruMesaji}&rdquo;
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
