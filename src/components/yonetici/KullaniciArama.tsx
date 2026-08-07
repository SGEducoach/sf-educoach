"use client";

import { useState, useTransition } from "react";
import { Search, Users, KeyRound, EyeOff, Eye, Copy, Check } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { kullaniciAra, sifreSifirla, hesapAktiflikDegistir, type KullaniciSonuc } from "@/app/yonetici/actions";
import type { UserRole } from "@/lib/types";

const ROL_SEKME: { id: UserRole | "hepsi"; ad: string }[] = [
  { id: "hepsi", ad: "Tümü" },
  { id: "ogrenci", ad: "Öğrenci" },
  { id: "ogretmen", ad: "Öğretmen" },
  { id: "veli", ad: "Veli" },
  { id: "mudur", ad: "Müdür" },
];

const ROL_ETIKET: Record<UserRole, string> = {
  ogrenci: "Öğrenci", ogretmen: "Öğretmen", veli: "Veli", mudur: "Müdür", admin: "Admin",
};

// Okul/sınıf sınırı olmadan tüm hesaplarda arama — admin panelinin "tek
// kontrol noktası" ilkesinin bir parçası: herhangi bir kullanıcıyı bulmak
// için doğru okulu/sınıfı önceden bilmeye gerek yok.
export function KullaniciArama() {
  const [sorgu, setSorgu] = useState("");
  const [rol, setRol] = useState<UserRole | "hepsi">("hepsi");
  const [sonuclar, setSonuclar] = useState<KullaniciSonuc[]>([]);
  const [aramaYapildi, setAramaYapildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ara(q: string, r: UserRole | "hepsi") {
    setHata(null);
    if (q.trim().length < 2) { setSonuclar([]); setAramaYapildi(false); return; }
    startTransition(async () => {
      const res = await kullaniciAra(q, r);
      if (res.error) return setHata(res.error);
      setSonuclar(res.sonuclar);
      setAramaYapildi(true);
    });
  }

  return (
    <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
          <Users size={13} color={LILAC} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Kullanıcı ara</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} color={TEXT_MUTED} className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={sorgu}
            onChange={(e) => { setSorgu(e.target.value); ara(e.target.value, rol); }}
            placeholder="Ad veya e-posta ile ara (en az 2 karakter)..."
            className="text-sm pl-9 pr-3 py-2 rounded-xl outline-none w-full"
            style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
          />
        </div>
      </div>

      <div className="flex gap-1 flex-wrap mb-4">
        {ROL_SEKME.map((r) => {
          const aktif = rol === r.id;
          return (
            <button key={r.id} type="button"
              onClick={() => { setRol(r.id); ara(sorgu, r.id); }}
              className="sgec-btn text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: aktif ? MINT : "rgba(255,255,255,0.06)", color: aktif ? "#0B3B24" : TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
              {r.ad}
            </button>
          );
        })}
      </div>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold mb-2">{hata}</div>}

      {pending ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Aranıyor...</p>
      ) : aramaYapildi && sonuclar.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Sonuç bulunamadı.</p>
      ) : sonuclar.length > 0 ? (
        <div className="flex flex-col gap-2">
          {sonuclar.map((k) => <KullaniciSatiri key={k.id} kullanici={k} />)}
        </div>
      ) : null}
    </div>
  );
}

function KullaniciSatiri({ kullanici }: { kullanici: KullaniciSonuc }) {
  const [aktif, setAktif] = useState(kullanici.aktif);
  const [yeniSifre, setYeniSifre] = useState<string | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sifrePending, startSifreTransition] = useTransition();
  const [aktiflikPending, startAktiflikTransition] = useTransition();

  function sifreSifirlaTikla() {
    if (!window.confirm(`${kullanici.ad} için yeni bir şifre oluşturulsun mu? Eski şifre geçersiz olacak.`)) return;
    setHata(null);
    startSifreTransition(async () => {
      const res = await sifreSifirla(kullanici.id);
      if (res.error) return setHata(res.error);
      setYeniSifre(res.sifre);
    });
  }

  function aktiflikTikla() {
    const hedefAktif = !aktif;
    if (!hedefAktif && !window.confirm(`${kullanici.ad} pasifleştirilsin mi? Giriş yapamayacak.`)) return;
    setHata(null);
    startAktiflikTransition(async () => {
      const res = await hesapAktiflikDegistir(kullanici.id, hedefAktif);
      if (res.error) return setHata(res.error);
      setAktif(hedefAktif);
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
    <div className="rounded-xl px-3.5 py-2.5 flex flex-col gap-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}`, opacity: aktif ? 1 : 0.6 }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div style={{ color: TEXT }} className="text-sm font-semibold">
            {kullanici.ad} <span style={{ color: LILAC }} className="text-[10px] font-bold ml-1">{ROL_ETIKET[kullanici.role]}</span>
            {!aktif && <span style={{ color: BLUSH }} className="text-[10px] font-bold ml-1">PASİF</span>}
          </div>
          <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">
            {[kullanici.email, kullanici.okulAdi, kullanici.sinifAdi, kullanici.okulNo && `#${kullanici.okulNo}`, kullanici.brans].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" onClick={sifreSifirlaTikla} disabled={sifrePending} title="Şifre sıfırla"
            className="sgec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
            style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
            <KeyRound size={11} /> Şifre sıfırla
          </button>
          <button type="button" onClick={aktiflikTikla} disabled={aktiflikPending} title={aktif ? "Pasifleştir" : "Aktifleştir"}
            className="sgec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
            style={{ background: "rgba(255,255,255,0.06)", color: aktif ? BLUSH : MINT, border: `1px solid ${BORDER_STRONG}` }}>
            {aktif ? <><EyeOff size={11} /> Pasifleştir</> : <><Eye size={11} /> Aktifleştir</>}
          </button>
        </div>
      </div>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}

      {yeniSifre && (
        <div className="rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap" style={{ background: MINT_BG, border: `1px solid ${MINT}` }}>
          <div className="text-xs" style={{ color: TEXT }}>
            Yeni şifre: <strong>{yeniSifre}</strong>
            <div style={{ color: TEXT_MUTED }} className="mt-0.5">Bu şifreyi ilgili kişiye iletin, tekrar gösterilmeyecek.</div>
          </div>
          <button type="button" onClick={sifreKopyala}
            className="sgec-btn shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
            style={{ background: MINT, color: MINT_ON }}>
            {kopyalandi ? <><Check size={12} /> Kopyalandı</> : <><Copy size={12} /> Kopyala</>}
          </button>
        </div>
      )}
    </div>
  );
}
