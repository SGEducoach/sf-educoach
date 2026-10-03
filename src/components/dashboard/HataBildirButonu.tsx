"use client";

import { startTransition, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug } from "lucide-react";
import { acikHataBildirimlerimGetir, hataBildir, hataBildirimineEkBilgiGonder, type AcikHataBildirimi } from "@/app/dashboard/hata-actions";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// Faz G — tüm rollerde erişilebilir "Hata Bildir" tetikleyicisi. `boyut`
// masaüstü (ikon-only, Header'daki diğer ikon butonlarla aynı boyut) ile
// mobil (metin etiketli, MobilMenu'nün liste satırı deseniyle aynı) arasında
// seçim yapıyor — aynı modal mantığı, iki farklı görünüm.
//
// Kullanıcı hata bildirimi (2026-08-25, öğretmen ve admin sayfasında,
// mobilde): "hata bildir ekranı aktif olmuyor". Kök neden: MobilMenu bu
// bileşeni {acik && (...)} bloğunun İÇİNDE render ediyordu ve eskiden
// burada bir "kapat" prop'u menüyü de kapatıyordu — ama bu, aynı render
// turunda bu BİLEŞENİN KENDİSİNİ (dolayısıyla modal açık durumunu tutan
// kendi state'ini) unmount ediyordu, modal hiç görünmeden yok oluyordu.
// Çözüm: menüyü kapatmayı bırakmak — modal (z-[200]) zaten menünün
// (z-[150]) üzerinde göründüğü için menünün altta açık kalması görsel
// bir sorun yaratmıyor.
export function HataBildirButonu({ boyut = "ikon" }: { boyut?: "ikon" | "satir" }) {
  const pathname = usePathname();
  const [acik, setAcik] = useState(false);
  const [mesaj, setMesaj] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [sonuc, setSonuc] = useState<{ tur: "basari" | "hata"; metin: string } | null>(null);
  const [acikBildirimler, setAcikBildirimler] = useState<AcikHataBildirimi[] | null>(null);
  const [ekBilgi, setEkBilgi] = useState<Record<string, string>>({});
  const [ekBilgiPending, setEkBilgiPending] = useState<string | null>(null);

  function bildirimleriYenile() {
    startTransition(() => {
      void acikHataBildirimlerimGetir().then((r) => {
        setAcikBildirimler(r.bildirimler);
        if (r.error) setSonuc({ tur: "hata", metin: r.error });
      });
    });
  }

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setSonuc(null);
    setGonderiliyor(true);
    const { error } = await hataBildir(mesaj, pathname);
    setGonderiliyor(false);
    if (error) return setSonuc({ tur: "hata", metin: error });
    setSonuc({ tur: "basari", metin: "Bildiriminiz alındı, teşekkürler." });
    setMesaj("");
    bildirimleriYenile();
  }

  function ekBilgiGonder(id: string) {
    const metin = ekBilgi[id]?.trim();
    if (!metin) return;
    setEkBilgiPending(id);
    startTransition(() => {
      void hataBildirimineEkBilgiGonder(id, metin).then((r) => {
        setEkBilgiPending(null);
        if (r.error) return setSonuc({ tur: "hata", metin: r.error });
        setEkBilgi((onceki) => ({ ...onceki, [id]: "" }));
        setSonuc({ tur: "basari", metin: "Ek bilginiz yöneticiye iletildi." });
        bildirimleriYenile();
      });
    });
  }

  const ac = () => { setAcik(true); setAcikBildirimler(null); bildirimleriYenile(); };

  return (
    <>
      {boyut === "ikon" ? (
        <button type="button" onClick={ac} title="Hata bildir"
          className="sfec-btn w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
          <Bug size={14} color={TEXT_MUTED} />
        </button>
      ) : (
        <button type="button" onClick={ac}
          className="sfec-btn flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-[13px] font-semibold w-full text-left" style={{ color: TEXT }}>
          <Bug size={16} color={TEXT_MUTED} /> Hata bildir
        </button>
      )}

      {acik && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}
          onClick={() => setAcik(false)}>
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER_STRONG}` }}
            onClick={(e) => e.stopPropagation()}>
            <h3 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[16px] font-bold mb-1">Hata bildir</h3>
            <p style={{ color: TEXT_MUTED }} className="text-xs mb-3">Yönetici ekibin incelemesi için karşılaştığınız sorunu kısaca anlatınız.</p>
            <form onSubmit={gonder} className="flex flex-col gap-3">
              <textarea required maxLength={2000} rows={5} value={mesaj} onChange={(e) => setMesaj(e.target.value)}
                placeholder="Örn: Deneme kaydettiğimde hata mesajı çıkıyor..."
                className="text-sm px-3 py-2 rounded-xl outline-none resize-none"
                style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              {sonuc && <div style={{ color: sonuc.tur === "basari" ? MINT : BLUSH }} className="text-xs font-semibold">{sonuc.metin}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setAcik(false)}
                  className="sfec-btn flex-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                  Kapat
                </button>
                <button type="submit" disabled={gonderiliyor}
                  className="sfec-btn flex-1 text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
                  {gonderiliyor ? "Gönderiliyor..." : "Gönder"}
                </button>
              </div>
            </form>
            <div className="mt-5 border-t pt-4" style={{ borderColor: BORDER_STRONG }}>
              <h4 style={{ color: TEXT }} className="text-sm font-bold">Açık bildirimlerim</h4>
              {acikBildirimler === null ? <p style={{ color: TEXT_MUTED }} className="mt-2 text-xs">Yükleniyor...</p>
                : acikBildirimler.length === 0 ? <p style={{ color: TEXT_MUTED }} className="mt-2 text-xs">Açık bildiriminiz yok.</p>
                : <div className="mt-2 space-y-3">{acikBildirimler.map((b) => <div key={b.id} className="rounded-xl p-3" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
                    <p style={{ color: TEXT }} className="text-xs whitespace-pre-wrap">{b.mesaj}</p>
                    {b.yanitlar.map((y) => <div key={y.id} className="mt-2 rounded-lg px-2 py-1.5" style={{ background: BG1 }}>
                      <span style={{ color: MINT }} className="text-[11px] font-bold">{y.gonderenRol === "admin" ? "Yönetici" : "Siz"}</span>
                      <p style={{ color: TEXT }} className="text-xs whitespace-pre-wrap">{y.mesaj}</p>
                    </div>)}
                    <textarea value={ekBilgi[b.id] ?? ""} onChange={(e) => setEkBilgi((onceki) => ({ ...onceki, [b.id]: e.target.value }))}
                      maxLength={2000} rows={2} aria-label="Bu bildirime ek bilgi yazın" placeholder="Ek bilgi veya yanıt yazın..."
                      className="mt-2 w-full rounded-lg px-2 py-1.5 text-xs" style={{ background: BG1, color: TEXT, border: `1px solid ${BORDER_STRONG}` }} />
                    <button type="button" onClick={() => ekBilgiGonder(b.id)} disabled={ekBilgiPending === b.id || !ekBilgi[b.id]?.trim()}
                      className="sfec-btn mt-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
                      Ek bilgiyi gönder
                    </button>
                  </div>)}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
