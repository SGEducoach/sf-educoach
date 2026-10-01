"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Building2, UserPlus, Copy, Check, Plus, Pencil, EyeOff, Eye, X, ClipboardList, Download } from "lucide-react";
import { BG0, BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import {
  sinifOgretmeniAta, ogretmenEkleManuel, ogrenciEkleManuel, okulEkle, okulDuzenle, okulAktiflikDegistir,
  ogrencileriTopluEkle, type TopluOgrenciSonuc,
} from "@/app/dashboard/actions";
import {
  sinifSil, sinifOgrencileriGetir, denemeSonucuTopluGir, ogrenciListesiDisaAktar,
  denemeBildirimGonder, type SinifOgrencisi, type DenemeBildirimSonucu,
} from "@/app/yonetici/actions";
import { SinifEkleFormu } from "@/components/dashboard/OgretmenPanel";
import { DershaneDenemePdfFormu } from "@/components/dashboard/DershaneDenemePdfFormu";
import { bugununTarihiTR } from "@/lib/tarih";
import { IzinliOgrenciListesi } from "@/components/yonetici/IzinliOgrenciListesi";
import { AYT_ALAN_ETIKET, TYT_DERSLERI, AYT_DERSLERI, BRANS_DENEMESI_DERSLERI, DENEME_ZORLUGU_ETIKET, dersSoruSayisi, dokuzOnSinifMi } from "@/lib/types";
import type { AytAlan, DenemeTuru, DenemeZorlugu } from "@/lib/types";
import { KURUM_KADEMESI_ETIKET, KURUM_SECIMI_ACIKLAMA, KURUM_SECIMI_ETIKET, KURUM_SECIMI_SIRASI, alanSorulurMu, hedefYerTutucusu, kademeBul, kurumSecimi, kurumSeciminiCoz, panelBransListesi } from "@/lib/kademe";
import type { KurumSecimi } from "@/lib/kademe";
import type { KurumKademesi, KurumTuru } from "@/lib/types";
import { telefonSanitize, okulNoSanitize, TELEFON_IPUCU } from "@/lib/validators";
import { ogrenciKaydiEslestir } from "@/lib/ogrenci-eslestirme";

interface OkulSatiri {
  id: string;
  ad: string;
  okul_kodu: string;
  tur: "okul" | "dershane";
  aktif: boolean;
  // Kurumun kademesi (migration 0128) — sınıf seviyesi seçeneklerini belirler.
  kademe?: KurumKademesi;
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
export function AdminPanel({
  okullar, gorunecekOkulId, siniflar, ogretmenListesi,
}: {
  okullar: OkulSatiri[];
  gorunecekOkulId: string | null;
  siniflar: SinifSatiri[];
  ogretmenListesi: OgretmenSatiri[];
}) {
  const router = useRouter();
  const gorunenOkul = okullar.find((o) => o.id === gorunecekOkulId);
  const [okulEkleAcik, setOkulEkleAcik] = useState(false);
  const [okulDuzenleAcik, setOkulDuzenleAcik] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
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
                  onChange={(e) => router.push(`/yonetici/okullar?okul=${e.target.value}`)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full outline-none"
                  style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                  {/* Kademe yalnız lise DIŞINDA yazılıyor: kurumların çoğu lise,
                      hepsine etiket basmak listeyi gürültüye çevirir. */}
                  {okullar.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.ad}
                      {o.kademe && o.kademe !== "lise" ? ` · ${KURUM_KADEMESI_ETIKET[o.kademe]}` : ""}
                      {!o.aktif ? " (Pasif)" : ""}
                    </option>
                  ))}
                </select>
                {gorunenOkul && (
                  <button type="button" onClick={() => setOkulDuzenleAcik((v) => !v)} title="Kurumu düzenle"
                    className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER_STRONG}` }}>
                    <Pencil size={11} color={TEXT_MUTED} />
                  </button>
                )}
                {gorunenOkul && <OgrenciCsvIndirButonu okul={gorunenOkul} />}
              </div>
            )}
            <button type="button" onClick={() => setOkulEkleAcik((v) => !v)}
              className="sfec-btn flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ background: okulEkleAcik ? MINT : "rgba(255,255,255,0.06)", color: okulEkleAcik ? MINT_ON : TEXT_MUTED, border: `2px solid ${BORDER_STRONG}` }}>
              <Plus size={12} /> Kurum ekle
            </button>
          </div>
        </div>

        {okulEkleAcik && (
          <OkulEkleFormu onDone={(yeniOkulId) => {
            setOkulEkleAcik(false);
            // Kullanıcı isteği (27.08.2026): "yeni eklenen kurum ilk iş
            // olarak sınıflarını oluştursun" — yeni kurum otomatik seçilip
            // aşağıdaki "Sınıflar" bölümüne (SinifEkleFormu + boş-sınıf
            // uyarısı) düşülüyor.
            if (yeniOkulId) router.push(`/yonetici/okullar?okul=${yeniOkulId}`);
          }} />
        )}
        {gorunenOkul && okulDuzenleAcik && (
          <OkulDuzenleFormu okul={gorunenOkul} onDone={() => setOkulDuzenleAcik(false)} />
        )}

        {!gorunenOkul ? (
          <p style={{ color: TEXT_MUTED }} className="text-sm py-4 text-center">Henüz kayıtlı okul yok.</p>
        ) : (
          <>
            <SinifEkleFormu schoolId={gorunenOkul.id} kademe={gorunenOkul.kademe} />

            {/* Kullanıcı isteği (27.08.2026): "yeni eklenen kurum ilk iş
                olarak sınıflarını oluştursun" — sınıf yoksa sessizce
                boş kalmak yerine açık bir yönlendirme gösteriliyor. */}
            {siniflar.length === 0 ? (
              <p style={{ color: BLUSH }} className="mt-3 text-xs font-semibold">
                Bu kurum için henüz sınıf eklenmedi. Öğretmen/öğrenci eklemeden önce yukarıdan sınıflarınızı oluşturun.
              </p>
            ) : (
              <div className="mt-4">
                <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold uppercase tracking-wide mb-2 block">
                  Sınıflar ({siniflar.length})
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {siniflar.map((s) => <SinifRozeti key={s.id} sinif={s} />)}
                </div>
              </div>
            )}

            <OgretmenListesiKutusu ogretmenListesi={ogretmenListesi} siniflar={siniflar} />

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <OgretmenEkleFormu schoolId={gorunenOkul.id} okullar={okullar} />
              <OgrenciEkleFormu schoolId={gorunenOkul.id} siniflar={siniflar} />
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <OgrenciTopluEkleFormu schoolId={gorunenOkul.id} siniflar={siniflar} />
              <DenemeTopluGirisFormu siniflar={siniflar} />
              {/* Kullanıcı isteği (29.09.2026): deneme yüklemenin asıl yeri
                  artık sol menüdeki "Deneme ve İçerik › Deneme Yükle"
                  bölümü. Buradaki kopya, okul üzerinde çalışırken elinin
                  altında dursun diye kaldı — ama kapalı, sayfa uzamasın. */}
              <details key={gorunenOkul.id} className="rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
                <summary className="cursor-pointer text-sm font-bold" style={{ color: TEXT }}>Deneme sonucu yükle (PDF / Excel)</summary>
                <p className="my-3 text-xs" style={{ color: TEXT_MUTED }}>
                  Sonuçlar yalnızca seçili kurumun öğrencileriyle eşleştirilir: {gorunenOkul.ad}.{" "}
                  <Link href="/yonetici/deneme-yukle" className="underline" style={{ color: MINT }}>Deneme Yükle bölümünde</Link> tam ekran çalışabilirsiniz.
                </p>
                <DershaneDenemePdfFormu schoolId={gorunenOkul.id} />
              </details>
              <IzinliOgrenciListesi schoolId={gorunenOkul.id} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Kurum seçimi düğmeleri — ekleme ve düzenleme formu AYNI bileşeni kullanıyor.
// Daha önce iki yere ayrı yazılmıştı; bir seçenek eklendiğinde birinin
// unutulması kaçınılmazdı.
function KurumSecimiDugmeleri({ secim, setSecim }: { secim: KurumSecimi; setSecim: (s: KurumSecimi) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {KURUM_SECIMI_SIRASI.map((k) => (
        <button key={k} type="button" onClick={() => setSecim(k)}
          className="sfec-btn rounded-full px-3.5 py-1.5 text-xs font-bold"
          style={{
            background: secim === k ? MINT : BG0,
            color: secim === k ? MINT_ON : TEXT,
            border: `2px solid ${secim === k ? MINT : BORDER_STRONG}`,
          }}>
          {KURUM_SECIMI_ETIKET[k]}
        </button>
      ))}
    </div>
  );
}

// Kullanıcı isteği (01.10.2026): kurum eklerken TEK seçim — Ortaokul / Lise /
// Ortaokul+Lise / Dershane. Seçim arka planda tur + kademe alanlarına
// çözülüyor; böylece ortaokulda sınıf eklerken 9-12 boş yere görünmüyor.
function OkulEkleFormu({ onDone }: { onDone: (yeniOkulId?: string) => void }) {
  const [ad, setAd] = useState("");
  const [secim, setSecim] = useState<KurumSecimi>("lise");
  const [okulKodu, setOkulKodu] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    const { tur, kademe } = kurumSeciminiCoz(secim);
    startTransition(async () => {
      const res = await okulEkle({ ad, tur, okulKodu, kademe });
      if (res.error) return setHata(res.error);
      setAd(""); setOkulKodu("");
      onDone(res.id ?? undefined);
    });
  }

  return (
    <form onSubmit={ekle} className="rounded-2xl p-4 mb-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Yeni kurum</span>
      <KurumSecimiDugmeleri secim={secim} setSecim={setSecim} />
      <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{KURUM_SECIMI_ACIKLAMA[secim]}</p>
      <div className="flex gap-2 flex-wrap">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Kurum adı" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none flex-1 min-w-[140px]" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <input value={okulKodu} onChange={(e) => setOkulKodu(e.target.value)} placeholder="Kurum kodu" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none w-32" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
      </div>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" disabled={pending}
        className="sfec-btn self-start text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {pending ? "Ekleniyor..." : "Kurumu ekle"}
      </button>
    </form>
  );
}

function OkulDuzenleFormu({ okul, onDone }: { okul: OkulSatiri; onDone: () => void }) {
  const [ad, setAd] = useState(okul.ad);
  const [okulKodu, setOkulKodu] = useState(okul.okul_kodu);
  const [secim, setSecim] = useState<KurumSecimi>(kurumSecimi(okul.tur, okul.kademe));
  const [hata, setHata] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [aktiflikPending, startAktiflikTransition] = useTransition();

  function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startTransition(async () => {
      const { tur, kademe } = kurumSeciminiCoz(secim);
      const res = await okulDuzenle(okul.id, { ad, okulKodu, tur, kademe });
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
      <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">Kurumu düzenle</span>
      {/* Kademe sonradan düzeltilebilir: kurum yanlış türle açıldıysa yeniden
          oluşturmak yerine buradan değiştirilir. Sınıf seviyesi seçenekleri
          anında buna göre daralır. */}
      <KurumSecimiDugmeleri secim={secim} setSecim={setSecim} />
      {secim !== kurumSecimi(okul.tur, okul.kademe) && (
        <p className="text-[11px] font-semibold" style={{ color: BLUSH }}>
          Kademe değişiyor. Mevcut sınıflar silinmez; bundan sonra açacağın sınıfların seviyeleri yeni kademeye göre listelenir.
        </p>
      )}
      <div className="flex gap-2 flex-wrap">
        <input value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Kurum adı" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none flex-1 min-w-[140px]" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        <input value={okulKodu} onChange={(e) => setOkulKodu(e.target.value)} placeholder="Kurum kodu" required
          className="text-sm px-3 py-1.5 rounded-xl outline-none w-32" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
      </div>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending}
          className="sfec-btn text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button type="button" onClick={aktiflikDegistir} disabled={aktiflikPending}
          className="sfec-btn flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60"
          style={{ background: "rgba(255,255,255,0.06)", color: okul.aktif ? BLUSH : MINT, border: `2px solid ${BORDER_STRONG}` }}>
          {okul.aktif ? <><EyeOff size={12} /> Pasifleştir</> : <><Eye size={12} /> Aktifleştir</>}
        </button>
      </div>
    </form>
  );
}

// Kullanıcı isteği (29.09.2026): "kurum öğretmenler listesi arttıkça uzayıp
// sayfayı kaplıyor, programı eşleşmeyen öğretmenler listesi gibi bir şekle
// sokulabilir" — kendi çerçevesinde, kaydırmalı ve aramalı bir kutu.
const LISTE_ESIGI = 8;

function OgretmenListesiKutusu({ ogretmenListesi, siniflar }: { ogretmenListesi: OgretmenSatiri[]; siniflar: SinifSatiri[] }) {
  const [arama, setArama] = useState("");
  const kucuk = arama.trim().toLocaleLowerCase("tr");
  const gorunen = kucuk
    ? ogretmenListesi.filter((o) => `${o.ad} ${o.brans} ${o.sinifAdi ?? ""}`.toLocaleLowerCase("tr").includes(kucuk))
    : ogretmenListesi;
  const uzunListe = ogretmenListesi.length > LISTE_ESIGI;

  return (
    <div className="mt-5 rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold uppercase tracking-wide">
          Öğretmenler ({ogretmenListesi.length})
        </span>
        {uzunListe && (
          <input value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Ad, branş veya sınıf ara"
            className="ml-auto min-w-[160px] flex-1 rounded-xl px-3 py-1.5 text-xs outline-none sm:max-w-xs"
            style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }} />
        )}
      </div>
      {ogretmenListesi.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="py-3 text-center text-sm">Henüz kayıtlı öğretmen yok.</p>
      ) : gorunen.length === 0 ? (
        <p style={{ color: TEXT_MUTED }} className="py-3 text-center text-sm">Aramaya uyan öğretmen yok.</p>
      ) : (
        <>
          <div className={`sfec-liste ${uzunListe ? "max-h-96 overflow-y-auto pr-1" : ""}`}>
            {gorunen.map((o) => (
              <OgretmenSatir key={o.id} ogretmen={o} siniflar={siniflar} />
            ))}
          </div>
          {uzunListe && kucuk && (
            <p className="mt-2 text-[11px]" style={{ color: TEXT_MUTED }}>{gorunen.length} / {ogretmenListesi.length} öğretmen</p>
          )}
        </>
      )}
    </div>
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
    <div className="sfec-liste-satiri flex items-center justify-between gap-2 px-2 py-3">
      <div>
        <div style={{ color: TEXT }} className="text-sm font-semibold">
          {ogretmen.ad} {ogretmen.mudurMu && <span style={{ color: LILAC }} className="text-[10px] font-bold ml-1">Müdür</span>}
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
        className="sfec-btn shrink-0 flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
        style={{ background: MINT, color: MINT_ON }}>
        {kopyalandi ? <><Check size={12} /> Kopyalandı</> : <><Copy size={12} /> Kopyala</>}
      </button>
    </div>
  );
}

function OgretmenEkleFormu({ schoolId, okullar }: { schoolId: string; okullar: OkulSatiri[] }) {
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [mudur, setMudur] = useState(false);
  const [hedefOkulId, setHedefOkulId] = useState(schoolId);
  // Branş listesi SEÇİLİ kurumun kademesine göre: ortaokulda "Türk Dili ve
  // Edebiyatı" değil "Türkçe", İnkılap ayrı branş olarak yok (kullanıcı
  // kararı 01.10.2026).
  const hedefOkul = okullar.find((o) => o.id === hedefOkulId) ?? null;
  const branslar = panelBransListesi((hedefOkul?.tur as KurumTuru | undefined) ?? "okul", hedefOkul?.kademe);
  const [secilenBrans, setBrans] = useState<string>(branslar[0]);
  // Kurum değişince eski kademenin branşı seçili kalmasın. Durumu efektle
  // düzeltmek yerine TÜRETİYORUZ: seçim listede yoksa ilk kaleme düşer.
  const brans = branslar.includes(secilenBrans) ? secilenBrans : branslar[0];
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ email: string; sifre: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Üstteki okul seçici değişirse (başka bir okula geçilirse) müdür hedefi
  // de varsayılan olarak onu takip etsin — render sırasında senkronize
  // etme deseni (bkz. DershaneRosterEkleFormu'daki aynı çözüm).
  const [sonSchoolId, setSonSchoolId] = useState(schoolId);
  if (schoolId !== sonSchoolId) { setSonSchoolId(schoolId); setHedefOkulId(schoolId); }

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startTransition(async () => {
      const res = await ogretmenEkleManuel({ ad, email, telefon, schoolId: mudur ? hedefOkulId : schoolId, brans, mudur });
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
            {branslar.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={mudur} onChange={(e) => setMudur(e.target.checked)} />
          <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold">Müdür olarak ekle (okul kodu + şifre ile giriş yapar)</span>
        </label>
        {mudur && (
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Hangi kuruma atansın?</span>
            <select value={hedefOkulId} onChange={(e) => setHedefOkulId(e.target.value)} required
              className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              {okullar.map((o) => <option key={o.id} value={o.id}>{o.ad}{!o.aktif ? " (Pasif)" : ""}</option>)}
            </select>
          </label>
        )}
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <button type="submit" disabled={pending}
          className="sfec-btn text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
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
  // Ortaokul (5-8) sinifi secilince YKS alani HIC sorulmaz; hedef de bolum
  // degil meslek olur (kullanici karari 01.10.2026). Karar KURUMUN degil
  // SECILEN SINIFIN seviyesinden turetiliyor — "ikisi" kurumunda ayni formda
  // hem 5-A hem 11-B acilabiliyor.
  const seciliKademe = kademeBul(siniflar.find((s) => s.id === classId)?.seviye);

  function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!classId) return setHata("Sınıf seçin.");
    startTransition(async () => {
      try {
        const res = await ogrenciEkleManuel({ ad, email, okulNo, telefon, schoolId, classId, aytAlan, hedefBolum });
        if (res.error || !res.sifre) return setHata(res.error ?? "Öğrenci hesabı oluşturulamadı.");
        setSonuc({ email: email.trim().toLowerCase(), sifre: res.sifre });
        setAd(""); setEmail(""); setOkulNo(""); setTelefon(""); setHedefBolum("");
      } catch {
        setHata("Öğrenci eklenemedi. Bağlantınızı kontrol edip tekrar deneyin.");
      }
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
        {!dokuzOnMu && alanSorulurMu(seciliKademe) && (
          <select value={aytAlan} onChange={(e) => setAytAlan(e.target.value as AytAlan)}
            className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
            {(Object.keys(AYT_ALAN_ETIKET) as AytAlan[]).map((a) => <option key={a} value={a}>{AYT_ALAN_ETIKET[a]}</option>)}
          </select>
        )}
        <input value={hedefBolum} onChange={(e) => setHedefBolum(e.target.value.toLocaleUpperCase("tr-TR"))} autoCapitalize="characters" placeholder={hedefYerTutucusu(seciliKademe)}
          className="text-sm px-3 py-1.5 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <button type="submit" disabled={pending}
          className="sfec-btn text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
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
          className="sfec-btn w-5 h-5 rounded-full flex items-center justify-center disabled:opacity-60" style={{ background: "rgba(255,255,255,0.06)" }}>
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
        className="sfec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl"
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
          className="sfec-btn text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Ekleniyor..." : `${gecerliSatirlar.length || ""} öğrenciyi ekle`}
        </button>
        <button type="button" onClick={() => { setAcik(false); setSonuclar(null); }}
          className="sfec-btn text-xs font-bold px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED }}>
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
  return bugununTarihiTR();
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
        className="sfec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl"
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
          <button type="button" onClick={yapistirilaniEslestir} className="sfec-btn self-start rounded-xl px-3.5 py-2 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>
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
        <div className="sfec-ogrenci-listesi max-h-72 overflow-y-auto">
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide px-1" style={{ color: TEXT_MUTED }}>
            <span className="flex-1">Öğrenci</span>
            <span className="w-16 text-center">Doğru</span>
            <span className="w-16 text-center">Yanlış</span>
          </div>
          {filtrelenmisOgrenciler.map((o) => (
            <div key={o.id} className="sfec-ogrenci-satiri flex items-center gap-2 px-2.5 py-2">
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
          className="sfec-btn text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Sonuçları kaydet"}
        </button>
        <button type="button" onClick={() => { setAcik(false); setSonuclar(null); }}
          className="sfec-btn text-xs font-bold px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED }}>
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
            className="sfec-btn self-start text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
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
        className="sfec-btn w-7 h-7 rounded-full flex items-center justify-center shrink-0 disabled:opacity-60"
        style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER_STRONG}` }}>
        <Download size={11} color={TEXT_MUTED} />
      </button>
      {hata && <span style={{ color: BLUSH }} className="text-[10px] font-semibold mt-1">{hata}</span>}
    </div>
  );
}
