"use client";

import { useEffect, useState, useTransition } from "react";
import { Crown, ShieldPlus, UserPlus } from "lucide-react";
import { adminHesapOlustur, adminleriGetir, type AdminHesabi } from "@/app/yonetici/actions";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, LILAC, LILAC_BG, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Faz 3 (2026-08-26 kullanıcı isteği) — admin hesapları SADECE burada
// (Adminler kategorisi) görüntülenip listelenebilir; başka hiçbir rol
// (moderatör dahil) bu listeyi göremez, KullaniciArama admin hesaplarını
// kasıtlı dışlıyor (bkz. kullaniciAra, .neq("role","admin")).
export function AdminlerYonetimi() {
  const [adminler, setAdminler] = useState<AdminHesabi[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [ekleAcik, setEkleAcik] = useState(false);

  function yukle() {
    adminleriGetir().then((r) => {
      if (r.error) setHata(r.error);
      setAdminler(r.adminler);
    });
  }
  useEffect(yukle, []);

  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <Crown size={16} color={LILAC} />
          <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Adminler</h2>
        </div>
        <button type="button" onClick={() => setEkleAcik((v) => !v)}
          className="sfec-btn flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
          style={{ background: ekleAcik ? MINT : BG1_ALT, color: ekleAcik ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          <UserPlus size={13} /> Yeni admin
        </button>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-xs mb-3">Birden fazla admin hesabı siteyi yönetebilir. Bu liste başka hiçbir rolde görünmez.</p>
      {ekleAcik && <AdminEkleFormu onDone={() => { setEkleAcik(false); yukle(); }} />}
      {hata && <p style={{ color: BLUSH }} className="text-xs font-semibold my-2">{hata}</p>}
      {adminler === null ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Yükleniyor...</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {adminler.map((a) => (
            <div key={a.id} className="rounded-xl px-3.5 py-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
              <div className="flex items-center gap-1.5">
                <span style={{ color: TEXT }} className="text-sm font-bold">{a.ad}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: LILAC_BG, color: LILAC }}>Admin</span>
                {!a.aktif && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: BLUSH }}>Pasif</span>}
              </div>
              <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">{a.email}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminEkleFormu({ onDone }: { onDone: () => void }) {
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [sifre, setSifre] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function olustur() {
    setHata(null);
    startTransition(async () => {
      const r = await adminHesapOlustur({ ad, email });
      if (r.error) return setHata(r.error);
      setSifre(r.sifre);
    });
  }

  if (sifre) {
    return (
      <div className="mb-3 rounded-xl p-3 text-xs" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}`, color: TEXT }}>
        <strong>{ad}</strong> için admin hesabı oluşturuldu. Geçici şifre: <strong>{sifre}</strong>
        <div style={{ color: TEXT_MUTED }} className="mt-1">Bu şifreyi ilgili kişiye iletin, tekrar gösterilmeyecek.</div>
        <button type="button" onClick={onDone} className="sfec-btn mt-2 rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ background: MINT, color: MINT_ON }}>Tamam</button>
      </div>
    );
  }

  return (
    <div className="mb-3 grid grid-cols-1 gap-2 rounded-xl p-3 sm:grid-cols-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Ad soyad</span>
        <input value={ad} onChange={(e) => setAd(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>E-posta</span>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
      </label>
      {hata && <p style={{ color: BLUSH }} className="text-xs font-semibold sm:col-span-2">{hata}</p>}
      <button type="button" onClick={olustur} disabled={pending || !ad || !email}
        className="sfec-btn self-start flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        <ShieldPlus size={12} /> {pending ? "Oluşturuluyor..." : "Admin hesabı oluştur"}
      </button>
    </div>
  );
}
