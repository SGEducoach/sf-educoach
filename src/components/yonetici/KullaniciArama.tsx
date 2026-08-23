"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Search, Users, KeyRound, EyeOff, Eye, Copy, Check, ArrowRightLeft, Trash2, Settings } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { kullaniciAra, sifreSifirla, hesapAktiflikDegistir, hesapSil, okulSiniflari, ogrenciSinifTasi, ogretmenBransDegistir, type KullaniciSonuc } from "@/app/yonetici/actions";
import { BRANS_LISTESI } from "@/lib/types";
import type { UserRole } from "@/lib/types";
import { KullaniciDetayYonetimi } from "@/components/yonetici/KullaniciDetayYonetimi";

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

  // 0 veya 1 karakterde filtreleme yapma.
  // Bunun yerine seçili role ait tüm kullanıcıları getir.
  const aranacakMetin = q.trim().length >= 2 ? q : "";

  startTransition(async () => {
    const res = await kullaniciAra(aranacakMetin, r);
    if (res.error) return setHata(res.error);

    setSonuclar(res.sonuclar);
    setAramaYapildi(true);
  });
}

  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
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
            style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
          />
        </div>
      </div>

      <div className="flex gap-1 flex-wrap mb-4">
        {ROL_SEKME.map((r) => {
          const aktif = rol === r.id;
          return (
            <button key={r.id} type="button"
              onClick={() => { setRol(r.id); ara(sorgu, r.id); }}
              className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full"
              style={{ background: aktif ? MINT : "rgba(255,255,255,0.06)", color: aktif ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
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
  const [silindi, setSilindi] = useState(false);
  const [aktif, setAktif] = useState(kullanici.aktif);
  const [yeniSifre, setYeniSifre] = useState<string | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sifrePending, startSifreTransition] = useTransition();
  const [aktiflikPending, startAktiflikTransition] = useTransition();
  const [silmePending, startSilmeTransition] = useTransition();
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [detayAcik, setDetayAcik] = useState(false);

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

  function silTikla() {
    if (!window.confirm(`${kullanici.ad} kalıcı olarak silinsin mi? Hesap ve bağlı veriler geri alınamaz.`)) return;
    setHata(null);
    startSilmeTransition(async () => {
      const res = await hesapSil(kullanici.id);
      if (res.error) return setHata(res.error);
      setSilindi(true);
    });
  }

  if (silindi) return null;

  return (
    <div className="rounded-xl px-3.5 py-2.5 flex flex-col gap-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}`, opacity: aktif ? 1 : 0.6 }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href={`/yonetici/kullanici/${kullanici.id}`} className="min-w-0 flex-1 cursor-pointer group" title={`${kullanici.ad} kullanıcısının sayfasını görüntüle`}>
          <div style={{ color: TEXT }} className="text-sm font-semibold underline-offset-2 group-hover:underline transition-colors">
            {kullanici.ad} <span style={{ color: LILAC }} className="text-[10px] font-bold ml-1">{ROL_ETIKET[kullanici.role]}</span>
            {!aktif && <span style={{ color: BLUSH }} className="text-[10px] font-bold ml-1">Pasif</span>}
          </div>
          <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">
            {[kullanici.email, kullanici.okulAdi, kullanici.sinifAdi, kullanici.okulNo && `#${kullanici.okulNo}`, kullanici.brans].filter(Boolean).join(" · ")}
          </div>
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" onClick={sifreSifirlaTikla} disabled={sifrePending} title="Şifre sıfırla"
            className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
            style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            <KeyRound size={11} /> Şifre sıfırla
          </button>
          <button type="button" onClick={aktiflikTikla} disabled={aktiflikPending} title={aktif ? "Pasifleştir" : "Aktifleştir"}
            className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
            style={{ background: "rgba(255,255,255,0.06)", color: aktif ? BLUSH : MINT, border: `2px solid ${BORDER_STRONG}` }}>
            {aktif ? <><EyeOff size={11} /> Pasifleştir</> : <><Eye size={11} /> Aktifleştir</>}
          </button>
          {(kullanici.role === "ogrenci" || kullanici.role === "ogretmen" || kullanici.role === "mudur") && (
            <button type="button" onClick={() => setDuzenleAcik((v) => !v)} title={kullanici.role === "ogrenci" ? "Sınıf taşı" : "Branş değiştir"}
              className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
              style={{ background: duzenleAcik ? MINT : "rgba(255,255,255,0.06)", color: duzenleAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
              <ArrowRightLeft size={11} /> {kullanici.role === "ogrenci" ? "Sınıf taşı" : "Branş"}
            </button>
          )}
          <button type="button" onClick={silTikla} disabled={silmePending} title="Kullanıcıyı kalıcı sil"
            className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
            style={{ background: "rgba(225,29,72,0.08)", color: BLUSH, border: `1px solid ${BLUSH}` }}>
            <Trash2 size={11} /> {silmePending ? "Siliniyor..." : "Sil"}
          </button>
          <button type="button" onClick={() => setDetayAcik((v) => !v)} title="Detaylı kullanıcı yönetimi"
            className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
            style={{ background: detayAcik ? MINT : "rgba(13,148,136,0.08)", color: detayAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            <Settings size={11} /> Yönet
          </button>
        </div>
      </div>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}

      {duzenleAcik && kullanici.role === "ogrenci" && (
        <OgrenciSinifTasiFormu studentId={kullanici.id} okulId={kullanici.okulId} suankiSinifId={kullanici.sinifId} onDone={() => setDuzenleAcik(false)} />
      )}
      {duzenleAcik && (kullanici.role === "ogretmen" || kullanici.role === "mudur") && (
        <OgretmenBransFormu teacherId={kullanici.id} suankiBrans={kullanici.brans} onDone={() => setDuzenleAcik(false)} />
      )}

      {yeniSifre && (
        <div className="rounded-xl p-2.5 flex items-center justify-between gap-2 flex-wrap" style={{ background: MINT_BG, border: `1px solid ${MINT}` }}>
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
      {detayAcik && <KullaniciDetayYonetimi kullanici={kullanici} />}
    </div>
  );
}

function OgrenciSinifTasiFormu({ studentId, okulId, suankiSinifId, onDone }: { studentId: string; okulId: string | null; suankiSinifId: string | null; onDone: () => void }) {
  const [siniflar, setSiniflar] = useState<{ id: string; seviye: string; sube: string }[] | null>(null);
  const [seciliSinifId, setSeciliSinifId] = useState(suankiSinifId ?? "");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!okulId) return;
    okulSiniflari(okulId).then((res) => {
      if (res.error) return setHata(res.error);
      setSiniflar(res.siniflar);
    });
  }, [okulId]);

  function tasi() {
    if (!seciliSinifId || seciliSinifId === suankiSinifId) return;
    setHata(null);
    startTransition(async () => {
      const res = await ogrenciSinifTasi(studentId, seciliSinifId);
      if (res.error) return setHata(res.error);
      onDone();
    });
  }

  return (
    <div className="rounded-xl p-2.5 flex items-center gap-2 flex-wrap" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      {siniflar === null ? (
        <span style={{ color: TEXT_MUTED }} className="text-xs">Sınıflar yükleniyor...</span>
      ) : siniflar.length === 0 ? (
        <span style={{ color: TEXT_MUTED }} className="text-xs">Bu okulda kayıtlı sınıf yok.</span>
      ) : (
        <>
          <select value={seciliSinifId} onChange={(e) => setSeciliSinifId(e.target.value)}
            className="text-xs font-bold px-2.5 py-1.5 rounded-full outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
          </select>
          <button type="button" onClick={tasi} disabled={pending || !seciliSinifId || seciliSinifId === suankiSinifId}
            className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            {pending ? "Taşınıyor..." : "Taşı"}
          </button>
        </>
      )}
      {hata && <span style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</span>}
    </div>
  );
}

function OgretmenBransFormu({ teacherId, suankiBrans, onDone }: { teacherId: string; suankiBrans: string | null; onDone: () => void }) {
  const [brans, setBrans] = useState(suankiBrans ?? BRANS_LISTESI[0]);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function kaydet() {
    if (brans === suankiBrans) return;
    setHata(null);
    startTransition(async () => {
      const res = await ogretmenBransDegistir(teacherId, brans);
      if (res.error) return setHata(res.error);
      onDone();
    });
  }

  return (
    <div className="rounded-xl p-2.5 flex items-center gap-2 flex-wrap" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <select value={brans} onChange={(e) => setBrans(e.target.value)}
        className="text-xs font-bold px-2.5 py-1.5 rounded-full outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        {BRANS_LISTESI.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <button type="button" onClick={kaydet} disabled={pending || brans === suankiBrans}
        className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
      {hata && <span style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</span>}
    </div>
  );
}
