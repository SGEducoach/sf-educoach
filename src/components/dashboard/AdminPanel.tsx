"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Building2, ScrollText, UserPlus, Copy, Check, Plus, Pencil, EyeOff, Eye, X, ClipboardList, Download } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import {
  sinifOgretmeniAta, ogretmenEkleManuel, ogrenciEkleManuel, okulEkle, okulDuzenle, okulAktiflikDegistir,
  ogrencileriTopluEkle, type TopluOgrenciSonuc,
} from "@/app/dashboard/actions";
import {
  sinifSil, sinifOgrencileriGetir, denemeSonucuTopluGir, ogrenciListesiDisaAktar, adminDuyuruGonder,
  denemeBildirimGonder, adminGonderilenDuyurularGetir, type SinifOgrencisi, type DenemeBildirimSonucu,
} from "@/app/yonetici/actions";
import { SinifEkleFormu } from "@/components/dashboard/OgretmenPanel";
import { DuyuruFormu } from "@/components/dashboard/DuyuruFormu";
import { IzinliOgrenciListesi } from "@/components/yonetici/IzinliOgrenciListesi";
import { AYT_ALAN_ETIKET, BRANS_LISTESI, TYT_DERSLERI, AYT_DERSLERI, BRANS_DENEMESI_DERSLERI, DENEME_ZORLUGU_ETIKET, dersSoruSayisi, dokuzOnSinifMi } from "@/lib/types";
import type { AytAlan, DenemeTuru, DenemeZorlugu } from "@/lib/types";
import { telefonSanitize, okulNoSanitize, TELEFON_IPUCU } from "@/lib/validators";
import { ogrenciKaydiEslestir } from "@/lib/ogrenci-eslestirme";

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
  ogretmen_ekle_manuel: "Öğretmen eklendi",
  mudur_ekle_manuel: "Müdür eklendi",
  admin_duyuru_gonder: "Duyuru gönderildi",
  ogrenci_ekle_manuel: "Öğrenci eklendi",
  ogrenci_toplu_ekle: "Öğrenciler toplu eklendi",
  deneme_toplu_gir: "Deneme sonuçları toplu girildi",
  deneme_bildirim_gonder: "Deneme sonucu bildirimleri gönderildi",
  sinif_ogretmeni_ata: "Sınıf öğretmeni atandı",
  sinif_ogretmenliginden_cikar: "Sınıf öğretmenliğinden çıkarıldı",
  okul_ekle: "Okul eklendi",
  okul_duzenle: "Okul düzenlendi",
  okul_aktiflestir: "Okul aktifleştirildi",
  okul_pasiflestir: "Okul pasifleştirildi",
  sifre_sifirla: "Şifre sıfırlandı",
  hesap_aktiflestir: "Hesap aktifleştirildi",
  hesap_pasiflestir: "Hesap pasifleştirildi",
  hesap_sil: "Kullanıcı kalıcı olarak silindi",
  kullanici_profil_guncelle: "Kullanıcı profili güncellendi",
  kullanici_kurum_degistir: "Kullanıcının okulu değiştirildi",
  veli_ogrenci_bagla: "Veli öğrenciye bağlandı",
  veli_ogrenci_baglantisi_sil: "Veli–öğrenci bağlantısı silindi",
  ogrenci_kaydi_guncelle: "Öğrenci kaydı güncellendi",
  ogrenci_kaydi_sil: "Öğrenci kaydı silindi",
  sinif_sil: "Sınıf silindi",
  ogrenci_sinif_tasi: "Öğrenci sınıf değiştirdi",
  ogretmen_brans_degistir: "Öğretmen branşı değiştirildi",
  veli_talebi_admin_onayla: "Veli talebi onaylandı (admin)",
  veli_talebi_reddet: "Veli talebi reddedildi",
  konu_anlatimi_duzenle: "Konu anlatımı düzenlendi",
  konu_anlatimi_yeniden_uret: "Konu anlatımı yeniden üretildi",
  kurallar_metni_guncelle: "Kayıt kuralları metni güncellendi",
  izinli_ogrenci_listesi_yukle: "İzinli öğrenci listesi güncellendi",
  izinli_ogrenci_sil: "İzinli öğrenci listesinden silindi",
  izinli_ogrenci_listesi_temizle: "İzinli öğrenci listesi temizlendi",
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
      <DuyuruFormu
  baslik="Genel Duyuru Gönder"
  aciklama="Tüm platformdaki öğrenci ve velilere anlık duyuru bildirim gönderin."
  gonder={yoneticiDuyuruGonderAction}
  gecmisGetir={yoneticiGecmisDuyurularAction}
/>

      <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
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
                  style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                  {okullar.map((o) => (
                    <option key={o.id} value={o.id}>{o.ad}{!o.aktif ? " (Pasif)" : ""}</option>
                  ))}
                </select>
                {gorunenOkul && (
                  <button type="button" onClick={() => setOkulDuzenleAcik((v) => !v)} title="Okulu düzenle"
                    className="sgec-btn w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER_STRONG}` }}>
                    <Pencil size={11} color={TEXT_MUTED} />
                  </button>
                )}
                {gorunenOkul && <OgrenciCsvIndirButonu okul={gorunenOkul} />}
              </div>
            )}
            <button type="button" onClick={() => setOkulEkleAcik((v) => !v)}
              className="sgec-btn flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: okulEkleAcik ? MINT : "rgba(255,255,255,0.06)", color: okulEkleAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
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

            <div className="mt-3 flex flex-col gap-3">
              <OgrenciTopluEkleFormu schoolId={gorunenOkul.id} siniflar={siniflar} />
              <DenemeTopluGirisFormu siniflar={siniflar} />
              <IzinliOgrenciListesi schoolId={gorunenOkul.id} />
            </div>
          </>
        )}
      </div>

      <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
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
              <div key={k.id} className="rounded-xl px-3.5 py-2 flex items-center justify-between flex-wrap gap-1.5 text-xs" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
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
    <form onSubmit={ekle} className="rounded-2xl p-4 mb-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Yeni okul</span>
      <div className="flex gap-2 flex-wrap">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Okul adı" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none flex-1 min-w-[140px]" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <select value={tur} onChange={(e) => setTur(e.target.value as "okul" | "dershane")}
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="okul">Okul</option>
          <option value="dershane">Dershane</option>
        </select>
        <input value={okulKodu} onChange={(e) => setOkulKodu(e.target.value)} placeholder="Okul kodu" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none w-32" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
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
    <form onSubmit={kaydet} className="rounded-2xl p-4 mb-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Okulu düzenle</span>
      <div className="flex gap-2 flex-wrap">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Okul adı" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none flex-1 min-w-[140px]" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <input value={okulKodu} onChange={(e) => setOkulKodu(e.target.value)} placeholder="Okul kodu" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none w-32" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
      </div>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending}
          className="sgec-btn text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button type="button" onClick={aktiflikDegistir} disabled={aktiflikPending}
          className="sgec-btn flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60"
          style={{ background: "rgba(255,255,255,0.06)", color: okul.aktif ? BLUSH : MINT, border: `2px solid ${BORDER_STRONG}` }}>
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
    <div className="rounded-xl px-3.5 py-2.5 flex items-center justify-between flex-wrap gap-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
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
          style={{ background: "rgba(255,255,255,0.04)", color: ogretmen.classId ? MINT : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
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
  const [mudur, setMudur] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ email: string; sifre: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startTransition(async () => {
      const res = await ogretmenEkleManuel({ ad, email, telefon, schoolId, brans, mudur });
      if (res.error) return setHata(res.error);
      setSonuc({ email: email.trim().toLowerCase(), sifre: res.sifre! });
      setAd(""); setEmail(""); setTelefon("");
    });
  }

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center gap-1.5">
        <UserPlus size={13} color={MINT} />
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">{mudur ? "Müdür ekle" : "Öğretmen ekle"}</span>
      </div>
      {sonuc && <OlusturulanHesap email={sonuc.email} sifre={sonuc.sifre} />}
      <form onSubmit={ekle} className="flex flex-col gap-2">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ad Soyad" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-posta" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <input value={telefon} onChange={(e) => setTelefon(telefonSanitize(e.target.value))} type="tel" inputMode="numeric" placeholder={TELEFON_IPUCU} required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        {!mudur && (
          <select value={brans} onChange={(e) => setBrans(e.target.value)}
            className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
            {BRANS_LISTESI.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={mudur} onChange={(e) => setMudur(e.target.checked)} />
          <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold">Müdür olarak ekle (okul kodu + şifre ile giriş yapar)</span>
        </label>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <button type="submit" disabled={pending}
          className="sgec-btn text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Ekleniyor..." : mudur ? "Müdür ekle" : "Öğretmen ekle"}
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
  // 9-10. sınıfta AYT alanı sorulmuyor — Branş Denemesi modeli kullanılıyor
  // (bkz. dashboard/OgrenciVeriGirisi). Sunucuya yine bir değer gitmesi
  // gerektiği için (ayt_alan NOT NULL) varsayılan "SAY" sessizce gönderiliyor.
  const dokuzOnMu = dokuzOnSinifMi(siniflar.find((s) => s.id === classId)?.seviye);

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
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center gap-1.5">
        <UserPlus size={13} color={MINT} />
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Öğrenci ekle</span>
      </div>
      {sonuc && <OlusturulanHesap email={sonuc.email} sifre={sonuc.sifre} />}
      <form onSubmit={ekle} className="flex flex-col gap-2">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Ad Soyad" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="E-posta" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <div className="flex gap-2">
          <input value={okulNo} onChange={(e) => setOkulNo(okulNoSanitize(e.target.value))} inputMode="numeric" maxLength={5} placeholder="Okul No" required
            className="text-sm px-3 py-1.5 rounded-xl outline-none w-1/2" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          <input value={telefon} onChange={(e) => setTelefon(telefonSanitize(e.target.value))} type="tel" inputMode="numeric" placeholder="Telefon (ops.)"
            className="text-sm px-3 py-1.5 rounded-xl outline-none w-1/2" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </div>
        <select value={classId} onChange={(e) => setClassId(e.target.value)} required
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="">Sınıf seçin</option>
          {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
        </select>
        {!dokuzOnMu && (
          <select value={aytAlan} onChange={(e) => setAytAlan(e.target.value as AytAlan)}
            className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
            {(Object.keys(AYT_ALAN_ETIKET) as AytAlan[]).map((a) => <option key={a} value={a}>{AYT_ALAN_ETIKET[a]}</option>)}
          </select>
        )}
        <input value={hedefBolum} onChange={(e) => setHedefBolum(e.target.value)} placeholder="Hedef bölüm (ops.)"
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
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
      <div className="flex items-center gap-1.5 rounded-full pl-3 pr-1.5 py-1" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
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

// Satır formatı esnek: "Ad Soyad, Okul No", "Ad Soyad<TAB>Okul No" veya
// sondaki rakam grubu okul no sayılarak "Ad Soyad Okul No" da kabul edilir.
function satirAyristir(satir: string): { ad: string; okulNo: string } | null {
  const virgullu = satir.split(/\t|,/).map((p) => p.trim()).filter(Boolean);
  if (virgullu.length >= 2) return { ad: virgullu[0], okulNo: virgullu[1] };

  const kelimeler = satir.trim().split(/\s+/).filter(Boolean);
  if (kelimeler.length >= 2) {
    const son = kelimeler[kelimeler.length - 1];
    if (/^\d+$/.test(son)) return { ad: kelimeler.slice(0, -1).join(" "), okulNo: son };
  }
  return null;
}

function OgrenciTopluEkleFormu({ schoolId, siniflar }: { schoolId: string; siniflar: SinifSatiri[] }) {
  const [acik, setAcik] = useState(false);
  const [classId, setClassId] = useState("");
  const [aytAlan, setAytAlan] = useState<AytAlan>("SAY");
  const [metin, setMetin] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [sonuclar, setSonuclar] = useState<TopluOgrenciSonuc[] | null>(null);
  const [pending, startTransition] = useTransition();

  const satirlar = metin.split("\n").map((s) => s.trim()).filter(Boolean).map(satirAyristir);
  const gecerliSatirlar = satirlar.filter((s): s is { ad: string; okulNo: string } => s !== null);
  const hatalıSayisi = satirlar.length - gecerliSatirlar.length;
  const dokuzOnMu = dokuzOnSinifMi(siniflar.find((s) => s.id === classId)?.seviye);

  function ekle() {
    setHata(null);
    if (!classId) return setHata("Sınıf seçin.");
    if (gecerliSatirlar.length === 0) return setHata("Ayrıştırılabilir satır bulunamadı.");
    startTransition(async () => {
      const res = await ogrencileriTopluEkle({ schoolId, classId, aytAlan, satirlar: gecerliSatirlar });
      if (res.error) return setHata(res.error);
      setSonuclar(res.sonuclar);
      setMetin("");
    });
  }

  if (!acik) {
    return (
      <button type="button" onClick={() => setAcik(true)}
        className="sgec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl"
        style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
        <ClipboardList size={13} /> Toplu öğrenci ekle
      </button>
    );
  }

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center gap-1.5">
        <ClipboardList size={13} color={MINT} />
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Toplu öğrenci ekle</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px]">Her satıra bir öğrenci: &quot;Ad Soyad, Okul No&quot; (Excel&apos;den yapıştırınca da çalışır).</p>

      <div className="flex gap-2 flex-wrap">
        <select value={classId} onChange={(e) => setClassId(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="">Sınıf seçin</option>
          {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
        </select>
        {!dokuzOnMu && (
          <select value={aytAlan} onChange={(e) => setAytAlan(e.target.value as AytAlan)}
            className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
            {(Object.keys(AYT_ALAN_ETIKET) as AytAlan[]).map((a) => <option key={a} value={a}>{AYT_ALAN_ETIKET[a]}</option>)}
          </select>
        )}
      </div>

      <textarea value={metin} onChange={(e) => setMetin(e.target.value)} rows={6} placeholder={"Ahmet Yılmaz, 1234\nAyşe Kaya, 1235"}
        className="text-xs px-3 py-2.5 rounded-xl outline-none resize-y font-mono" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />

      {metin.trim() && (
        <span style={{ color: TEXT_MUTED }} className="text-[11px]">
          {gecerliSatirlar.length} satır ayrıştırıldı{hatalıSayisi > 0 && <span style={{ color: BLUSH }}> · {hatalıSayisi} satır anlaşılamadı</span>}
        </span>
      )}

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}

      <div className="flex items-center gap-2">
        <button type="button" onClick={ekle} disabled={pending}
          className="sgec-btn text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Ekleniyor..." : `${gecerliSatirlar.length || ""} öğrenciyi ekle`}
        </button>
        <button type="button" onClick={() => { setAcik(false); setSonuclar(null); }}
          className="sgec-btn text-xs font-bold px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED }}>
          Kapat
        </button>
      </div>

      {sonuclar && (
        <div className="rounded-xl p-3 flex flex-col gap-1.5 mt-1" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: TEXT }} className="text-xs font-bold mb-1">
            {sonuclar.filter((s) => !s.hata).length}/{sonuclar.length} eklendi
          </div>
          <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
            {sonuclar.map((s, i) => (
              <div key={i} className="text-[11px] flex items-center justify-between gap-2" style={{ color: s.hata ? BLUSH : TEXT_MUTED }}>
                <span>{s.ad} · #{s.okulNo}</span>
                <span className="font-mono">{s.hata ?? s.sifre}</span>
              </div>
            ))}
          </div>
          <p style={{ color: TEXT_MUTED }} className="text-[10px] mt-1">Şifreler bir kerelik gösterildi, kaydedin — tekrar gösterilmeyecek.</p>
        </div>
      )}
    </div>
  );
}

function bugununTarihi(): string {
  return new Date().toISOString().slice(0, 10);
}

// Ders bazlı toplu giriş: bir sınıfın tamamı için TEK bir dersin doğru/yanlış
// sayılarını girip kaydeder (optik okuma sonrası tipik kullanım — ders ders
// işlenir). Aynı öğrenci+tarih+tür için "ogretmen" kaynaklı deneme zaten
// varsa (başka bir ders için önceden girilmişse) sonuç ona eklenir.
function DenemeTopluGirisFormu({ siniflar }: { siniflar: SinifSatiri[] }) {
  const [acik, setAcik] = useState(false);
  const [classId, setClassId] = useState("");
  const [tarih, setTarih] = useState(bugununTarihi());
  const [tur, setTur] = useState<DenemeTuru>("TYT");
  const [zorluk, setZorluk] = useState<DenemeZorlugu>("orta");
  const [aytAlan, setAytAlan] = useState<AytAlan>("SAY");
  const [ogrenciler, setOgrenciler] = useState<SinifOgrencisi[] | null>(null);
  const [girisler, setGirisler] = useState<Record<string, { dogru: string; yanlis: string }>>({});
  const [hata, setHata] = useState<string | null>(null);
  const [sonuclar, setSonuclar] = useState<{ ad: string; hata: string | null }[] | null>(null);
  const [yapistirilan, setYapistirilan] = useState("");
  const [eslestirmeRaporu, setEslestirmeRaporu] = useState<{ kaynak: string; sonuc: string; hata: boolean }[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [bildirimHata, setBildirimHata] = useState<string | null>(null);
  const [bildirimSonuclari, setBildirimSonuclari] = useState<DenemeBildirimSonucu[] | null>(null);
  const [bildirimPending, startBildirimTransition] = useTransition();

  // 9-10. sınıfta TYT/AYT hiç sorulmuyor: seçilen sınıfın seviyesine göre
  // form otomatik Branş Denemesi moduna geçiyor (bkz. dashboard/OgrenciVeriGirisi
  // aynı mantık öğrenci tarafında da uygulanıyor).
  const seciliSinif = siniflar.find((s) => s.id === classId);
  const dokuzOnMu = dokuzOnSinifMi(seciliSinif?.seviye);
  const efektifTur: DenemeTuru = dokuzOnMu ? "BRANS" : tur;

  const dersListesi = dokuzOnMu ? [...BRANS_DENEMESI_DERSLERI] : (tur === "TYT" ? TYT_DERSLERI : AYT_DERSLERI[aytAlan]);
  const [ders, setDers] = useState<string>(dersListesi[0]);
  const dersListesiKey = dersListesi.join("|");

  function classIdSec(id: string) {
    setClassId(id);
    setOgrenciler(null);
    setGirisler({});
    setSonuclar(null);
    setEslestirmeRaporu(null);
    const yeniSinif = siniflar.find((s) => s.id === id);
    setDers(dokuzOnSinifMi(yeniSinif?.seviye) ? BRANS_DENEMESI_DERSLERI[0] : TYT_DERSLERI[0]);
    if (!id) return;
    sinifOgrencileriGetir(id).then((res) => {
      if (res.error) return setHata(res.error);
      setOgrenciler(res.ogrenciler);
    });
  }

  function turDegistir(yeniTur: DenemeTuru) {
    setTur(yeniTur);
    const yeniListe = yeniTur === "TYT" ? TYT_DERSLERI : AYT_DERSLERI[aytAlan];
    setDers(yeniListe[0]);
  }

  function alanDegistir(yeniAlan: AytAlan) {
    setAytAlan(yeniAlan);
    if (tur === "AYT") setDers(AYT_DERSLERI[yeniAlan][0]);
  }

  const filtrelenmisOgrenciler = (ogrenciler ?? []).filter((o) => dokuzOnMu || tur === "TYT" || o.aytAlan === aytAlan);
  const maxSoru = dersSoruSayisi(efektifTur, ders);

  function alanGuncelle(studentId: string, alan: "dogru" | "yanlis", deger: string) {
    setGirisler((g) => ({ ...g, [studentId]: { ...(g[studentId] ?? { dogru: "", yanlis: "" }), [alan]: deger } }));
  }

  function yapistirilaniEslestir() {
    if (!ogrenciler) return setHata("Önce sınıf seçin.");
    const rapor: { kaynak: string; sonuc: string; hata: boolean }[] = [];
    const yeniGirisler: Record<string, { dogru: string; yanlis: string }> = {};
    for (const [index, ham] of yapistirilan.split(/\r?\n/).entries()) {
      if (!ham.trim()) continue;
      const parcalar = ham.includes("\t") ? ham.split("\t") : ham.split(";");
      if (parcalar.length < 4) {
        rapor.push({ kaynak: `${index + 1}. satır`, sonuc: "Biçim: okul no; ad soyad; doğru; yanlış", hata: true });
        continue;
      }
      const [okulNo, ad, dogruHam, yanlisHam] = parcalar.map((p) => p.trim());
      const dogru = Number(dogruHam.replace(",", "."));
      const yanlis = Number(yanlisHam.replace(",", "."));
      if (!Number.isInteger(dogru) || !Number.isInteger(yanlis) || dogru < 0 || yanlis < 0 || (maxSoru !== undefined && dogru + yanlis > maxSoru)) {
        rapor.push({ kaynak: `${okulNo} - ${ad}`, sonuc: `Doğru/yanlış değerleri geçersiz${maxSoru ? ` veya toplam ${maxSoru} soruyu aşıyor` : ""}.`, hata: true });
        continue;
      }
      const eslesme = ogrenciKaydiEslestir({ okulNo, ad }, ogrenciler);
      if (eslesme.durum === "belirsiz") {
        rapor.push({ kaynak: `${okulNo} - ${ad}`, sonuc: eslesme.gerekce, hata: true });
        continue;
      }
      yeniGirisler[eslesme.ogrenci.id] = { dogru: String(dogru), yanlis: String(yanlis) };
      rapor.push({ kaynak: `${okulNo} - ${ad}`, sonuc: `${eslesme.ogrenci.okulNo} - ${eslesme.ogrenci.ad}: ${eslesme.gerekce}`, hata: false });
    }
    setGirisler((g) => ({ ...g, ...yeniGirisler }));
    setEslestirmeRaporu(rapor);
    setHata(rapor.length === 0 ? "Eşleştirilecek satır bulunamadı." : null);
  }

  function kaydet() {
    const girilenler = filtrelenmisOgrenciler
      .map((o) => ({ studentId: o.id, g: girisler[o.id] }))
      .filter(({ g }) => g && (g.dogru.trim() !== "" || g.yanlis.trim() !== ""))
      .map(({ studentId, g }) => ({ studentId, dogru: Number(g!.dogru) || 0, yanlis: Number(g!.yanlis) || 0 }));

    if (girilenler.length === 0) return setHata("En az bir öğrenci için sonuç girin.");
    setHata(null);
    startTransition(async () => {
      const res = await denemeSonucuTopluGir({ tarih, tur: efektifTur, zorluk, ders, sonuclar: girilenler });
      if (res.error) return setHata(res.error);
      const adMap = new Map(filtrelenmisOgrenciler.map((o) => [o.id, o.ad]));
      setSonuclar(res.sonuclar.map((s) => ({ ad: adMap.get(s.studentId) ?? "—", hata: s.hata })));
      setGirisler({});
    });
  }

  // Bir sınıfın o tarih/türdeki bütün dersleri girildikten sonra tek seferlik
  // tetiklenir: sonucu hiç girilmemiş öğrencinin velisine uyarı, girilmiş
  // öğrencinin velisine + sınıf öğretmenine + öğrencinin kendisine bilgi
  // mesajı gider. Aynı durumda tekrar tıklanırsa ikinci kez bildirim gitmez.
  function bildirimGonder() {
    if (!classId) return setBildirimHata("Sınıf seçin.");
    setBildirimHata(null);
    startBildirimTransition(async () => {
      const res = await denemeBildirimGonder({ classId, tarih, tur: efektifTur, aytAlan: !dokuzOnMu && tur === "AYT" ? aytAlan : undefined });
      if (res.error) return setBildirimHata(res.error);
      setBildirimSonuclari(res.sonuclar);
    });
  }

  if (!acik) {
    return (
      <button type="button" onClick={() => setAcik(true)}
        className="sgec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl"
        style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
        <ClipboardList size={13} /> Toplu deneme sonucu gir
      </button>
    );
  }

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center gap-1.5">
        <ClipboardList size={13} color={MINT} />
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Toplu deneme sonucu gir</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px]">Bir sınıfın tamamı için tek bir dersin sonuçlarını girin; farklı ders için tekrar açıp aynı tarih/türü seçerseniz aynı denemeye eklenir.</p>

      <div className="flex gap-2 flex-wrap">
        <select value={classId} onChange={(e) => classIdSec(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          <option value="">Sınıf seçin</option>
          {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
        </select>
        <input type="date" value={tarih} onChange={(e) => setTarih(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        {dokuzOnMu ? (
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl flex items-center" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT_MUTED }}>
            Branş Denemesi
          </span>
        ) : (
          <>
            <select value={tur} onChange={(e) => turDegistir(e.target.value as DenemeTuru)}
              className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              <option value="TYT">TYT</option>
              <option value="AYT">AYT</option>
            </select>
            {tur === "AYT" && (
              <select value={aytAlan} onChange={(e) => alanDegistir(e.target.value as AytAlan)}
                className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
                {(Object.keys(AYT_ALAN_ETIKET) as AytAlan[]).map((a) => <option key={a} value={a}>{AYT_ALAN_ETIKET[a]}</option>)}
              </select>
            )}
          </>
        )}
        <select value={ders} onChange={(e) => setDers(e.target.value)} key={dersListesiKey}
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          {dersListesi.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={zorluk} onChange={(e) => setZorluk(e.target.value as DenemeZorlugu)}
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
          {(Object.keys(DENEME_ZORLUGU_ETIKET) as DenemeZorlugu[]).map((z) => <option key={z} value={z}>{DENEME_ZORLUGU_ETIKET[z]}</option>)}
        </select>
      </div>

      {classId && ogrenciler !== null && (
        <div className="rounded-2xl p-3 flex flex-col gap-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: TEXT }} className="text-xs font-bold">Listeyi yapıştır ve güvenli eşleştir</div>
          <p style={{ color: TEXT_MUTED }} className="text-[10px]">Her satır: <strong>okul no; ad soyad; doğru; yanlış</strong>. Birebir olmayan adlar okul numarası ve ortak ad parçalarıyla değerlendirilir; belirsiz kayıtlar otomatik doldurulmaz.</p>
          <textarea value={yapistirilan} onChange={(e) => setYapistirilan(e.target.value)} rows={4}
            placeholder={"307; İkra; 37; 3\n195; Nilda Karadaş; 33; 7"}
            className="w-full resize-y rounded-xl px-3 py-2 text-xs outline-none" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
          <button type="button" onClick={yapistirilaniEslestir} className="sgec-btn self-start rounded-xl px-3.5 py-2 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>
            Eşleştir ve alanları doldur
          </button>
          {eslestirmeRaporu && (
            <div className="max-h-44 overflow-y-auto rounded-xl p-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
              {eslestirmeRaporu.map((r, i) => <div key={`${r.kaynak}-${i}`} className="py-1 text-[10px] leading-relaxed" style={{ color: r.hata ? BLUSH : TEXT }}><strong>{r.kaynak}</strong> → {r.sonuc}</div>)}
            </div>
          )}
        </div>
      )}

      {classId && ogrenciler === null && <p style={{ color: TEXT_MUTED }} className="text-xs py-2 text-center">Öğrenciler yükleniyor...</p>}
      {classId && ogrenciler !== null && filtrelenmisOgrenciler.length === 0 && (
        <p style={{ color: TEXT_MUTED }} className="text-xs py-2 text-center">Bu sınıfta/alanda öğrenci yok.</p>
      )}

      {filtrelenmisOgrenciler.length > 0 && (
        <div className="flex flex-col gap-1.5 max-h-72 overflow-y-auto">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide px-1" style={{ color: TEXT_MUTED }}>
            <span className="flex-1">Öğrenci</span>
            <span className="w-16 text-center">Doğru</span>
            <span className="w-16 text-center">Yanlış</span>
          </div>
          {filtrelenmisOgrenciler.map((o) => (
            <div key={o.id} className="flex items-center gap-2 rounded-xl px-2.5 py-1.5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
              <span style={{ color: TEXT }} className="text-xs font-semibold flex-1">{o.ad} <span style={{ color: TEXT_MUTED }} className="font-normal">#{o.okulNo}</span></span>
              <input type="number" min={0} max={maxSoru} value={girisler[o.id]?.dogru ?? ""} onChange={(e) => alanGuncelle(o.id, "dogru", e.target.value)}
                className="w-16 text-xs px-2 py-1 rounded-lg outline-none text-center" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
              <input type="number" min={0} max={maxSoru} value={girisler[o.id]?.yanlis ?? ""} onChange={(e) => alanGuncelle(o.id, "yanlis", e.target.value)}
                className="w-16 text-xs px-2 py-1 rounded-lg outline-none text-center" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
            </div>
          ))}
        </div>
      )}

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}

      <div className="flex items-center gap-2">
        <button type="button" onClick={kaydet} disabled={pending || filtrelenmisOgrenciler.length === 0}
          className="sgec-btn text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Sonuçları kaydet"}
        </button>
        <button type="button" onClick={() => { setAcik(false); setSonuclar(null); }}
          className="sgec-btn text-xs font-bold px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED }}>
          Kapat
        </button>
      </div>

      {sonuclar && (
        <div className="rounded-xl p-3 flex flex-col gap-1 mt-1" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: TEXT }} className="text-xs font-bold mb-1">
            {sonuclar.filter((s) => !s.hata).length}/{sonuclar.length} kaydedildi
          </div>
          {sonuclar.filter((s) => s.hata).map((s, i) => (
            <div key={i} style={{ color: BLUSH }} className="text-[11px]">{s.ad}: {s.hata}</div>
          ))}
        </div>
      )}

      {classId && (
        <div className="rounded-2xl p-3 mt-1 flex flex-col gap-2" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: TEXT }} className="text-xs font-bold">Velilere ve öğrenciye bildirim gönder</div>
          <p style={{ color: TEXT_MUTED }} className="text-[10px]">
            Sınıfın o tarih/türe ait tüm dersleri girildikten sonra tek sefer tıklayın: sonucu girilmeyen öğrencinin velisine uyarı,
            girilen öğrencinin velisine, sınıf öğretmenine ve öğrencinin kendisine bilgi mesajı gider. Durumu değişmeyen öğrenciye
            tekrar tıklansa bile ikinci kez bildirim gitmez.
          </p>
          <button type="button" onClick={bildirimGonder} disabled={bildirimPending}
            className="sgec-btn self-start text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            {bildirimPending ? "Gönderiliyor..." : "Bildirim gönder"}
          </button>
          {bildirimHata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{bildirimHata}</div>}
          {bildirimSonuclari && (
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1 mt-1">
              <div style={{ color: TEXT }} className="text-xs font-bold mb-1">
                {bildirimSonuclari.filter((s) => s.gonderildi).length}/{bildirimSonuclari.length} bildirim gönderildi
                {" · "}{bildirimSonuclari.filter((s) => s.durum === "girildi").length} girildi, {bildirimSonuclari.filter((s) => s.durum === "girilmedi").length} girilmedi
              </div>
              {bildirimSonuclari.map((s, i) => (
                <div key={i} className="text-[11px] flex items-center justify-between gap-2" style={{ color: s.durum === "girilmedi" ? BLUSH : TEXT_MUTED }}>
                  <span>{s.ad}</span>
                  <span>{s.durum === "girildi" ? "Girildi" : "Girilmedi"}{!s.gonderildi && " · daha önce bildirildi"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function csvKacir(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

// UTF-8 BOM ekleniyor ki Excel Türkçe karakterleri (ı,ş,ğ...) doğru göstersin.
function csvIndir(dosyaAdi: string, basliklar: string[], satirlar: string[][]) {
  const icerik = [basliklar, ...satirlar].map((satir) => satir.map(csvKacir).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + icerik], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = dosyaAdi;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function OgrenciCsvIndirButonu({ okul }: { okul: OkulSatiri }) {
  const [pending, startTransition] = useTransition();
  const [hata, setHata] = useState<string | null>(null);

  function indir() {
    setHata(null);
    startTransition(async () => {
      const res = await ogrenciListesiDisaAktar(okul.id);
      if (res.error) return setHata(res.error);
      if (res.satirlar.length === 0) return setHata("Bu okulda kayıtlı öğrenci yok.");
      csvIndir(
        `${okul.ad.replace(/[^\w]+/g, "_")}_ogrenciler.csv`,
        ["Ad Soyad", "Okul No", "Sınıf", "AYT Alanı", "Hedef Bölüm", "E-posta", "Telefon"],
        res.satirlar.map((s) => [s.ad, s.okulNo, s.sinifAdi ?? "", s.aytAlan, s.hedefBolum, s.email ?? "", s.telefon ?? ""]),
      );
    });
  }

  return (
    <div className="flex flex-col items-end">
      <button type="button" onClick={indir} disabled={pending} title="Öğrenci listesini CSV indir"
        className="sgec-btn w-7 h-7 rounded-full flex items-center justify-center shrink-0 disabled:opacity-60"
        style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER_STRONG}` }}>
        <Download size={11} color={TEXT_MUTED} />
      </button>
      {hata && <span style={{ color: BLUSH }} className="text-[10px] font-semibold mt-1">{hata}</span>}
    </div>
  );
}
