"use client";

// Öğrencinin Profilim ekranında "Velimi Davet Et" (migration 0187). Bağlantı
// yalnız üretildiği anda gösterilir; kaybolursa yeni bağlantı üretilir ve
// eskisi geçersiz olur.
import { useEffect, useState, useTransition } from "react";
import { Copy, Link2, Send, UserRoundCheck, X } from "lucide-react";
import { BG0, BG1, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { veliDavetDurumuGetir, veliDavetiIptalEt, veliDavetiOlusturOgrenci, type VeliDavetDurumu } from "@/app/dashboard/veli-davet-actions";

const tarih = (iso: string) => new Date(iso).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Istanbul" });

export function VeliDavetKarti() {
  const [durum, setDurum] = useState<VeliDavetDurumu | null>(null);
  const [baglanti, setBaglanti] = useState<{ url: string; son: string } | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const yukle = () => veliDavetDurumuGetir().then((r) => { setHata(r.error); setDurum(r.durum); });
  useEffect(() => { start(yukle); }, []);

  function olustur() {
    setHata(null); setMesaj(null);
    start(async () => {
      const r = await veliDavetiOlusturOgrenci();
      if (r.error || !r.baglanti || !r.sonKullanma) return setHata(r.error ?? "Bağlantı oluşturulamadı.");
      setBaglanti({ url: r.baglanti, son: r.sonKullanma });
      await yukle();
    });
  }
  function iptal() {
    setHata(null); setMesaj(null);
    start(async () => {
      const r = await veliDavetiIptalEt();
      if (r.error) return setHata(r.error);
      setBaglanti(null); setMesaj("Davet bağlantısı iptal edildi.");
      await yukle();
    });
  }
  async function kopyala() {
    if (!baglanti) return;
    try { await navigator.clipboard.writeText(baglanti.url); setMesaj("Bağlantı kopyalandı."); }
    catch { setMesaj("Kopyalanamadı; bağlantıyı elle seçip kopyala."); }
  }
  async function paylas() {
    if (!baglanti) return;
    const metin = `SeFu Koç veli hesabını bu bağlantıdan oluşturabilirsin (tek kullanımlık, ${tarih(baglanti.son)} tarihine kadar geçerli): ${baglanti.url}`;
    if (navigator.share) {
      try { await navigator.share({ title: "SeFu Koç Veli Daveti", text: metin }); } catch { /* kullanıcı vazgeçti */ }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(metin)}`, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Velimi Davet Et</h2>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
        Velin bu bağlantıyla kendi hesabını açar ve hesabına otomatik bağlanır; öğretmen onayı gerekmez. Bağlantı tek kullanımlıktır ve 7 gün geçerlidir. Yalnız kendi velinle paylaş.
      </p>

      {durum && durum.bagliVeliler.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {durum.bagliVeliler.map((v, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
              <UserRoundCheck size={12} color={MINT} aria-hidden="true" /> {v}
            </span>
          ))}
        </div>
      )}

      {baglanti ? (
        <div className="mt-3 flex flex-col gap-2 rounded-xl p-3" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <input readOnly value={baglanti.url} onFocus={(e) => e.currentTarget.select()} aria-label="Davet bağlantısı"
            className="w-full rounded-lg px-2.5 py-1.5 text-[11px] outline-none" style={{ background: BG1, color: TEXT, border: `1px solid ${BORDER_STRONG}` }} />
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={paylas} className="sfec-btn inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}><Send size={13}/> Veline gönder</button>
            <button type="button" onClick={kopyala} className="sfec-btn inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}><Copy size={13}/> Kopyala</button>
            <button type="button" onClick={iptal} disabled={pending} className="sfec-btn inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ color: BLUSH, border: `2px solid ${BORDER_STRONG}` }}><X size={13}/> İptal et</button>
          </div>
          <p className="text-[10px]" style={{ color: TEXT_MUTED }}>{tarih(baglanti.son)} tarihine kadar geçerli. Bu sayfadan çıkınca bağlantı bir daha gösterilmez; gerekirse yenisini oluşturursun.</p>
        </div>
      ) : durum?.yeniDavetMumkun ? (
        <div className="mt-3 flex flex-col gap-2">
          {durum.aktifDavetSonKullanma && (
            <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
              {tarih(durum.aktifDavetSonKullanma)} tarihine kadar geçerli bir davetin var. Yeni bağlantı oluşturursan eskisi geçersiz olur.{" "}
              <button type="button" onClick={iptal} disabled={pending} className="font-bold underline disabled:opacity-50" style={{ color: BLUSH }}>Daveti iptal et</button>
            </p>
          )}
          <button type="button" onClick={olustur} disabled={pending} className="sfec-btn inline-flex w-fit items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            <Link2 size={14}/> {pending ? "Hazırlanıyor..." : "Davet bağlantısı oluştur"}
          </button>
        </div>
      ) : durum ? (
        <p className="mt-3 text-[11px]" style={{ color: TEXT_MUTED }}>Hesabına bağlanabilecek veli sayısı doldu. Değişiklik için okul yönetimine başvur.</p>
      ) : null}

      {mesaj && <p className="mt-2 text-[11px] font-semibold" style={{ color: MINT }}>{mesaj}</p>}
      {hata && <p role="alert" className="mt-2 text-[11px] font-semibold" style={{ color: BLUSH }}>{hata}</p>}
    </div>
  );
}
