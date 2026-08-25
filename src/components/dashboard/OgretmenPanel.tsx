"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check, Users, Eye, Plus, X, BookMarked, BedDouble, ClipboardCheck, ArrowRightLeft, ChevronDown, ChevronUp, CalendarPlus } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, SKY, SKY_BG, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import {
  veliTalepOnayla, sinifEkle, ogretmenDuyuruGonder, gonderilenDuyurularGetir,
  ogretmenDersEkle, ogretmenDersSil, ogrenciSinifTasi, ogrenciYurtDurumuGuncelle, soruCozumuOnayla,
} from "@/app/dashboard/actions";
import { gorevVer } from "@/app/dashboard/gorev-actions";
import { DuyuruFormu } from "@/components/dashboard/DuyuruFormu";
import { BRANS_LISTESI, type GorevTuru, type SinifSeviyesi, type VeliLinkRequest } from "@/lib/types";
import { bugununTarihiTR } from "@/lib/tarih";
import type { DashboardBolumu } from "@/lib/dashboard-navigation";
import { DersProgramiGrid } from "@/components/dashboard/DersProgramiGrid";
import { YurtNobetiTablosu } from "@/components/dashboard/YurtNobetiTablosu";
import { programGunleri } from "@/lib/ders-programi";
import type { DersProgramiSatiri, YurtNobetiSatiri } from "@/lib/ders-programi";

interface OgrenciSatiri {
  id: string;
  ad: string;
  okul_no: string;
  yurtOgrencisi: boolean;
}
interface SinifSatiri {
  id: string;
  seviye: string;
  sube: string;
}
interface OgretmenDersiSatiri {
  id: string;
  classId: string;
  ders: string;
  sinifAdi: string;
}
interface BekleyenOnaySatiri {
  id: string;
  studentId: string;
  ders: string;
  dogru: number;
  yanlis: number;
  bos: number;
  tarih: string;
  ogrenciAd: string;
}

// Okul numarası sahibi öğrenciler numara sırasına göre dizilir (metin
// olarak saklanan okul_no'yu sayısal karşılaştırır, örn. "9" "10"dan önce
// gelir); numeric:true, dershanenin ileride alfasayısal kullanıcı adı
// kullanması durumunda da doğal sırayla (a1, a2, a10 gibi) çalışmaya devam eder.
function ogrencilerOkulNoSirali(ogrenciler: OgrenciSatiri[]): OgrenciSatiri[] {
  return [...ogrenciler].sort((a, b) => a.okul_no.localeCompare(b.okul_no, "tr", { numeric: true }));
}

export function OgretmenPanel({
  role, bekleyenTalepler, ogrenciler, sinifAdi, siniflar, gorunecekSinifId, kendiSinifId, kendiSinifiMi,
  ogretmenDersleri, bekleyenOnaylar, konuOnerileri, aktifBolum,
  dersProgramiSatirlari, yurtNobetiSatirlari, dershaneMi,
}: {
  role: "ogretmen" | "mudur";
  bekleyenTalepler: (VeliLinkRequest & { ogrenci_ad: string })[];
  ogrenciler: OgrenciSatiri[];
  sinifAdi: string | null;
  siniflar: SinifSatiri[];
  gorunecekSinifId: string | null;
  kendiSinifId: string | null;
  kendiSinifiMi: boolean;
  ogretmenDersleri: OgretmenDersiSatiri[];
  bekleyenOnaylar: BekleyenOnaySatiri[];
  konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
  aktifBolum: DashboardBolumu;
  // Ders Programı + Yurt Nöbeti (2026-08-25) — sadece "dersler" bölümünde
  // kullanılıyor, diğer bölümlerde boş dizi/false gelir.
  dersProgramiSatirlari?: DersProgramiSatiri[];
  yurtNobetiSatirlari?: YurtNobetiSatiri[];
  dershaneMi?: boolean;
}) {
  const router = useRouter();
  const [uretilenKodlar, setUretilenKodlar] = useState<Record<string, string>>({});
  // Onaylanınca sunucu listesi (bekleyenTalepler) yenilenip o talep listeden
  // düşüyor — kodu kaybetmemek için bu oturumda onaylananları ayrıca tutuyoruz.
  const [oturumdaOnaylanan, setOturumdaOnaylanan] = useState<(VeliLinkRequest & { ogrenci_ad: string })[]>([]);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onayla(talep: VeliLinkRequest & { ogrenci_ad: string }) {
    setHata(null);
    startTransition(async () => {
      const res = await veliTalepOnayla(talep.id);
      if (res.error) setHata(res.error);
      else if (res.kod) {
        setUretilenKodlar((k) => ({ ...k, [talep.id]: res.kod! }));
        setOturumdaOnaylanan((list) => [...list, talep]);
      }
    });
  }

  const onaylananIdSeti = new Set(oturumdaOnaylanan.map((t) => t.id));
  const gosterilecekBekleyenler = bekleyenTalepler.filter((t) => !onaylananIdSeti.has(t.id));

  // Görev verilebilir mi: kendi sınıfı veya ogretmen_dersleri ile ilişkili
  // olduğu bir sınıf görüntüleniyorsa (bkz. migration 0047 RLS kuralı).
  const gorevVerilebilirMi = kendiSinifiMi || ogretmenDersleri.some((d) => d.classId === gorunecekSinifId);

  const duyuruMumkunMu = role === "mudur" || !!kendiSinifId;
  // Müdür kapsamı seçebiliyor: tüm okul / seviye / belirli şube. Öğretmende
  // kapsam sabit (kendi sınıfı) olduğu için seçici hiç gösterilmiyor.
  const duyuruKapsamSecenekleri = role === "mudur"
    ? [
        { deger: "okul", etiket: "Tüm okul" },
        { deger: "9", etiket: "9. Sınıflar" },
        { deger: "10", etiket: "10. Sınıflar" },
        { deger: "11", etiket: "11. Sınıflar" },
        { deger: "12", etiket: "12. Sınıflar" },
        ...siniflar.map((s) => ({ deger: s.id, etiket: `Sadece ${s.seviye}-${s.sube}` })),
      ]
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {aktifBolum === "ozet" && (
        <section className="sfec-dashboard-hero sfec-fade rounded-3xl px-6 py-5 sm:px-7 print:hidden">
          <div className="relative z-10 flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: MINT_BG, border: `1px solid ${BORDER_STRONG}` }}>
              <span className="sfec-hosgeldin-kapi h-7 w-7" aria-hidden="true" />
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: TEXT_MUTED }}>Eğitimci paneli</div>
              <h1 className="mt-0.5 text-xl font-extrabold sm:text-2xl" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Hoş geldin hocam</h1>
            </div>
          </div>
        </section>
      )}

      {aktifBolum === "duyurular" && duyuruMumkunMu && (
        <section id="duyurular" className="sfec-section"><DuyuruFormu
          baslik={role === "mudur" ? "Okula duyuru gönder" : "Sınıfınıza duyuru gönder"}
          aciklama={role === "mudur"
            ? "Okul veya sınıf kapsamını ve duyurunun öğrenciye, veliye ya da ikisine birden gideceğini seçebilirsiniz."
            : "Kendi sınıfınız için duyurunun öğrenciye, veliye ya da ikisine birden gideceğini seçebilirsiniz."}
          gonder={ogretmenDuyuruGonder}
          kapsamSecenekleri={duyuruKapsamSecenekleri}
          aliciTuruSecilebilir
          gecmisGetir={gonderilenDuyurularGetir}
        /></section>
      )}

      {aktifBolum === "talepler" && kendiSinifId && (
        <div id="veli-talepleri" className="sfec-section sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: MINT_BG }}>
              <UserPlus size={13} color={MINT} />
            </div>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Bekleyen veli talepleri</span>
            <span style={{ color: TEXT_MUTED }} className="text-xs">(kendi sınıfınız)</span>
          </div>

          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold mb-3">{hata}</div>}

          {gosterilecekBekleyenler.length === 0 && oturumdaOnaylanan.length === 0 ? (
            <p style={{ color: TEXT_MUTED }} className="text-sm py-4 text-center">Bekleyen talep yok.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {oturumdaOnaylanan.map((t) => (
                <div key={t.id} className="rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
                  <div>
                    <div style={{ color: TEXT }} className="text-sm font-semibold">{t.veli_ad} <span style={{ color: TEXT_MUTED }} className="font-normal">· {t.veli_telefon}</span></div>
                    <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">Öğrenci: {t.ogrenci_ad}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: MINT_BG, color: MINT }}>
                    <Check size={13} /> Kod: {uretilenKodlar[t.id]}
                  </div>
                </div>
              ))}
              {gosterilecekBekleyenler.map((t) => (
                <div key={t.id} className="rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
                  <div>
                    <div style={{ color: TEXT }} className="text-sm font-semibold">{t.veli_ad} <span style={{ color: TEXT_MUTED }} className="font-normal">· {t.veli_telefon}</span></div>
                    <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">Öğrenci: {t.ogrenci_ad}</div>
                  </div>
                  <button onClick={() => onayla(t)} disabled={pending}
                    className="sfec-btn text-xs font-bold px-3.5 py-1.5 rounded-full disabled:opacity-60"
                    style={{ background: MINT, color: MINT_ON }}>
                    Onayla ve kod üret
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {aktifBolum === "onaylar" && role === "ogretmen" && kendiSinifId && <BekleyenOnaylarBolumu onaylar={bekleyenOnaylar} />}

      {aktifBolum === "gorevler" && role === "ogretmen" && (
        <div className="sfec-fade rounded-2xl p-3 flex items-center justify-between gap-3 flex-wrap" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div>
            <div className="text-sm font-bold" style={{ color: TEXT }}>Görev verilecek sınıf</div>
            <div className="text-[11px]" style={{ color: TEXT_MUTED }}>Yalnızca ders verdiğiniz sınıflara görev gönderebilirsiniz.</div>
          </div>
          <select value={gorunecekSinifId ?? ""} onChange={(e) => router.push(`/dashboard/gorevler?sinif=${e.target.value}`)}
            className="text-xs font-bold px-3 py-2 rounded-xl outline-none"
            style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}{s.id === kendiSinifId ? " (sınıfınız)" : ""}</option>)}
          </select>
        </div>
      )}

      {aktifBolum === "gorevler" && role === "ogretmen" && gorevVerilebilirMi && ogrenciler.length > 0 && (
        <GorevVerBolumu ogrenciler={ogrenciler} konuOnerileri={konuOnerileri} />
      )}

      {aktifBolum === "dersler" && role === "ogretmen" && (
        <DerslerimBolumu
          dersler={ogretmenDersleri}
          siniflar={siniflar}
          dersProgramiSatirlari={dersProgramiSatirlari ?? []}
          yurtNobetiSatirlari={yurtNobetiSatirlari ?? []}
          dershaneMi={!!dershaneMi}
        />
      )}

      {aktifBolum === "ozet" && <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: kendiSinifiMi ? MINT_BG : SKY_BG }}>
              {kendiSinifiMi ? <Users size={13} color={MINT} /> : <Eye size={13} color={SKY} />}
            </div>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">
              {kendiSinifiMi ? "Öğrencileriniz" : "Sınıf görüntüleme"}
            </span>
            {!kendiSinifiMi && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: SKY_BG, color: SKY }}>salt okunur</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select
              value={gorunecekSinifId ?? ""}
              onChange={(e) => router.push(`/dashboard?sinif=${e.target.value}`)}
              className="text-xs font-bold px-3 py-1.5 rounded-full outline-none"
              style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
              {siniflar.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.seviye}-{s.sube}{s.id === kendiSinifId ? " (sınıfınız)" : ""}
                </option>
              ))}
            </select>
            <span style={{ color: TEXT_MUTED }} className="text-xs">{sinifAdi ?? "—"} · {ogrenciler.length} kişi</span>
          </div>
        </div>
        {ogrenciler.length === 0 ? (
          <p style={{ color: TEXT_MUTED }} className="text-sm py-4 text-center">Bu sınıfta kayıtlı öğrenci yok.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ogrencilerOkulNoSirali(ogrenciler).map((o) => (
              <div key={o.id} className="rounded-xl flex items-center justify-between gap-2 pr-1.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
                <button onClick={() => router.push(`/dashboard?sinif=${gorunecekSinifId}&ogrenci=${o.id}`)}
                  className="sfec-btn flex-1 min-w-0 px-3.5 py-2.5 flex items-center justify-between text-left">
                  <span style={{ color: TEXT }} className="text-sm font-semibold truncate">{o.ad}</span>
                  <span style={{ color: TEXT_MUTED }} className="text-xs shrink-0 ml-2">#{o.okul_no}</span>
                </button>
                {kendiSinifiMi && (
                  <>
                    <YurtOgrencisiButonu ogrenciId={o.id} yurtOgrencisi={o.yurtOgrencisi} />
                    <OgrenciTasiButonu ogrenciId={o.id} kendiSinifId={kendiSinifId} siniflar={siniflar} />
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>}

    </div>
  );
}

// "Öğrenci ekle/çıkar" — kullanıcı kararı: sınıf transferi. Sadece kendi
// sınıfınızdaki bir öğrenciyi aynı okuldaki başka bir sınıfa taşıyabilirsiniz
// (bkz. migration 0045, students_update_sinif_ogretmeni policy).
// Yurt öğrencisi işareti — sadece sınıf öğretmeni (kendiSinifiMi) kendi
// öğrencisini işaretleyebilir. Hafta içi telefonuna erişemeyen öğrenciler
// için rozet eşikleri ve "sisteme girmedi" hatırlatmaları hafta sonuna
// göre esnetiliyor (bkz. migration 0053).
function YurtOgrencisiButonu({ ogrenciId, yurtOgrencisi }: { ogrenciId: string; yurtOgrencisi: boolean }) {
  const router = useRouter();
  const [yurt, setYurt] = useState(yurtOgrencisi);
  const [pending, startTransition] = useTransition();

  function degistir() {
    const yeni = !yurt;
    startTransition(async () => {
      const res = await ogrenciYurtDurumuGuncelle(ogrenciId, yeni);
      if (!res.error) { setYurt(yeni); router.refresh(); }
    });
  }

  return (
    <button type="button" onClick={degistir} disabled={pending}
      title={yurt ? "Yurt öğrencisi (kaldırmak için tıkla)" : "Yurt öğrencisi olarak işaretle"}
      className="sfec-btn shrink-0 w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-60"
      style={{ background: yurt ? MINT : "rgba(255,255,255,0.06)", border: `2px solid ${yurt ? MINT : BORDER_STRONG}` }}>
      <BedDouble size={13} color={yurt ? MINT_ON : TEXT_MUTED} />
    </button>
  );
}

function OgrenciTasiButonu({ ogrenciId, kendiSinifId, siniflar }: {
  ogrenciId: string; kendiSinifId: string | null; siniflar: SinifSatiri[];
}) {
  const [acik, setAcik] = useState(false);
  const [hedefSinif, setHedefSinif] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const digerSiniflar = siniflar.filter((s) => s.id !== kendiSinifId);
  if (digerSiniflar.length === 0) return null;

  function tasi() {
    setHata(null);
    if (!hedefSinif) return setHata("Sınıf seçin.");
    startTransition(async () => {
      const res = await ogrenciSinifTasi(ogrenciId, hedefSinif);
      if (res.error) setHata(res.error);
      else setAcik(false);
    });
  }

  if (!acik) {
    return (
      <button type="button" onClick={() => setAcik(true)} title="Başka sınıfa taşı"
        className="sfec-btn shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER_STRONG}` }}>
        <ArrowRightLeft size={13} color={TEXT_MUTED} />
      </button>
    );
  }

  return (
    <div className="shrink-0 flex items-center gap-1">
      <select value={hedefSinif} onChange={(e) => setHedefSinif(e.target.value)}
        className="text-[11px] font-bold px-2 py-1.5 rounded-full outline-none"
        style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        <option value="">Sınıf seç</option>
        {digerSiniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
      </select>
      <button type="button" onClick={tasi} disabled={pending}
        className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-60"
        style={{ background: MINT, color: MINT_ON }}>
        <Check size={12} />
      </button>
      <button type="button" onClick={() => { setAcik(false); setHata(null); }} disabled={pending}
        className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center disabled:opacity-60"
        style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER_STRONG}` }}>
        <X size={12} color={TEXT_MUTED} />
      </button>
      {hata && <span style={{ color: BLUSH }} className="text-[10px] font-semibold">{hata}</span>}
    </div>
  );
}

// Görevlendirme dışı (öğrencinin kendi girdiği) soru çözümlerine öğretmenin
// "gördüm" damgası basması — onaylanana kadar bekleyen iş sayısı olarak
// gösteriliyor (bkz. migration 0045).
// Aynı öğrencinin farklı derslerdeki bekleyen soru çözümleri tek satırda
// toplanıyor — satıra basınca o öğrencinin tüm bekleyen kayıtları sıralanıyor.
// "Gördüm" onaylanınca kayıt listeden kaybolmuyor, butonu pasifleşip renk
// değiştiriyor (görsel onay izi).
function BekleyenOnaylarBolumu({ onaylar }: { onaylar: BekleyenOnaySatiri[] }) {
  const [onaylanan, setOnaylanan] = useState<Set<string>>(new Set());
  const [onaylanıyorId, setOnaylanıyorId] = useState<string | null>(null);
  const [acikOgrenciId, setAcikOgrenciId] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function onayla(id: string) {
    setHata(null);
    setOnaylanıyorId(id);
    startTransition(async () => {
      const res = await soruCozumuOnayla(id);
      setOnaylanıyorId(null);
      if (res.error) setHata(res.error);
      else setOnaylanan((s) => new Set(s).add(id));
    });
  }

  const gruplar = new Map<string, { ogrenciAd: string; kayitlar: BekleyenOnaySatiri[] }>();
  for (const o of onaylar) {
    const grup = gruplar.get(o.studentId) ?? { ogrenciAd: o.ogrenciAd, kayitlar: [] };
    grup.kayitlar.push(o);
    gruplar.set(o.studentId, grup);
  }
  const ogrenciListesi = Array.from(gruplar.entries()).map(([studentId, g]) => ({ studentId, ...g }));
  const toplamBekleyen = onaylar.filter((o) => !onaylanan.has(o.id)).length;

  return (
    <div className="sfec-section sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: SKY_BG }}>
          <ClipboardCheck size={13} color={SKY} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Bekleyen onaylar</span>
        {toplamBekleyen > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: SKY_BG, color: SKY }}>{toplamBekleyen}</span>
        )}
      </div>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold mb-3">{hata}</div>}
      {ogrenciListesi.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-4 text-center">Onay bekleyen soru çözümü yok.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ogrenciListesi.map((g) => {
            const acik = acikOgrenciId === g.studentId;
            const bekleyenSayisi = g.kayitlar.filter((k) => !onaylanan.has(k.id)).length;
            return (
              <div key={g.studentId} className="rounded-2xl overflow-hidden" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
                <button type="button" onClick={() => setAcikOgrenciId(acik ? null : g.studentId)}
                  className="sfec-btn w-full flex items-center justify-between gap-2 p-3 text-left">
                  <span style={{ color: TEXT }} className="text-sm font-semibold">{g.ogrenciAd}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {bekleyenSayisi > 0 ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: SKY_BG, color: SKY }}>{bekleyenSayisi} bekliyor</span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: MINT_BG, color: MINT }}>tamamlandı</span>
                    )}
                    {acik ? <ChevronUp size={15} color={TEXT_MUTED} /> : <ChevronDown size={15} color={TEXT_MUTED} />}
                  </div>
                </button>
                {acik && (
                  <div className="flex flex-col gap-2 px-3 pb-3">
                    {g.kayitlar.map((o) => {
                      const onaylandi = onaylanan.has(o.id);
                      return (
                        <div key={o.id} className="rounded-xl p-2.5 flex items-center justify-between flex-wrap gap-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
                          <div>
                            <div style={{ color: TEXT }} className="text-xs font-semibold">{o.ders}</div>
                            <div style={{ color: TEXT_MUTED }} className="text-[11px] mt-0.5">D:{o.dogru} Y:{o.yanlis} B:{o.bos} · {o.tarih}</div>
                          </div>
                          <button onClick={() => onayla(o.id)} disabled={onaylandi || onaylanıyorId === o.id}
                            className="sfec-btn flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full disabled:opacity-100"
                            style={onaylandi
                              ? { background: MINT_BG, color: MINT, cursor: "default" }
                              : { background: MINT, color: MINT_ON }}>
                            <Check size={13} /> {onaylandi ? "Onaylandı" : "Gördüm"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Öğretmenin branş dersi verdiği sınıflar (çoklu, homeroom'dan bağımsız) —
// kendi ekleyip çıkarabildiği self-servis liste (bkz. migration 0045).
function DerslerimBolumu({ dersler, siniflar, dersProgramiSatirlari, yurtNobetiSatirlari, dershaneMi }: {
  dersler: OgretmenDersiSatiri[];
  siniflar: SinifSatiri[];
  dersProgramiSatirlari: DersProgramiSatiri[];
  yurtNobetiSatirlari: YurtNobetiSatiri[];
  dershaneMi: boolean;
}) {
  const [sinifId, setSinifId] = useState(siniflar[0]?.id ?? "");
  const [ders, setDers] = useState<string>(BRANS_LISTESI[0]);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [silinenler, setSilinenler] = useState<Set<string>>(new Set());

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startTransition(async () => {
      const res = await ogretmenDersEkle(sinifId, ders);
      if (res.error) setHata(res.error);
    });
  }

  function sil(id: string) {
    setHata(null);
    startTransition(async () => {
      const res = await ogretmenDersSil(id);
      if (res.error) setHata(res.error);
      else setSilinenler((s) => new Set(s).add(id));
    });
  }

  const gosterilecekler = dersler.filter((d) => !silinenler.has(d.id));

  return (
    <div className="sfec-section sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: MINT_BG }}>
          <BookMarked size={13} color={MINT} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Girdiğim sınıflar ve derslerim</span>
      </div>

      {gosterilecekler.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm mb-3">Henüz eklenmiş bir branş dersiniz yok.</p>
      ) : (
        <div className="flex flex-wrap gap-2 mb-4">
          {gosterilecekler.map((d) => (
            <div key={d.id} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
              {d.sinifAdi} · {d.ders}
              <button type="button" onClick={() => sil(d.id)} disabled={pending} title="Kaldır" className="sfec-btn disabled:opacity-60">
                <X size={12} color={TEXT_MUTED} />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={ekle} className="flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Sınıf</span>
          <select value={sinifId} onChange={(e) => setSinifId(e.target.value)}
            className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
            {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ders</span>
          <select value={ders} onChange={(e) => setDers(e.target.value)}
            className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
            {BRANS_LISTESI.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <button type="submit" disabled={pending || !sinifId}
          className="sfec-btn flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full disabled:opacity-60"
          style={{ background: MINT, color: MINT_ON }}>
          <Plus size={13} /> {pending ? "Ekleniyor..." : "Ekle"}
        </button>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      </form>

      {/* Ders Programı (2026-08-25 kullanıcı isteği) — salt-okunur, admin/
          dershane müdürü elle doldurur. Öğretmen sadece kendi haftalık
          programını görür. */}
      <div className="mt-5 flex flex-col gap-2">
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-bold uppercase tracking-wide">Ders Programım</span>
        <DersProgramiGrid gunler={programGunleri(dershaneMi)} satirlar={dersProgramiSatirlari} />
      </div>

      {!dershaneMi && (
        <div className="mt-4">
          <YurtNobetiTablosu satirlar={yurtNobetiSatirlari} />
        </div>
      )}
    </div>
  );
}

export function SinifEkleFormu({ schoolId }: { schoolId: string }) {
  const [seviye, setSeviye] = useState<SinifSeviyesi>("9");
  const [sube, setSube] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasari(null);
    if (!sube.trim()) return setHata("Şube adı girin (örn. E).");
    startTransition(async () => {
      const res = await sinifEkle(schoolId, seviye, sube);
      if (res.error) setHata(res.error);
      else {
        setBasari(`${seviye}-${sube.trim().toUpperCase()} eklendi.`);
        setSube("");
      }
    });
  }

  return (
    <form onSubmit={ekle} className="flex flex-wrap items-end gap-2.5">
      <label className="flex flex-col gap-1">
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Seviye</span>
        <select value={seviye} onChange={(e) => setSeviye(e.target.value as SinifSeviyesi)}
          className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
          <option value="9">9</option>
          <option value="10">10</option>
          <option value="11">11</option>
          <option value="12">12</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Şube</span>
        <input value={sube} onChange={(e) => setSube(e.target.value)} placeholder="örn. E" maxLength={2}
          className="text-sm px-2.5 py-1.5 rounded-xl outline-none w-20" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
      </label>
      <button type="submit" disabled={pending}
        className="sfec-btn flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full disabled:opacity-60"
        style={{ background: MINT, color: MINT_ON }}>
        <Plus size={13} /> {pending ? "Ekleniyor..." : "Sınıf ekle"}
      </button>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      {basari && <div style={{ color: MINT }} className="text-xs font-semibold">{basari}</div>}
    </form>
  );
}

// Görev ver / toplu görev — tek bir form: bir veya birden çok öğrenci
// (checkbox ile, "Tümünü seç" toplu görev karşılığı) seçilip aynı görev
// hepsine birden atanıyor. Öğrenci tarafında bu görev, ilgili mevcut veri
// giriş formundan (Konu/Soru/Deneme) tamamlanıyor (bkz. Gorevlerim.tsx).
function GorevVerBolumu({ ogrenciler, konuOnerileri }: {
  ogrenciler: OgrenciSatiri[]; konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
}) {
  const [secili, setSecili] = useState<Set<string>>(new Set());
  const [tur, setTur] = useState<GorevTuru>("soru");
  const [ders, setDers] = useState<string>(BRANS_LISTESI[0]);
  const [konu, setKonu] = useState("");
  const dersKonulari = konuOnerileri.filter((k) => k.ders === ders);
  const [hedefSoru, setHedefSoru] = useState("");
  const [hedefDakika, setHedefDakika] = useState("");
  const [tarih, setTarih] = useState(bugununTarihiTR);
  const [sonTarih, setSonTarih] = useState("");
  const [baslangicSaat, setBaslangicSaat] = useState("");
  const [bitisSaat, setBitisSaat] = useState("");
  const [aciklama, setAciklama] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tumuSeciliMi = ogrenciler.length > 0 && secili.size === ogrenciler.length;

  // Deneme görevinde "Ders" alanı anlamsız — TYT/AYT birden çok dersi birden
  // kapsıyor, tek bir ders seçmek yanıltıcı. Sadece Branş Denemesi (9-10.
  // sınıf, tek ders) seçilince Ders tekrar anlamlı olduğu için aktifleşiyor.
  // "Konu" alanı deneme türünde bu amaçla "Deneme Türü" seçiciye dönüşüyor —
  // bu yüzden görsel sırada da Deneme Türü, Ders'ten ÖNCE geliyor (Ders'in
  // aktif/pasif durumunu o belirliyor).
  const dersPasif = tur === "deneme" && konu !== "BRANS";

  function turDegistir(yeni: GorevTuru) {
    setTur(yeni);
    setKonu("");
    if (yeni === "deneme") setDers("Genel");
    else if (ders === "Genel") setDers(BRANS_LISTESI[0]);
  }

  function denemeTuruDegistir(yeni: string) {
    setKonu(yeni);
    setDers(yeni === "BRANS" ? BRANS_LISTESI[0] : "Genel");
  }

  function ogrenciToggle(id: string) {
    setSecili((s) => {
      const yeni = new Set(s);
      if (yeni.has(id)) yeni.delete(id); else yeni.add(id);
      return yeni;
    });
  }

  function tumunuSecToggle() {
    setSecili(tumuSeciliMi ? new Set() : new Set(ogrenciler.map((o) => o.id)));
  }

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasari(null);
    if (secili.size === 0) return setHata("En az bir öğrenci seçin.");
    if (!ders.trim()) return setHata("Ders seçin.");
    startTransition(async () => {
      const res = await gorevVer({
        studentIds: Array.from(secili),
        tur, ders, konu: konu || undefined,
        hedefSoruSayisi: hedefSoru ? Number(hedefSoru) : undefined,
        hedefDakika: hedefDakika ? Number(hedefDakika) : undefined,
        tarih, sonTarih: sonTarih || undefined,
        baslangicSaat: baslangicSaat || undefined, bitisSaat: bitisSaat || undefined,
        aciklama: aciklama || undefined,
      });
      if (res.error) setHata(res.error);
      else {
        setBasari(`Görev ${secili.size} öğrenciye verildi.`);
        setKonu(""); setHedefSoru(""); setHedefDakika(""); setSonTarih(""); setBaslangicSaat(""); setBitisSaat(""); setAciklama("");
      }
    });
  }

  return (
    <div className="sfec-section sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: MINT_BG }}>
          <CalendarPlus size={13} color={MINT} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Görev ver</span>
      </div>

      <form onSubmit={gonder} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Öğrenciler</span>
            <button type="button" onClick={tumunuSecToggle}
              className="sfec-btn text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: BG1_ALT, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
              {tumuSeciliMi ? "Seçimi kaldır" : "Tümünü seç (toplu görev)"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto rounded-xl p-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
            {ogrenciler.map((o) => {
              const isSecili = secili.has(o.id);
              return (
                <button key={o.id} type="button" onClick={() => ogrenciToggle(o.id)}
                  className="sfec-btn flex items-center gap-1.5 text-xs font-semibold px-2 py-1.5 rounded-lg text-left"
                  style={{ background: isSecili ? MINT : "transparent", color: isSecili ? MINT_ON : TEXT }}>
                  {isSecili && <Check size={11} className="shrink-0" />} <span className="truncate">{o.ad}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bulgu 06 — önceden her alan kendi başına ayrı bir çerçeveydi (8-9
            kutu üst üste, "çorba" görünümü). Mantıksal gruplar artık ortak
            bir çerçeve altında toplanıyor: ne çalışılacağı bir arada, ne
            zaman yapılacağı bir arada. */}
        <div className="rounded-2xl p-3 flex flex-col gap-3" style={{ border: `2px solid ${BORDER}` }}>
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-bold uppercase tracking-wide">Ne çalışılacak</span>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Tür</span>
              <select value={tur} onChange={(e) => turDegistir(e.target.value as GorevTuru)}
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
                <option value="konu">Konu Çalışma</option>
                <option value="soru">Soru Çözümü</option>
                <option value="deneme">Deneme</option>
              </select>
            </label>
            {tur === "deneme" ? (
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Deneme Türü</span>
                <select value={konu} onChange={(e) => denemeTuruDegistir(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
                  <option value="">Seçiniz</option>
                  <option value="TYT">TYT</option>
                  <option value="AYT">AYT</option>
                  <option value="BRANS">Branş</option>
                </select>
              </label>
            ) : (
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ders</span>
                <select value={ders} onChange={(e) => { setDers(e.target.value); setKonu(""); }}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
                  {BRANS_LISTESI.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
            )}
          </div>

          {tur === "deneme" ? (
            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ders{dersPasif ? " (branş denemesinde seçilir)" : ""}</span>
              <select value={ders} disabled={dersPasif} onChange={(e) => setDers(e.target.value)}
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none disabled:cursor-not-allowed disabled:opacity-50"
                style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
                {dersPasif
                  ? <option value="Genel">Genel (deneme geneli)</option>
                  : BRANS_LISTESI.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Konu (opsiyonel)</span>
              <select value={konu} onChange={(e) => setKonu(e.target.value)}
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
                <option value="">Seçiniz (opsiyonel)</option>
                {dersKonulari.map((k) => <option key={k.konu} value={k.konu}>{k.konu}</option>)}
              </select>
            </label>
          )}

          {tur === "soru" && (
            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Hedef soru sayısı (opsiyonel)</span>
              <input type="number" min={1} value={hedefSoru} onChange={(e) => setHedefSoru(e.target.value)}
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
            </label>
          )}
          {tur === "konu" && (
            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Hedef süre, dk (opsiyonel)</span>
              <input type="number" min={1} value={hedefDakika} onChange={(e) => setHedefDakika(e.target.value)}
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
            </label>
          )}
        </div>

        <div className="rounded-2xl p-3 flex flex-col gap-3" style={{ border: `2px solid ${BORDER}` }}>
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-bold uppercase tracking-wide">Ne zaman</span>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Tarih</span>
              <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)} required
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
            </label>
            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Son tarih (opsiyonel)</span>
              <input type="date" min={tarih} value={sonTarih} onChange={(e) => setSonTarih(e.target.value)}
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Başlangıç saati (opsiyonel)</span>
              <input type="time" value={baslangicSaat} onChange={(e) => setBaslangicSaat(e.target.value)}
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
            </label>
            <label className="flex flex-col gap-1">
              <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Bitiş saati (opsiyonel)</span>
              <input type="time" value={bitisSaat} onChange={(e) => setBitisSaat(e.target.value)}
                className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
            </label>
          </div>
        </div>

        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Açıklama (opsiyonel)</span>
          <input value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="örn. Sınava hazırlık"
            className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
        </label>

        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        {basari && <div style={{ color: MINT }} className="text-xs font-semibold">{basari}</div>}
        <button type="submit" disabled={pending}
          className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Gönderiliyor..." : `Görev ver${secili.size > 1 ? ` (${secili.size} öğrenci)` : ""}`}
        </button>
      </form>
    </div>
  );
}
