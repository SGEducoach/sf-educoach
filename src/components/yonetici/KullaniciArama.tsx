"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { Search, Users, KeyRound, EyeOff, Eye, Copy, Check, ArrowRightLeft, Trash2, Settings, Building2, ChevronLeft } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC, LILAC_TEXT } from "@/lib/theme";
import { kullaniciAra, sifreSifirla, sifreBelirle, hesapAktiflikDegistir, hesapSil, okulSiniflari, ogrenciSinifTasi, ogretmenBransDegistir, yonetimOkullariGetir, type KullaniciSonuc, type YonetimOkulu } from "@/app/yonetici/actions";
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

// Kullanıcı bulgusu (26.08.2026, İKİNCİ kez bildirildi — "hâlâ çalışmıyor"):
// "Kullanıcılara dön" sonrası kurum seçim ekranına düşülüyordu.
// router.back() (bkz. GeriDonButonu) tek başına yeterli olmadı — Next.js'in
// router cache'i bu client bileşenin state'ini garanti korumuyor. Kalıcı,
// navigasyon yolundan BAĞIMSIZ çözüm: filtreleri sessionStorage'a yazıp
// mount'ta geri okumak — böylece "Kullanıcılara dön" linki, tarayıcı geri
// tuşu veya sekme yenilemesi FARK ETMEKSİZİN son bakılan liste geri gelir.
const OTURUM_ANAHTARI = "sfec_yonetici_kullanici_arama";

interface KayitliDurum { schoolId: string | null; rol: UserRole | "hepsi" | null; sinifId: string; sorgu: string }

function durumOku(): KayitliDurum | null {
  if (typeof window === "undefined") return null;
  try {
    const ham = sessionStorage.getItem(OTURUM_ANAHTARI);
    return ham ? (JSON.parse(ham) as KayitliDurum) : null;
  } catch {
    return null;
  }
}

function durumYaz(durum: KayitliDurum) {
  try { sessionStorage.setItem(OTURUM_ANAHTARI, JSON.stringify(durum)); } catch { /* yoksay */ }
}

// 2026-08-26 kullanıcı isteği: "admin sayfasında filtreleri kurumdan
// başlat" — artık ilk ve zorunlu adım kurum (okul/dershane) seçimi.
// Ondan sonra rol (mevcut büyük kart davranışı), öğrenci seçilirse de
// sınıf filtresi geliyor.
export function KullaniciArama() {
  const kayitli = durumOku();
  const [okullar, setOkullar] = useState<YonetimOkulu[]>([]);
  const [schoolId, setSchoolId] = useState<string | null>(kayitli?.schoolId ?? null);
  const [sinifId, setSinifId] = useState(kayitli?.sinifId ?? "");
  const [sorgu, setSorgu] = useState(kayitli?.sorgu ?? "");
  // Kullanıcı geri bildirimi (2026-08-25): "Tümü seçili geliyor ama hiçbir
  // şey listelemiyor" — kök neden ayrıydı (mount'ta hiç arama tetiklenmiyordu,
  // aşağıya bkz.) ama kullanıcı ayrıca hiçbir kategorinin baştan seçili
  // GELMEMESİNİ istedi: ilk girişte kategoriler büyük kartlar halinde
  // listelensin, seçim yapılınca mevcut küçük sekme haline dönsün.
  const [rol, setRol] = useState<UserRole | "hepsi" | null>(kayitli?.rol ?? null);
  const [sonuclar, setSonuclar] = useState<KullaniciSonuc[]>([]);
  const [aramaYapildi, setAramaYapildi] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Bu Next.js sürümünde server action'lar useEffect içinden çağrılırken
    // startTransition ile sarılmak ZORUNDA (bkz. node_modules/next/dist/docs/
    // 01-app/02-guides/server-actions.md, "invoke it from ... a useEffect
    // wrapped in startTransition") — yoksa istek sessizce hiç sonuçlanmıyor,
    // ekran süresiz "Yükleniyor..." durumunda kalıyor. Bu, oturumdaki birçok
    // "boş/yükleniyor" şikayetinin kök nedeni.
    startTransition(() => {
      yonetimOkullariGetir().then((r) => setOkullar(r.okullar));
    });
  }, []);

  // Kayıtlı bir durum varsa (schoolId+rol) sayfa ilk açıldığında aramayı
  // otomatik tetikle — sadece mount'ta bir kez.
  useEffect(() => {
    if (kayitli?.schoolId && kayitli.rol) ara(kayitli.sorgu ?? "", kayitli.rol, kayitli.sinifId ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    durumYaz({ schoolId, rol, sinifId, sorgu });
  }, [schoolId, rol, sinifId, sorgu]);

  const seciliOkul = okullar.find((o) => o.id === schoolId) ?? null;

  function ara(q: string, r: UserRole | "hepsi", sinif: string) {
    if (!schoolId) return;
    setHata(null);

    // 0 veya 1 karakterde filtreleme yapma.
    // Bunun yerine seçili role ait tüm kullanıcıları getir.
    const aranacakMetin = q.trim().length >= 2 ? q : "";

    startTransition(async () => {
      const res = await kullaniciAra(aranacakMetin, r, schoolId, r === "ogrenci" && sinif ? sinif : undefined);
      if (res.error) return setHata(res.error);

      setSonuclar(res.sonuclar);
      setAramaYapildi(true);
    });
  }

  function kurumDegistir() {
    setSchoolId(null);
    setRol(null);
    setSinifId("");
    setSorgu("");
    setSonuclar([]);
    setAramaYapildi(false);
  }

  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
          <Users size={13} color={LILAC} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Kullanıcı ara</span>
      </div>

      {schoolId === null ? (
        <>
          <div className="flex items-center gap-1.5 mb-3">
            <Building2 size={13} color={TEXT_MUTED} />
            <span style={{ color: TEXT_MUTED }} className="text-xs font-semibold">Önce bir kurum seçin</span>
          </div>
          {okullar.length === 0 ? (
            <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Yükleniyor...</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {okullar.map((o) => (
                <button key={o.id} type="button"
                  onClick={() => setSchoolId(o.id)}
                  className="sfec-btn rounded-2xl py-4 px-3 text-sm font-bold"
                  style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                  {o.ad}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={kurumDegistir}
              className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
              <ChevronLeft size={12} /> Kurum değiştir
            </button>
            <span style={{ color: TEXT }} className="text-xs font-bold flex items-center gap-1"><Building2 size={12} color={TEXT_MUTED} /> {seciliOkul?.ad}</span>
          </div>

          {rol === null ? (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {ROL_SEKME.map((r) => (
                <button key={r.id} type="button"
                  onClick={() => { setRol(r.id); ara(sorgu, r.id, sinifId); }}
                  className="sfec-btn rounded-2xl py-4 text-sm font-bold"
                  style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                  {r.ad}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="relative flex-1 min-w-[180px]">
                  <Search size={14} color={TEXT_MUTED} className="absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={sorgu}
                    onChange={(e) => { setSorgu(e.target.value); ara(e.target.value, rol, sinifId); }}
                    placeholder="Ad veya e-posta ile ara (en az 2 karakter)..."
                    className="text-sm pl-9 pr-3 py-2 rounded-xl outline-none w-full"
                    style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
                  />
                </div>
                {rol === "ogrenci" && (
                  <select value={sinifId} onChange={(e) => { setSinifId(e.target.value); ara(sorgu, rol, e.target.value); }}
                    className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
                    <option value="">Tüm sınıflar</option>
                    {seciliOkul?.siniflar.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
                  </select>
                )}
              </div>

              <div className="flex gap-1 flex-wrap mb-4">
                {ROL_SEKME.map((r) => {
                  const aktif = rol === r.id;
                  return (
                    <button key={r.id} type="button"
                      onClick={() => { setRol(r.id); setSinifId(""); ara(sorgu, r.id, ""); }}
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
            </>
          )}
        </>
      )}
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
  const [elleSifreAcik, setElleSifreAcik] = useState(false);
  const [elleSifre, setElleSifre] = useState("");
  const [elleSifrePending, startElleSifreTransition] = useTransition();

  function sifreSifirlaTikla() {
    if (!window.confirm(`${kullanici.ad} için yeni bir şifre oluşturulsun mu? Eski şifre geçersiz olacak.`)) return;
    setHata(null);
    startSifreTransition(async () => {
      const res = await sifreSifirla(kullanici.id);
      if (res.error) return setHata(res.error);
      setYeniSifre(res.sifre);
    });
  }

  function elleSifreKaydet() {
    setHata(null);
    startElleSifreTransition(async () => {
      const res = await sifreBelirle(kullanici.id, elleSifre);
      if (res.error) return setHata(res.error);
      setElleSifre("");
      setElleSifreAcik(false);
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
            {kullanici.ad} <span style={{ color: LILAC_TEXT }} className="text-[10px] font-bold ml-1">{ROL_ETIKET[kullanici.role]}</span>
            {kullanici.moderatorMu && <span style={{ color: MINT_ON, background: MINT }} className="text-[10px] font-bold ml-1 px-1.5 py-0.5 rounded-full">Moderatör</span>}
            {!aktif && <span style={{ color: BLUSH }} className="text-[10px] font-bold ml-1">Pasif</span>}
          </div>
          <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">
            {[kullanici.email, kullanici.okulAdi, kullanici.sinifAdi, kullanici.okulNo && `#${kullanici.okulNo}`, kullanici.brans].filter(Boolean).join(" · ")}
          </div>
        </Link>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button type="button" onClick={sifreSifirlaTikla} disabled={sifrePending} title="Rastgele yeni şifre oluştur"
            className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full disabled:opacity-60"
            style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            <KeyRound size={11} /> Rastgele şifre
          </button>
          <button type="button" onClick={() => setElleSifreAcik((v) => !v)} title="Şifreyi elle belirle"
            className="sfec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
            style={{ background: elleSifreAcik ? MINT : "rgba(255,255,255,0.06)", color: elleSifreAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            <KeyRound size={11} /> Şifre belirle
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

      {elleSifreAcik && (
        <div className="rounded-xl p-2.5 flex items-center gap-2 flex-wrap" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <input type="text" value={elleSifre} onChange={(e) => setElleSifre(e.target.value)} placeholder="Yeni şifre (en az 8, harf+rakam+özel işaret)"
            className="min-w-0 flex-1 rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          <button type="button" disabled={elleSifrePending || !elleSifre} onClick={elleSifreKaydet}
            className="sfec-btn shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            {elleSifrePending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
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
