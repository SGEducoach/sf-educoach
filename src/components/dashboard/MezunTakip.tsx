"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, FileUp, GraduationCap, MessageSquare, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { MEZUN_KAYNAK_ETIKETI, MEZUN_PDF_SUTUNLARI } from "@/lib/mezun";
import type { MezunHamBilgisi, MezunKaydi, MezunPdfOnizlemesi } from "@/lib/mezun";
import { SMS_ICERIK_SINIRI, smsUzunlugu } from "@/lib/sms-mesaj";
import { mezunKaydet, mezunPdfAktar, mezunPdfOnizle, mezunSil, mezunSmsGonder } from "@/app/dashboard/mezun-actions";
import {
  BG0, BG1, BG1_ALT, BLUSH, BLUSH_BG, BORDER, BORDER_STRONG, BUTTER_BG, MINT, MINT_BG, MINT_ON, SKY_BG, TEXT, TEXT_MUTED,
} from "@/lib/theme";

// Mezun Takip (kullanıcı isteği 30.10.2026): rehberlik servisi ve müdür
// mezunların iletişim ve güncel durum bilgisini izler, düzenler, PDF ile
// toplu ekler ve seçtiklerine SMS gönderir.

type SmsDurumu = "hazir" | "kapali" | "baglantisiz";

const BOS_FORM: Record<keyof Required<MezunHamBilgisi>, string> = {
  ad: "", soyad: "", il: "", ilce: "", eposta: "", telefon: "", universite: "", meslek: "", mezuniyetYili: "",
};

// 905321234567 → 0532 123 45 67
function telefonGoster(t: string | null): string {
  if (!t) return "";
  const n = t.slice(2);
  return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}`;
}

function sablonIndir() {
  const kacir = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const ornek = ["Ayşe", "Yılmaz", "Kahramanmaraş", "Elbistan", "ornek@eposta.com", "0532 000 00 00", "Ankara Üniversitesi Tıp", "", "2024"];
  const metin = [MEZUN_PDF_SUTUNLARI.map(kacir).join(";"), ornek.map(kacir).join(";")].join("\r\n");
  // Başındaki BOM, Excel'in Türkçe karakterleri doğru açması için.
  const url = URL.createObjectURL(new Blob(["﻿" + metin], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "mezun-listesi-sablonu.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export function MezunTakip({ mezunlar, smsDurumu, buYil }: { mezunlar: MezunKaydi[]; smsDurumu: SmsDurumu; buYil: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<{ tur: "ok" | "hata"; metin: string } | null>(null);
  const [arama, setArama] = useState("");
  const [yil, setYil] = useState<string>("");
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<{ id: string | null; alanlar: typeof BOS_FORM } | null>(null);
  const [sms, setSms] = useState("");
  const [onizleme, setOnizleme] = useState<{ satirlar: MezunPdfOnizlemesi[]; ham: MezunHamBilgisi[]; eksik: string[] } | null>(null);
  const dosyaRef = useRef<HTMLInputElement>(null);

  const yillar = useMemo(() => [...new Set(mezunlar.map((m) => m.mezuniyetYili))].sort((a, b) => b - a), [mezunlar]);
  const gorunen = useMemo(() => {
    const q = arama.trim().toLocaleLowerCase("tr-TR");
    return mezunlar.filter((m) => (!yil || String(m.mezuniyetYili) === yil)
      && (!q || [m.ad, m.soyad, m.il, m.ilce, m.universite, m.meslek, m.okulNo].some((v) => v?.toLocaleLowerCase("tr-TR").includes(q))));
  }, [mezunlar, arama, yil]);
  const seciliTelefonlu = mezunlar.filter((m) => secili.has(m.id) && m.telefon).length;
  const uzunluk = smsUzunlugu(sms);

  const sonuc = (r: { error: string | null }, ok: string) => {
    if (r.error) { setMesaj({ tur: "hata", metin: r.error }); return false; }
    setMesaj({ tur: "ok", metin: ok });
    router.refresh();
    return true;
  };

  function formuAc(m: MezunKaydi | null) {
    setMesaj(null);
    setForm(m ? {
      id: m.id,
      alanlar: { ad: m.ad, soyad: m.soyad, il: m.il ?? "", ilce: m.ilce ?? "", eposta: m.eposta ?? "", telefon: telefonGoster(m.telefon),
        universite: m.universite ?? "", meslek: m.meslek ?? "", mezuniyetYili: String(m.mezuniyetYili) },
    } : { id: null, alanlar: { ...BOS_FORM, mezuniyetYili: String(buYil) } });
  }

  function formuKaydet() {
    if (!form) return;
    startTransition(async () => {
      const r = await mezunKaydet({ id: form.id, bilgi: form.alanlar });
      if (sonuc(r, form.id ? "Mezun bilgisi güncellendi." + (r.uyarilar.length ? ` ${r.uyarilar.join(" ")}` : "") : "Mezun eklendi." + (r.uyarilar.length ? ` ${r.uyarilar.join(" ")}` : ""))) setForm(null);
    });
  }

  function sil(m: MezunKaydi) {
    if (!window.confirm(`${m.ad} ${m.soyad} mezun listesinden silinsin mi?`)) return;
    startTransition(async () => { sonuc(await mezunSil(m.id), "Kayıt silindi."); });
  }

  function pdfOku(dosya: File) {
    setMesaj(null);
    setOnizleme(null);
    const fd = new FormData();
    fd.set("dosya", dosya);
    startTransition(async () => {
      const r = await mezunPdfOnizle(fd);
      if (dosyaRef.current) dosyaRef.current.value = "";
      if (r.error) return setMesaj({ tur: "hata", metin: r.error });
      setOnizleme({ satirlar: r.satirlar, ham: r.ham, eksik: r.eksikSutunlar });
    });
  }

  function pdfAktar() {
    if (!onizleme) return;
    startTransition(async () => {
      const r = await mezunPdfAktar(onizleme.ham);
      if (sonuc(r, `${r.eklenen} mezun eklendi, ${r.guncellenen} kayıt güncellendi${r.atlanan ? `, ${r.atlanan} hatalı satır atlandı` : ""}.`)) setOnizleme(null);
    });
  }

  function smsGonder() {
    if (!window.confirm(`${seciliTelefonlu} mezuna SMS gönderilsin mi?`)) return;
    startTransition(async () => {
      const r = await mezunSmsGonder({ mezunIdleri: [...secili], icerik: sms, zamanIso: null });
      if (r.error) return setMesaj({ tur: "hata", metin: r.error });
      setMesaj({ tur: "ok", metin: `SMS ${r.sonuc?.aliciSayisi ?? 0} mezuna gönderildi${r.sonuc?.gecersizSayisi ? `, ${r.sonuc.gecersizSayisi} kişinin telefonu yok ya da geçersiz` : ""}.` });
      setSms("");
      setSecili(new Set());
    });
  }

  const kutu = { background: BG1, border: `2px solid ${BORDER}` };
  const girdi = { background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` };
  const dugme = (ana = false) => (ana ? { background: MINT, color: MINT_ON } : { background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` });
  const hepsiSecili = gorunen.length > 0 && gorunen.every((m) => secili.has(m.id));
  const onizlemeSayisi = (d: MezunPdfOnizlemesi["durum"]) => onizleme?.satirlar.filter((s) => s.durum === d).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-3xl p-5 flex flex-col gap-3" style={kutu}>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
            <GraduationCap size={16} color={MINT} />
          </div>
          <div>
            <h1 className="text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Mezun Takip</h1>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>
              {mezunlar.length} mezun · {mezunlar.filter((m) => m.telefon).length} kişinin telefonu kayıtlı. 12. sınıftakiler ders yılı bitince (1 Temmuz) kendiliğinden eklenir; eski mezunları PDF ile toplu ekleyebilirsiniz.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 rounded-xl px-2 py-1.5" style={girdi}>
            <Search size={13} color={TEXT_MUTED} aria-hidden="true" />
            <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Ad, il, üniversite, meslek…" aria-label="Mezun ara"
              className="w-52 bg-transparent text-xs outline-none" style={{ color: TEXT }} />
          </label>
          <select value={yil} onChange={(e) => setYil(e.target.value)} aria-label="Mezuniyet yılı" className="rounded-xl px-2 py-1.5 text-xs font-bold outline-none" style={girdi}>
            <option value="">Tüm yıllar</option>
            {yillar.map((y) => <option key={y} value={y}>{y} mezunları</option>)}
          </select>
          <button type="button" onClick={() => formuAc(null)} className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold" style={dugme(true)}>
            <Plus size={13} /> Mezun Ekle
          </button>
        </div>
        {mesaj && <p className="text-xs font-semibold" style={{ color: mesaj.tur === "ok" ? MINT : BLUSH }}>{mesaj.metin}</p>}
      </div>

      {form && (
        <div className="rounded-3xl p-5 flex flex-col gap-3" style={kutu}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold" style={{ color: TEXT }}>{form.id ? "Mezun Bilgisini Düzenle" : "Yeni Mezun"}</h2>
            <button type="button" onClick={() => setForm(null)} aria-label="Kapat" style={{ color: TEXT_MUTED }}><X size={16} /></button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {([
              ["ad", "Ad"], ["soyad", "Soyad"], ["mezuniyetYili", "Mezuniyet yılı"], ["il", "İl"], ["ilce", "İlçe"], ["telefon", "Telefon"],
              ["eposta", "E-posta"], ["universite", "Üniversite (okuyorsa)"], ["meslek", "Meslek (çalışıyorsa)"],
            ] as [keyof typeof BOS_FORM, string][]).map(([k, etiket]) => (
              <label key={k} className="flex flex-col gap-1 text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>
                {etiket}
                <input value={form.alanlar[k]} inputMode={k === "mezuniyetYili" || k === "telefon" ? "numeric" : undefined}
                  onChange={(e) => { const v = e.target.value; setForm((f) => f && { ...f, alanlar: { ...f.alanlar, [k]: v } }); }}
                  className="rounded-xl px-3 py-2 text-xs font-normal outline-none" style={girdi} />
              </label>
            ))}
          </div>
          <button type="button" onClick={formuKaydet} disabled={pending} className="sfec-btn w-fit rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50" style={dugme(true)}>
            {pending ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      )}

      <div className="rounded-3xl overflow-hidden" style={kutu}>
        {gorunen.length === 0 ? (
          <p className="p-5 text-sm" style={{ color: TEXT_MUTED }}>{mezunlar.length === 0 ? "Henüz mezun kaydı yok." : "Aramaya uyan mezun yok."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" style={{ minWidth: 980 }}>
              <thead>
                <tr style={{ background: BG1_ALT, color: TEXT }}>
                  <th className="px-3 py-2 text-left">
                    <input type="checkbox" checked={hepsiSecili} aria-label="Görünenlerin hepsini seç"
                      onChange={() => setSecili((s) => { const y = new Set(s); for (const m of gorunen) { if (hepsiSecili) y.delete(m.id); else y.add(m.id); } return y; })} />
                  </th>
                  {["Ad Soyad", "Mezuniyet", "İl / İlçe", "Telefon", "E-posta", "Üniversite", "Meslek", ""].map((b, i) => (
                    <th key={i} className="px-2 py-2 text-left font-bold">{b}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gorunen.map((m) => (
                  <tr key={m.id} style={{ borderTop: `1px solid ${BORDER}`, color: TEXT }}>
                    <td className="px-3 py-1.5">
                      <input type="checkbox" checked={secili.has(m.id)} aria-label={`${m.ad} ${m.soyad} seç`}
                        onChange={() => setSecili((s) => { const y = new Set(s); if (y.has(m.id)) y.delete(m.id); else y.add(m.id); return y; })} />
                    </td>
                    <td className="px-2 py-1.5 font-semibold whitespace-nowrap">
                      {m.ad} {m.soyad}
                      <span className="ml-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: m.kaynak === "otomatik" ? SKY_BG : BG1_ALT, color: TEXT_MUTED }}>
                        {MEZUN_KAYNAK_ETIKETI[m.kaynak]}{m.okulNo ? ` · ${m.okulNo}` : ""}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">{m.mezuniyetYili}</td>
                    <td className="px-2 py-1.5">{[m.il, m.ilce].filter(Boolean).join(" / ")}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{telefonGoster(m.telefon)}</td>
                    <td className="px-2 py-1.5">{m.eposta}</td>
                    <td className="px-2 py-1.5">{m.universite}</td>
                    <td className="px-2 py-1.5">{m.meslek}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      <button type="button" onClick={() => formuAc(m)} aria-label={`${m.ad} ${m.soyad} düzenle`} className="mr-2" style={{ color: TEXT_MUTED }}><Pencil size={13} /></button>
                      <button type="button" onClick={() => sil(m)} disabled={pending} aria-label={`${m.ad} ${m.soyad} sil`} style={{ color: BLUSH }}><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-3xl p-5 flex flex-col gap-3" style={kutu}>
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: TEXT }}><MessageSquare size={14} color={MINT} /> Mezunlara SMS</h2>
        {smsDurumu === "kapali" ? (
          <p className="text-xs" style={{ color: TEXT_MUTED }}>SMS modülü kurumunuz için kapalı. Açılması için kurum yetkilinizle görüşün.</p>
        ) : smsDurumu === "baglantisiz" ? (
          <p className="text-xs" style={{ color: TEXT_MUTED }}>Kurumun SMS bağlantısı henüz kurulmamış. Kurum yöneticisi SMS bölümünden sağlayıcı bilgilerini girmeli.</p>
        ) : (
          <>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>
              Tablodan seçtiğiniz mezunlara gönderilir. Seçili: {secili.size} kişi, telefonu kayıtlı olan: {seciliTelefonlu}.
            </p>
            <textarea value={sms} onChange={(e) => setSms(e.target.value)} rows={3} maxLength={SMS_ICERIK_SINIRI} aria-label="SMS metni"
              placeholder="Örn. Sevgili mezunumuz, okulumuzun mezunlar buluşmasına davetlisiniz…" className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-y" style={girdi} />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={smsGonder} disabled={pending || seciliTelefonlu === 0 || !sms.trim()}
                className="sfec-btn rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50" style={dugme(true)}>
                {pending ? "Gönderiliyor..." : `SMS Gönder (${seciliTelefonlu})`}
              </button>
              <span className="text-[11px]" style={{ color: TEXT_MUTED }}>
                {uzunluk.karakter} karakter · yaklaşık {uzunluk.parca} SMS{uzunluk.unicode ? " (Türkçe karakter var)" : ""}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="rounded-3xl p-5 flex flex-col gap-3" style={kutu}>
        <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: TEXT }}><FileUp size={14} color={MINT} /> PDF ile Toplu Mezun Ekleme</h2>
        <p className="text-xs" style={{ color: TEXT_MUTED }}>
          Eski mezunları bir tabloya yazıp PDF olarak yükleyin. İlk satır başlık olmalı: {MEZUN_PDF_SUTUNLARI.join(", ")} (&quot;Ad Soyad&quot; tek sütun da olur).
          Şablonu indirip Excel&apos;de doldurun, &quot;Farklı Kaydet → PDF&quot; ile kaydedin. Aynı ad soyad ve mezuniyet yılındaki kayıt güncellenir, PDF&apos;teki boş alanlar mevcut bilgiyi silmez.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={sablonIndir} className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold" style={dugme()}>
            <Download size={13} /> Şablonu İndir (Excel)
          </button>
          <label className="sfec-btn inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold" style={dugme(true)}>
            <FileUp size={13} /> {pending && !onizleme ? "Okunuyor..." : "PDF Seç"}
            <input ref={dosyaRef} type="file" accept="application/pdf,.pdf" className="hidden" disabled={pending}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) pdfOku(f); }} />
          </label>
        </div>

        {onizleme && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold" style={{ color: TEXT }}>
              {onizleme.satirlar.length} satır okundu: {onizlemeSayisi("yeni")} yeni, {onizlemeSayisi("guncelle")} güncellenecek, {onizlemeSayisi("hatali")} hatalı (atlanır).
            </p>
            {onizleme.eksik.length > 0 && (
              <p className="rounded-xl px-3 py-2 text-xs" style={{ background: BUTTER_BG, color: TEXT }}>Tabloda bulunamayan sütun: {onizleme.eksik.join(", ")}.</p>
            )}
            <div className="max-h-96 overflow-auto rounded-xl" style={{ border: `1px solid ${BORDER_STRONG}` }}>
              <table className="w-full text-xs">
                <thead><tr style={{ background: BG1_ALT, color: TEXT }}>
                  {["#", "Durum", "Ad Soyad", "Yıl", "Telefon", "Üniversite / Meslek", "Not"].map((b) => <th key={b} className="px-2 py-1.5 text-left">{b}</th>)}
                </tr></thead>
                <tbody>
                  {onizleme.satirlar.map((s) => (
                    <tr key={s.sira} style={{ borderTop: `1px solid ${BORDER}`, color: TEXT }}>
                      <td className="px-2 py-1">{s.sira}</td>
                      <td className="px-2 py-1">
                        <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{
                          background: s.durum === "yeni" ? MINT_BG : s.durum === "guncelle" ? SKY_BG : BLUSH_BG, color: TEXT,
                        }}>{s.durum === "yeni" ? "Yeni" : s.durum === "guncelle" ? "Güncellenecek" : "Hatalı"}</span>
                      </td>
                      <td className="px-2 py-1">{s.bilgi ? `${s.bilgi.ad} ${s.bilgi.soyad}` : "—"}</td>
                      <td className="px-2 py-1">{s.bilgi?.mezuniyetYili ?? ""}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{telefonGoster(s.bilgi?.telefon ?? null)}</td>
                      <td className="px-2 py-1">{[s.bilgi?.universite, s.bilgi?.meslek].filter(Boolean).join(" / ")}</td>
                      <td className="px-2 py-1" style={{ color: TEXT_MUTED }}>{[...s.hatalar, ...s.uyarilar].join(" ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={pdfAktar} disabled={pending || onizlemeSayisi("yeni") + onizlemeSayisi("guncelle") === 0}
                className="sfec-btn rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50" style={dugme(true)}>
                {pending ? "Aktarılıyor..." : "Onayla ve Aktar"}
              </button>
              <button type="button" onClick={() => setOnizleme(null)} className="sfec-btn rounded-xl px-4 py-2 text-sm font-bold" style={dugme()}>Vazgeç</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
