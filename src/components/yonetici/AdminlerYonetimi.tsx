"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Copy, Crown, Eye, EyeOff, KeyRound, ShieldPlus, Settings, UserPlus } from "lucide-react";
import {
  adminAktiflikDegistir, adminHesapOlustur, adminleriGetir, adminProfilGuncelle, adminSifreBelirle, adminSifreSifirla,
  type AdminHesabi,
} from "@/app/yonetici/actions";
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
          {adminler.map((a) => <AdminSatiri key={a.id} admin={a} onDegisti={yukle} />)}
        </div>
      )}
    </div>
  );
}

// Kullanıcı isteği (26.08.2026): "Admin rolü kendi panelinde admin
// profillerini düzenleyebilir, profillerde işlem yapabilir." — daha önce
// bu liste tamamen salt-okunurdu (bkz. adminProfilGuncelle/adminAktiflikDegistir/
// adminSifreSifirla/adminSifreBelirle yorumları, actions.ts: bunlar
// kullaniciProfilGuncelle vb.'nin TERSİNE sadece role==='admin' hedefte
// çalışır, self-lockout ve "son admin" korumaları var).
function AdminSatiri({ admin: a, onDegisti }: { admin: AdminHesabi; onDegisti: () => void }) {
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [ad, setAd] = useState(a.ad);
  const [email, setEmail] = useState(a.email ?? "");
  const [telefon, setTelefon] = useState(a.telefon ?? "");
  const [elleSifreAcik, setElleSifreAcik] = useState(false);
  const [elleSifre, setElleSifre] = useState("");
  const [yeniSifre, setYeniSifre] = useState<string | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function kaydet() {
    setHata(null);
    setMesaj(null);
    startTransition(async () => {
      const r = await adminProfilGuncelle({ adminId: a.id, ad, email, telefon });
      if (r.error) return setHata(r.error);
      setMesaj("Profil güncellendi.");
      onDegisti();
    });
  }

  function aktiflikTikla() {
    const hedefAktif = !a.aktif;
    if (!hedefAktif && !window.confirm(`${a.ad} pasifleştirilsin mi? Giriş yapamayacak.`)) return;
    setHata(null);
    startTransition(async () => {
      const r = await adminAktiflikDegistir(a.id, hedefAktif);
      if (r.error) return setHata(r.error);
      onDegisti();
    });
  }

  function rastgeleSifreTikla() {
    if (!window.confirm(`${a.ad} için yeni bir şifre oluşturulsun mu? Eski şifre geçersiz olacak.`)) return;
    setHata(null);
    startTransition(async () => {
      const r = await adminSifreSifirla(a.id);
      if (r.error) return setHata(r.error);
      setYeniSifre(r.sifre);
    });
  }

  function elleSifreKaydet() {
    setHata(null);
    startTransition(async () => {
      const r = await adminSifreBelirle(a.id, elleSifre);
      if (r.error) return setHata(r.error);
      setElleSifre("");
      setElleSifreAcik(false);
      setMesaj("Şifre güncellendi.");
    });
  }

  function sifreKopyala() {
    if (!yeniSifre) return;
    navigator.clipboard?.writeText(yeniSifre).then(() => {
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    });
  }

  return (
    <div className="rounded-xl px-3.5 py-2.5 flex flex-col gap-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}`, opacity: a.aktif ? 1 : 0.6 }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span style={{ color: TEXT }} className="text-sm font-bold">{a.ad}</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: LILAC_BG, color: LILAC }}>Admin</span>
            {!a.aktif && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: BLUSH }}>Pasif</span>}
          </div>
          <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">{[a.email, a.telefon].filter(Boolean).join(" · ") || "İletişim bilgisi yok"}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <button type="button" onClick={rastgeleSifreTikla} disabled={pending} title="Rastgele yeni şifre oluştur"
            className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
            style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            <KeyRound size={11} /> Rastgele şifre
          </button>
          <button type="button" onClick={() => setElleSifreAcik((v) => !v)} title="Şifreyi elle belirle"
            className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
            style={{ background: elleSifreAcik ? MINT : "rgba(255,255,255,0.06)", color: elleSifreAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            <KeyRound size={11} /> Şifre belirle
          </button>
          <button type="button" onClick={aktiflikTikla} disabled={pending} title={a.aktif ? "Pasifleştir" : "Aktifleştir"}
            className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
            style={{ background: "rgba(255,255,255,0.06)", color: a.aktif ? BLUSH : MINT, border: `2px solid ${BORDER_STRONG}` }}>
            {a.aktif ? <><EyeOff size={11} /> Pasifleştir</> : <><Eye size={11} /> Aktifleştir</>}
          </button>
          <button type="button" onClick={() => setDuzenleAcik((v) => !v)} title="Profili düzenle"
            className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
            style={{ background: duzenleAcik ? MINT : "rgba(13,148,136,0.08)", color: duzenleAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            <Settings size={11} /> Yönet
          </button>
        </div>
      </div>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      {mesaj && <div style={{ color: MINT }} className="text-xs font-semibold">{mesaj}</div>}

      {elleSifreAcik && (
        <div className="rounded-xl p-2.5 flex items-center gap-2 flex-wrap" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <input type="text" value={elleSifre} onChange={(e) => setElleSifre(e.target.value)} placeholder="Yeni şifre (en az 8, harf+rakam+özel işaret)"
            className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          <button type="button" disabled={pending || !elleSifre} onClick={elleSifreKaydet}
            className="sfec-btn shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      )}

      {yeniSifre && (
        <div className="rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap" style={{ background: BG0, border: `1px solid ${MINT}` }}>
          <div className="text-xs" style={{ color: TEXT }}>
            Yeni şifre: <strong>{yeniSifre}</strong>
            <div style={{ color: TEXT_MUTED }} className="mt-0.5">Bu şifreyi ilgili kişiye iletin, tekrar gösterilmeyecek.</div>
          </div>
          <button type="button" onClick={sifreKopyala}
            className="sfec-btn shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
            style={{ background: MINT, color: MINT_ON }}>
            {kopyalandi ? <><Check size={12} /> Kopyalandı</> : <><Copy size={12} /> Kopyala</>}
          </button>
        </div>
      )}

      {duzenleAcik && (
        <div className="rounded-xl p-3 flex flex-col gap-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Ad soyad</span>
              <input value={ad} onChange={(e) => setAd(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>E-posta</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Telefon</span>
              <input value={telefon} onChange={(e) => setTelefon(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
            </label>
          </div>
          <button type="button" onClick={kaydet} disabled={pending} className="sfec-btn self-start rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            {pending ? "Kaydediliyor..." : "Profili kaydet"}
          </button>
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
