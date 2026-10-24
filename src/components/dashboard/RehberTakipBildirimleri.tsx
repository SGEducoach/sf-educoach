"use client";

// Rehber Takip Bildirimleri (kullanıcı kararı 20.10.2026, migration 0171).
// Öğrenci takibinde rehberin bilmesi gereken durumlar burada; bildirim
// kutusuna gitmez. Rehber her kaydı "görüldü" ya da notla "ele alındı"
// diye kapatır; kayıtlar kurumun rehberleri arasında ortaktır.
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BellRing, BookX, Check, CheckCheck, Hourglass, ListTodo, RefreshCw, RotateCcw, TrendingDown, TrendingUp } from "lucide-react";
import { BG0, BG1, BG1_ALT, BLUSH, BLUSH_BG, BORDER, BORDER_STRONG, LILAC, LILAC_BG, MINT, MINT_BG, MINT_ON, PEACH, PEACH_BG, SKY, SKY_BG, TEXT, TEXT_MUTED } from "@/lib/theme";
import { TAKIP_DURUMU_ETIKET, TAKIP_TURU_ETIKET, type DersDegisimi, type TakipDurumu, type TakipTuru } from "@/lib/rehber-takip";
import type { TakipBildirimi } from "@/lib/rehber-takip-verisi";
import { takipBildirimiDurumGuncelle, takipBildirimleriniTara } from "@/app/dashboard/rehber-takip-actions";
import { sinifTakipDurumGuncelle } from "@/app/dashboard/sinif-takip-actions";
import { SINIF_TAKIP_TURLERI } from "@/lib/sinif-takip";
import { sinifSiraKarsilastir } from "@/lib/types";

const TUR_GORUNUM: Record<TakipTuru, { Ikon: typeof BellRing; renk: string; zemin: string }> = {
  net_dususu: { Ikon: TrendingDown, renk: BLUSH, zemin: BLUSH_BG },
  net_yukselisi: { Ikon: TrendingUp, renk: MINT, zemin: MINT_BG },
  ders_dususu: { Ikon: BookX, renk: PEACH, zemin: PEACH_BG },
  sessizlik: { Ikon: Hourglass, renk: SKY, zemin: SKY_BG },
  gorev_birikmesi: { Ikon: ListTodo, renk: LILAC, zemin: LILAC_BG },
};
const TUM_TURLER = Object.keys(TAKIP_TURU_ETIKET) as TakipTuru[];
const DURUM_FILTRELERI: (TakipDurumu | "tumu")[] = ["yeni", "goruldu", "ele_alindi", "tumu"];
const girdi = { background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` };
const tarihYaz = (t: string) => new Date(`${t}T12:00:00Z`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
const sayi = (n: number) => n.toLocaleString("tr-TR", { maximumFractionDigits: 1 });

function DersCipleri({ dersler }: { dersler: DersDegisimi[] }) {
  if (dersler.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {dersler.map((d) => (
        <span key={d.ders} className="rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ background: d.fark < 0 ? BLUSH_BG : MINT_BG, color: d.fark < 0 ? BLUSH : MINT }}>
          {d.ders} {d.fark > 0 ? "+" : ""}{sayi(d.fark)} ({sayi(d.once)} → {sayi(d.simdi)})
        </span>
      ))}
    </div>
  );
}

// Saat dilimi sabit: sunucu ve tarayıcı aynı metni üretsin.
const taramaZamaniYaz = (iso: string) => new Date(iso).toLocaleString("tr-TR", {
  timeZone: "Europe/Istanbul", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
});

export function RehberTakipBildirimleri({ bildirimler, hazir, ogrenciBaglantisi, duzeySiz, sonTarama = null, taramaHatasi = false, sinifOgretmeni = false }: {
  bildirimler: TakipBildirimi[]; hazir: boolean; ogrenciBaglantisi: "analiz" | "takip"; duzeySiz: boolean;
  sonTarama?: string | null; taramaHatasi?: boolean;
  /** Sınıf öğretmeni görünümü (migration 0176): kendi sınıfı, beş tür, kişiye özel durum/not. */
  sinifOgretmeni?: boolean;
}) {
  const TURLER = sinifOgretmeni ? TUM_TURLER.filter((t) => (SINIF_TAKIP_TURLERI as readonly string[]).includes(t)) : TUM_TURLER;
  const router = useRouter();
  const [durum, setDurum] = useState<TakipDurumu | "tumu">("yeni");
  const [tur, setTur] = useState<TakipTuru | "">("");
  const [sinif, setSinif] = useState("");
  const [arama, setArama] = useState("");
  const [notAcik, setNotAcik] = useState<string | null>(null);
  const [notMetni, setNotMetni] = useState("");
  const [mesaj, setMesaj] = useState<{ hata: boolean; metin: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const siniflar = useMemo(() => {
    const m = new Map<string, { seviye: string; sube: string }>();
    for (const b of bildirimler) {
      const [seviye, sube] = b.sinifAdi.split("-");
      if (seviye && sube) m.set(b.sinifAdi, { seviye, sube });
    }
    return [...m.entries()].sort((a, b) => sinifSiraKarsilastir(a[1], b[1])).map(([ad]) => ad);
  }, [bildirimler]);
  const yeniSayilari = useMemo(() => {
    const m = new Map<TakipTuru, number>();
    for (const b of bildirimler) if (b.durum === "yeni") m.set(b.tur, (m.get(b.tur) ?? 0) + 1);
    return m;
  }, [bildirimler]);
  const kucukArama = arama.toLocaleLowerCase("tr-TR");
  const liste = bildirimler.filter((b) => (durum === "tumu" || b.durum === durum) && (!tur || b.tur === tur)
    && (!sinif || b.sinifAdi === sinif) && b.ogrenciAd.toLocaleLowerCase("tr-TR").includes(kucukArama));
  const yeniListe = liste.filter((b) => b.durum === "yeni");

  function guncelle(idler: string[], yeniDurum: TakipDurumu, not?: string) {
    setMesaj(null);
    startTransition(async () => {
      const r = sinifOgretmeni ? await sinifTakipDurumGuncelle(idler, yeniDurum, not) : await takipBildirimiDurumGuncelle(idler, yeniDurum, not);
      if (r.error) { setMesaj({ hata: true, metin: r.error }); return; }
      setNotAcik(null); setNotMetni("");
      router.refresh();
    });
  }
  function tara() {
    setMesaj(null);
    startTransition(async () => {
      const r = await takipBildirimleriniTara();
      setMesaj(r.error ? { hata: true, metin: r.error } : { hata: false, metin: r.eklenen ? `${r.eklenen} yeni bildirim eklendi.` : "Yeni bir durum yok." });
      router.refresh();
    });
  }
  const ogrenciHref = (b: TakipBildirimi) => ogrenciBaglantisi === "takip"
    ? `/dashboard/ogrenci-takibi?ogrenci=${b.studentId}`
    : `/dashboard?bolum=ozet&sinif=${b.sinifId ?? ""}&ogrenci=${b.studentId}`;

  return (
    <section className="sfec-section flex flex-col gap-4">
      <div className="sfec-fade flex flex-wrap items-start gap-3 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: MINT_BG }}>
          <BellRing size={18} color={MINT} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Takip Bildirimleri</h1>
          <p className="text-xs" style={{ color: TEXT_MUTED }}>
            {sinifOgretmeni
              ? "Sınıfınızdaki öğrenciler için ani net düşüşü ve yükselişi, ders bazında düşüş, 14 gün ve üzeri sessizlik ve biriken görevler burada toplanır. \"Görüldü\" ve notlarınız yalnız size aittir; rehberlik servisinin kayıtlarını ve notlarını etkilemez, görmezsiniz. Her sabah otomatik taranır."
              : "Ani net düşüşü ve yükselişi, ders bazında düşüş, 14 gün ve üzeri sessizlik ve biriken görevler burada toplanır. Bu bildirimler mesaj kutusuna gitmez; her sabah otomatik taranır."}
          </p>
          {hazir && !duzeySiz && (
            <p className="mt-1 text-[11px] font-semibold" style={{ color: taramaHatasi ? BLUSH : TEXT_MUTED }}>
              {taramaHatasi
                ? "Açılış taraması tamamlanamadı; liste son kayıtlı taramaya göre. \"Şimdi Tara\" ile yeniden deneyin."
                : sonTarama ? `Son tarama: ${taramaZamaniYaz(sonTarama)}` : "Henüz tarama kaydı yok."}
            </p>
          )}
        </div>
        <button type="button" onClick={tara} disabled={pending || !hazir || duzeySiz}
          className="sfec-btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold disabled:opacity-50" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
          <RefreshCw size={13} aria-hidden="true" className={pending ? "animate-spin" : undefined} /> Şimdi Tara
        </button>
        {mesaj && <p className="w-full text-xs font-semibold" style={{ color: mesaj.hata ? BLUSH : MINT }}>{mesaj.metin}</p>}
      </div>

      {!hazir ? (
        <p className="rounded-3xl p-6 text-center text-sm" style={{ background: BG1, border: `2px solid ${BORDER}`, color: BLUSH }}>{sinifOgretmeni ? "Sınıf takip bildirimleri için veritabanı güncellemesi (migration 0176) henüz uygulanmamış." : "Takip bildirimleri için veritabanı güncellemesi (migration 0171) henüz uygulanmamış."}</p>
      ) : duzeySiz ? (
        <p className="rounded-3xl p-6 text-center text-sm" style={{ background: BG1, border: `2px solid ${BORDER}`, color: TEXT_MUTED }}>Henüz sorumlu olduğunuz sınıf düzeyi atanmadı.</p>
      ) : (<>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
          {TURLER.map((t) => {
            const { Ikon, renk, zemin } = TUR_GORUNUM[t];
            const secili = tur === t;
            return (
              <button key={t} type="button" onClick={() => setTur(secili ? "" : t)} aria-pressed={secili}
                className="sfec-btn flex items-center gap-2.5 rounded-2xl p-3 text-left"
                style={{ background: secili ? zemin : BG1, border: `2px solid ${secili ? renk : BORDER}` }}>
                <Ikon size={17} color={renk} aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-lg font-black leading-none" style={{ color: TEXT }}>{yeniSayilari.get(t) ?? 0}</span>
                  <span className="block text-[11px] font-semibold" style={{ color: TEXT_MUTED }}>{TAKIP_TURU_ETIKET[t]}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-3xl p-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="inline-flex flex-wrap gap-1 rounded-2xl p-1" style={{ background: BG0 }}>
            {DURUM_FILTRELERI.map((d) => (
              <button key={d} type="button" onClick={() => setDurum(d)} aria-pressed={durum === d}
                className="sfec-btn rounded-xl px-3 py-1.5 text-xs font-bold"
                style={durum === d ? { background: MINT, color: MINT_ON } : { color: TEXT_MUTED }}>
                {d === "tumu" ? "Tümü" : TAKIP_DURUMU_ETIKET[d]}
              </button>
            ))}
          </div>
          {siniflar.length > 1 && (
            <select value={sinif} onChange={(e) => setSinif(e.target.value)} aria-label="Sınıf" className="rounded-xl px-3 py-1.5 text-xs font-semibold outline-none" style={girdi}>
              <option value="">Tüm sınıflar</option>
              {siniflar.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Öğrenci ara…" aria-label="Öğrenci ara"
            className="min-w-[140px] flex-1 rounded-xl px-3 py-1.5 text-xs outline-none" style={girdi} />
          {yeniListe.length > 1 && (
            <button type="button" disabled={pending}
              onClick={() => { if (window.confirm(`Listedeki ${yeniListe.length} yeni bildirim "Görüldü" olarak işaretlensin mi?`)) guncelle(yeniListe.map((b) => b.id), "goruldu"); }}
              className="sfec-btn inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
              <CheckCheck size={13} aria-hidden="true" /> Listedekileri Görüldü Yap
            </button>
          )}
        </div>

        {liste.length === 0 ? (
          <p className="rounded-3xl p-6 text-center text-sm" style={{ background: BG1, border: `2px solid ${BORDER}`, color: TEXT_MUTED }}>
            {durum === "yeni" ? "Yeni bildirim yok." : "Bu süzgece uyan bildirim yok."}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {liste.map((b) => {
              const { Ikon, renk, zemin } = TUR_GORUNUM[b.tur];
              const dersler = Array.isArray(b.ayrinti.dersler) ? (b.ayrinti.dersler as DersDegisimi[]) : [];
              return (
                <li key={b.id} className="sfec-fade flex flex-wrap items-start gap-3 rounded-2xl p-3.5"
                  style={{ background: BG1, border: `2px solid ${b.durum === "yeni" ? renk : BORDER}`, opacity: b.durum === "yeni" ? 1 : 0.86 }}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: zemin }}>
                    <Ikon size={16} color={renk} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <Link href={ogrenciHref(b)} className="text-sm font-bold hover:underline" style={{ color: TEXT }}>{b.ogrenciAd}</Link>
                      <span className="text-xs" style={{ color: TEXT_MUTED }}>{b.sinifAdi} · {tarihYaz(b.olayTarihi)}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: zemin, color: renk }}>{TAKIP_TURU_ETIKET[b.tur]}</span>
                      {b.durum !== "yeni" && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: BG1_ALT, color: TEXT_MUTED }}>{TAKIP_DURUMU_ETIKET[b.durum]}{!sinifOgretmeni && b.kapatanAdi ? ` · ${b.kapatanAdi}` : ""}</span>}
                    </div>
                    <p className="mt-0.5 text-[13px]" style={{ color: TEXT }}>{b.baslik}</p>
                    <DersCipleri dersler={dersler} />
                    {b.notMetni && <p className="mt-1.5 rounded-xl px-3 py-2 text-xs" style={{ background: BG1_ALT, color: TEXT }}>Not: {b.notMetni}</p>}
                    {notAcik === b.id && (
                      <div className="mt-2 flex flex-col gap-2">
                        <textarea value={notMetni} onChange={(e) => setNotMetni(e.target.value)} rows={2} maxLength={1000} autoFocus
                          placeholder="Ne yapıldı? Örn. Öğrenciyle görüşüldü, veliye bilgi verildi."
                          className="rounded-xl px-3 py-2 text-xs outline-none" style={girdi} />
                        <div className="flex gap-2">
                          <button type="button" disabled={pending} onClick={() => guncelle([b.id], "ele_alindi", notMetni)}
                            className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>Kaydet</button>
                          <button type="button" onClick={() => { setNotAcik(null); setNotMetni(""); }} className="sfec-btn rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: TEXT_MUTED }}>Vazgeç</button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {b.durum === "yeni" && (
                      <button type="button" disabled={pending} onClick={() => guncelle([b.id], "goruldu")}
                        className="sfec-btn inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-50" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                        <Check size={12} aria-hidden="true" /> Görüldü
                      </button>
                    )}
                    {b.durum !== "ele_alindi" && notAcik !== b.id && (
                      <button type="button" disabled={pending} onClick={() => { setNotAcik(b.id); setNotMetni(b.notMetni ?? ""); }}
                        className="sfec-btn inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-50" style={{ background: MINT, color: MINT_ON }}>
                        <CheckCheck size={12} aria-hidden="true" /> Ele Alındı
                      </button>
                    )}
                    {b.durum !== "yeni" && (
                      <button type="button" disabled={pending} onClick={() => guncelle([b.id], "yeni")} title="Yeniye geri al" aria-label="Yeniye geri al"
                        className="sfec-btn flex h-8 w-8 items-center justify-center rounded-full disabled:opacity-50" style={{ border: `2px solid ${BORDER_STRONG}` }}>
                        <RotateCcw size={13} color={TEXT_MUTED} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </>)}
    </section>
  );
}
