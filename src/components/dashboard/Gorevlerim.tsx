"use client";

import { useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, BookOpen, PenLine, ClipboardList, X, Clock, Plus, CalendarDays, Rows3 } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, PEACH, PEACH_BG, BLUSH, BLUSH_BG, TEXT, TEXT_MUTED } from "@/lib/theme";
import { GOREV_TURU_ETIKET, GOREV_DURUMU_ETIKET } from "@/lib/types";
import type { GorevTuru, GorevDurumu, AytAlan } from "@/lib/types";
import { KonuCalismaForm, SoruCozumuForm, DenemeForm } from "@/components/dashboard/OgrenciVeriGirisi";
import { planEkle } from "@/app/dashboard/gorev-actions";
import { bugununTarihiTR, tarihEkle } from "@/lib/tarih";
import { saatiDakikayaCevir } from "@/lib/saat-araligi";

export interface GorevSatiri {
  atamaId: string;
  tur: GorevTuru;
  ders: string;
  konu: string | null;
  hedefSoruSayisi: number | null;
  hedefDakika: number | null;
  tarih: string;
  sonTarih: string;
  baslangicSaat: string | null;
  bitisSaat: string | null;
  aciklama: string | null;
  durum: GorevDurumu;
}

const TUR_IKON: Record<GorevTuru, typeof BookOpen> = { konu: BookOpen, soru: PenLine, deneme: ClipboardList };
const DURUM_RENK: Record<GorevDurumu, { bg: string; renk: string }> = {
  bekliyor: { bg: PEACH_BG, renk: PEACH },
  tamamlandi: { bg: MINT_BG, renk: MINT },
  tamamlanmadi: { bg: BLUSH_BG, renk: BLUSH },
};
const SAAT_YUKSEKLIGI = 36;
const GUN_YUKSEKLIGI = SAAT_YUKSEKLIGI * 24;
const CIZELGE_BASLANGIC_DAKIKA = 5 * 60;

function cizelgedekiDakika(saat: string | null) {
  const dakika = saatiDakikayaCevir(saat);
  if (dakika === null) return null;
  return dakika >= CIZELGE_BASLANGIC_DAKIKA
    ? dakika - CIZELGE_BASLANGIC_DAKIKA
    : dakika + (24 * 60 - CIZELGE_BASLANGIC_DAKIKA);
}

function gunAdi(tarihISO: string) {
  return new Date(`${tarihISO}T00:00:00`).toLocaleDateString("tr-TR", { weekday: "short" });
}
function gunSayisi(tarihISO: string) {
  return new Date(`${tarihISO}T00:00:00`).getDate();
}

// Haftalık görev takvimi — mobilde tek günlük kart listesi + üstte yatay
// kaydırılabilir gün şeridi (7 sütunlu masaüstü tablo yerine, dar ekranda da
// aynı, tek bir düzen). Görev tamamlama, AYRI bir form değil — ilgili mevcut
// veri giriş formu (Konu/Soru/Deneme) bir modal içinde açılıp gorevAtamaId
// ile ilişkilendiriliyor; böylece rozet/analiz sistemleri görev kaynaklı
// girişleri de otomatik sayıyor (bkz. yenilikler_1.txt §5, Faz 3 planı).
export function Gorevlerim({ gorevler, haftaBaslangic, aytAlan, dokuzOnMu, dersListesi, konuOnerileri, konuSayaclari }: {
  gorevler: GorevSatiri[];
  haftaBaslangic: string;
  aytAlan: AytAlan;
  dokuzOnMu: boolean;
  dersListesi: string[];
  konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
  konuSayaclari?: Record<string, { tamamlanan: number; toplam: number }>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const gunler = Array.from({ length: 7 }, (_, i) => tarihEkle(haftaBaslangic, i));
  const bugun = bugununTarihiTR();
  const [seciliGun, setSeciliGun] = useState(() => (gunler.includes(bugun) ? bugun : gunler[0]));
  // Hafta değiştirilince (önceki/sonraki hafta okları) bu bileşen YENİDEN
  // MOUNT olmuyor — sadece haftaBaslangic prop'u değişiyor. useState'in
  // ilk değeri sadece ilk render'da hesaplandığı için, prop değiştiğinde
  // seciliGun eski haftadaki günde donuk kalıyordu ("hâlâ Cumartesi"
  // hatası). React'in önerdiği "render sırasında state'i sıfırla" deseni:
  const [sonHaftaBaslangic, setSonHaftaBaslangic] = useState(haftaBaslangic);
  if (haftaBaslangic !== sonHaftaBaslangic) {
    setSonHaftaBaslangic(haftaBaslangic);
    setSeciliGun(gunler.includes(bugun) ? bugun : gunler[0]);
  }
  const [acikGorev, setAcikGorev] = useState<GorevSatiri | null>(null);
  const [planModalAcik, setPlanModalAcik] = useState(false);
  const [haftalikGorunum, setHaftalikGorunum] = useState(false);

  const gunlukGorevSayisi = new Map<string, number>();
  for (const g of gorevler) gunlukGorevSayisi.set(g.tarih, (gunlukGorevSayisi.get(g.tarih) ?? 0) + 1);

  function haftaGuncelle(haftaISO: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("hafta", haftaISO);
    router.push(`${pathname}?${params.toString()}`);
  }

  function haftaDegistir(yon: -1 | 1) {
    haftaGuncelle(tarihEkle(haftaBaslangic, yon * 7));
  }

  const gunGorevleri = gorevler
    .filter((g) => g.tarih === seciliGun)
    .sort((a, b) => (a.baslangicSaat ?? "99:99").localeCompare(b.baslangicSaat ?? "99:99"));

  return (
    <div className="sfec-fade rounded-3xl p-5 print:hidden" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Görevlerim</span>
          <button type="button" onClick={() => setHaftalikGorunum((acik) => !acik)}
            aria-pressed={haftalikGorunum}
            className="sfec-btn inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
            style={{ background: haftalikGorunum ? MINT : BG1_ALT, color: haftalikGorunum ? MINT_ON : TEXT_MUTED, border: `2px solid ${haftalikGorunum ? MINT : BORDER_STRONG}` }}>
            {haftalikGorunum ? <Rows3 size={13} /> : <CalendarDays size={13} />}
            {haftalikGorunum ? "Günlük göster" : "Haftalık göster"}
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => haftaDegistir(-1)} title="Önceki hafta"
            className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
            <ChevronLeft size={14} color={TEXT_MUTED} />
          </button>
          <button type="button" onClick={() => { haftaGuncelle(bugun); setSeciliGun(bugun); }}
            className="sfec-btn text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: BG1_ALT, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
            Bugün
          </button>
          <button type="button" onClick={() => haftaDegistir(1)} title="Sonraki hafta"
            className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
            <ChevronRight size={14} color={TEXT_MUTED} />
          </button>
        </div>
      </div>

      {!haftalikGorunum && (
        <div className="grid grid-cols-7 gap-1.5 mb-4">
          {gunler.map((g) => {
            const secili = g === seciliGun;
            const sayisi = gunlukGorevSayisi.get(g) ?? 0;
            return (
              <button key={g} type="button" onClick={() => setSeciliGun(g)}
                className="sfec-btn flex flex-col items-center gap-0.5 rounded-2xl px-2 py-2"
                style={{
                  background: secili ? MINT : g === bugun ? MINT_BG : BG1_ALT,
                  color: secili ? MINT_ON : TEXT,
                  border: `2px solid ${secili ? MINT : BORDER_STRONG}`,
                }}>
                <span className="text-[10px] font-semibold uppercase">{gunAdi(g)}</span>
                <span className="text-sm font-bold">{gunSayisi(g)}</span>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: sayisi > 0 ? (secili ? MINT_ON : PEACH) : "transparent" }} />
              </button>
            );
          })}
        </div>
      )}

      {haftalikGorunum ? (
        <HaftalikZamanPlani
          gunler={gunler}
          gorevler={gorevler}
          bugun={bugun}
          onGunSec={(gun) => { setSeciliGun(gun); setPlanModalAcik(true); }}
          onGorevAc={(gorev) => setAcikGorev(gorev)}
        />
      ) : gunGorevleri.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-4 text-center">Bu gün için görev yok.</p>
      ) : (
        <div className="flex flex-col gap-2.5 mb-2.5">
          {gunGorevleri.map((g) => {
            const Icon = TUR_IKON[g.tur];
            const renk = DURUM_RENK[g.durum];
            const hedefMetni = g.tur === "soru" && g.hedefSoruSayisi ? `${g.hedefSoruSayisi} soru`
              : g.tur === "konu" && g.hedefDakika ? `${g.hedefDakika} dk`
              : null;
            return (
              <div key={g.atamaId} className="rounded-2xl p-3.5 flex items-start justify-between gap-3 flex-wrap" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: renk.bg }}>
                    <Icon size={14} color={renk.renk} />
                  </div>
                  <div className="min-w-0">
                    <div style={{ color: TEXT }} className="text-sm font-bold">{GOREV_TURU_ETIKET[g.tur]} · {g.ders}</div>
                    {g.konu && <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">{g.konu}</div>}
                    <div className="flex items-center gap-2 flex-wrap mt-1">
                      {hedefMetni && <span style={{ color: TEXT_MUTED }} className="text-[11px]">🎯 {hedefMetni}</span>}
                      {g.baslangicSaat && (
                        <span style={{ color: TEXT_MUTED }} className="text-[11px] flex items-center gap-0.5">
                          <Clock size={10} /> {g.baslangicSaat.slice(0, 5)}{g.bitisSaat ? `–${g.bitisSaat.slice(0, 5)}` : ""}
                        </span>
                      )}
                    </div>
                    {g.aciklama && <div style={{ color: TEXT_MUTED }} className="text-[11px] mt-1 italic">{g.aciklama}</div>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: renk.bg, color: renk.renk }}>{GOREV_DURUMU_ETIKET[g.durum]}</span>
                  {g.durum === "bekliyor" && (
                    <button type="button" onClick={() => setAcikGorev(g)}
                      className="sfec-btn text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: MINT, color: MINT_ON }}>
                      Tamamla
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button type="button" onClick={() => setPlanModalAcik(true)}
        className="sfec-btn w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-2xl"
        style={{ background: "transparent", color: TEXT_MUTED, border: `2px dashed ${BORDER_STRONG}` }}>
        <Plus size={14} /> Plan ekle
      </button>

      {acikGorev && createPortal(
        <GorevTamamlamaModal
          gorev={acikGorev}
          aytAlan={aytAlan}
          dokuzOnMu={dokuzOnMu}
          dersListesi={dersListesi}
          konuOnerileri={konuOnerileri}
          konuSayaclari={konuSayaclari}
          onKapat={() => setAcikGorev(null)}
        />,
        document.body,
      )}

      {planModalAcik && createPortal(
        <PlanEkleModal
          tarih={seciliGun}
          dersListesi={dersListesi}
          konuOnerileri={konuOnerileri}
          onKapat={() => setPlanModalAcik(false)}
        />,
        document.body,
      )}
    </div>
  );
}

function HaftalikZamanPlani({ gunler, gorevler, bugun, onGunSec, onGorevAc }: {
  gunler: string[];
  gorevler: GorevSatiri[];
  bugun: string;
  onGunSec: (gun: string) => void;
  onGorevAc: (gorev: GorevSatiri) => void;
}) {
  return (
    <div className="mb-3 overflow-hidden rounded-3xl" style={{ background: BG0, border: `2px solid ${BORDER}`, boxShadow: `inset 0 0 0 1px ${BORDER_STRONG}` }}>
      <div className="overflow-x-auto overscroll-x-contain">
        <div className="min-w-[70rem] p-2.5">
          <div className="ml-10 grid grid-cols-7 gap-2 mb-2">
            {gunler.map((gun, gunIndex) => (
              <button key={gun} type="button" onClick={() => onGunSec(gun)}
                title="Bu güne plan ekle"
                className="sfec-btn rounded-2xl px-2 py-2 text-center"
                style={{
                  color: TEXT,
                  background: gunIndex % 2 === 0 ? MINT_BG : PEACH_BG,
                  border: `2px solid ${gun === bugun ? MINT : BORDER_STRONG}`,
                }}>
                <span className="block text-[10px] font-bold uppercase tracking-wide">{gunAdi(gun)}</span>
                <span className="block text-sm font-extrabold">{gunSayisi(gun)}</span>
              </button>
            ))}
          </div>

          <div className="flex" aria-label="Haftalık 05.00–05.00 çalışma planı">
            <div className="relative w-10 shrink-0" style={{ height: GUN_YUKSEKLIGI }} aria-hidden="true">
              <span className="absolute left-0 top-0 -translate-y-1/2 text-[9px] font-bold" style={{ color: TEXT_MUTED }}>05.00</span>
              <span className="absolute bottom-0 left-0 translate-y-1/2 text-[9px] font-bold" style={{ color: TEXT_MUTED }}>05.00</span>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-7 gap-2">
              {gunler.map((gun, gunIndex) => {
                const gununGorevleri = gorevler
                  .filter((g) => g.tarih === gun)
                  .sort((a, b) => (a.baslangicSaat ?? "99:99").localeCompare(b.baslangicSaat ?? "99:99"));
                const zamanliGorevler = gununGorevleri.filter((g) => cizelgedekiDakika(g.baslangicSaat) !== null && saatiDakikayaCevir(g.bitisSaat) !== null);
                const sutunArkaPlan = gunIndex % 2 === 0 ? MINT_BG : PEACH_BG;
                const sutunVurgu = gunIndex % 2 === 0 ? MINT : PEACH;
                const sutunDolu = zamanliGorevler.length > 0;

                return (
                  <div key={gun} className="relative overflow-hidden rounded-2xl"
                    style={{
                      height: GUN_YUKSEKLIGI,
                      background: sutunDolu ? sutunArkaPlan : "transparent",
                      border: `1px solid ${sutunDolu ? BORDER_STRONG : "transparent"}`,
                    }}
                    aria-label={`${gunAdi(gun)} günü 05.00–05.00 plan alanı`}>
                    {zamanliGorevler.map((g) => {
                      const baslangic = cizelgedekiDakika(g.baslangicSaat) ?? 0;
                      const baslangicSaatDakika = saatiDakikayaCevir(g.baslangicSaat) ?? 0;
                      const bitisSaatDakika = saatiDakikayaCevir(g.bitisSaat) ?? baslangicSaatDakika;
                      const sure = bitisSaatDakika > baslangicSaatDakika
                        ? bitisSaatDakika - baslangicSaatDakika
                        : bitisSaatDakika + 24 * 60 - baslangicSaatDakika;
                      const kalanYukseklik = GUN_YUKSEKLIGI - (baslangic / 60) * SAAT_YUKSEKLIGI;
                      const yukseklik = Math.min(Math.max((sure / 60) * SAAT_YUKSEKLIGI, 30), Math.max(kalanYukseklik, 1));
                      const Icon = TUR_IKON[g.tur];
                      const durumRengi = DURUM_RENK[g.durum];
                      return (
                        <button key={g.atamaId} type="button" disabled={g.durum !== "bekliyor"} onClick={() => onGorevAc(g)}
                          title={`${g.baslangicSaat?.slice(0, 5)}–${g.bitisSaat?.slice(0, 5)} ${GOREV_TURU_ETIKET[g.tur]} · ${g.ders}`}
                          className="sfec-btn absolute left-1.5 right-1.5 overflow-hidden rounded-xl px-2 py-1.5 text-left disabled:cursor-default"
                          style={{
                            top: (baslangic / 60) * SAAT_YUKSEKLIGI,
                            height: yukseklik,
                            background: BG1,
                            color: TEXT,
                            border: `2px solid ${sutunVurgu}`,
                            boxShadow: `0 4px 12px ${BORDER}`,
                          }}>
                          <span className="flex items-center gap-1 text-[9px] font-extrabold leading-tight" style={{ color: sutunVurgu }}>
                            <Icon size={10} /> {g.baslangicSaat?.slice(0, 5)}–{g.bitisSaat?.slice(0, 5)}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] font-bold leading-tight">{GOREV_TURU_ETIKET[g.tur]} · {g.ders}</span>
                          {yukseklik >= 48 && g.konu && <span className="mt-0.5 block truncate text-[9px] leading-tight" style={{ color: TEXT_MUTED }}>{g.konu}</span>}
                          {yukseklik >= 65 && <span className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[8px] font-bold" style={{ background: durumRengi.bg, color: durumRengi.renk }}>{GOREV_DURUMU_ETIKET[g.durum]}</span>}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <p className="px-4 pb-3 pt-1 text-[10px]" style={{ color: TEXT_MUTED }}>
        Her gün 05.00’dan ertesi gün 05.00’a kadar gösterilir. Saati belirtilmeyen görevler günlük görünümde yer alır.
      </p>
    </div>
  );
}

function GorevTamamlamaModal({ gorev, aytAlan, dokuzOnMu, dersListesi, konuOnerileri, konuSayaclari, onKapat }: {
  gorev: GorevSatiri;
  aytAlan: AytAlan;
  dokuzOnMu: boolean;
  dersListesi: string[];
  konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
  konuSayaclari?: Record<string, { tamamlanan: number; toplam: number }>;
  onKapat: () => void;
}) {
  const [basari, setBasari] = useState<string | null>(null);

  function basariGoster(mesaj: string) {
    setBasari(mesaj);
    setTimeout(onKapat, 1200);
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4"
      style={{ background: "rgba(0,0,0,0.55)" }} onClick={onKapat}>
      <div className="sfec-fade w-full max-w-md rounded-3xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: BG1, border: `2px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">{GOREV_TURU_ETIKET[gorev.tur]} görevini tamamla</span>
          <button type="button" onClick={onKapat} className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <X size={13} color={TEXT_MUTED} />
          </button>
        </div>
        {basari ? (
          <div style={{ color: MINT }} className="text-sm font-semibold py-6 text-center">✓ {basari}</div>
        ) : gorev.tur === "konu" ? (
          <KonuCalismaForm dersListesi={dersListesi} konuOnerileri={konuOnerileri} konuSayaclari={konuSayaclari}
            prefillDers={gorev.ders} prefillKonu={gorev.konu ?? undefined} gorevAtamaId={gorev.atamaId}
            onBasari={(m) => basariGoster(m)} />
        ) : gorev.tur === "soru" ? (
          <SoruCozumuForm dersListesi={dersListesi} konuOnerileri={konuOnerileri}
            prefillDers={gorev.ders} prefillKonu={gorev.konu ?? undefined} gorevAtamaId={gorev.atamaId}
            onBasari={(m) => basariGoster(m)} />
        ) : (
          <DenemeForm aytAlan={aytAlan} dokuzOnMu={dokuzOnMu} gorevAtamaId={gorev.atamaId}
            onBasari={(m) => basariGoster(m)} />
        )}
      </div>
    </div>
  );
}

// Öğrencinin kendi planını eklediği form — öğretmen görevinden farklı
// olarak saat aralığı ZORUNLU; sunucu tarafı aynı gün çakışan bir saat
// aralığına izin vermiyor (bkz. planEkle, gorev-actions.ts).
function PlanEkleModal({ tarih, dersListesi, konuOnerileri, onKapat }: {
  tarih: string;
  dersListesi: string[];
  konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
  onKapat: () => void;
}) {
  const [tur, setTur] = useState<GorevTuru>("konu");
  const [ders, setDers] = useState(dersListesi[0] ?? "");
  const [konu, setKonu] = useState("");
  const [hedefSoru, setHedefSoru] = useState("");
  const [baslangicSaat, setBaslangicSaat] = useState("");
  const [bitisSaat, setBitisSaat] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dersKonulari = konuOnerileri.filter((k) => k.ders === ders);

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!ders) return setHata("Ders seçin.");
    if (!baslangicSaat || !bitisSaat) return setHata("Başlangıç ve bitiş saati zorunludur.");
    const baslangicDakika = saatiDakikayaCevir(baslangicSaat);
    const bitisDakika = saatiDakikayaCevir(bitisSaat);
    if (baslangicDakika === null || bitisDakika === null || bitisDakika <= baslangicDakika) {
      return setHata("Bitiş saati başlangıçtan sonra olmalı.");
    }
    startTransition(async () => {
      const res = await planEkle({
        tur, ders, konu: konu || undefined,
        hedefSoruSayisi: hedefSoru ? Number(hedefSoru) : undefined,
        tarih, baslangicSaat, bitisSaat, aciklama: aciklama || undefined,
      });
      if (res.error) setHata(res.error);
      else { setBasari("Plan eklendi."); setTimeout(onKapat, 1000); }
    });
  }

  const tarihEtiket = new Date(`${tarih}T00:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "2-digit", month: "long" });

  return (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:px-4"
      style={{ background: "rgba(0,0,0,0.55)" }} onClick={onKapat}>
      <div className="sfec-fade w-full max-w-md rounded-3xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: BG1, border: `2px solid ${BORDER}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Plan ekle · {tarihEtiket}</span>
          <button type="button" onClick={onKapat} className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <X size={13} color={TEXT_MUTED} />
          </button>
        </div>

        {basari ? (
          <div style={{ color: MINT }} className="text-sm font-semibold py-6 text-center">✓ {basari}</div>
        ) : (
          <form onSubmit={gonder} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Tür</span>
                <select value={tur} onChange={(e) => setTur(e.target.value as GorevTuru)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
                  <option value="konu">Konu Çalışma</option>
                  <option value="soru">Soru Çözümü</option>
                  <option value="deneme">Deneme</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ders</span>
                <select value={ders} onChange={(e) => { setDers(e.target.value); setKonu(""); }}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
                  {dersListesi.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Konu (opsiyonel)</span>
              <select value={konu} onChange={(e) => setKonu(e.target.value)}
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
                <option value="">Seçiniz (opsiyonel)</option>
                {dersKonulari.map((k) => <option key={k.konu} value={k.konu}>{k.konu}</option>)}
              </select>
            </label>

            {tur === "soru" && (
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Hedef soru sayısı (opsiyonel)</span>
                <input type="number" min={1} value={hedefSoru} onChange={(e) => setHedefSoru(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Başlangıç saati *</span>
                <input type="time" required value={baslangicSaat} onChange={(e) => setBaslangicSaat(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Bitiş saati *</span>
                <input type="time" required value={bitisSaat} onChange={(e) => setBitisSaat(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
            </div>

            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Açıklama (opsiyonel)</span>
              <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="örn. Sınava hazırlık"
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
            </label>

            {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
            <button type="submit" disabled={pending}
              className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
              {pending ? "Ekleniyor..." : "Plan ekle"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
