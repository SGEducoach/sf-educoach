"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowRightLeft, Award, BedDouble, ChevronDown, KeyRound, Pencil, Save, Search, Settings, ShieldCheck, Trash2, UserCheck, UserPlus, UserX } from "lucide-react";
import {
  moderatorAktiflikDegistir, moderatorHesapSil, moderatorKurumBilgisiGetir, moderatorKurumGuncelle,
  moderatorOgrenciEkle, moderatorOgrenciSinifTasi, moderatorOgretmenBransDegistir, moderatorOgretmenEkle,
  moderatorOkulSiniflari, moderatorRozetSifirla, moderatorSifreBelirle, moderatorSifreSifirla, moderatorYurtDurumuDegistir,
  type ModeratorKullanici,
} from "@/app/moderator/actions";
import { AYT_ALAN_ETIKET, BRANS_LISTESI } from "@/lib/types";
import type { AytAlan } from "@/lib/types";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

export function ModeratorPanel({ okulAdi, kullanicilar, schoolId }: {
  okulAdi: string; kullanicilar: ModeratorKullanici[];
  // schoolId: yalnızca admin /yonetici → Moderatörler'den bu okulu
  // GÖRÜNTÜLERKEN geçilir (bkz. moderator/page.tsx) — aksiyon fonksiyonlarına
  // iletilir ki requireModerator() admin'in kendi (var olmayan) moderatör
  // satırı yerine hedef okulu kullanabilsin.
  schoolId?: string;
}) {
  const SAYFA_BOYUTU = 50;
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [sekme, setSekme] = useState<"tumu" | ModeratorKullanici["kategori"]>("ogrenci");
  const [arama, setArama] = useState("");
  const [sinif, setSinif] = useState("tumu");
  const [durum, setDurum] = useState<"tumu" | "aktif" | "pasif">("tumu");
  const [sayfa, setSayfa] = useState(1);
  const [ekleModu, setEkleModu] = useState<"yok" | "ogretmen" | "ogrenci">("yok");
  const siniflar = useMemo(() => [...new Set(kullanicilar.map((k) => k.sinif).filter((x): x is string => !!x))].sort(), [kullanicilar]);
  const sayilar = useMemo(() => ({
    tumu: kullanicilar.length,
    ogrenci: kullanicilar.filter((k) => k.kategori === "ogrenci").length,
    ogretmen: kullanicilar.filter((k) => k.kategori === "ogretmen").length,
    veli: kullanicilar.filter((k) => k.kategori === "veli").length,
  }), [kullanicilar]);
  const gosterilenler = useMemo(() => {
    const terim = arama.trim().toLocaleLowerCase("tr-TR");
    return kullanicilar.filter((k) =>
      (sekme === "tumu" || k.kategori === sekme)
      && (sinif === "tumu" || k.sinif === sinif)
      && (durum === "tumu" || (durum === "aktif" ? k.aktif : !k.aktif))
      && (!terim || `${k.ad} ${k.detay}`.toLocaleLowerCase("tr-TR").includes(terim))
    );
  }, [arama, kullanicilar, sekme, sinif, durum]);
  const toplamSayfa = Math.max(1, Math.ceil(gosterilenler.length / SAYFA_BOYUTU));
  const etkinSayfa = Math.min(sayfa, toplamSayfa);
  const sayfadakiler = useMemo(() => gosterilenler.slice((etkinSayfa - 1) * SAYFA_BOYUTU, etkinSayfa * SAYFA_BOYUTU), [etkinSayfa, gosterilenler]);
  const sekmeler = [
    { id: "ogrenci" as const, ad: "Öğrenciler" },
    { id: "ogretmen" as const, ad: "Öğretmenler" },
    { id: "veli" as const, ad: "Veliler" },
    { id: "tumu" as const, ad: "Tümü" },
  ];
  return <div className="flex flex-col gap-5">
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2"><ShieldCheck size={18} color={MINT} /><h1 style={{ color: TEXT }} className="font-bold">{okulAdi}</h1></div>
      <p style={{ color: TEXT_MUTED }} className="mt-2 text-xs leading-relaxed">Yetkiniz yalnız bu okulun öğrenci, öğretmen, müdür ve bağlı velileriyle sınırlıdır. Başka okulların kayıtları görüntülenmez veya değiştirilemez.</p>
    </div>
    {mesaj && <div className="rounded-xl p-3 text-xs font-bold" style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT, background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>{mesaj}</div>}

    {/* Kullanıcı isteği (26.08.2026): "Kurum ayarları + Öğretmen ekle +
        Öğrenci ekle tek çerçevede toplansın" — üç ayrı kart yerine tek
        "Kurum ayarları" başlıklı bölüm. */}
    <div className="rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 text-sm font-bold" style={{ color: TEXT }}>
        <Settings size={15} color={TEXT_MUTED} /> Kurum ayarları
      </div>
      <KurumBilgileriDuzenleyici schoolId={schoolId} onMesaj={setMesaj} />
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setEkleModu((m) => m === "ogretmen" ? "yok" : "ogretmen")}
          className="sfec-btn flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"
          style={{ background: ekleModu === "ogretmen" ? MINT : BG1_ALT, color: ekleModu === "ogretmen" ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          <UserPlus size={14} /> Öğretmen ekle
        </button>
        <button type="button" onClick={() => setEkleModu((m) => m === "ogrenci" ? "yok" : "ogrenci")}
          className="sfec-btn flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"
          style={{ background: ekleModu === "ogrenci" ? MINT : BG1_ALT, color: ekleModu === "ogrenci" ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          <UserPlus size={14} /> Öğrenci ekle
        </button>
      </div>
      {ekleModu === "ogretmen" && <OgretmenEkleFormu schoolId={schoolId} onDone={(msg) => { setMesaj(msg); setEkleModu("yok"); }} />}
      {ekleModu === "ogrenci" && <OgrenciEkleFormu schoolId={schoolId} onDone={(msg) => { setMesaj(msg); setEkleModu("yok"); }} />}
    </div>

    <div className="rounded-3xl p-3 sm:p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {sekmeler.map((s) => <button key={s.id} type="button" onClick={() => { setSekme(s.id); setSayfa(1); if (s.id === "veli") setSinif("tumu"); }} className="sfec-btn rounded-xl px-2 py-2.5 text-xs font-bold" style={{ background: sekme === s.id ? MINT : BG1_ALT, color: sekme === s.id ? MINT_ON : TEXT, border: `2px solid ${sekme === s.id ? MINT : BORDER_STRONG}` }}>{s.ad} ({sayilar[s.id]})</button>)}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_160px_140px]">
        <label className="relative"><Search size={14} color={TEXT_MUTED} className="absolute left-3 top-1/2 -translate-y-1/2"/><input value={arama} onChange={(e) => { setArama(e.target.value); setSayfa(1); }} placeholder="İsim, okul no veya branş ara" className="w-full rounded-xl py-2 pl-9 pr-3 text-sm outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}/></label>
        <select value={sinif} onChange={(e) => { setSinif(e.target.value); setSayfa(1); }} disabled={sekme === "veli"} className="rounded-xl px-3 py-2 text-sm outline-none disabled:opacity-50" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}><option value="tumu">Tüm sınıflar</option>{siniflar.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <select value={durum} onChange={(e) => { setDurum(e.target.value as typeof durum); setSayfa(1); }} className="rounded-xl px-3 py-2 text-sm outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          <option value="tumu">Aktif + pasif</option>
          <option value="aktif">Sadece aktif</option>
          <option value="pasif">Sadece pasif</option>
        </select>
      </div>
      <p style={{ color: TEXT_MUTED }} className="mt-3 text-xs font-semibold">Listelenen kişi: <strong style={{ color: TEXT }}>{gosterilenler.length}</strong></p>
    </div>
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {sayfadakiler.map(k => <KullaniciKarti key={k.id} kullanici={k} schoolId={schoolId} onMesaj={setMesaj} />)}
      {gosterilenler.length === 0 && <div className="col-span-full rounded-2xl p-6 text-center text-sm" style={{ color: TEXT_MUTED, background: BG1, border: `2px solid ${BORDER}` }}>Bu filtrelere uygun kullanıcı bulunamadı.</div>}
    </div>
    {toplamSayfa > 1 && <nav aria-label="Kullanıcı listesi sayfaları" className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" disabled={sayfa === 1} onClick={() => setSayfa((s) => Math.max(1, s - 1))} className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40" style={{ color: TEXT, background: BG1, border: `2px solid ${BORDER_STRONG}` }}>Önceki</button>
      {Array.from({ length: toplamSayfa }, (_, i) => i + 1).map((no) => <button key={no} type="button" aria-current={sayfa === no ? "page" : undefined} onClick={() => setSayfa(no)} className="sfec-btn min-w-9 rounded-xl px-3 py-2 text-xs font-bold" style={{ color: sayfa === no ? MINT_ON : TEXT, background: sayfa === no ? MINT : BG1, border: `2px solid ${sayfa === no ? MINT : BORDER_STRONG}` }}>{no}</button>)}
      <button type="button" disabled={sayfa === toplamSayfa} onClick={() => setSayfa((s) => Math.min(toplamSayfa, s + 1))} className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-40" style={{ color: TEXT, background: BG1, border: `2px solid ${BORDER_STRONG}` }}>Sonraki</button>
    </nav>}
  </div>;
}

// Kurum ayarları (isim, kurum kodu) — 2026-08-26 kullanıcı isteği: "Kurum
// ayarlarını (isim, kurum kodu gibi) düzenleyebilir". Varsayılan kapalı,
// gerekmedikçe listeyle aynı ekranda yer kaplamasın diye. Kendi çerçevesi
// yok — "Kurum ayarları" başlıklı ortak bölümün içine gömülüyor.
function KurumBilgileriDuzenleyici({ schoolId, onMesaj }: { schoolId?: string; onMesaj: (m: string) => void }) {
  const [acik, setAcik] = useState(false);
  // ad===null → henüz yüklenmedi ("Yükleniyor..." bu şekilde türetiliyor,
  // ayrı bir yükleniyor state'i effect içinde senkron setState'e yol açardı).
  const [ad, setAd] = useState<string | null>(null);
  const [okulKodu, setOkulKodu] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!acik || ad !== null) return;
    // Bkz. KullaniciArama.tsx'teki startTransition notu.
    startTransition(() => {
      moderatorKurumBilgisiGetir(schoolId).then((r) => {
        if (r.error) onMesaj(`Hata: ${r.error}`);
        setAd(r.ad);
        setOkulKodu(r.okulKodu);
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, ad]);

  function kaydet() {
    startTransition(async () => {
      const r = await moderatorKurumGuncelle({ ad: ad ?? "", okulKodu }, schoolId);
      onMesaj(r.error ? `Hata: ${r.error}` : "Kurum bilgileri güncellendi.");
    });
  }

  return (
    <div className="mt-2">
      <button type="button" onClick={() => setAcik((v) => !v)} className="sfec-btn flex items-center gap-1.5 text-xs font-bold" style={{ color: TEXT_MUTED }}>
        <Pencil size={12} /> Kurum adı / kodunu düzenle
      </button>
      {acik && (ad === null ? (
        <p style={{ color: TEXT_MUTED }} className="mt-3 text-xs">Yükleniyor...</p>
      ) : (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="flex min-w-48 flex-1 flex-col gap-1">
            <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Kurum adı</span>
            <input value={ad} onChange={(e) => setAd(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          </label>
          <label className="flex min-w-40 flex-col gap-1">
            <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Kurum kodu</span>
            <input value={okulKodu} onChange={(e) => setOkulKodu(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          </label>
          <button type="button" onClick={kaydet} disabled={pending} className="sfec-btn flex items-center gap-1 rounded-full px-3 py-2 text-[11px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            <Save size={12} /> {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      ))}
    </div>
  );
}

function OgretmenEkleFormu({ schoolId, onDone }: { schoolId?: string; onDone: (msg: string) => void }) {
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [brans, setBrans] = useState<string>(BRANS_LISTESI[0]);
  const [pending, startTransition] = useTransition();

  function ekle() {
    startTransition(async () => {
      const r = await moderatorOgretmenEkle({ ad, email, telefon, brans }, schoolId);
      if (r.error) return onDone(`Hata: ${r.error}`);
      onDone(`Öğretmen eklendi. Geçici şifre: ${r.sifre}`);
    });
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl p-3 sm:grid-cols-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <Alan etiket="Ad soyad" value={ad} onChange={setAd} />
      <Alan etiket="E-posta" value={email} onChange={setEmail} type="email" />
      <Alan etiket="Telefon" value={telefon} onChange={setTelefon} />
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Branş</span>
        <select value={brans} onChange={(e) => setBrans(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          {BRANS_LISTESI.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </label>
      <button type="button" onClick={ekle} disabled={pending} className="sfec-btn self-start rounded-full px-3 py-2 text-[11px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Ekleniyor..." : "Öğretmeni ekle"}
      </button>
    </div>
  );
}

function OgrenciEkleFormu({ schoolId, onDone }: { schoolId?: string; onDone: (msg: string) => void }) {
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [okulNo, setOkulNo] = useState("");
  const [telefon, setTelefon] = useState("");
  const [classId, setClassId] = useState("");
  const [aytAlan, setAytAlan] = useState<AytAlan>("SAY");
  const [hedefBolum, setHedefBolum] = useState("");
  const [siniflar, setSiniflar] = useState<{ id: string; seviye: string; sube: string }[] | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => { moderatorOkulSiniflari(schoolId).then((r) => setSiniflar(r.siniflar)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ekle() {
    startTransition(async () => {
      const r = await moderatorOgrenciEkle({ ad, email, okulNo, telefon, classId, aytAlan, hedefBolum }, schoolId);
      if (r.error) return onDone(`Hata: ${r.error}`);
      onDone(`Öğrenci eklendi. Geçici şifre: ${r.sifre}`);
    });
  }

  return (
    <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl p-3 sm:grid-cols-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <Alan etiket="Ad soyad" value={ad} onChange={setAd} />
      <Alan etiket="E-posta" value={email} onChange={setEmail} type="email" />
      <Alan etiket="Okul numarası" value={okulNo} onChange={setOkulNo} />
      <Alan etiket="Telefon" value={telefon} onChange={setTelefon} />
      <Alan etiket="Hedef bölüm" value={hedefBolum} onChange={setHedefBolum} />
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>AYT alanı</span>
        <select value={aytAlan} onChange={(e) => setAytAlan(e.target.value as AytAlan)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          {(Object.keys(AYT_ALAN_ETIKET) as AytAlan[]).map((a) => <option key={a} value={a}>{AYT_ALAN_ETIKET[a]}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>Sınıf</span>
        {siniflar === null ? (
          <span className="text-xs" style={{ color: TEXT_MUTED }}>Yükleniyor...</span>
        ) : (
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <option value="">Sınıf seçin</option>
            {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
          </select>
        )}
      </label>
      <button type="button" onClick={ekle} disabled={pending || !classId} className="sfec-btn self-start rounded-full px-3 py-2 text-[11px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Ekleniyor..." : "Öğrenciyi ekle"}
      </button>
    </div>
  );
}

function Alan({ etiket, value, onChange, type = "text" }: { etiket: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold" style={{ color: TEXT_MUTED }}>{etiket}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-lg px-2.5 py-2 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} /></label>;
}

function KullaniciKarti({ kullanici: k, schoolId, onMesaj }: { kullanici: ModeratorKullanici; schoolId?: string; onMesaj: (m: string) => void }) {
  const [pending, startTransition] = useTransition();
  const [duzenleAcik, setDuzenleAcik] = useState(false);
  const [sifreAcik, setSifreAcik] = useState(false);
  const [yeniSifre, setYeniSifre] = useState("");
  // Kullanıcı isteği (26.08.2026): Pasifleştir/Sil artık doğrudan görünmüyor
  // — "Diğer ayarlar" tıklanınca açılıyor. Rozetleri sıfırla ise (aynı gün,
  // tekrar bildirim: "moderatöre de verilecek") görünürlüğü artırmak için
  // AŞAĞIDA, ana buton sırasına taşındı — yetki zaten vardı
  // (moderatorRozetSifirla requireModerator ile korunuyor), sorun sadece bu
  // toggle'ın arkasında gizli kalıp fark edilmemesiydi.
  const [digerAcik, setDigerAcik] = useState(false);

  return (
    <div className="rounded-2xl p-3.5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div style={{ color: TEXT }} className="text-sm font-bold flex items-center gap-1.5 flex-wrap">
        {k.ad}
        {k.moderatorMu && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: MINT, color: MINT_ON }}><ShieldCheck size={9}/> Moderatör</span>}
      </div>
      <div style={{ color: TEXT_MUTED }} className="text-xs">{k.detay}</div>
      {/* Kullanıcı isteği (27.08.2026): "öğrenci hesabı yönetim butonları
          küçültülecek" — kart başına buton sayısı fazla olduğundan (özellikle
          öğrenci kartlarında) daha kompakt bir dolgu/yazı boyutuna geçildi. */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <button disabled={pending} onClick={() => startTransition(async () => { const r = await moderatorSifreSifirla(k.id, schoolId); onMesaj(r.error ? `Hata: ${r.error}` : `Geçici şifre (${k.ad}): ${r.sifre}`); })} className="sfec-btn flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}><KeyRound className="mr-1 inline" size={11}/>Rastgele şifre</button>
        <button disabled={pending} onClick={() => setSifreAcik((v) => !v)} className="sfec-btn flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold" style={{ background: sifreAcik ? MINT : "transparent", color: sifreAcik ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}><KeyRound className="mr-1 inline" size={11}/>Şifre belirle</button>
        {(k.kategori === "ogrenci" || k.kategori === "ogretmen") && (
          <button disabled={pending} onClick={() => setDuzenleAcik((v) => !v)} title={k.kategori === "ogrenci" ? "Sınıf taşı" : "Branş değiştir"}
            className="sfec-btn rounded-lg px-2.5 py-1.5 text-[10px] font-bold" style={{ background: duzenleAcik ? MINT : "transparent", color: duzenleAcik ? MINT_ON : TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <ArrowRightLeft className="mr-1 inline" size={11}/>{k.kategori === "ogrenci" ? "Sınıf taşı" : "Branş"}
          </button>
        )}
        {k.kategori === "ogrenci" && (
          <button disabled={pending} title="Rozet ilerlemesini bugünden başlatır — geçmiş çalışma kayıtları silinmez"
            onClick={() => { if (!window.confirm(`${k.ad} için rozet ilerlemesi bugünden başlatılsın mı?`)) return; startTransition(async () => { const r = await moderatorRozetSifirla(k.id, schoolId); onMesaj(r.error ? `Hata: ${r.error}` : "Rozetler sıfırlandı."); }); }}
            className="sfec-btn rounded-lg px-2.5 py-1.5 text-[10px] font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <Award size={11} className="mr-1 inline"/> Rozetleri sıfırla
          </button>
        )}
        <button disabled={pending} onClick={() => setDigerAcik((v) => !v)}
          className="sfec-btn rounded-lg px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1" style={{ background: digerAcik ? MINT : "transparent", color: digerAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
          Diğer ayarlar <ChevronDown size={11} style={{ transform: digerAcik ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }}/>
        </button>
      </div>

      {digerAcik && (
        <div className="mt-2 flex flex-wrap gap-1.5 rounded-lg p-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <button disabled={pending} onClick={() => startTransition(async () => { const r = await moderatorAktiflikDegistir(k.id, !k.aktif, schoolId); onMesaj(r.error ? `Hata: ${r.error}` : "İşlem tamamlandı."); })} className="sfec-btn flex-1 rounded-lg px-2 py-1.5 text-[10px] font-bold" style={{ color: k.aktif ? BLUSH : MINT, border: `2px solid ${BORDER_STRONG}` }}>{k.aktif ? <UserX className="mr-1 inline" size={11}/> : <UserCheck className="mr-1 inline" size={11}/>} {k.aktif ? "Pasifleştir" : "Aktifleştir"}</button>
          <button disabled={pending} onClick={() => { if (!window.confirm(`${k.ad} hesabı kalıcı olarak silinsin mi?`)) return; startTransition(async () => { const r = await moderatorHesapSil(k.id, schoolId); onMesaj(r.error ? `Hata: ${r.error}` : "Hesap silindi."); }); }} className="sfec-btn rounded-lg px-2.5 py-1.5 text-[10px] font-bold" style={{ color: BLUSH, border: `2px solid ${BORDER_STRONG}` }}><Trash2 className="mr-1 inline" size={11}/>Sil</button>
        </div>
      )}

      {sifreAcik && (
        <div className="mt-2 flex items-center gap-2 rounded-lg p-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <input type="text" value={yeniSifre} onChange={(e) => setYeniSifre(e.target.value)} placeholder="Yeni şifre (en az 8, harf+rakam+özel işaret)"
            className="min-w-0 flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none" style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          <button type="button" disabled={pending || !yeniSifre} onClick={() => startTransition(async () => {
            const r = await moderatorSifreBelirle(k.id, yeniSifre, schoolId);
            onMesaj(r.error ? `Hata: ${r.error}` : `${k.ad} için şifre güncellendi.`);
            if (!r.error) { setYeniSifre(""); setSifreAcik(false); }
          })} className="sfec-btn shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>Kaydet</button>
        </div>
      )}

      {duzenleAcik && k.kategori === "ogrenci" && (
        <ModeratorOgrenciSinifTasiFormu studentId={k.id} schoolId={schoolId} onDone={(msg) => { onMesaj(msg); setDuzenleAcik(false); }} />
      )}
      {duzenleAcik && k.kategori === "ogretmen" && (
        <ModeratorOgretmenBransFormu teacherId={k.id} schoolId={schoolId} onDone={(msg) => { onMesaj(msg); setDuzenleAcik(false); }} />
      )}

      {k.kategori === "ogrenci" && (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <button disabled={pending} title="Hafta içi telefonuna erişemeyen öğrenciler için rozet eşikleri ve hatırlatmalar hafta sonuna göre esnetilir"
            onClick={() => startTransition(async () => { const r = await moderatorYurtDurumuDegistir(k.id, !k.yurtOgrencisi, schoolId); onMesaj(r.error ? `Hata: ${r.error}` : "İşlem tamamlandı."); })}
            className="sfec-btn flex flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold"
            style={{ background: k.yurtOgrencisi ? MINT : "transparent", color: k.yurtOgrencisi ? MINT_ON : TEXT_MUTED, border: `2px solid ${k.yurtOgrencisi ? MINT : BORDER_STRONG}` }}>
            <BedDouble size={12}/> {k.yurtOgrencisi ? "Yurt öğrencisi ✓" : "Yurt öğrencisi işaretle"}
          </button>
        </div>
      )}
    </div>
  );
}

function ModeratorOgrenciSinifTasiFormu({ studentId, schoolId, onDone }: { studentId: string; schoolId?: string; onDone: (msg: string) => void }) {
  const [siniflar, setSiniflar] = useState<{ id: string; seviye: string; sube: string }[] | null>(null);
  const [seciliSinifId, setSeciliSinifId] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(() => { moderatorOkulSiniflari(schoolId).then((r) => setSiniflar(r.siniflar)); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function tasi() {
    if (!seciliSinifId) return;
    startTransition(async () => {
      const r = await moderatorOgrenciSinifTasi(studentId, seciliSinifId, schoolId);
      onDone(r.error ? `Hata: ${r.error}` : "Öğrenci sınıfı güncellendi.");
    });
  }

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap rounded-lg p-2.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      {siniflar === null ? (
        <span style={{ color: TEXT_MUTED }} className="text-xs">Sınıflar yükleniyor...</span>
      ) : (
        <>
          <select value={seciliSinifId} onChange={(e) => setSeciliSinifId(e.target.value)}
            className="text-xs font-bold px-2.5 py-1.5 rounded-full outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <option value="">Sınıf seçin</option>
            {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
          </select>
          <button type="button" onClick={tasi} disabled={pending || !seciliSinifId}
            className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            {pending ? "Taşınıyor..." : "Taşı"}
          </button>
        </>
      )}
    </div>
  );
}

function ModeratorOgretmenBransFormu({ teacherId, schoolId, onDone }: { teacherId: string; schoolId?: string; onDone: (msg: string) => void }) {
  const [brans, setBrans] = useState<string>(BRANS_LISTESI[0]);
  const [pending, startTransition] = useTransition();

  function kaydet() {
    startTransition(async () => {
      const r = await moderatorOgretmenBransDegistir(teacherId, brans, schoolId);
      onDone(r.error ? `Hata: ${r.error}` : "Branş güncellendi.");
    });
  }

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap rounded-lg p-2.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <select value={brans} onChange={(e) => setBrans(e.target.value)}
        className="text-xs font-bold px-2.5 py-1.5 rounded-full outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        {BRANS_LISTESI.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <button type="button" onClick={kaydet} disabled={pending} className="sfec-btn text-[11px] font-bold px-3 py-1.5 rounded-full disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </div>
  );
}
