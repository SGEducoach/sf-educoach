"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Building2, ScrollText, UserPlus, Copy, Check, Plus, Pencil, EyeOff, Eye, X } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { sinifOgretmeniAta, ogretmenEkleManuel, ogrenciEkleManuel, okulEkle, okulDuzenle, okulAktiflikDegistir } from "@/app/dashboard/actions";
import { sinifSil } from "@/app/yonetici/actions";
import { SinifEkleFormu } from "@/components/dashboard/OgretmenPanel";
import { AYT_ALAN_ETIKET, BRANS_LISTESI } from "@/lib/types";
import type { AytAlan } from "@/lib/types";
import { telefonSanitize, okulNoSanitize, TELEFON_IPUCU } from "@/lib/validators";

interface OkulSatiri {
  id: string;
  ad: string;
  okul_kodu: string;
  tur: "okul" | "dershane";
  aktif: boolean;
}
interface SinifSatiri {
  id: string;
  seviye: string;
  sube: string;
}
interface OgretmenSatiri {
  id: string;
  ad: string;
  brans: string;
  classId: string | null;
  sinifAdi: string | null;
  mudurMu: boolean;
}
interface IslemKaydi {
  id: string;
  eylem: string;
  detay: Record<string, unknown> | null;
  createdAt: string;
  aktorAdi: string;
}

const EYLEM_ETIKET: Record<string, string> = {
  sinif_ekle: "Sınıf eklendi",
  sinif_ogretmeni_ata: "Sınıf öğretmeni atandı",
  sinif_ogretmenliginden_cikar: "Sınıf öğretmenliğinden çıkarıldı",
  okul_ekle: "Okul eklendi",
  okul_duzenle: "Okul düzenlendi",
  okul_aktiflestir: "Okul aktifleştirildi",
  okul_pasiflestir: "Okul pasifleştirildi",
  sifre_sifirla: "Şifre sıfırlandı",
  hesap_aktiflestir: "Hesap aktifleştirildi",
  hesap_pasiflestir: "Hesap pasifleştirildi",
  sinif_sil: "Sınıf silindi",
  ogrenci_sinif_tasi: "Öğrenci sınıf değiştirdi",
  ogretmen_brans_degistir: "Öğretmen branşı değiştirildi",
  veli_talebi_admin_onayla: "Veli talebi onaylandı (admin)",
  veli_talebi_reddet: "Veli talebi reddedildi",
};

export function AdminPanel({
  okullar, gorunecekOkulId, siniflar, ogretmenListesi, islemKayitlari,
}: {
  okullar: OkulSatiri[];
  gorunecekOkulId: string | null;
  siniflar: SinifSatiri[];
  ogretmenListesi: OgretmenSatiri[];
  islemKayitlari: IslemKaydi[];
}) {
  const router = useRouter();
  const gorunenOkul = okullar.find((o) => o.id === gorunecekOkulId);
  const [okulEkleAcik, setOkulEkleAcik] = useState(false);
  const [okulDuzenleAcik, setOkulDuzenleAcik] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
              <Shield size={13} color={LILAC} />
            </div>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Yönetim</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(199,182,255,0.15)", color: LILAC }}>admin</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {okullar.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 size={14} color={TEXT_MUTED} />
                <select
                  value={gorunecekOkulId ?? ""}
                  onChange={(e) => router.push(`/yonetici?okul=${e.target.value}`)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full outline-none"
                  style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
                  {okullar.map((o) => (
                    <option key={o.id} value={o.id}>{o.ad}{!o.aktif ? " (Pasif)" : ""}</option>
                  ))}
                </select>
                {gorunenOkul && (
                  <button type="button" onClick={() => setOkulDuzenleAcik((v) => !v)} title="Okulu düzenle"
                    className="sgec-btn w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER_STRONG}` }}>
                    <Pencil size={11} color={TEXT_MUTED} />
                  </button>
                )}
              </div>
            )}
            <button type="button" onClick={() => setOkulEkleAcik((v) => !v)}
              className="sgec-btn flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: okulEkleAcik ? MINT : "rgba(255,255,255,0.06)", color: okulEkleAcik ? MINT_ON : TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
              <Plus size={12} /> Okul ekle
            </button>
          </div>
        </div>

        {okulEkleAcik && <OkulEkleFormu onDone={() => setOkulEkleAcik(false)} />}
        {gorunenOkul && okulDuzenleAcik && (
          <OkulDuzenleFormu okul={gorunenOkul} onDone={() => setOkulDuzenleAcik(false)} />
        )}

        {!gorunenOkul ? (
          <p style={{ color: TEXT_MUTED }} className="text-sm py-4 text-center">Henüz kayıtlı okul yok.</p>
        ) : (
          <>
            <SinifEkleFormu schoolId={gorunenOkul.id} />

            {siniflar.length > 0 && (
              <div className="mt-4">
                <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold uppercase tracking-wide mb-2 block">
                  Sınıflar ({siniflar.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {siniflar.map((s) => <SinifRozeti key={s.id} sinif={s} />)}
                </div>
              </div>
            )}

            <div className="mt-5">
              <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold uppercase tracking-wide mb-2 block">
                Öğretmenler ({ogretmenListesi.length})
              </span>
              {ogretmenListesi.length === 0 ? (
                <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Henüz kayıtlı öğretmen yok.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {ogretmenListesi.map((o) => (
                    <OgretmenSatir key={o.id} ogretmen={o} siniflar={siniflar} />
                  ))}
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <OgretmenEkleFormu schoolId={gorunenOkul.id} />
              <OgrenciEkleFormu schoolId={gorunenOkul.id} siniflar={siniflar} />
            </div>
          </>
        )}
      </div>

      <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
            <ScrollText size={13} color={LILAC} />
          </div>
          <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Son işlemler</span>
        </div>
        {islemKayitlari.length === 0 ? (
          <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Henüz işlem kaydı yok.</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {islemKayitlari.map((k) => (
              <div key={k.id} className="rounded-xl px-3.5 py-2 flex items-center justify-between flex-wrap gap-1.5 text-xs" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
                <span style={{ color: TEXT }} className="font-semibold">{EYLEM_ETIKET[k.eylem] ?? k.eylem} <span style={{ color: TEXT_MUTED }} className="font-normal">· {k.aktorAdi}</span></span>
                <span style={{ color: TEXT_MUTED }}>{new Date(k.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OkulEkleFormu({ onDone }: { onDone: () => void }) {
  const [ad, setAd] = useState("");
  const [tur, setTur] = useState<"okul" | "dershane">("okul");
  const [okulKodu, setOkulKodu] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startTransition(async () => {
      const res = await okulEkle({ ad, tur, okulKodu });
      if (res.error) return setHata(res.error);
      setAd(""); setOkulKodu("");
      onDone();
    });
  }

  return (
    <form onSubmit={ekle} className="rounded-2xl p-4 mb-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
      <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Yeni okul</span>
      <div className="flex gap-2 flex-wrap">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Okul adı" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none flex-1 min-w-[140px]" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <select value={tur} onChange={(e) => setTur(e.target.value as "okul" | "dershane")}
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="okul">Okul</option>
          <option value="dershane">Dershane</option>
        </select>
        <input value={okulKodu} onChange={(e) => setOkulKodu(e.target.value)} placeholder="Okul kodu" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none w-32" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
      </div>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" disabled={pending}
        className="sgec-btn self-start text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Ekleniyor..." : "Okulu ekle"}
      </button>
    </form>
  );
}

function OkulDuzenleFormu({ okul, onDone }: { okul: OkulSatiri; onDone: () => void }) {
  const [ad, setAd] = useState(okul.ad);
  const [okulKodu, setOkulKodu] = useState(okul.okul_kodu);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [aktiflikPending, startAktiflikTransition] = useTransition();

  function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startTransition(async () => {
      const res = await okulDuzenle(okul.id, { ad, okulKodu });
      if (res.error) return setHata(res.error);
      onDone();
    });
  }

  function aktiflikDegistir() {
    setHata(null);
    startAktiflikTransition(async () => {
      const res = await okulAktiflikDegistir(okul.id, !okul.aktif);
      if (res.error) setHata(res.error);
    });
  }

  return (
    <form onSubmit={kaydet} className="rounded-2xl p-4 mb-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
      <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Okulu düzenle</span>
      <div className="flex gap-2 flex-wrap">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Okul adı" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none flex-1 min-w-[140px]" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <input value={okulKodu} onChange={(e) => setOkulKodu(e.target.value)} placeholder="Okul kodu" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none w-32" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
      </div>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending}
          className="sgec-btn text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button type="button" onClick={aktiflikDegistir} disabled={aktiflikPending}
          className="sgec-btn flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60"
          style={{ background: "rgba(255,255,255,0.06)", color: okul.aktif ? BLUSH : MINT, border: `1px solid ${BORDER_STRONG}` }}>
          {okul.aktif ? <><EyeOff size={12} /> Pasifleştir</> : <><Eye size={12} /> Aktifleştir</>}
        </button>
      </div>
    </form>
  );
}

function OgretmenSatir({ ogretmen, siniflar }: { ogretmen: OgretmenSatiri; siniflar: SinifSatiri[] }) {
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ata(classId: string) {
    setHata(null);
    startTransition(async () => {
      const res = await sinifOgretmeniAta(ogretmen.id, classId || null);
      if (res.error) setHata(res.error);
    });
  }

  return (
    <div className="rounded-xl px-3.5 py-2.5 flex items-center justify-between flex-wrap gap-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
      <div>
        <div style={{ color: TEXT }} className="text-sm font-semibold">
          {ogretmen.ad} {ogretmen.mudurMu && <span style={{ color: LILAC }} className="text-[10px] font-bold ml-1">MÜDÜR</span>}
        </div>
        <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">{ogretmen.brans}</div>
        {hata && <div style={{ color: BLUSH }} className="text-[11px] font-semibold mt-1">{hata}</div>}
      </div>
      <div className="flex items-center gap-1.5">
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Sınıf öğretmeni</span>
        <select
          value={ogretmen.classId ?? ""}
          disabled={pending}
          onChange={(e) => ata(e.target.value)}
          className="text-xs font-bold px-2.5 py-1.5 rounded-full outline-none disabled:opacity-60"
          style={{ background: "rgba(255,255,255,0.04)", color: ogretmen.classId ? MINT : TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
          <option value="">— Yok —</option>
          {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
        </select>
      </div>
    </div>
  );
}

// Yeni oluşturulan hesabın e-posta+geçici şifresini bir kerelik gösterip
// panoya kopyalamayı kolaylaştırır — admin bunu ilgili kişiye iletecek.
function OlusturulanHesap({ email, sifre }: { email: string; sifre: string }) {
  const [kopyalandi, setKopyalandi] = useState(false);

  function kopyala() {
    navigator.clipboard?.writeText(`E-posta: ${email}\nŞifre: ${sifre}`).then(() => {
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2000);
    });
  }

  return (
    <div className="rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap" style={{ background: MINT_BG, border: `1px solid ${MINT}` }}>
      <div className="text-xs" style={{ color: TEXT }}>
        Hesap oluşturuldu — <strong>{email}</strong> / <strong>{sifre}</strong>
        <div style={{ color: TEXT_MUTED }} className="mt-0.5">Bu şifreyi ilgili kişiye iletin, tekrar gösterilmeyecek.</div>
      </div>
      <button type="button" onClick={kopyala}
        className="sgec-btn shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
        style={{ background: MINT, color: MINT_ON }}>
        {kopyalandi ? <><Check size={12} /> Kopyalandı</> : <><Copy size={12} /> Kopyala</>}
      </button>
    </div>
  );
}

function OgretmenEkleFormu({ schoolId }: { schoolId: string }) {
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [brans, setBrans] = useState<string>(BRANS_LISTESI[0]);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ email: string; sifre: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startTransition(async () => {
      const res = await ogretmenEkleManuel({ ad, email, telefon, schoolId, brans });
      if (res.error) return setHata(res.error);
      setSonuc({ email: email.trim().toLowerCase(), sifre: res.sifre! });
      setAd(""); setEmail(""); setTelefon("");
    });
  }

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center gap-1.5">
        <UserPlus size={13} color={MINT} />
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Öğretmen ekle</span>
      </div>
      {sonuc && <OlusturulanHesap email={sonuc.email} sifre={sonuc.sifre} />}
      <form onSubmit={ekle} className="flex flex-col gap-2">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ad Soyad" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-posta" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <input value={telefon} onChange={(e) => setTelefon(telefonSanitize(e.target.value))} type="tel" inputMode="numeric" placeholder={TELEFON_IPUCU} required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <select value={brans} onChange={(e) => setBrans(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          {BRANS_LISTESI.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <button type="submit" disabled={pending}
          className="sgec-btn text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Ekleniyor..." : "Öğretmen ekle"}
        </button>
      </form>
    </div>
  );
}

function OgrenciEkleFormu({ schoolId, siniflar }: { schoolId: string; siniflar: SinifSatiri[] }) {
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [okulNo, setOkulNo] = useState("");
  const [telefon, setTelefon] = useState("");
  const [classId, setClassId] = useState("");
  const [aytAlan, setAytAlan] = useState<AytAlan>("SAY");
  const [hedefBolum, setHedefBolum] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ email: string; sifre: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!classId) return setHata("Sınıf seçin.");
    startTransition(async () => {
      const res = await ogrenciEkleManuel({ ad, email, okulNo, telefon, schoolId, classId, aytAlan, hedefBolum });
      if (res.error) return setHata(res.error);
      setSonuc({ email: email.trim().toLowerCase(), sifre: res.sifre! });
      setAd(""); setEmail(""); setOkulNo(""); setTelefon(""); setHedefBolum("");
    });
  }

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center gap-1.5">
        <UserPlus size={13} color={MINT} />
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Öğrenci ekle</span>
      </div>
      {sonuc && <OlusturulanHesap email={sonuc.email} sifre={sonuc.sifre} />}
      <form onSubmit={ekle} className="flex flex-col gap-2">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ad Soyad" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-posta" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <div className="flex gap-2">
          <input value={okulNo} onChange={(e) => setOkulNo(okulNoSanitize(e.target.value))} inputMode="numeric" maxLength={5} placeholder="Okul No" required
            className="text-sm px-3 py-1.5 rounded-xl outline-none w-1/2" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          <input value={telefon} onChange={(e) => setTelefon(telefonSanitize(e.target.value))} type="tel" inputMode="numeric" placeholder="Telefon (ops.)"
            className="text-sm px-3 py-1.5 rounded-xl outline-none w-1/2" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </div>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="">Sınıf seçin</option>
          {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
        </select>
        <select value={aytAlan} onChange={(e) => setAytAlan(e.target.value as AytAlan)}
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          {(Object.keys(AYT_ALAN_ETIKET) as AytAlan[]).map((a) => <option key={a} value={a}>{AYT_ALAN_ETIKET[a]}</option>)}
        </select>
        <input value={hedefBolum} onChange={(e) => setHedefBolum(e.target.value)} placeholder="Hedef bölüm (ops.)"
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <button type="submit" disabled={pending}
          className="sgec-btn text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Ekleniyor..." : "Öğrenci ekle"}
        </button>
      </form>
    </div>
  );
}

// Silme FK kısıtı yüzünden (öğrenci/öğretmen varken) engellenir — hata mesajı
// bunu anlaşılır şekilde açıklıyor, boş sınıflar sorunsuz silinebilir.
function SinifRozeti({ sinif }: { sinif: SinifSatiri }) {
  const [hata, setHata] = useState<string | null>(null);
  const [silindi, setSilindi] = useState(false);
  const [pending, startTransition] = useTransition();

  function sil() {
    if (!window.confirm(`${sinif.seviye}-${sinif.sube} sınıfı silinsin mi?`)) return;
    setHata(null);
    startTransition(async () => {
      const res = await sinifSil(sinif.id);
      if (res.error) return setHata(res.error);
      setSilindi(true);
    });
  }

  if (silindi) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 rounded-full pl-3 pr-1.5 py-1" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
        <span style={{ color: TEXT }} className="text-xs font-bold">{sinif.seviye}-{sinif.sube}</span>
        <button type="button" onClick={sil} disabled={pending} title="Sınıfı sil"
          className="sgec-btn w-5 h-5 rounded-full flex items-center justify-center disabled:opacity-60" style={{ background: "rgba(255,255,255,0.06)" }}>
          <X size={10} color={BLUSH} />
        </button>
      </div>
      {hata && <span style={{ color: BLUSH }} className="text-[10px] font-semibold">{hata}</span>}
    </div>
  );
}
