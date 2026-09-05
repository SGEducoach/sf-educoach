"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Palette, Power, Settings2 } from "lucide-react";
import { siteKapaliDegistir, siteTemasiDegistir } from "@/app/yonetici/actions";
import { SITE_TEMA_PALETI } from "@/lib/site-tema";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Faz 3 (2026-08-26 kullanıcı isteği) — "Site ayarları kategorisi
// eklenecek. Burada site açık kapalı butonu yer alacak. Site kapalıyken
// ekranda sadece logo yer alacak..." (bkz. SiteBakimdaEkrani, proxy.ts).
export function SiteAyarlariYonetimi({ kapaliBaslangic, temaIdBaslangic }: { kapaliBaslangic: boolean; temaIdBaslangic: string }) {
  const router = useRouter();
  const [kapali, setKapali] = useState(kapaliBaslangic);
  const [temaId, setTemaId] = useState(temaIdBaslangic);
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);

  function degistir() {
    const yeni = !kapali;
    if (yeni && !window.confirm("Site bakıma alınsın mı? Admin dışındaki tüm roller (öğrenci/veli/öğretmen/müdür) siteyi kullanamaz.")) return;
    setMesaj(null);
    startTransition(async () => {
      const r = await siteKapaliDegistir(yeni);
      if (r.error) return setMesaj(`Hata: ${r.error}`);
      setKapali(yeni);
      setMesaj(yeni ? "Site bakıma alındı." : "Site tekrar açıldı.");
      router.refresh();
    });
  }

  function temaSec(id: string) {
    if (id === temaId) return;
    setMesaj(null);
    startTransition(async () => {
      const r = await siteTemasiDegistir(id);
      if (r.error) return setMesaj(`Hata: ${r.error}`);
      setTemaId(id);
      setMesaj("Site teması güncellendi.");
      router.refresh();
    });
  }

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-1">
        <Settings2 size={16} color={TEXT_MUTED} />
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Site ayarları</h2>
      </div>
      <div className="mt-3 rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div style={{ color: TEXT }} className="text-sm font-bold">Site {kapali ? "bakımda" : "açık"}</div>
            <p style={{ color: TEXT_MUTED }} className="text-xs mt-0.5 max-w-md">
              {kapali
                ? "Öğrenci/veli/öğretmen/müdür rolleri şu anda sadece logo ve bakım yazısı görüyor. Siz (admin) etkilenmezsiniz."
                : "Site normal çalışıyor. Bakıma aldığınızda tüm roller (admin hariç) bakım ekranıyla karşılanır."}
            </p>
          </div>
          <button type="button" disabled={pending} onClick={degistir}
            className="sfec-btn shrink-0 flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-bold disabled:opacity-60"
            style={{ background: kapali ? MINT : BG0, color: kapali ? MINT_ON : BLUSH, border: `2px solid ${kapali ? MINT : BLUSH}` }}>
            <Power size={13} /> {pending ? "İşleniyor..." : kapali ? "Siteyi aç" : "Siteyi bakıma al"}
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
        <div style={{ color: TEXT }} className="text-sm font-bold flex items-center gap-1.5">
          <Palette size={14} /> Site teması
        </div>
        <p style={{ color: TEXT_MUTED }} className="text-xs mt-0.5 max-w-2xl">
          Tema; arka planla birlikte kutu içi, kenarlık ve yazı renklerini de
          uyumlu biçimde değiştirir. Kartlar temanın kendi renkleriyle çizilir
          — seçmeden önce kutu-içi ve font uyumunu görürsünüz. Üniversite
          isimleri motivasyon, Aero yeşili ve cam mavisi Windows 7/Vista
          nostaljisidir. Seçim tüm kullanıcılar için anında geçerli olur.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {SITE_TEMA_PALETI.map((t) => {
            const aktif = t.id === temaId;
            const d = t.degisken;
            const palet = [d.bg0, d.bg1, d.border, d.borderStrong, d.text];
            return (
              <button
                key={t.id}
                type="button"
                disabled={pending}
                onClick={() => temaSec(t.id)}
                aria-pressed={aktif}
                aria-label={`Tema: ${t.ad}`}
                className="relative text-left rounded-3xl overflow-hidden transition-transform duration-200 hover:-translate-y-1 disabled:opacity-60"
                style={{
                  background: `linear-gradient(145deg, ${d.bg0} 0%, ${d.bg1Alt} 55%, ${d.border} 100%)`,
                  border: `2px solid ${aktif ? d.borderStrong : d.border}`,
                  boxShadow: aktif
                    ? `0 0 0 3px ${BORDER_STRONG}, 0 18px 40px rgba(0,0,0,0.55)`
                    : "0 15px 35px rgba(0,0,0,0.45)",
                }}
              >
                {aktif && (
                  <span
                    className="absolute top-3 right-3 flex items-center justify-center rounded-full"
                    style={{ width: 24, height: 24, background: d.borderStrong, color: d.bg0 }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </span>
                )}
                <div className="flex flex-col gap-3 p-5" style={{ minHeight: 190 }}>
                  <div>
                    <div style={{ color: d.text, fontFamily: "var(--font-baloo)" }} className="text-lg font-bold leading-tight">
                      {t.ad}
                    </div>
                    <div style={{ color: d.textMuted }} className="text-[11px] font-semibold uppercase tracking-wide mt-0.5">
                      {t.aciklama}
                    </div>
                  </div>
                  {/* Kutu-içi önizleme: temanın paneli + kendi font rengi */}
                  <div
                    className="rounded-xl px-3 py-2.5"
                    style={{ background: d.bg1, border: `1px solid ${d.border}` }}
                  >
                    <div style={{ color: d.text }} className="text-xs font-bold">Kutu içi önizleme</div>
                    <div style={{ color: d.textMuted }} className="text-[11px] mt-0.5">Sessiz metin örneği</div>
                    <span
                      className="inline-block rounded-full px-3 py-1 text-[10px] font-bold mt-2"
                      style={{ background: d.borderStrong, color: d.bg0 }}
                    >
                      Vurgu butonu
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-auto">
                    {palet.map((renk) => (
                      <span
                        key={renk}
                        className="rounded-lg shrink-0"
                        style={{
                          width: 26, height: 26, background: renk,
                          border: "1px solid rgba(255,255,255,0.25)",
                          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        }}
                        title={renk}
                      />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {mesaj && <p style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT }} className="text-xs font-semibold mt-2">{mesaj}</p>}
    </div>
  );
}
