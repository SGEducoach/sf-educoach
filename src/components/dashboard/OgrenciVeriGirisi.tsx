"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { BookOpen, PenLine, ClipboardList, Sparkles, Loader2, ChevronDown, ChevronUp, CalendarClock } from "lucide-react";
import type {
  AytAlan, DenemeTuru, DenemeZorlugu, HedefeYakinlik, TakipCevabi, VerimlilikDuzeyi,
} from "@/lib/types";
import {
  TYT_DERSLERI, AYT_DERSLERI, BRANS_DENEMESI_DERSLERI, TAKIP_SORUSU, VERIMLILIK_ETIKET, netHesapla, dersSoruSayisi,
  SURE_UST_SINIR, KATEGORI_GERIYE_DONUK_SINIR, dokuzOnSinifMi, maarifHiyerarsiSinifMi,
} from "@/lib/types";
import {
  BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, SKY, SKY_BG, TEXT, TEXT_MUTED, BLUSH,
} from "@/lib/theme";
import {
  konuCalismaEkle, soruCozumuEkle, denemeEkle, haftalikVerimlilikEkle, konuAnlatimiGetir,
} from "@/app/dashboard/veri-actions";
import { YukleniyorOverlay } from "@/components/YukleniyorOverlay";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";

// Türkiye saatine göre "bugün" — bkz. src/lib/tarih.ts: naif
// `new Date().toISOString()` yaklaşımı UTC+3 saat diliminde gece yarısı ile
// sabah ~03:00 arasında bir önceki günü döndürüyordu.
function bugununTarihi(): string {
  return bugununTarihiTR();
}

function enEskiTarih(geriyeMaksGun: number): string {
  return tarihEkle(bugununTarihiTR(), -geriyeMaksGun);
}

// Varsayılan: anlık giriş bugünün tarihiyle kaydedilir. Öğrenci geçmiş bir
// gün için giriş yapmak isterse bu buton bir tarih seçici açar (gelecek bir
// tarih seçilemez). geriyeMaksGun, rozet sistemi v2 ile eklendi: kategoriye
// göre (konu/soru 3 gün, deneme 7 gün) geriye dönük giriş sınırlı — sınırsız
// backdating rozet/seri sayımını manipüle etmeye açık kapıydı (bkz.
// KATEGORI_GERIYE_DONUK_SINIR, migration 0029).
function GecmisTarihSecici({ tarih, setTarih, geriyeMaksGun }: { tarih: string; setTarih: (v: string) => void; geriyeMaksGun: number }) {
  const [acik, setAcik] = useState(tarih !== bugununTarihi());

  if (!acik) {
    return (
      <button type="button" onClick={() => setAcik(true)}
        className="sfec-btn self-start flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
        style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
        <CalendarClock size={12} /> Geçmiş tarih için gir
      </button>
    );
  }

  return (
    <label className="flex flex-col gap-1">
      <Etiket>Tarih</Etiket>
      <div className="flex gap-2 relative">
        <Girdi type="date" max={bugununTarihi()} min={enEskiTarih(geriyeMaksGun)} value={tarih} onChange={(e) => setTarih(e.target.value)} required />
        <button type="button" onClick={() => { setAcik(false); setTarih(bugununTarihi()); }}
          className="sfec-btn shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
          Bugüne dön
        </button>
      </div>
      <span style={{ color: TEXT_MUTED }} className="text-[10px]">En fazla {geriyeMaksGun} gün geriye gidebilirsin.</span>
    </label>
  );
}

type Sekme = "konu" | "soru" | "deneme";

export function Etiket({ children }: { children: React.ReactNode }) {
  return <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{children}</span>;
}
function Girdi(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="text-sm px-2.5 py-1.5 rounded-xl outline-none w-full" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />;
}
function Secim({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="text-sm px-2.5 py-1.5 rounded-xl outline-none w-full" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>{children}</select>;
}

// Genel 3-seçenekli buton grubu — Konu Çalışma/Soru Çözümü/Deneme'de aynı
// hedefe_yakinlik (ya da zorluk) alanı farklı başlık/etiketlerle gösteriliyor.
export function SecenekSecici<T extends string>({ baslik, secenekler, value, onChange }: {
  baslik: string; secenekler: [T, string][]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Etiket>{baslik}</Etiket>
      <div className="flex gap-1.5">
        {secenekler.map(([k, v]) => (
          <button type="button" key={k} onClick={() => onChange(k)}
            className="sfec-btn flex-1 text-[11px] font-bold py-1.5 rounded-full"
            style={{ background: value === k ? MINT : "transparent", color: value === k ? MINT_ON : TEXT_MUTED, border: `1px solid ${value === k ? MINT : BORDER_STRONG}` }}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OgrenciVeriGirisi({ aytAlan, konuOnerileri, sinifSeviyesi, konuSayaclari, mufredatAltKonulari, gerekYokListesi }: {
  aytAlan: AytAlan;
  konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
  sinifSeviyesi?: string | null;
  konuSayaclari?: Record<string, { tamamlanan: number; toplam: number }>;
  mufredatAltKonulari?: { ders: string; ustKonu: string; altBaslik: string }[];
  gerekYokListesi?: string[];
}) {
  const [sekme, setSekme] = useState<Sekme>("konu");
  const [verimlilikSor, setVerimlilikSor] = useState(false);
  const [basari, setBasari] = useState<string | null>(null);

  const dokuzOnMu = dokuzOnSinifMi(sinifSeviyesi);
  // 9-10. sınıfta AYT alanı ayrımı yok — TYT_DERSLERI zaten Fen/Sosyal'i
  // kendi alt derslerine (Fizik/Kimya/Biyoloji, Tarih/Coğrafya/Din
  // Kültürü/Felsefe) ayrılmış hâlde içeriyor, o yüzden ek bir liste
  // tanımlamaya gerek yok (bkz. 9_10_sinif_ekleme_senaryosu.pdf).
  const dersListesi = dokuzOnMu
    ? [...TYT_DERSLERI]
    : [...TYT_DERSLERI, ...AYT_DERSLERI[aytAlan].filter((d) => !TYT_DERSLERI.includes(d as typeof TYT_DERSLERI[number]))];

  function basariGoster(mesaj: string, sorulsunMu: boolean) {
    setBasari(mesaj);
    setTimeout(() => setBasari(null), 3000);
    if (sorulsunMu) setVerimlilikSor(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {basari && (
        <div className="sfec-fade rounded-2xl px-4 py-2.5 text-[13px] font-semibold" style={{ background: MINT_BG, color: MINT }}>
          ✓ {basari}
        </div>
      )}

      <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
          {[
            { id: "konu" as const, ad: "Konu Çalışma", icon: BookOpen },
            { id: "soru" as const, ad: "Soru Çözümü", icon: PenLine },
            { id: "deneme" as const, ad: "Deneme", icon: ClipboardList },
          ].map((s) => {
            const Icon = s.icon;
            const aktif = sekme === s.id;
            return (
              <button key={s.id} type="button" onClick={() => setSekme(s.id)}
                className="sfec-btn flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[12px] font-bold"
                style={{ background: aktif ? MINT : "transparent", color: aktif ? MINT_ON : TEXT_MUTED }}>
                <Icon size={13} /> {s.ad}
              </button>
            );
          })}
        </div>

        {sekme === "konu" && <KonuCalismaForm dersListesi={dersListesi} konuOnerileri={konuOnerileri} konuSayaclari={konuSayaclari} sinifSeviyesi={sinifSeviyesi} mufredatAltKonulari={mufredatAltKonulari} gerekYokListesi={gerekYokListesi} onBasari={basariGoster} />}
        {sekme === "soru" && <SoruCozumuForm dersListesi={dersListesi} konuOnerileri={konuOnerileri} onBasari={basariGoster} />}
        {sekme === "deneme" && <DenemeForm aytAlan={aytAlan} dokuzOnMu={dokuzOnMu} onBasari={basariGoster} />}
      </div>

      {verimlilikSor && <HaftalikVerimlilikModal onKapat={() => setVerimlilikSor(false)} />}
    </div>
  );
}

// Konu adı yazılırken input'un hemen altında açılan, seçilince kapanan
// (ve input'u temizleyip yeni aramaya hazır bırakan) özel öneri listesi —
// native <datalist>'in yerine (konumu/davranışı kontrol edilemiyordu).
function KonuOneriDropdown({ oneriler, aktif, onSec }: {
  oneriler: { konu: string; seviye?: string | null }[]; aktif: boolean; onSec: (konu: string) => void;
}) {
  if (!aktif || oneriler.length === 0) return null;
  return (
    <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto rounded-xl sfec-fade"
      style={{ background: BG0, border: `2px solid ${BORDER_STRONG}`, boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}>
      {oneriler.map((o) => (
        <button key={o.konu} type="button" onMouseDown={(e) => { e.preventDefault(); onSec(o.konu); }}
          className="sfec-btn w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-xs font-semibold"
          style={{ color: TEXT }}>
          <span>{o.konu}</span>
          {o.seviye && <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: SKY_BG, color: SKY }}>{o.seviye}</span>}
        </button>
      ))}
    </div>
  );
}

// Akış: önce ders+konu seçilir (eksik olduğun konuyu SEN bulursun), "Konuyu
// oku" ile o an AI anlatımı gösterilir; süre ve konuya hakimiyet — yani
// konuyu ne kadar anladığın — bunu OKUDUKTAN/çalıştıktan SONRA girilir.
export function KonuCalismaForm({ dersListesi, konuOnerileri, konuSayaclari, sinifSeviyesi, mufredatAltKonulari, gerekYokListesi, onBasari, prefillDers, prefillKonu, gorevAtamaId }: {
  dersListesi: string[]; konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
  konuSayaclari?: Record<string, { tamamlanan: number; toplam: number }>;
  sinifSeviyesi?: string | null;
  mufredatAltKonulari?: { ders: string; ustKonu: string; altBaslik: string }[];
  // Konu Hakimiyeti'nde (Faz H) "gerek yok" işaretlenmiş "ders|konu"
  // çiftleri — bu konu tekrar seçilip kaydedilmeye çalışılınca "hakimsin,
  // yine de çalışacak mısın?" onayı çıkar (bkz. gonderOncesiOnayGerekliMi).
  gerekYokListesi?: string[];
  onBasari: (m: string, s: boolean) => void;
  prefillDers?: string; prefillKonu?: string; gorevAtamaId?: string;
}) {
  const [ders, setDers] = useState(prefillDers ?? "");
  const [konu, setKonu] = useState(prefillKonu ?? "");
  const [aramaMetni, setAramaMetni] = useState(prefillKonu ?? "");
  const [oneriAcik, setOneriAcik] = useState(false);
  // Faz K4 — 9-10-11. sınıf, Türkçe hariç: serbest metin yerine üst
  // başlık→alt başlık gruplu seçici gösteriliyor (bkz. altta ustBasliklar/
  // altBasliklar). Türkçe bütün seviyelerde düz TYT müfredatı olarak kalıyor.
  const hiyerarsiAktif = maarifHiyerarsiSinifMi(sinifSeviyesi) && !!ders && ders !== "Türkçe";
  const [ustBaslik, setUstBaslik] = useState("");
  const [hedefeYakinlik, setHedefeYakinlik] = useState<HedefeYakinlik>("belirsiz");
  // Konu bilme/bilmeme göstergesi — "Konuya hakimiyet" seçimine göre
  // farklı bir 2. aşama takip sorusu geliyor (bkz. TAKIP_SORUSU,
  // src/lib/types.ts). hedefeYakinlik'in ilk seçeneğiyle aynı desende
  // (SecenekSecici zaten hep bir varsayılan değerle başlıyor, zorunlu
  // tıklama istemiyor) — hedefeYakinlik her değiştiğinde YENİ soru
  // setinin ilk seçeneğine sıfırlanıyor.
  const [takipCevabi, setTakipCevabi] = useState<TakipCevabi>(TAKIP_SORUSU.belirsiz.secenekler[0][0]);
  const [yayinevi, setYayinevi] = useState("");
  const [tarih, setTarih] = useState(bugununTarihi());
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const secilenSayac = ders ? konuSayaclari?.[ders] : undefined;

  const [anlatimAcik, setAnlatimAcik] = useState(false);
  const [anlatim, setAnlatim] = useState<string | null>(null);
  const [anlatimSeviye, setAnlatimSeviye] = useState<string | null>(null);
  const [anlatimYukleniyor, setAnlatimYukleniyor] = useState(false);
  const [anlatimHata, setAnlatimHata] = useState<string | null>(null);

  const oneriler = useMemo(
    () => konuOnerileri.filter((o) => o.ders === ders && (!aramaMetni.trim() || o.konu.toLowerCase().includes(aramaMetni.trim().toLowerCase()))),
    [konuOnerileri, ders, aramaMetni],
  );
  const seciliKonuSeviyesi = konuOnerileri.find((o) => o.ders === ders && o.konu === konu)?.seviye;

  // Faz K4 — üst başlıklar: konuOnerileri zaten MUFREDAT_KONULARI'ni içeriyor
  // (bkz. dashboard/page.tsx), o yüzden seviye etiketi "{sinifSeviyesi}. Sınıf"
  // ile eşleşenler üst başlık adayı. Alt başlıklar seçilen üst başlığa göre
  // mufredatAltKonulari'ndan filtrelenir.
  const ustBasliklar = hiyerarsiAktif
    ? konuOnerileri.filter((o) => o.ders === ders && o.seviye === `${sinifSeviyesi}. Sınıf`)
    : [];
  const altBasliklar = hiyerarsiAktif && ustBaslik
    ? (mufredatAltKonulari ?? []).filter((a) => a.ders === ders && a.ustKonu === ustBaslik)
    : [];

  // Konu seçilince kutuya yazılır ve üstte rozet gösterilir; "Konuyu oku"ya
  // basılınca kutu temizlenir (okuma o an açık), oku kapatılınca ise seçili
  // konu (ve rozet) tamamen sıfırlanır — yeni bir arama için hazır olunur.
  function konuSec(secilenKonu: string) {
    setKonu(secilenKonu);
    setAramaMetni(secilenKonu);
    setOneriAcik(false);
    setAnlatim(null);
    setAnlatimSeviye(null);
  }

  // Faz K4 — üst başlık seçilince: altında kayıtlı alt başlık varsa konu
  // boş bırakılır (kullanıcı 2. seçiciden birini seçmeli), yoksa üst
  // başlığın kendisi doğrudan konu olarak kullanılır (yaprak seçim).
  function ustBaslikSec(secilenUstBaslik: string) {
    setUstBaslik(secilenUstBaslik);
    const altlar = (mufredatAltKonulari ?? []).filter((a) => a.ders === ders && a.ustKonu === secilenUstBaslik);
    if (altlar.length === 0) { setKonu(secilenUstBaslik); setAramaMetni(secilenUstBaslik); }
    else { setKonu(""); setAramaMetni(""); }
    setAnlatim(null);
    setAnlatimSeviye(null);
  }

  function konuyuOku() {
    if (!ders || !konu.trim()) return setAnlatimHata("Önce ders ve konu girin.");
    const aciliyor = !anlatimAcik;
    setAnlatimAcik(aciliyor);

    if (!aciliyor) {
      // Kapatılıyor: serbest metin modunda seçili konuyu (ve rozeti)
      // sıfırla, arama kutusu boş kalsın — hiyerarşi modunda ise
      // üst başlık/alt başlık seçimi kalıcı (panel kapansa da bozulmasın).
      if (!hiyerarsiAktif) { setKonu(""); setAramaMetni(""); }
      setAnlatim(null);
      setAnlatimSeviye(null);
      setAnlatimHata(null);
      return;
    }

    if (!hiyerarsiAktif) setAramaMetni("");
    if (anlatim || anlatimYukleniyor) return;
    setAnlatimYukleniyor(true);
    setAnlatimHata(null);
    startTransition(async () => {
      const res = await konuAnlatimiGetir(ders, konu);
      setAnlatimYukleniyor(false);
      if (res.error) setAnlatimHata(res.error);
      else { setAnlatim(res.icerik); setAnlatimSeviye(res.seviye); }
    });
  }

  // Konu Hakimiyeti (Faz H3) — daha önce "gerek yok" (tekrar durumu)
  // işaretlenmiş bir konu tekrar kaydedilmeye çalışılırsa, gönderim önce
  // bir onaya takılır. formData zaten submit içinde dolduruluyor, "Evet"
  // tıklanınca aynı FormData ref'ten tekrar kullanılıyor.
  const [onayGerekli, setOnayGerekli] = useState(false);
  const bekleyenFormData = useRef<FormData | null>(null);

  function kaydet(formData: FormData) {
    startTransition(async () => {
      const res = await konuCalismaEkle(formData);
      if (res.error) return setHata(res.error);
      onBasari("Konu çalışması kaydedildi.", res.verimlilikSorulsunMu);
      setKonu(""); setAramaMetni(""); setUstBaslik(""); setAnlatim(null); setAnlatimSeviye(null); setAnlatimAcik(false); setHedefeYakinlik("belirsiz"); setTakipCevabi(TAKIP_SORUSU.belirsiz.secenekler[0][0]); setYayinevi(""); setTarih(bugununTarihi());
      setOnayGerekli(false);
      bekleyenFormData.current = null;
    });
  }

  function submit(formData: FormData) {
    setHata(null);
    if (!konu.trim()) return setHata("Konu seçin veya yazın.");
    if (!yayinevi.trim()) return setHata("Yayınevi girin (MEB veya okul kitabıysa öyle yazabilirsin).");
    formData.set("ders", ders);
    formData.set("konu", konu);
    formData.set("hedefeYakinlik", hedefeYakinlik);
    formData.set("takipCevabi", takipCevabi);
    formData.set("yayinevi", yayinevi.trim());
    formData.set("tarih", tarih);
    if (gorevAtamaId) formData.set("gorevAtamaId", gorevAtamaId);

    if (gerekYokListesi?.includes(`${ders}|${konu}`)) {
      bekleyenFormData.current = formData;
      setOnayGerekli(true);
      return;
    }
    kaydet(formData);
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
      <GecmisTarihSecici tarih={tarih} setTarih={setTarih} geriyeMaksGun={KATEGORI_GERIYE_DONUK_SINIR.konu} />
      <label className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Etiket>Ders</Etiket>
          {secilenSayac && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: MINT_BG, color: MINT }}>
              {secilenSayac.tamamlanan}/{secilenSayac.toplam} konu
            </span>
          )}
        </div>
        <Secim value={ders} onChange={(e) => { setDers(e.target.value); setKonu(""); setAramaMetni(""); setUstBaslik(""); setAnlatim(null); setAnlatimAcik(false); }} required>
          <option value="" disabled>Seçiniz</option>
          {dersListesi.map((d) => <option key={d} value={d}>{d}</option>)}
        </Secim>
      </label>

      {hiyerarsiAktif ? (
        <>
          <label className="flex flex-col gap-1"><Etiket>Ünite</Etiket>
            <Secim value={ustBaslik} onChange={(e) => ustBaslikSec(e.target.value)}>
              <option value="" disabled>Seçiniz</option>
              {ustBasliklar.map((u) => <option key={u.konu} value={u.konu}>{u.konu}</option>)}
            </Secim>
          </label>
          {altBasliklar.length > 0 && (
            <label className="flex flex-col gap-1"><Etiket>Konu</Etiket>
              <Secim value={konu} onChange={(e) => { setKonu(e.target.value); setAramaMetni(e.target.value); setAnlatim(null); setAnlatimSeviye(null); }}>
                <option value="" disabled>Seçiniz</option>
                {altBasliklar.map((a) => <option key={a.altBaslik} value={a.altBaslik}>{a.altBaslik}</option>)}
              </Secim>
            </label>
          )}
          {konu && (
            <button type="button" onClick={konuyuOku}
              className="sfec-btn self-start flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl"
              style={{ background: SKY_BG, color: SKY, border: `1px solid rgba(143,198,255,0.3)` }}>
              {anlatimYukleniyor ? <Loader2 size={13} className="animate-spin" /> : anlatimAcik ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Konuyu oku
            </button>
          )}
        </>
      ) : (
        <label className="flex flex-col gap-1 relative">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Etiket>Konu</Etiket>
            {seciliKonuSeviyesi && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: SKY_BG, color: SKY }}>{seciliKonuSeviyesi}</span>
            )}
            {konu && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: MINT_BG, color: MINT }}>{konu}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Girdi placeholder="örn. Türev - Zincir Kuralı" value={aramaMetni} autoComplete="off"
              onFocus={() => setOneriAcik(true)}
              onBlur={() => setTimeout(() => setOneriAcik(false), 120)}
              onChange={(e) => { setAramaMetni(e.target.value); setKonu(e.target.value); setOneriAcik(true); setAnlatim(null); setAnlatimSeviye(null); }}
              disabled={!ders} />
            <button type="button" onClick={konuyuOku} disabled={!ders || !konu.trim()}
              className="sfec-btn shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-50"
              style={{ background: SKY_BG, color: SKY, border: `1px solid rgba(143,198,255,0.3)` }}>
              {anlatimYukleniyor ? <Loader2 size={13} className="animate-spin" /> : anlatimAcik ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              Konuyu oku
            </button>
          </div>
          <KonuOneriDropdown oneriler={oneriler} aktif={oneriAcik && !!ders} onSec={konuSec} />
        </label>
      )}

      {anlatimAcik && (
        <div className="rounded-2xl p-3.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
          {anlatimHata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{anlatimHata}</div>}
          {anlatim && (
            <>
              {anlatimSeviye && (
                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2" style={{ background: SKY_BG, color: SKY }}>{anlatimSeviye}</span>
              )}
              <div style={{ color: TEXT_MUTED }} className="text-sm leading-relaxed whitespace-pre-line">{anlatim}</div>
            </>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1"><Etiket>Süre (dakika)</Etiket>
        <Girdi name="sureDakika" type="number" min={1} max={SURE_UST_SINIR} required />
      </label>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] -mt-1">Bu, şu an bitirdiğin <strong>tek oturumun</strong> süresi — haftalık/günlük toplam değil. Birden fazla çalışman varsa her birini ayrı ayrı gir.</p>
      <label className="flex flex-col gap-1"><Etiket>Yayınevi</Etiket>
        <Girdi placeholder="örn. Palme, MEB, Okul kitabı" value={yayinevi} onChange={(e) => setYayinevi(e.target.value)} required />
      </label>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] -mt-1">Konuyu okuduktan/çalıştıktan sonra ne kadar hakim olduğunu aşağıdan işaretle:</p>
      <SecenekSecici baslik="Konuya hakimiyet" value={hedefeYakinlik}
        onChange={(v) => { setHedefeYakinlik(v); setTakipCevabi(TAKIP_SORUSU[v].secenekler[0][0]); }}
        secenekler={[["uzak", "Yetersiz"], ["belirsiz", "Orta"], ["yakin", "Yeterli"]]} />
      {/* Konu bilme/bilmeme göstergesi — 1. aşamada seçilen düzeye özel
          2. aşama takip sorusu (bkz. TAKIP_SORUSU, src/lib/types.ts).
          Sınıf/kurum bazlı "Konu Haritası" raporunun girdisi (Faz K3). */}
      <SecenekSecici baslik={TAKIP_SORUSU[hedefeYakinlik].baslik} value={takipCevabi} onChange={setTakipCevabi}
        secenekler={TAKIP_SORUSU[hedefeYakinlik].secenekler} />
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      {onayGerekli ? (
        <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: "rgba(255,196,107,0.12)", border: "2px solid rgba(255,196,107,0.35)" }}>
          <span style={{ color: TEXT }} className="text-xs font-semibold">Bu konuya hakimsin, yine de çalışmayı kaydetmek istiyor musun?</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setOnayGerekli(false); bekleyenFormData.current = null; }} disabled={pending}
              className="sfec-btn flex-1 text-xs font-bold py-2 rounded-xl disabled:opacity-60"
              style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
              Hayır
            </button>
            <button type="button" onClick={() => bekleyenFormData.current && kaydet(bekleyenFormData.current)} disabled={pending}
              className="sfec-btn flex-1 text-xs font-bold py-2 rounded-xl disabled:opacity-60"
              style={{ background: MINT, color: MINT_ON }}>
              Evet, yine de kaydet
            </button>
          </div>
        </div>
      ) : (
        <button type="submit" disabled={pending} className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
      )}
      <YukleniyorOverlay visible={pending} mesaj={anlatimYukleniyor ? undefined : "Kaydediliyor..."} />
    </form>
  );
}

export function SoruCozumuForm({ dersListesi, konuOnerileri, onBasari, prefillDers, prefillKonu, gorevAtamaId }: {
  dersListesi: string[]; konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
  onBasari: (m: string, s: boolean) => void;
  prefillDers?: string; prefillKonu?: string; gorevAtamaId?: string;
}) {
  const [ders, setDers] = useState(prefillDers ?? "");
  const [dogru, setDogru] = useState("");
  const [yanlis, setYanlis] = useState("");
  const [bos, setBos] = useState("");
  const [konu, setKonu] = useState(prefillKonu ?? "");
  const [aramaMetni, setAramaMetni] = useState(prefillKonu ?? "");
  const [oneriAcik, setOneriAcik] = useState(false);
  const [yayinevi, setYayinevi] = useState("");
  const [tarih, setTarih] = useState(bugununTarihi());
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const oneriler = useMemo(
    () => konuOnerileri.filter((o) => o.ders === ders && (!aramaMetni.trim() || o.konu.toLowerCase().includes(aramaMetni.trim().toLowerCase()))),
    [konuOnerileri, ders, aramaMetni],
  );

  const net = dogru !== "" && yanlis !== "" ? netHesapla(Number(dogru), Number(yanlis)) : null;
  // Süre, toplam soru sayısının (doğru+yanlış+boş) iki katını geçemez (bkz.
  // soruCozumuEkle) — hem art niyeti caydırmak hem de "günlük toplamı tek
  // oturuma girme" hatasını erkenden yakalamak için form tarafında da
  // uygulanıyor.
  const toplamSoru = (Number(dogru) || 0) + (Number(yanlis) || 0) + (Number(bos) || 0);
  const sureUstSiniri = toplamSoru * 2;

  function submit(formData: FormData) {
    setHata(null);
    if (!yayinevi.trim()) return setHata("Yayınevi girin (MEB veya okul kitabıysa öyle yazabilirsin).");
    formData.set("ders", ders);
    formData.set("konu", konu);
    formData.set("yayinevi", yayinevi.trim());
    formData.set("tarih", tarih);
    if (gorevAtamaId) formData.set("gorevAtamaId", gorevAtamaId);
    startTransition(async () => {
      const res = await soruCozumuEkle(formData);
      if (res.error) setHata(res.error);
      else {
        onBasari(`Soru çözümü kaydedildi (net: ${net}).`, res.verimlilikSorulsunMu);
        setDogru(""); setYanlis(""); setBos(""); setKonu(""); setAramaMetni(""); setYayinevi(""); setTarih(bugununTarihi());
      }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
      <GecmisTarihSecici tarih={tarih} setTarih={setTarih} geriyeMaksGun={KATEGORI_GERIYE_DONUK_SINIR.soru} />
      <label className="flex flex-col gap-1"><Etiket>Ders</Etiket>
        <Secim value={ders} onChange={(e) => { setDers(e.target.value); setKonu(""); setAramaMetni(""); }} required>
          <option value="" disabled>Seçiniz</option>
          {dersListesi.map((d) => <option key={d} value={d}>{d}</option>)}
        </Secim>
      </label>

      <label className="flex flex-col gap-1 relative"><Etiket>Konu (opsiyonel)</Etiket>
        <Girdi placeholder="örn. Türev - Zincir Kuralı" value={aramaMetni} autoComplete="off"
          onFocus={() => setOneriAcik(true)}
          onBlur={() => setTimeout(() => setOneriAcik(false), 120)}
          onChange={(e) => { setAramaMetni(e.target.value); setKonu(e.target.value); setOneriAcik(true); }}
          disabled={!ders} />
        <KonuOneriDropdown oneriler={oneriler} aktif={oneriAcik && !!ders} onSec={(k) => { setKonu(k); setAramaMetni(k); setOneriAcik(false); }} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><Etiket>Doğru</Etiket>
          <Girdi name="dogru" type="number" min={0} required value={dogru} onChange={(e) => setDogru(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><Etiket>Yanlış</Etiket>
          <Girdi name="yanlis" type="number" min={0} required value={yanlis} onChange={(e) => setYanlis(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><Etiket>Boş</Etiket>
          <Girdi name="bos" type="number" min={0} required value={bos} onChange={(e) => setBos(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><Etiket>Süre (dk)</Etiket>
          <Girdi name="sureDakika" type="number" min={1} max={toplamSoru > 0 ? sureUstSiniri : undefined} required />
        </label>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] -mt-1">Süre, şu an bitirdiğin <strong>tek oturumun</strong> süresi — haftalık/günlük toplam değil.
        {toplamSoru > 0 && <> En fazla <strong>{sureUstSiniri} dakika</strong> (soru başına ~2 dk).</>}
      </p>
      <label className="flex flex-col gap-1"><Etiket>Yayınevi</Etiket>
        <Girdi placeholder="örn. Palme, MEB, Okul kitabı" value={yayinevi} onChange={(e) => setYayinevi(e.target.value)} required />
      </label>
      {net !== null && (
        <div style={{ color: MINT }} className="text-xs font-bold">Net: {net}</div>
      )}
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" disabled={pending} className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
      <YukleniyorOverlay visible={pending} mesaj="Kaydediliyor..." />
    </form>
  );
}

// 9-10. sınıfta TYT/AYT hiç sorulmuyor: sınav türü sabit Branş Denemesi,
// öğrenci dört ana branştan (Türk Dili ve Edebiyatı/Sosyal Bilimler/
// Matematik/Fen Bilimleri) SADECE birini seçip o branşın tek sonucunu
// girer (bkz. 9_10_sinif_ekleme_senaryosu.pdf 7.1 "Ürün kararı") — 11-12
// TYT/AYT akışı (birden çok ders aynı anda) değişmeden kalıyor.
export function DenemeForm({ aytAlan, dokuzOnMu, onBasari, gorevAtamaId }: {
  aytAlan: AytAlan; dokuzOnMu: boolean; onBasari: (m: string, s: boolean) => void; gorevAtamaId?: string;
}) {
  const [tur, setTur] = useState<DenemeTuru>("TYT");
  const [brans, setBrans] = useState<string>(BRANS_DENEMESI_DERSLERI[0]);
  const [sonuclar, setSonuclar] = useState<Record<string, { dogru: string; yanlis: string }>>({});
  const [yayinevi, setYayinevi] = useState("");
  const [hedefeYakinlik, setHedefeYakinlik] = useState<HedefeYakinlik>("belirsiz");
  const [zorluk, setZorluk] = useState<DenemeZorlugu>("orta");
  const [tarih, setTarih] = useState(bugununTarihi());
  const [hata, setHata] = useState<string | null>(null);
  const [benzerUyari, setBenzerUyari] = useState(false);
  const [pending, startTransition] = useTransition();

  const efektifTur: DenemeTuru = dokuzOnMu ? "BRANS" : tur;
  const dersler = efektifTur === "BRANS" ? [brans] : (efektifTur === "TYT" ? TYT_DERSLERI : AYT_DERSLERI[aytAlan]);

  // Doğru+yanlış toplamı, dersin sınavdaki resmi/branş soru sayısını aşamaz
  // — eksik girilirse kalanı cevaplanmamış (boş) sayılır, bu zaten net
  // hesabını etkilemiyor.
  function alanGuncelle(ders: string, alan: "dogru" | "yanlis", deger: string) {
    const maks = dersSoruSayisi(efektifTur, ders);
    setSonuclar((s) => {
      const mevcutDiger = Number(s[ders]?.[alan === "dogru" ? "yanlis" : "dogru"] ?? "0");
      let sayi = deger === "" ? 0 : Number(deger);
      if (maks !== undefined && sayi + mevcutDiger > maks) sayi = Math.max(0, maks - mevcutDiger);
      return {
        ...s,
        [ders]: {
          ...s[ders],
          [alan]: deger === "" ? "" : String(sayi),
          [alan === "dogru" ? "yanlis" : "dogru"]: s[ders]?.[alan === "dogru" ? "yanlis" : "dogru"] ?? "0",
        },
      };
    });
  }

  function kaydet(zorla: boolean) {
    const dersSonuclari = dersler.map((d) => ({
      ders: d,
      dogru: Number(sonuclar[d]?.dogru ?? 0),
      yanlis: Number(sonuclar[d]?.yanlis ?? 0),
    }));
    startTransition(async () => {
      const res = await denemeEkle(efektifTur, yayinevi.trim(), hedefeYakinlik, zorluk, dersSonuclari, tarih, zorla, gorevAtamaId);
      if (res.error) { setHata(res.error); setBenzerUyari(false); }
      else if (res.benzerUyari) { setBenzerUyari(true); }
      else {
        onBasari(efektifTur === "BRANS" ? `${brans} Branş Denemesi kaydedildi.` : `${tur} denemesi kaydedildi.`, res.verimlilikSorulsunMu);
        setSonuclar({});
        setYayinevi("");
        setTarih(bugununTarihi());
        setBenzerUyari(false);
      }
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBenzerUyari(false);
    if (!yayinevi.trim()) return setHata("Yayınevi girin (MEB veya okul kitabıysa öyle yazabilirsin).");
    kaydet(false);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <GecmisTarihSecici tarih={tarih} setTarih={setTarih} geriyeMaksGun={KATEGORI_GERIYE_DONUK_SINIR.deneme} />
      <div className="grid grid-cols-2 gap-3">
        {dokuzOnMu ? (
          <label className="flex flex-col gap-1"><Etiket>Branş</Etiket>
            <Secim value={brans} onChange={(e) => { setBrans(e.target.value); setSonuclar({}); }}>
              {BRANS_DENEMESI_DERSLERI.map((b) => <option key={b} value={b}>{b}</option>)}
            </Secim>
          </label>
        ) : (
          <label className="flex flex-col gap-1"><Etiket>Deneme türü</Etiket>
            <Secim value={tur} onChange={(e) => { setTur(e.target.value as DenemeTuru); setSonuclar({}); }}>
              <option value="TYT">TYT</option>
              <option value="AYT">AYT ({aytAlan})</option>
              <option value="BRANS">Branş</option>
            </Secim>
          </label>
        )}
        {/* 11-12. sınıfta da Branş Denemesi girilebiliyor (örn. tek dersten
            deneme çözülmüş olabilir) — bu durumda hangi dersten olduğunu
            seçtiren ikinci alan, TYT/AYT'de Yayınevi'nin durduğu yerde açılır. */}
        {!dokuzOnMu && tur === "BRANS" ? (
          <label className="flex flex-col gap-1"><Etiket>Branş</Etiket>
            <Secim value={brans} onChange={(e) => { setBrans(e.target.value); setSonuclar({}); }}>
              {BRANS_DENEMESI_DERSLERI.map((b) => <option key={b} value={b}>{b}</option>)}
            </Secim>
          </label>
        ) : (
          <label className="flex flex-col gap-1"><Etiket>Yayınevi</Etiket>
            <Girdi placeholder="örn. Palme, MEB, Okul kitabı" value={yayinevi} onChange={(e) => setYayinevi(e.target.value)} required />
          </label>
        )}
      </div>
      {!dokuzOnMu && tur === "BRANS" && (
        <label className="flex flex-col gap-1"><Etiket>Yayınevi</Etiket>
          <Girdi placeholder="örn. Palme, MEB, Okul kitabı" value={yayinevi} onChange={(e) => setYayinevi(e.target.value)} required />
        </label>
      )}

      <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
        <Etiket>{efektifTur === "BRANS" ? "Branş sonucu" : "Ders bazlı sonuçlar"}</Etiket>
        {dersler.map((d) => {
          const maks = dersSoruSayisi(efektifTur, d);
          return (
            // D/Y kutuları sabit genişlikte (auto DEĞİL) — Türkçe/Matematik
            // gibi iki basamaklı soru sayısı olan derslerde değer girilince
            // kutunun genişleyip satırın kaymasını önler; her satır aynı
            // hizada kalır (bkz. kullanıcı bulgusu, 24.08.2026).
            <div key={d} className="grid grid-cols-[1fr_56px_56px] gap-2 items-center">
              <span style={{ color: TEXT }} className="text-xs font-semibold">{d} {maks !== undefined && <span style={{ color: TEXT_MUTED }} className="font-normal">(max {maks})</span>}</span>
              <Girdi type="number" min={0} max={maks} placeholder="D" value={sonuclar[d]?.dogru ?? ""} onChange={(e) => alanGuncelle(d, "dogru", e.target.value)} />
              <Girdi type="number" min={0} max={maks} placeholder="Y" value={sonuclar[d]?.yanlis ?? ""} onChange={(e) => alanGuncelle(d, "yanlis", e.target.value)} />
            </div>
          );
        })}
      </div>

      <SecenekSecici baslik="Deneme seviyesi" value={zorluk} onChange={setZorluk}
        secenekler={[["kolay", "Kolay"], ["orta", "Orta"], ["zor", "Zor"]]} />
      <SecenekSecici baslik="Deneme net hedefim" value={hedefeYakinlik} onChange={setHedefeYakinlik}
        secenekler={[["uzak", "Uzak"], ["belirsiz", "Ortalama"], ["yakin", "Ulaştım"]]} />
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      {benzerUyari && (
        <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: "rgba(255,196,107,0.12)", border: "2px solid rgba(255,196,107,0.35)" }}>
          <span style={{ color: TEXT }} className="text-xs font-semibold">
            Bu tarih için zaten {efektifTur === "BRANS" ? `${brans} branşında` : `bir ${tur} denemesi için`} kendi girdiğin bir kayıt var. Yine de eklemek istiyor musun?
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setBenzerUyari(false)} disabled={pending}
              className="sfec-btn flex-1 text-xs font-bold py-2 rounded-xl disabled:opacity-60"
              style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
              Vazgeç
            </button>
            <button type="button" onClick={() => kaydet(true)} disabled={pending}
              className="sfec-btn flex-1 text-xs font-bold py-2 rounded-xl disabled:opacity-60"
              style={{ background: MINT, color: MINT_ON }}>
              Yine de ekle
            </button>
          </div>
        </div>
      )}
      <button type="submit" disabled={pending || benzerUyari} className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
      <YukleniyorOverlay visible={pending} mesaj="Kaydediliyor..." />
    </form>
  );
}

function HaftalikVerimlilikModal({ onKapat }: { onKapat: () => void }) {
  const [pending, startTransition] = useTransition();

  function sec(duzey: VerimlilikDuzeyi) {
    startTransition(async () => {
      await haftalikVerimlilikEkle(duzey);
      onKapat();
    });
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="sfec-fade rounded-3xl p-6 max-w-sm w-full" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} color={MINT} />
          <h3 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Bu dönemki genel çalışma düzeyin nasıldı?</h3>
        </div>
        <div className="flex flex-col gap-2">
          {(Object.entries(VERIMLILIK_ETIKET) as [VerimlilikDuzeyi, string][]).map(([k, v]) => (
            <button key={k} disabled={pending} onClick={() => sec(k)}
              className="sfec-btn text-sm font-semibold py-2 rounded-xl text-left px-4"
              style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <YukleniyorOverlay visible={pending} mesaj="Kaydediliyor..." />
    </div>
  );
}
