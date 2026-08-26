"use client";

import { startTransition, useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, BellOff, BellRing, Check, ShieldAlert, Sparkles, X } from "lucide-react";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { pushAbonelikSil } from "@/app/dashboard/push-actions";
import { pushAbonelikAc } from "@/lib/push-subscribe";
import {
  bildirimTercihiGuncelle, bildirimTercihleriGetir, bildirimlerGetir, bildirimOkunduIsaretle, bildirimlerTumunuOkunduIsaretle,
  type BildirimTercihleri, type Bildirim,
} from "@/app/dashboard/bildirim-actions";
import type { UserRole } from "@/lib/types";

type Durum = "kontrolEdiliyor" | "desteklenmiyor" | "anaEkranaEklenmeli" | "kapali" | "reddedildi" | "acik";

// Kullanıcı isteği (26.08.2026): "Bildirimler bölümü tarayıcı izninin
// yanında GERÇEK bildirim türleri de içersin" — rol'e göre hangi
// tercihlerin gösterileceği burada belirleniyor. "Yaklaşan deneme/sınav
// tarihleri" BİLİNÇLİ OLARAK yok — platformda öğrenciye özel, ileri
// tarihli bir sınav/deneme takvimi veri modeli hiç yok (bkz. migration
// 0077'nin başındaki not); önce o özellik kurulmadan burada gerçek bir
// tercih sunmak yanıltıcı olurdu.
const ROL_TERCIHLERI: Record<UserRole, { alan: keyof BildirimTercihleri; etiket: string }[]> = {
  ogrenci: [
    { alan: "ogretmenMesaji", etiket: "Öğretmen duyuruları" },
    { alan: "mudurMesaji", etiket: "Müdür / okul duyuruları" },
    { alan: "yaklasanGorev", etiket: "Yaklaşan ödev/program hatırlatmaları" },
  ],
  veli: [
    { alan: "ogretmenMesaji", etiket: "Öğretmen duyuruları" },
    { alan: "mudurMesaji", etiket: "Müdür / okul duyuruları" },
  ],
  ogretmen: [{ alan: "yanlisGiris", etiket: "Şüpheli / yanlış giriş uyarıları" }],
  mudur: [{ alan: "yanlisGiris", etiket: "Şüpheli / yanlış giriş uyarıları" }],
  admin: [{ alan: "yanlisGiris", etiket: "Şüpheli / yanlış giriş uyarıları" }],
};

const TUR_IKON: Record<string, typeof Bell> = { yanlis_giris: ShieldAlert, sistem: Sparkles };

function tarihEtiketi(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

// Kullanıcı isteği (26.08.2026, Bildirimler yeniden tasarımı — devam):
// "Bildirimleri aç sistemi kaldırılacak (kullanıcı isterse kendisi açar),
// Bildirim türleri yazısı kaldırılıp başlık sadece Bildirimler olacak,
// sistem içi bildirimleri kullanıcı buradan takip edecek." Panelin ASIL
// içeriği artık gerçek bildirim akışı (bkz. migration 0079) — tarayıcı
// push izni ve tür tercihleri en alta, küçük/ikincil bir "Ayarlar"
// bölümüne indirildi.
export function BildirimAyarlari({ role }: { role: UserRole }) {
  const [durum, setDurum] = useState<Durum>("kontrolEdiliyor");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [acik, setAcik] = useState(false);
  const [ayarlarAcik, setAyarlarAcik] = useState(false);
  const [tercihler, setTercihler] = useState<BildirimTercihleri | null>(null);
  const [tercihPending, setTercihPending] = useState<keyof BildirimTercihleri | null>(null);
  const [bildirimler, setBildirimler] = useState<Bildirim[] | null>(null);
  const [okunmamisSayisi, setOkunmamisSayisi] = useState(0);

  // Zil ikonunda okunmamış sayısı gösterebilmek için akış panel açılmadan
  // ÖNCE, mount'ta çekiliyor (tercihlerin aksine — onlar sadece panel
  // açılınca gerekiyor).
  useEffect(() => {
    startTransition(() => {
      bildirimlerGetir().then((r) => { setBildirimler(r.bildirimler); setOkunmamisSayisi(r.okunmamisSayisi); });
    });
  }, []);

  useEffect(() => {
    if (!acik || tercihler !== null) return;
    // Bkz. KullaniciArama.tsx'teki startTransition notu — bu Next.js
    // sürümünde şart, yoksa istek sessizce hiç sonuçlanmıyor.
    startTransition(() => {
      bildirimTercihleriGetir().then((r) => setTercihler(r.tercihler));
    });
  }, [acik, tercihler]);

  function tercihDegistir(alan: keyof BildirimTercihleri) {
    if (!tercihler) return;
    const yeni = !tercihler[alan];
    setTercihPending(alan);
    setTercihler({ ...tercihler, [alan]: yeni });
    bildirimTercihiGuncelle(alan, yeni).finally(() => setTercihPending(null));
  }

  function birOkunduIsaretle(id: string) {
    setBildirimler((liste) => liste?.map((b) => (b.id === id ? { ...b, okundu: true } : b)) ?? null);
    setOkunmamisSayisi((n) => Math.max(0, n - 1));
    bildirimOkunduIsaretle(id);
  }

  function tumunuOkunduIsaretle() {
    setBildirimler((liste) => liste?.map((b) => ({ ...b, okundu: true })) ?? null);
    setOkunmamisSayisi(0);
    bildirimlerTumunuOkunduIsaretle();
  }

  const kontrolEt = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setDurum("desteklenmiyor");
      return;
    }

    const iosMu = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standaloneMi =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (iosMu && !standaloneMi) {
      setDurum("anaEkranaEklenmeli");
      return;
    }

    if (Notification.permission === "denied") {
      setDurum("reddedildi");
      return;
    }

    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.getSubscription();
      setDurum(sub ? "acik" : "kapali");
    } catch {
      setDurum("kapali");
    }
  }, []);

  useEffect(() => {
    // Mount'ta tarayıcının bildirim/service-worker durumunu okuyup buna göre
    // state'i güncelliyor — bu, harici bir sistemle (Notification/ServiceWorker
    // API) senkronize olmanın kurallı yolu; kural burada yanlış pozitif veriyor.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    kontrolEt();
  }, [kontrolEt]);

  async function ac() {
    setHata(null);
    setYukleniyor(true);
    const res = await pushAbonelikAc();
    setYukleniyor(false);
    if (res.error) {
      if (Notification.permission === "denied") setDurum("reddedildi");
      setHata(res.error);
      return;
    }
    setDurum("acik");
  }

  async function kapat() {
    setYukleniyor(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await pushAbonelikSil(sub.endpoint);
        await sub.unsubscribe();
      }
      setDurum("kapali");
    } finally {
      setYukleniyor(false);
    }
  }

  const Ikon = okunmamisSayisi > 0 ? BellRing : Bell;
  const ikonRengi = okunmamisSayisi > 0 ? MINT : TEXT_MUTED;

  return (
    <div className="relative">
      <button type="button" onClick={() => setAcik((v) => !v)} title="Bildirimler"
        className="sfec-btn relative h-11 w-11 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: okunmamisSayisi > 0 ? MINT_BG : "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
        <Ikon size={16} color={ikonRengi} />
        {okunmamisSayisi > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: BLUSH, color: "#fff" }}>
            {okunmamisSayisi > 9 ? "9+" : okunmamisSayisi}
          </span>
        )}
      </button>

      {acik && createPortal(
        <div className="fixed inset-0 z-[400]" onClick={() => setAcik(false)}>
          <div
            className="sfec-fade absolute right-4 top-16 sm:right-6 w-[min(340px,calc(100vw-2rem))] max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl p-4"
            style={{ background: BG1, border: `2px solid ${BORDER_STRONG}`, boxShadow: "0 12px 30px rgba(0,0,0,0.28)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[16px] font-bold">Bildirimler</span>
              <button type="button" onClick={() => setAcik(false)} aria-label="Kapat"
                className="sfec-btn shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                <X size={12} color={TEXT_MUTED} />
              </button>
            </div>

            {okunmamisSayisi > 0 && (
              <button type="button" onClick={tumunuOkunduIsaretle}
                className="sfec-btn mb-2 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full self-start"
                style={{ color: MINT, border: `2px solid ${BORDER_STRONG}` }}>
                <Check size={11} /> Tümünü okundu işaretle
              </button>
            )}

            <div className="flex flex-col gap-1.5">
              {bildirimler === null ? (
                <p style={{ color: TEXT_MUTED }} className="text-xs py-3 text-center">Yükleniyor...</p>
              ) : bildirimler.length === 0 ? (
                <p style={{ color: TEXT_MUTED }} className="text-xs py-3 text-center">Henüz bildiriminiz yok.</p>
              ) : (
                bildirimler.map((b) => {
                  const BildirimIkonu = TUR_IKON[b.tur] ?? Bell;
                  return (
                    <button key={b.id} type="button" onClick={() => !b.okundu && birOkunduIsaretle(b.id)}
                      className="sfec-btn flex items-start gap-2 rounded-xl px-2.5 py-2 text-left"
                      style={{ background: b.okundu ? "transparent" : BG0, border: `2px solid ${BORDER_STRONG}` }}>
                      <BildirimIkonu size={14} className="mt-0.5 shrink-0" color={b.okundu ? TEXT_MUTED : MINT} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span style={{ color: TEXT }} className="text-xs font-bold truncate">{b.baslik}</span>
                          {!b.okundu && <span className="shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: MINT }} />}
                        </div>
                        <p style={{ color: TEXT_MUTED }} className="text-[11px] leading-relaxed mt-0.5">{b.mesaj}</p>
                        <span style={{ color: TEXT_MUTED }} className="text-[10px] opacity-70">{tarihEtiketi(b.olusturulmaTarihi)}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <button type="button" onClick={() => setAyarlarAcik((v) => !v)}
              className="sfec-btn mt-3 w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wide px-2.5 py-2 rounded-xl"
              style={{ color: TEXT_MUTED, borderTop: `1px solid ${BORDER_STRONG}` }}>
              Ayarlar <span style={{ transform: ayarlarAcik ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}>▾</span>
            </button>

            {ayarlarAcik && (
              <div className="flex flex-col gap-2 mt-1">
                <div className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
                  <div className="min-w-0">
                    <div style={{ color: TEXT }} className="text-xs font-semibold">Tarayıcı bildirimleri</div>
                    {durum === "desteklenmiyor" && <div style={{ color: TEXT_MUTED }} className="text-[10px]">Bu tarayıcı desteklemiyor</div>}
                    {durum === "anaEkranaEklenmeli" && <div style={{ color: TEXT_MUTED }} className="text-[10px]">Safari&apos;de Paylaş → Ana Ekrana Ekle</div>}
                    {durum === "reddedildi" && <div style={{ color: BLUSH }} className="text-[10px]">İzin reddedilmiş</div>}
                  </div>
                  {(durum === "kapali" || durum === "acik") && (
                    <button type="button" onClick={durum === "acik" ? kapat : ac} disabled={yukleniyor}
                      className="sfec-btn shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
                      style={{
                        background: durum === "acik" ? "transparent" : MINT,
                        color: durum === "acik" ? TEXT_MUTED : MINT_ON,
                        border: durum === "acik" ? `2px solid ${BORDER_STRONG}` : "none",
                      }}>
                      {durum === "acik" ? <BellOff size={12} /> : <Bell size={12} />}
                      {yukleniyor ? "..." : durum === "acik" ? "Kapat" : "Aç"}
                    </button>
                  )}
                </div>
                {hata && <p style={{ color: BLUSH }} className="text-xs">{hata}</p>}

                {ROL_TERCIHLERI[role].length > 0 && (
                  tercihler === null ? (
                    <p style={{ color: TEXT_MUTED }} className="text-xs">Yükleniyor...</p>
                  ) : (
                    ROL_TERCIHLERI[role].map(({ alan, etiket }) => (
                      <button key={alan} type="button" onClick={() => tercihDegistir(alan)} disabled={tercihPending === alan}
                        className="sfec-btn flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs disabled:opacity-60"
                        style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
                        <span style={{ color: TEXT }}>{etiket}</span>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{ background: tercihler[alan] ? MINT : "rgba(255,255,255,0.06)", color: tercihler[alan] ? MINT_ON : TEXT_MUTED }}>
                          {tercihler[alan] ? "Açık" : "Kapalı"}
                        </span>
                      </button>
                    ))
                  )
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
