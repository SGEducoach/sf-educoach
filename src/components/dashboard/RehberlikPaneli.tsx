"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, HeartHandshake, Search, Send, Square, SquareCheckBig } from "lucide-react";
import { rehberMesajGonder } from "@/app/dashboard/actions";
import type { DuyuruAliciTuru } from "@/lib/push-send";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

const MIN_UZUNLUK = 10;
const MAKS_UZUNLUK = 500;

export interface RehberlikOgrencisi {
  id: string;
  ad: string;
  sinifId: string | null;
  sinifAdi: string;
}

// Rehberlik servisi (2026-08-26 kullanıcı isteği) — Rehber Öğretmen
// branşındaki bir öğretmen, sınıf öğretmenliği sınırı olmadan okulun
// TÜM öğrencilerinden istediğini (tek tek veya toplu — sınıf/okul
// genelinde "tümünü seç" ile) seçip mesaj gönderebiliyor. Mesaj sabit
// "Rehberlik Servisinden Mesajınız Var" başlığıyla gidiyor (bkz.
// rehberMesajGonder, REHBERLIK_DUYURU_BASLIGI) — alıcı bunun sınıf
// öğretmeninden değil okul rehberlik servisinden geldiğini anlıyor.
export function RehberlikPaneli({ ogrenciler }: { ogrenciler: RehberlikOgrencisi[] }) {
  const [arama, setArama] = useState("");
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [mesaj, setMesaj] = useState("");
  const [aliciTuru, setAliciTuru] = useState<DuyuruAliciTuru>("hepsi");
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [onayAcik, setOnayAcik] = useState(false);
  const [pending, startTransition] = useTransition();

  const siniflar = useMemo(() => [...new Set(ogrenciler.map((o) => o.sinifAdi))].sort((a, b) => a.localeCompare(b, "tr")), [ogrenciler]);

  const gosterilenler = useMemo(() => {
    const terim = arama.trim().toLocaleLowerCase("tr-TR");
    if (!terim) return ogrenciler;
    return ogrenciler.filter((o) => o.ad.toLocaleLowerCase("tr-TR").includes(terim));
  }, [arama, ogrenciler]);

  const gosterilenlerBySinif = useMemo(() => {
    const harita = new Map<string, RehberlikOgrencisi[]>();
    for (const sinif of siniflar) harita.set(sinif, []);
    for (const o of gosterilenler) (harita.get(o.sinifAdi) ?? harita.set(o.sinifAdi, []).get(o.sinifAdi)!).push(o);
    return harita;
  }, [gosterilenler, siniflar]);

  function toggleOgrenci(id: string) {
    setSecili((s) => {
      const yeni = new Set(s);
      if (yeni.has(id)) yeni.delete(id); else yeni.add(id);
      return yeni;
    });
  }

  function toggleSinif(sinifAdi: string) {
    const buSinifIdleri = (gosterilenlerBySinif.get(sinifAdi) ?? []).map((o) => o.id);
    const hepsiSecili = buSinifIdleri.every((id) => secili.has(id));
    setSecili((s) => {
      const yeni = new Set(s);
      for (const id of buSinifIdleri) { if (hepsiSecili) yeni.delete(id); else yeni.add(id); }
      return yeni;
    });
  }

  function tumunuSecToggle() {
    const tumIdler = gosterilenler.map((o) => o.id);
    const hepsiSecili = tumIdler.length > 0 && tumIdler.every((id) => secili.has(id));
    setSecili(hepsiSecili ? new Set() : new Set(tumIdler));
  }

  function gonderTikla(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasari(null);
    const temiz = mesaj.trim();
    if (secili.size === 0) return setHata("En az bir öğrenci seçin.");
    if (!temiz) return setHata("Mesaj boş olamaz.");
    if (temiz.length < MIN_UZUNLUK) return setHata(`Mesaj en az ${MIN_UZUNLUK} karakter olmalıdır.`);
    setOnayAcik(true);
  }

  function onaylaVeGonder() {
    const temiz = mesaj.trim();
    setOnayAcik(false);
    startTransition(async () => {
      const res = await rehberMesajGonder([...secili], temiz, aliciTuru);
      if (res.error) return setHata(res.error);
      setBasari(`Gönderildi — ${res.ogrenciSayisi} öğrenci, ${res.veliSayisi} veliye ulaştı. Bugün için kalan hakkınız: ${res.kalanGunlukHak}.`);
      setMesaj("");
      setSecili(new Set());
    });
  }

  const tumuSeciliMi = gosterilenler.length > 0 && gosterilenler.every((o) => secili.has(o.id));

  return (
    <div className="flex flex-col gap-5">
      <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: MINT_BG }}>
            <HeartHandshake size={13} color={MINT} />
          </div>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Rehberlik — Mesaj Gönder</span>
        </div>
        <p style={{ color: TEXT_MUTED }} className="text-xs mb-4">
          Okulunuzdaki tüm öğrencilerden istediğinizi seçip (tek tek veya toplu) mesaj gönderebilirsiniz. Alıcılar mesajı &quot;Rehberlik Servisinden Mesajınız Var&quot; başlığıyla görür.
        </p>

        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} color={TEXT_MUTED} className="absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Öğrenci adı ile ara..."
              className="text-sm pl-9 pr-3 py-2 rounded-xl outline-none w-full" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          </div>
          <button type="button" onClick={tumunuSecToggle}
            className="sfec-btn flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-full"
            style={{ background: tumuSeciliMi ? MINT : "rgba(255,255,255,0.06)", color: tumuSeciliMi ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            {tumuSeciliMi ? <SquareCheckBig size={13} /> : <Square size={13} />} {tumuSeciliMi ? "Seçimi kaldır" : `Görünenlerin tümünü seç (${gosterilenler.length})`}
          </button>
        </div>

        <p style={{ color: TEXT_MUTED }} className="text-xs mb-3"><strong style={{ color: TEXT }}>{secili.size}</strong> öğrenci seçili</p>

        <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
          {siniflar.filter((s) => (gosterilenlerBySinif.get(s) ?? []).length > 0).map((sinifAdi) => {
            const ogrencilerBuSinif = gosterilenlerBySinif.get(sinifAdi) ?? [];
            const sinifTumuSecili = ogrencilerBuSinif.every((o) => secili.has(o.id));
            return (
              <div key={sinifAdi} className="rounded-2xl p-3" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
                <button type="button" onClick={() => toggleSinif(sinifAdi)} className="sfec-btn flex items-center gap-1.5 mb-2 text-xs font-bold" style={{ color: TEXT }}>
                  {sinifTumuSecili ? <SquareCheckBig size={13} color={MINT} /> : <Square size={13} color={TEXT_MUTED} />} {sinifAdi} <span style={{ color: TEXT_MUTED }} className="font-normal">({ogrencilerBuSinif.length})</span>
                </button>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {ogrencilerBuSinif.map((o) => {
                    const isSecili = secili.has(o.id);
                    return (
                      <button key={o.id} type="button" onClick={() => toggleOgrenci(o.id)}
                        className="sfec-btn flex items-center gap-1.5 text-left rounded-lg px-2 py-1.5 text-xs"
                        style={{ background: isSecili ? MINT_BG : "transparent", color: isSecili ? TEXT : TEXT_MUTED }}>
                        {isSecili ? <Check size={12} color={MINT} className="shrink-0" /> : <Square size={12} className="shrink-0" />} {o.ad}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {gosterilenler.length === 0 && <p style={{ color: TEXT_MUTED }} className="text-sm py-4 text-center">Bu aramaya uyan öğrenci yok.</p>}
        </div>
      </div>

      <form onSubmit={gonderTikla} className="sfec-fade rounded-3xl p-5 flex flex-col gap-2" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Kimlere gönderilsin</span>
          <select value={aliciTuru} onChange={(e) => setAliciTuru(e.target.value as DuyuruAliciTuru)} className="text-sm px-3 py-1.5 rounded-xl outline-none w-full sm:w-64" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
            <option value="hepsi">Hepsi - öğrenci ve veliler</option>
            <option value="ogrenci">Sadece öğrenciler</option>
            <option value="veli">Sadece veliler</option>
          </select>
        </label>
        <textarea value={mesaj} onChange={(e) => setMesaj(e.target.value.slice(0, MAKS_UZUNLUK))} rows={3}
          placeholder="Örn. Merhaba, seninle görüşmek istiyorum. Uygun olduğunda beni ziyaret edebilir misin?"
          className="text-sm px-3 py-2 rounded-xl outline-none resize-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span style={{ color: mesaj.trim().length > 0 && mesaj.trim().length < MIN_UZUNLUK ? BLUSH : TEXT_MUTED }} className="text-[10px]">En az {MIN_UZUNLUK} · {mesaj.length}/{MAKS_UZUNLUK}</span>
          <button type="submit" disabled={pending || mesaj.trim().length < MIN_UZUNLUK || secili.size === 0}
            className="sfec-btn flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full disabled:opacity-50"
            style={{ background: MINT, color: MINT_ON }}>
            <Send size={13} /> {pending ? "Gönderiliyor..." : `Mesaj gönder (${secili.size})`}
          </button>
        </div>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        {basari && <div style={{ color: MINT }} className="text-xs font-semibold">{basari}</div>}
      </form>

      {onayAcik && (
        <div className="fixed inset-0 z-[450] flex items-center justify-center p-4" style={{ background: "rgba(24,48,47,0.55)", backdropFilter: "blur(4px)" }} onClick={() => setOnayAcik(false)}>
          <div role="dialog" aria-modal="true" className="relative w-full max-w-sm rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Mesaj gönderilsin mi?</h2>
            <p style={{ color: TEXT_MUTED }} className="mt-1 text-xs">{secili.size} öğrenciye ({aliciTuru === "hepsi" ? "kendileri ve velileri" : aliciTuru === "ogrenci" ? "sadece kendileri" : "sadece velileri"}) gönderilecek.</p>
            <div className="my-4 max-h-40 overflow-y-auto rounded-2xl p-3 text-sm leading-relaxed" style={{ color: TEXT, background: BG0, border: `2px solid ${BORDER_STRONG}` }}>{mesaj.trim()}</div>
            <p style={{ color: BLUSH }} className="mb-4 text-[11px] font-semibold">Gönderilen mesaj alıcıların mesaj kutusuna eklenir ve geri alınamaz.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setOnayAcik(false)} className="sfec-btn flex-1 rounded-xl py-2.5 text-sm font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>Vazgeç</button>
              <button type="button" onClick={onaylaVeGonder} className="sfec-btn flex-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>Onayla ve gönder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
