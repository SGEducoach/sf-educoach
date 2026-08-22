"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check, Users, Eye, Plus, X, BookMarked, ClipboardCheck, ArrowRightLeft } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, SKY, SKY_BG, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import {
  veliTalepOnayla, sinifEkle, ogretmenDuyuruGonder, gonderilenDuyurularGetir,
  ogretmenDersEkle, ogretmenDersSil, ogrenciSinifTasi, soruCozumuOnayla,
} from "@/app/dashboard/actions";
import { DuyuruFormu } from "@/components/dashboard/DuyuruFormu";
import { BRANS_LISTESI, type SinifSeviyesi, type VeliLinkRequest } from "@/lib/types";

interface OgrenciSatiri {
  id: string;
  ad: string;
  okul_no: string;
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
  ders: string;
  dogru: number;
  yanlis: number;
  bos: number;
  tarih: string;
  ogrenciAd: string;
}

export function OgretmenPanel({
  role, bekleyenTalepler, ogrenciler, sinifAdi, siniflar, gorunecekSinifId, kendiSinifId, kendiSinifiMi,
  ogretmenDersleri, bekleyenOnaylar,
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
      {duyuruMumkunMu && (
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

      {kendiSinifId && (
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

      {role === "ogretmen" && kendiSinifId && <BekleyenOnaylarBolumu onaylar={bekleyenOnaylar} />}

      {role === "ogretmen" && <DerslerimBolumu dersler={ogretmenDersleri} siniflar={siniflar} />}

      <div id="siniflar" className="sfec-section sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
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
            {ogrenciler.map((o) => (
              <div key={o.id} className="rounded-xl flex items-center justify-between gap-2 pr-1.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
                <button onClick={() => router.push(`/dashboard?sinif=${gorunecekSinifId}&ogrenci=${o.id}`)}
                  className="sfec-btn flex-1 min-w-0 px-3.5 py-2.5 flex items-center justify-between text-left">
                  <span style={{ color: TEXT }} className="text-sm font-semibold truncate">{o.ad}</span>
                  <span style={{ color: TEXT_MUTED }} className="text-xs shrink-0 ml-2">#{o.okul_no}</span>
                </button>
                {kendiSinifiMi && (
                  <OgrenciTasiButonu ogrenciId={o.id} kendiSinifId={kendiSinifId} siniflar={siniflar} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// "Öğrenci ekle/çıkar" — kullanıcı kararı: sınıf transferi. Sadece kendi
// sınıfınızdaki bir öğrenciyi aynı okuldaki başka bir sınıfa taşıyabilirsiniz
// (bkz. migration 0045, students_update_sinif_ogretmeni policy).
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
function BekleyenOnaylarBolumu({ onaylar }: { onaylar: BekleyenOnaySatiri[] }) {
  const [onaylanan, setOnaylanan] = useState<Set<string>>(new Set());
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onayla(id: string) {
    setHata(null);
    startTransition(async () => {
      const res = await soruCozumuOnayla(id);
      if (res.error) setHata(res.error);
      else setOnaylanan((s) => new Set(s).add(id));
    });
  }

  const gosterilecekler = onaylar.filter((o) => !onaylanan.has(o.id));

  return (
    <div className="sfec-section sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: SKY_BG }}>
          <ClipboardCheck size={13} color={SKY} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Bekleyen onaylar</span>
        {gosterilecekler.length > 0 && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: SKY_BG, color: SKY }}>{gosterilecekler.length}</span>
        )}
      </div>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold mb-3">{hata}</div>}
      {gosterilecekler.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-4 text-center">Onay bekleyen soru çözümü yok.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {gosterilecekler.map((o) => (
            <div key={o.id} className="rounded-2xl p-3 flex items-center justify-between flex-wrap gap-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
              <div>
                <div style={{ color: TEXT }} className="text-sm font-semibold">{o.ogrenciAd} <span style={{ color: TEXT_MUTED }} className="font-normal">· {o.ders}</span></div>
                <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">D:{o.dogru} Y:{o.yanlis} B:{o.bos} · {o.tarih}</div>
              </div>
              <button onClick={() => onayla(o.id)} disabled={pending}
                className="sfec-btn flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full disabled:opacity-60"
                style={{ background: MINT, color: MINT_ON }}>
                <Check size={13} /> Gördüm
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Öğretmenin branş dersi verdiği sınıflar (çoklu, homeroom'dan bağımsız) —
// kendi ekleyip çıkarabildiği self-servis liste (bkz. migration 0045).
function DerslerimBolumu({ dersler, siniflar }: { dersler: OgretmenDersiSatiri[]; siniflar: SinifSatiri[] }) {
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
