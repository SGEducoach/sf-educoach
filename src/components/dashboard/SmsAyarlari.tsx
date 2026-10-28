"use client";

// SMS bağlantı ayarları (kullanıcı kararı 28.10.2026): kurum KENDİ sağlayıcısını
// listeden seçer ve hesap bilgilerini girer; başlık(lar) sağlayıcıdan çekilir,
// elle yazılamaz. Gizli alanlar kaydedildikten sonra bir daha gösterilmez.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Lock, RefreshCw, Trash2 } from "lucide-react";
import { BG0, BG1, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { SMS_SAGLAYICILARI, smsSaglayiciBilgisi, type SmsSaglayiciKodu } from "@/lib/sms-saglayici-bilgi";
import type { SmsAyarOzeti } from "@/lib/sms-veri";
import { smsBaglantiKaldir, smsBaglantiKaydet, smsBaglantiYenile, smsBaslikSec } from "@/app/dashboard/sms-actions";

const girdi = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };
const tarihYaz = (iso: string) => new Date(iso).toLocaleString("tr-TR", {
  timeZone: "Europe/Istanbul", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export function SmsAyarlari({ ozet, okulId }: {
  ozet: SmsAyarOzeti | null;
  /** Yalnız admin başka bir kurum adına işlem yaparken. */
  okulId?: string;
}) {
  const router = useRouter();
  const [saglayici, setSaglayici] = useState<SmsSaglayiciKodu | "">(ozet?.saglayici ?? "");
  const [kimlik, setKimlik] = useState<Record<string, string>>({});
  const [duzenle, setDuzenle] = useState(ozet === null);
  const [mesaj, setMesaj] = useState<{ hata: boolean; metin: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const bilgi = smsSaglayiciBilgisi(saglayici);

  function calistir(is: () => Promise<{ error: string | null }>, basari: string, sonra?: () => void) {
    setMesaj(null);
    startTransition(async () => {
      const sonuc = await is();
      if (sonuc.error) return setMesaj({ hata: true, metin: sonuc.error });
      setMesaj({ hata: false, metin: basari });
      sonra?.();
      router.refresh();
    });
  }

  function kaydet(e: React.FormEvent) {
    e.preventDefault();
    if (!bilgi) return setMesaj({ hata: true, metin: "Listeden bir SMS sağlayıcısı seçin." });
    calistir(() => smsBaglantiKaydet({ saglayici: bilgi.kod, kimlik, okulId }), "Bağlantı doğrulandı ve kaydedildi. Başlıklar sağlayıcıdan alındı.", () => {
      setKimlik({});
      setDuzenle(false);
    });
  }

  return (
    <section className="flex flex-col gap-4">
      {ozet && !duzenle && (
        <div className="rounded-2xl p-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 size={18} color={MINT} aria-hidden="true" />
            <h2 className="text-sm font-bold" style={{ color: TEXT }}>{ozet.saglayiciAdi} bağlı</h2>
          </div>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs" style={{ color: TEXT_MUTED }}>Başlık (sağlayıcıdan)</dt>
              <dd className="mt-1">
                {ozet.basliklar.length > 1 ? (
                  <select aria-label="Gönderici başlığı" value={ozet.seciliBaslik ?? ""} disabled={pending}
                    onChange={(e) => calistir(() => smsBaslikSec(e.target.value, okulId), "Başlık seçildi.")}
                    className="min-h-11 w-full rounded-xl px-3 py-2 text-sm" style={girdi}>
                    {ozet.basliklar.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                ) : (
                  <span className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 font-bold" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER}` }}>
                    <Lock size={14} color={TEXT_MUTED} aria-hidden="true" /> {ozet.seciliBaslik ?? "—"}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs" style={{ color: TEXT_MUTED }}>Kalan paket</dt>
              <dd className="mt-1 font-bold" style={{ color: TEXT }}>{ozet.bakiye ?? "Bu sağlayıcıda sorgulanamıyor"}</dd>
            </div>
            <div>
              <dt className="text-xs" style={{ color: TEXT_MUTED }}>Son doğrulama</dt>
              <dd className="mt-1" style={{ color: TEXT }}>{ozet.sonDogrulama ? tarihYaz(ozet.sonDogrulama) : "—"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={pending} onClick={() => calistir(() => smsBaglantiYenile(okulId), "Başlık ve paket bilgisi güncellendi.")}
              className="sfec-btn inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-bold disabled:opacity-50" style={{ background: MINT_BG, color: TEXT, border: `1px solid ${MINT}` }}>
              <RefreshCw size={15} aria-hidden="true" /> Sağlayıcıdan yenile
            </button>
            <button type="button" disabled={pending} onClick={() => { setDuzenle(true); setMesaj(null); }}
              className="sfec-btn min-h-11 rounded-xl px-3.5 text-sm font-bold disabled:opacity-50" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
              Bilgileri değiştir
            </button>
            <button type="button" disabled={pending}
              onClick={() => { if (window.confirm("SMS bağlantısı kaldırılsın mı? Kayıtlı sağlayıcı bilgileri silinir; geçmiş ve şablonlar kalır.")) calistir(() => smsBaglantiKaldir(okulId), "Bağlantı kaldırıldı.", () => { setSaglayici(""); setDuzenle(true); }); }}
              className="sfec-btn inline-flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-bold disabled:opacity-50" style={{ background: BG0, color: BLUSH, border: `1px solid ${BORDER_STRONG}` }}>
              <Trash2 size={15} aria-hidden="true" /> Bağlantıyı kaldır
            </button>
          </div>
        </div>
      )}

      {duzenle && (
        <form onSubmit={kaydet} className="flex flex-col gap-3 rounded-2xl p-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
          <div>
            <h2 className="text-sm font-bold" style={{ color: TEXT }}>{ozet ? "Bağlantı bilgilerini güncelle" : "SMS paketinizi bağlayın"}</h2>
            <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
              SeFu SMS paketi satmaz. Kurumunuzun kendi SMS sağlayıcısındaki hesap bilgilerini girin; mesajlar sizin paketinizden düşer.
              Başlık (gönderici adı) sağlayıcıdan otomatik alınır ve değiştirilemez.
            </p>
          </div>
          <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: TEXT_MUTED }}>
            SMS sağlayıcısı
            <select value={saglayici} onChange={(e) => { setSaglayici(e.target.value as SmsSaglayiciKodu | ""); setKimlik({}); }}
              disabled={pending} className="min-h-11 rounded-xl px-3 py-2 text-sm font-normal" style={girdi}>
              <option value="">Seçin…</option>
              {SMS_SAGLAYICILARI.map((s) => <option key={s.kod} value={s.kod}>{s.ad}</option>)}
            </select>
          </label>
          {bilgi?.alanlar.map((a) => (
            <label key={`${bilgi.kod}-${a.anahtar}`} className="flex flex-col gap-1 text-xs font-bold" style={{ color: TEXT_MUTED }}>
              {a.etiket}
              <input type={a.gizli ? "password" : "text"} value={kimlik[a.anahtar] ?? ""} maxLength={200} required
                autoComplete={a.gizli ? "new-password" : "off"} spellCheck={false} disabled={pending}
                onChange={(e) => setKimlik((k) => ({ ...k, [a.anahtar]: e.target.value }))}
                className="min-h-11 rounded-xl px-3 py-2 text-sm font-normal" style={girdi} />
              {a.ipucu && <span className="font-normal">{a.ipucu}</span>}
            </label>
          ))}
          {bilgi?.not && <p className="text-xs" style={{ color: TEXT_MUTED }}>{bilgi.not}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending || !bilgi}
              className="sfec-btn min-h-11 rounded-xl px-4 text-sm font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
              {pending ? "Sağlayıcıya bağlanılıyor…" : "Doğrula ve kaydet"}
            </button>
            {ozet && (
              <button type="button" disabled={pending} onClick={() => { setDuzenle(false); setMesaj(null); }}
                className="sfec-btn min-h-11 rounded-xl px-4 text-sm font-bold" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
                Vazgeç
              </button>
            )}
          </div>
        </form>
      )}

      {mesaj && <p role={mesaj.hata ? "alert" : "status"} className="text-sm" style={{ color: mesaj.hata ? BLUSH : MINT }}>{mesaj.metin}</p>}
    </section>
  );
}
