"use client";

import { useState, useTransition } from "react";
import { BookOpen, PenLine, ClipboardList, Sparkles, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import type { AytAlan, DenemeTuru, HedefeYakinlik, VerimlilikDuzeyi, VeriGirisSikligi } from "@/lib/types";
import {
  TYT_DERSLERI, AYT_DERSLERI, HEDEFE_YAKINLIK_ETIKET, VERIMLILIK_ETIKET, VERI_GIRIS_SIKLIGI_ETIKET, netHesapla,
} from "@/lib/types";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, SKY, SKY_BG, TEXT, TEXT_MUTED, BLUSH,
} from "@/lib/theme";
import {
  konuCalismaEkle, soruCozumuEkle, denemeEkle, haftalikVerimlilikEkle, veriGirisSikligiGuncelle, konuAnlatimiGetir,
} from "@/app/dashboard/veri-actions";

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

function HedefeYakinlikSecici({ value, onChange }: { value: HedefeYakinlik; onChange: (v: HedefeYakinlik) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <Etiket>Hedefe yakınlık</Etiket>
      <div className="flex gap-1.5">
        {(Object.entries(HEDEFE_YAKINLIK_ETIKET) as [HedefeYakinlik, string][]).map(([k, v]) => (
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

export function OgrenciVeriGirisi({ studentId, aytAlan, veriGirisSikligi, konuOnerileri }: {
  studentId: string; aytAlan: AytAlan; veriGirisSikligi: VeriGirisSikligi;
  konuOnerileri: { ders: string; konu: string }[];
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
      <SiklikAyari studentId={studentId} mevcut={veriGirisSikligi} />

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

function SiklikAyari({ studentId, mevcut }: { studentId: string; mevcut: VeriGirisSikligi }) {
  const [pending, startTransition] = useTransition();
  const [deger, setDeger] = useState(mevcut);
  void studentId;

  return (
    <div className="sgec-fade rounded-2xl px-4 py-3 flex items-center justify-between flex-wrap gap-2" style={{ background: SKY_BG, border: `1px solid rgba(143,198,255,0.3)` }}>
      <span style={{ color: SKY }} className="text-[12px] font-semibold">Veri giriş sıklığınız</span>
      <select value={deger} disabled={pending}
        onChange={(e) => {
          const v = e.target.value as VeriGirisSikligi;
          setDeger(v);
          startTransition(() => { void veriGirisSikligiGuncelle(v); });
        }}
        className="text-xs font-bold px-3 py-1.5 rounded-full outline-none" style={{ background: BG1, color: SKY, border: `1px solid ${SKY}` }}>
        {(Object.entries(VERI_GIRIS_SIKLIGI_ETIKET) as [VeriGirisSikligi, string][]).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
    </div>
  );
}

// Akış: önce ders+konu seçilir (eksik olduğun konuyu SEN bulursun), "Konuyu
// oku" ile o an AI anlatımı gösterilir; süre ve hedefe yakınlığı — yani
// konuyu ne kadar anladığın — bunu OKUDUKTAN/çalıştıktan SONRA girilir.
function KonuCalismaForm({ dersListesi, konuOnerileri, onBasari }: {
  dersListesi: string[]; konuOnerileri: { ders: string; konu: string }[]; onBasari: (m: string, s: boolean) => void;
}) {
  const [ders, setDers] = useState("");
  const [konu, setKonu] = useState("");
  const [hedefeYakinlik, setHedefeYakinlik] = useState<HedefeYakinlik>("belirsiz");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [anlatimAcik, setAnlatimAcik] = useState(false);
  const [anlatim, setAnlatim] = useState<string | null>(null);
  const [anlatimYukleniyor, setAnlatimYukleniyor] = useState(false);
  const [anlatimHata, setAnlatimHata] = useState<string | null>(null);

  const oneriler = konuOnerileri.filter((o) => o.ders === ders);

  function konuyuOku() {
    if (!ders || !konu.trim()) return setAnlatimHata("Önce ders ve konu girin.");
    setAnlatimAcik((a) => !a);
    if (anlatim || anlatimYukleniyor) return;
    setAnlatimYukleniyor(true);
    setAnlatimHata(null);
    startTransition(async () => {
      const res = await konuAnlatimiGetir(ders, konu);
      setAnlatimYukleniyor(false);
      if (res.error) setAnlatimHata(res.error);
      else setAnlatim(res.icerik);
    });
  }

  function submit(formData: FormData) {
    setHata(null);
    formData.set("ders", ders);
    formData.set("konu", konu);
    formData.set("hedefeYakinlik", hedefeYakinlik);
    startTransition(async () => {
      const res = await konuCalismaEkle(formData);
      if (res.error) return setHata(res.error);
      onBasari("Konu çalışması kaydedildi.", res.verimlilikSorulsunMu);
      setKonu(""); setAnlatim(null); setAnlatimAcik(false); setHedefeYakinlik("belirsiz");
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1"><Etiket>Ders</Etiket>
        <Secim value={ders} onChange={(e) => { setDers(e.target.value); setKonu(""); setAnlatim(null); setAnlatimAcik(false); }} required>
          <option value="" disabled>Seçiniz</option>
          {dersListesi.map((d) => <option key={d} value={d}>{d}</option>)}
        </Secim>
      </label>

      <label className="flex flex-col gap-1"><Etiket>Eksik olduğun konu</Etiket>
        <div className="flex gap-2">
          <Girdi list="konu-oneri-listesi" required placeholder="örn. Türev - Zincir Kuralı" value={konu}
            onChange={(e) => { setKonu(e.target.value); setAnlatim(null); }} disabled={!ders} />
          <button type="button" onClick={konuyuOku} disabled={!ders || !konu.trim()}
            className="sgec-btn shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl disabled:opacity-50"
            style={{ background: SKY_BG, color: SKY, border: `1px solid rgba(143,198,255,0.3)` }}>
            {anlatimYukleniyor ? <Loader2 size={13} className="animate-spin" /> : anlatimAcik ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Konuyu oku
          </button>
        </div>
        <datalist id="konu-oneri-listesi">
          {oneriler.map((o) => <option key={o.konu} value={o.konu} />)}
        </datalist>
      </label>

      {anlatimAcik && (
        <div className="rounded-2xl p-3.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
          {anlatimHata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{anlatimHata}</div>}
          {anlatim && <div style={{ color: TEXT_MUTED }} className="text-sm leading-relaxed whitespace-pre-line">{anlatim}</div>}
        </div>
      )}

      <label className="flex flex-col gap-1"><Etiket>Süre (dakika)</Etiket>
        <Girdi name="sureDakika" type="number" min={1} required />
      </label>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] -mt-1">Konuyu okuduktan/çalıştıktan sonra ne kadar anladığını aşağıdan işaretle:</p>
      <HedefeYakinlikSecici value={hedefeYakinlik} onChange={setHedefeYakinlik} />
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" disabled={pending} className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}

function SoruCozumuForm({ dersListesi, onBasari }: { dersListesi: string[]; onBasari: (m: string, s: boolean) => void }) {
  const [dogru, setDogru] = useState("");
  const [yanlis, setYanlis] = useState("");
  const [hedefeYakinlik, setHedefeYakinlik] = useState<HedefeYakinlik>("belirsiz");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const net = dogru !== "" && yanlis !== "" ? netHesapla(Number(dogru), Number(yanlis)) : null;

  function submit(formData: FormData) {
    setHata(null);
    formData.set("hedefeYakinlik", hedefeYakinlik);
    startTransition(async () => {
      const res = await soruCozumuEkle(formData);
      if (res.error) setHata(res.error);
      else onBasari(`Soru çözümü kaydedildi (net: ${net}).`, res.verimlilikSorulsunMu);
    });
  }

  return (
    <form action={submit} className="flex flex-col gap-3">
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
          <Girdi name="sureDakika" type="number" min={1} required />
        </label>
      </div>
      {net !== null && (
        <div style={{ color: MINT }} className="text-xs font-bold">Net: {net}</div>
      )}
      <HedefeYakinlikSecici value={hedefeYakinlik} onChange={setHedefeYakinlik} />
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" disabled={pending} className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}

function DenemeForm({ aytAlan, onBasari }: { aytAlan: AytAlan; onBasari: (m: string, s: boolean) => void }) {
  const [tur, setTur] = useState<DenemeTuru>("TYT");
  const [sonuclar, setSonuclar] = useState<Record<string, { dogru: string; yanlis: string }>>({});
  const [sureDakika, setSureDakika] = useState("");
  const [hedefeYakinlik, setHedefeYakinlik] = useState<HedefeYakinlik>("belirsiz");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dersler = tur === "TYT" ? TYT_DERSLERI : AYT_DERSLERI[aytAlan];

  function alanGuncelle(ders: string, alan: "dogru" | "yanlis", deger: string) {
    setSonuclar((s) => ({ ...s, [ders]: { ...s[ders], [alan]: deger, [alan === "dogru" ? "yanlis" : "dogru"]: s[ders]?.[alan === "dogru" ? "yanlis" : "dogru"] ?? "0" } }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!sureDakika || Number(sureDakika) <= 0) return setHata("Süreyi girin.");
    const dersSonuclari = dersler.map((d) => ({
      ders: d,
      dogru: Number(sonuclar[d]?.dogru ?? 0),
      yanlis: Number(sonuclar[d]?.yanlis ?? 0),
    }));
    startTransition(async () => {
      const res = await denemeEkle(tur, Number(sureDakika), hedefeYakinlik, dersSonuclari);
      if (res.error) setHata(res.error);
      else {
        onBasari(`${tur} denemesi kaydedildi.`, res.verimlilikSorulsunMu);
        setSonuclar({});
        setSureDakika("");
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><Etiket>Deneme türü</Etiket>
          <Secim value={tur} onChange={(e) => { setTur(e.target.value as DenemeTuru); setSonuclar({}); }}>
            <option value="TYT">TYT</option>
            <option value="AYT">AYT ({aytAlan})</option>
          </Secim>
        </label>
        <label className="flex flex-col gap-1"><Etiket>Süre (dakika)</Etiket>
          <Girdi type="number" min={1} required value={sureDakika} onChange={(e) => setSureDakika(e.target.value)} />
        </label>
      </div>

      <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
        <Etiket>Ders bazlı sonuçlar</Etiket>
        {dersler.map((d) => (
          <div key={d} className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
            <span style={{ color: TEXT }} className="text-xs font-semibold">{d}</span>
            <Girdi type="number" min={0} placeholder="D" value={sonuclar[d]?.dogru ?? ""} onChange={(e) => alanGuncelle(d, "dogru", e.target.value)} />
            <Girdi type="number" min={0} placeholder="Y" value={sonuclar[d]?.yanlis ?? ""} onChange={(e) => alanGuncelle(d, "yanlis", e.target.value)} />
          </div>
        ))}
      </div>

      <HedefeYakinlikSecici value={hedefeYakinlik} onChange={setHedefeYakinlik} />
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" disabled={pending} className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
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
    </div>
  );
}
