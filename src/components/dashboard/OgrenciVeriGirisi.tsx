"use client";

import { useMemo, useState, useTransition } from "react";
import { BookOpen, PenLine, ClipboardList, Sparkles, Loader2, ChevronDown, ChevronUp, CalendarClock } from "lucide-react";
import type {
  AytAlan, DenemeTuru, DenemeZorlugu, HedefeYakinlik, VerimlilikDuzeyi,
} from "@/lib/types";
import {
  TYT_DERSLERI, AYT_DERSLERI, VERIMLILIK_ETIKET, netHesapla, dersSoruSayisi,
  SURE_UST_SINIR, DENEME_SURE_UST_SINIR,
} from "@/lib/types";
import {
  BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, SKY, SKY_BG, TEXT, TEXT_MUTED, BLUSH,
} from "@/lib/theme";
import {
  konuCalismaEkle, soruCozumuEkle, denemeEkle, haftalikVerimlilikEkle, konuAnlatimiGetir,
} from "@/app/dashboard/veri-actions";
import { YukleniyorOverlay } from "@/components/YukleniyorOverlay";

function bugununTarihi(): string {
  return new Date().toISOString().slice(0, 10);
}

// Varsayılan: anlık giriş bugünün tarihiyle kaydedilir. Öğrenci geçmiş bir
// gün için giriş yapmak isterse bu buton bir tarih seçici açar (gelecek bir
// tarih seçilemez). Veri giriş sıklığı (günlük/haftalık) sistemi bu yüzden
// kaldırıldı — artık her gün ayrı ayrı, istenildiği zaman girilebiliyor.
function GecmisTarihSecici({ tarih, setTarih }: { tarih: string; setTarih: (v: string) => void }) {
  const [acik, setAcik] = useState(tarih !== bugununTarihi());

  if (!acik) {
    return (
      <button type="button" onClick={() => setAcik(true)}
        className="sgec-btn self-start flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
        style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
        <CalendarClock size={12} /> Geçmiş tarih için gir
      </button>
    );
  }

  return (
    <label className="flex flex-col gap-1">
      <Etiket>Tarih</Etiket>
      <div className="flex gap-2">
        <Girdi type="date" max={bugununTarihi()} value={tarih} onChange={(e) => setTarih(e.target.value)} required />
        <button type="button" onClick={() => { setAcik(false); setTarih(bugununTarihi()); }}
          className="sgec-btn shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
          Bugüne dön
        </button>
      </div>
    </label>
  );
}

type Sekme = "konu" | "soru" | "deneme";

function Etiket({ children }: { children: React.ReactNode }) {
  return <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{children}</span>;
}
function Girdi(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="text-sm px-2.5 py-1.5 rounded-xl outline-none w-full" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />;
}
function Secim({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className="text-sm px-2.5 py-1.5 rounded-xl outline-none w-full" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>{children}</select>;
}

// Genel 3-seçenekli buton grubu — Konu Çalışma/Soru Çözümü/Deneme'de aynı
// hedefe_yakinlik (ya da zorluk) alanı farklı başlık/etiketlerle gösteriliyor.
function SecenekSecici<T extends string>({ baslik, secenekler, value, onChange }: {
  baslik: string; secenekler: [T, string][]; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Etiket>{baslik}</Etiket>
      <div className="flex gap-1.5">
        {secenekler.map(([k, v]) => (
          <button type="button" key={k} onClick={() => onChange(k)}
            className="sgec-btn flex-1 text-[11px] font-bold py-1.5 rounded-full"
            style={{ background: value === k ? MINT : "transparent", color: value === k ? MINT_ON : TEXT_MUTED, border: `1px solid ${value === k ? MINT : BORDER_STRONG}` }}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OgrenciVeriGirisi({ aytAlan, konuOnerileri }: {
  aytAlan: AytAlan;
  konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
}) {
  const [sekme, setSekme] = useState<Sekme>("konu");
  const [verimlilikSor, setVerimlilikSor] = useState(false);
  const [basari, setBasari] = useState<string | null>(null);

  const dersListesi = [...TYT_DERSLERI, ...AYT_DERSLERI[aytAlan].filter((d) => !TYT_DERSLERI.includes(d as typeof TYT_DERSLERI[number]))];

  function basariGoster(mesaj: string, sorulsunMu: boolean) {
    setBasari(mesaj);
    setTimeout(() => setBasari(null), 3000);
    if (sorulsunMu) setVerimlilikSor(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {basari && (
        <div className="sgec-fade rounded-2xl px-4 py-2.5 text-[13px] font-semibold" style={{ background: MINT_BG, color: MINT }}>
          ✓ {basari}
        </div>
      )}

      <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}>
          {[
            { id: "konu" as const, ad: "Konu Çalışma", icon: BookOpen },
            { id: "soru" as const, ad: "Soru Çözümü", icon: PenLine },
            { id: "deneme" as const, ad: "Deneme", icon: ClipboardList },
          ].map((s) => {
            const Icon = s.icon;
            const aktif = sekme === s.id;
            return (
              <button key={s.id} type="button" onClick={() => setSekme(s.id)}
                className="sgec-btn flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[12px] font-bold"
                style={{ background: aktif ? MINT : "transparent", color: aktif ? MINT_ON : TEXT_MUTED }}>
                <Icon size={13} /> {s.ad}
              </button>
            );
          })}
        </div>

        {sekme === "konu" && <KonuCalismaForm dersListesi={dersListesi} konuOnerileri={konuOnerileri} onBasari={basariGoster} />}
        {sekme === "soru" && <SoruCozumuForm dersListesi={dersListesi} onBasari={basariGoster} />}
        {sekme === "deneme" && <DenemeForm aytAlan={aytAlan} onBasari={basariGoster} />}
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
    <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto rounded-xl sgec-fade"
      style={{ background: BG0, border: `1px solid ${BORDER_STRONG}`, boxShadow: "0 8px 20px rgba(0,0,0,0.35)" }}>
      {oneriler.map((o) => (
        <button key={o.konu} type="button" onMouseDown={(e) => { e.preventDefault(); onSec(o.konu); }}
          className="sgec-btn w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-xs font-semibold"
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
function KonuCalismaForm({ dersListesi, konuOnerileri, onBasari }: {
  dersListesi: string[]; konuOnerileri: { ders: string; konu: string; seviye?: string | null }[]; onBasari: (m: string, s: boolean) => void;
}) {
  const [ders, setDers] = useState("");
  const [konu, setKonu] = useState("");
  const [aramaMetni, setAramaMetni] = useState("");
  const [oneriAcik, setOneriAcik] = useState(false);
  const [hedefeYakinlik, setHedefeYakinlik] = useState<HedefeYakinlik>("belirsiz");
  const [tarih, setTarih] = useState(bugununTarihi());
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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

  function konuyuOku() {
    if (!ders || !konu.trim()) return setAnlatimHata("Önce ders ve konu girin.");
    const aciliyor = !anlatimAcik;
    setAnlatimAcik(aciliyor);

    if (!aciliyor) {
      // Kapatılıyor: seçili konuyu (ve rozeti) sıfırla, arama kutusu boş kalsın.
      setKonu("");
      setAramaMetni("");
      setAnlatim(null);
      setAnlatimSeviye(null);
      setAnlatimHata(null);
      return;
    }

    setAramaMetni("");
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

  function submit(formData: FormData) {
    setHata(null);
    if (!konu.trim()) return setHata("Konu seçin veya yazın.");
    formData.set("ders", ders);
    formData.set("konu", konu);
    formData.set("hedefeYakinlik", hedefeYakinlik);
    formData.set("tarih", tarih);
    startTransition(async () => {
      const res = await konuCalismaEkle(formData);
      if (res.error) return setHata(res.error);
      onBasari("Konu çalışması kaydedildi.", res.verimlilikSorulsunMu);
      setKonu(""); setAramaMetni(""); setAnlatim(null); setAnlatimSeviye(null); setAnlatimAcik(false); setHedefeYakinlik("belirsiz"); setTarih(bugununTarihi());
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
      <GecmisTarihSecici tarih={tarih} setTarih={setTarih} />
      <label className="flex flex-col gap-1"><Etiket>Ders</Etiket>
        <Secim value={ders} onChange={(e) => { setDers(e.target.value); setKonu(""); setAramaMetni(""); setAnlatim(null); setAnlatimAcik(false); }} required>
          <option value="" disabled>Seçiniz</option>
          {dersListesi.map((d) => <option key={d} value={d}>{d}</option>)}
        </Secim>
      </label>

      <label className="flex flex-col gap-1 relative">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Etiket>Eksik olduğun konu</Etiket>
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
            className="sgec-btn shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-50"
            style={{ background: SKY_BG, color: SKY, border: `1px solid rgba(143,198,255,0.3)` }}>
            {anlatimYukleniyor ? <Loader2 size={13} className="animate-spin" /> : anlatimAcik ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Konuyu oku
          </button>
        </div>
        <KonuOneriDropdown oneriler={oneriler} aktif={oneriAcik && !!ders} onSec={konuSec} />
      </label>

      {anlatimAcik && (
        <div className="rounded-2xl p-3.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
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
      <p style={{ color: TEXT_MUTED }} className="text-[11px] -mt-1">Konuyu okuduktan/çalıştıktan sonra ne kadar hakim olduğunu aşağıdan işaretle:</p>
      <SecenekSecici baslik="Konuya hakimiyet" value={hedefeYakinlik} onChange={setHedefeYakinlik}
        secenekler={[["uzak", "Yetersiz"], ["belirsiz", "Orta"], ["yakin", "Yeterli"]]} />
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" disabled={pending} className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
      <YukleniyorOverlay visible={pending} mesaj={anlatimYukleniyor ? undefined : "Kaydediliyor..."} />
    </form>
  );
}

function SoruCozumuForm({ dersListesi, onBasari }: { dersListesi: string[]; onBasari: (m: string, s: boolean) => void }) {
  const [dogru, setDogru] = useState("");
  const [yanlis, setYanlis] = useState("");
  const [hedefeYakinlik, setHedefeYakinlik] = useState<HedefeYakinlik>("belirsiz");
  const [tarih, setTarih] = useState(bugununTarihi());
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const net = dogru !== "" && yanlis !== "" ? netHesapla(Number(dogru), Number(yanlis)) : null;

  function submit(formData: FormData) {
    setHata(null);
    formData.set("hedefeYakinlik", hedefeYakinlik);
    formData.set("tarih", tarih);
    startTransition(async () => {
      const res = await soruCozumuEkle(formData);
      if (res.error) setHata(res.error);
      else { onBasari(`Soru çözümü kaydedildi (net: ${net}).`, res.verimlilikSorulsunMu); setTarih(bugununTarihi()); }
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
      <GecmisTarihSecici tarih={tarih} setTarih={setTarih} />
      <label className="flex flex-col gap-1"><Etiket>Ders</Etiket>
        <Secim name="ders" required defaultValue="">
          <option value="" disabled>Seçiniz</option>
          {dersListesi.map((d) => <option key={d} value={d}>{d}</option>)}
        </Secim>
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="flex flex-col gap-1"><Etiket>Doğru</Etiket>
          <Girdi name="dogru" type="number" min={0} required value={dogru} onChange={(e) => setDogru(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><Etiket>Yanlış</Etiket>
          <Girdi name="yanlis" type="number" min={0} required value={yanlis} onChange={(e) => setYanlis(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><Etiket>Süre (dk)</Etiket>
          <Girdi name="sureDakika" type="number" min={1} max={SURE_UST_SINIR} required />
        </label>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] -mt-1">Süre, şu an bitirdiğin <strong>tek oturumun</strong> süresi — haftalık/günlük toplam değil.</p>
      {net !== null && (
        <div style={{ color: MINT }} className="text-xs font-bold">Net: {net}</div>
      )}
      <SecenekSecici baslik="Soru çözüm sayım" value={hedefeYakinlik} onChange={setHedefeYakinlik}
        secenekler={[["uzak", "Az"], ["belirsiz", "Orta"], ["yakin", "Çok"]]} />
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" disabled={pending} className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
      <YukleniyorOverlay visible={pending} mesaj="Kaydediliyor..." />
    </form>
  );
}

function DenemeForm({ aytAlan, onBasari }: { aytAlan: AytAlan; onBasari: (m: string, s: boolean) => void }) {
  const [tur, setTur] = useState<DenemeTuru>("TYT");
  const [sonuclar, setSonuclar] = useState<Record<string, { dogru: string; yanlis: string }>>({});
  const [sureDakika, setSureDakika] = useState("");
  const [hedefeYakinlik, setHedefeYakinlik] = useState<HedefeYakinlik>("belirsiz");
  const [zorluk, setZorluk] = useState<DenemeZorlugu>("orta");
  const [tarih, setTarih] = useState(bugununTarihi());
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dersler = tur === "TYT" ? TYT_DERSLERI : AYT_DERSLERI[aytAlan];

  // Doğru+yanlış toplamı, dersin sınavdaki resmi soru sayısını aşamaz —
  // eksik girilirse kalanı cevaplanmamış (boş) sayılır, bu zaten net
  // hesabını etkilemiyor.
  function alanGuncelle(ders: string, alan: "dogru" | "yanlis", deger: string) {
    const maks = dersSoruSayisi(tur, ders);
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

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!sureDakika || Number(sureDakika) <= 0) return setHata("Süreyi girin.");
    if (Number(sureDakika) > DENEME_SURE_UST_SINIR) return setHata(`Süre en fazla ${DENEME_SURE_UST_SINIR} dakika olabilir.`);
    const dersSonuclari = dersler.map((d) => ({
      ders: d,
      dogru: Number(sonuclar[d]?.dogru ?? 0),
      yanlis: Number(sonuclar[d]?.yanlis ?? 0),
    }));
    startTransition(async () => {
      const res = await denemeEkle(tur, Number(sureDakika), hedefeYakinlik, zorluk, dersSonuclari, tarih);
      if (res.error) setHata(res.error);
      else {
        onBasari(`${tur} denemesi kaydedildi.`, res.verimlilikSorulsunMu);
        setSonuclar({});
        setSureDakika("");
        setTarih(bugununTarihi());
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <GecmisTarihSecici tarih={tarih} setTarih={setTarih} />
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><Etiket>Deneme türü</Etiket>
          <Secim value={tur} onChange={(e) => { setTur(e.target.value as DenemeTuru); setSonuclar({}); }}>
            <option value="TYT">TYT</option>
            <option value="AYT">AYT ({aytAlan})</option>
          </Secim>
        </label>
        <label className="flex flex-col gap-1"><Etiket>Süre (dakika)</Etiket>
          <Girdi type="number" min={1} max={DENEME_SURE_UST_SINIR} required value={sureDakika} onChange={(e) => setSureDakika(e.target.value)} />
        </label>
      </div>

      <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
        <Etiket>Ders bazlı sonuçlar</Etiket>
        {dersler.map((d) => {
          const maks = dersSoruSayisi(tur, d);
          return (
            <div key={d} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
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
      <button type="submit" disabled={pending} className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="sgec-fade rounded-3xl p-6 max-w-sm w-full" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles size={16} color={MINT} />
          <h3 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Bu dönemki genel çalışma düzeyin nasıldı?</h3>
        </div>
        <div className="flex flex-col gap-2">
          {(Object.entries(VERIMLILIK_ETIKET) as [VerimlilikDuzeyi, string][]).map(([k, v]) => (
            <button key={k} disabled={pending} onClick={() => sec(k)}
              className="sgec-btn text-sm font-semibold py-2 rounded-xl text-left px-4"
              style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
              {v}
            </button>
          ))}
        </div>
      </div>
      <YukleniyorOverlay visible={pending} mesaj="Kaydediliyor..." />
    </div>
  );
}
