"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  aktifKullanicilar, gorevAdamlari, gorevAkibeti, katilimDagilimi, kayipNesilOzeti,
  netOrtalamasi, netSiralamasi, sinifAktiflikSiralamasi,
  anahtardanTur, denemeTurleri, turEtiketi, turNetleri, varsayilanDeneme, varsayilanTur,
  sayfala, sessizler, uzaklasanlar,
  AKTIFLIK_PENCERESI, GOREV_MIN_SAYI, KISA_LISTE, TREND_PENCERESI,
  type AnalizOgrencisi, type SiraliSatir,
} from "@/lib/sinif-analizi";
import type { AnalizOgrencisiHam, DenemeSecenegi, KayipNesilKaydi } from "@/lib/sinif-analizi-verisi";
import { ON_KAYIT_ETIKETI } from "@/lib/on-kayitli";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, BUTTER, MINT, SKY, TEXT, TEXT_MUTED } from "@/lib/theme";

type Gorunum = "net" | "aktif" | "gorev" | "uzaklasan" | "sessiz" | "kayip";

// Kart adları ÖLÇÜM dilinde (denetim 20.10.2026): öğrenciyi etiketlemez, neyin
// ölçüldüğünü söyler. Gruplar örtüşebilir; kart sayıları toplanıp tek bir
// "sorunlu öğrenci" sayısı ÜRETİLMEZ. Bu etiketler yalnız yetişkin ekranındadır.
const BOLUMLER: { kod: Gorunum; baslik: string; aciklama: string; renk: string; grup: string }[] = [
  { kod: "net", baslik: "Deneme sonuçları", aciklama: "Seçilen türde seçilen deneme ya da kişisel ortalama", renk: MINT, grup: "Deneme başarısı" },
  { kod: "aktif", baslik: "Çalışma kaydı girenler", aciklama: `Son ${AKTIFLIK_PENCERESI} günde konu/soru kaydı girenler`, renk: SKY, grup: "Çalışma ve görev" },
  { kod: "gorev", baslik: "Görev tamamlama", aciklama: `En az ${GOREV_MIN_SAYI} görevi olanlarda tamamlanan/toplam`, renk: MINT, grup: "Çalışma ve görev" },
  { kod: "uzaklasan", baslik: "Kayıt girişi azalanlar", aciklama: `Son ${TREND_PENCERESI} gün, önceki ${TREND_PENCERESI} güne göre azalan`, renk: BUTTER, grup: "Katılım ve erişim" },
  { kod: "sessiz", baslik: "Kullanıma başlamayanlar", aciklama: "Henüz giriş yapmamış ya da hiç veri girmemiş", renk: BLUSH, grup: "Katılım ve erişim" },
  { kod: "kayip", baslik: "Hesabı olmayan öğrenciler", aciklama: "Resmî listede var, hesabı açılmamış", renk: BLUSH, grup: "Katılım ve erişim" },
];
const GRUPLAR = ["Deneme başarısı", "Çalışma ve görev", "Katılım ve erişim"];

const TUM_SINIFLAR = "tumu";
// Tek bir denemeye değil, öğrencinin TÜM denemelerinin ortalamasına göre
// sıralama (kullanıcı isteği 09.10.2026). Deneme anahtarları
// "yayinevi|tarih|tur" biçiminde olduğu için bu sabitle çakışmaz.
const ORTALAMA = "__ortalama__";

const seciliDenemeAnahtari = (secenekler: DenemeSecenegi[], tur: string | null) =>
  (tur ? varsayilanDeneme(secenekler, tur)?.anahtar : null) ?? ORTALAMA;

export function SinifAnaliziPanel({
  ogrenciler, denemeSecenekleri, kayipNesil, siniflar, sinifSecilebilir, kapsamEtiketi,
}: {
  ogrenciler: AnalizOgrencisiHam[];
  denemeSecenekleri: DenemeSecenegi[];
  kayipNesil: KayipNesilKaydi[];
  siniflar: { id: string; seviye: string; sube: string }[];
  /** Sınıf öğretmeni tek sınıfını görür; filtre ona gösterilmez. */
  sinifSecilebilir: boolean;
  kapsamEtiketi: string;
}) {
  const [gorunum, setGorunum] = useState<Gorunum | null>(null);
  const [sinifId, setSinifId] = useState<string>(TUM_SINIFLAR);
  // Karma (TYT+AYT+branş+LGS) sıralama YOK: önce tür, sonra o türün en yeni ORTAK denemesi.
  const turler = useMemo(() => denemeTurleri(denemeSecenekleri), [denemeSecenekleri]);
  const [tur, setTur] = useState<string | null>(() => varsayilanTur(denemeSecenekleri));
  const [deneme, setDeneme] = useState<string>(() => seciliDenemeAnahtari(denemeSecenekleri, varsayilanTur(denemeSecenekleri)));
  const turSecenekleri = useMemo(() => denemeSecenekleri.filter((d) => d.tur === tur), [denemeSecenekleri, tur]);
  const turDegistir = (yeni: string) => { setTur(yeni); setDeneme(seciliDenemeAnahtari(denemeSecenekleri, yeni)); setSayfa(1); };
  const [sayfa, setSayfa] = useState(1);

  const sinifAdiOf = useMemo(() => {
    const m = new Map(siniflar.map((s) => [s.id, `${s.seviye}-${s.sube}`]));
    return (id: string) => m.get(id) ?? null;
  }, [siniflar]);

  const secilenSinifAdi = sinifId === TUM_SINIFLAR ? null : sinifAdiOf(sinifId);

  // Seçilen denemenin neti burada bağlanıyor: saf modül tek net bekliyor,
  // veri katmanı tüm denemelerin haritasını gönderiyor.
  const kapsam: AnalizOgrencisi[] = useMemo(() => ogrenciler
    .filter((o) => sinifId === TUM_SINIFLAR || o.sinifId === sinifId)
    .map(({ denemeNetleri, ...o }) => ({
      ...o,
      // Ortalama YALNIZ seçili türün denemeleri üzerinden; deneme sayısı da o türe ait.
      secilenDenemeNeti: !tur ? null : deneme === ORTALAMA ? netOrtalamasi(turNetleri(denemeNetleri, tur)) : denemeNetleri[deneme] ?? null,
      denemeSayisi: tur ? Object.keys(turNetleri(denemeNetleri, tur)).length : 0,
    })),
  [ogrenciler, sinifId, deneme, tur]);

  const kayipKapsam = useMemo(
    () => kayipNesil.filter((k) => secilenSinifAdi === null || k.sinifAdi === secilenSinifAdi),
    [kayipNesil, secilenSinifAdi],
  );

  // Hesapsız (ön kayıtlı) öğrencilerin yüklü denemeleri yalnız deneme
  // sıralamasına girer; diğer listelere (aktiflik, görev, uzaklaşma, sessizlik)
  // karıştırılmaz. Seçilen deneme/ortalama ile aynı kural.
  const hesapsizNetKapsam: AnalizOgrencisi[] = useMemo(() => kayipKapsam
    .filter((k) => !k.hesabiVarMi && Object.keys(k.denemeNetleri).length > 0)
    .map((k) => ({
      ogrenciId: `liste:${k.listeId}`, ad: k.adSoyad, okulNo: k.okulNo, sinifId: null, sinifAdi: k.sinifAdi,
      kademe: "lise" as const, hesapsiz: true,
      secilenDenemeNeti: !tur ? null : deneme === ORTALAMA ? netOrtalamasi(turNetleri(k.denemeNetleri, tur)) : k.denemeNetleri[deneme] ?? null,
      denemeSayisi: tur ? Object.keys(turNetleri(k.denemeNetleri, tur)).length : 0,
      aktiflik: 0, gorevToplam: 0, gorevTamamlanan: 0, gorevBekleyen: 0, gorevTamamlanmayan: 0,
      sonDonem: 0, oncekiDonem: 0, girisYapmisMi: false, verisiVarMi: true,
    })),
  [kayipKapsam, deneme, tur]);

  // Sınıf seçiliyken liste zaten tek sayfa (sınıf başına ~13 kişi);
  // sayfalama yalnızca kurum geneli görünümünde anlamlı.
  const sayfalaniyorMu = sinifId === TUM_SINIFLAR;
  const degistir = (yeni: Gorunum | null) => { setGorunum(yeni); setSayfa(1); };

  if (gorunum === null) {
    return (
      <div className="sfec-fade flex flex-col gap-4">
        <Baslik kapsamEtiketi={kapsamEtiketi} ogrenciSayisi={ogrenciler.length} />
        {siniflar.length === 0 ? (
          <Bos metin="Görebileceğiniz bir sınıf yok. Sınıf öğretmenliğiniz ya da bir derse atamanız tanımlı değil — yöneticinizle görüşün." />
        ) : (
          <div className="flex flex-col gap-4">
            {GRUPLAR.map((grup) => (
              <section key={grup} aria-label={grup}>
                <h3 className="mb-2 text-[11px] font-extrabold uppercase tracking-wider" style={{ color: TEXT_MUTED }}>{grup}</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {BOLUMLER.filter((b) => b.grup === grup).map((b) => (
                    <button
                      key={b.kod}
                      type="button"
                      onClick={() => degistir(b.kod)}
                      className="sfec-btn flex items-center gap-3 rounded-2xl p-4 text-left"
                      style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}
                    >
                      <Image src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{b.baslik}</span>
                        <span className="block text-[11px] font-bold" style={{ color: b.renk }}>{b.aciklama}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        {ogrenciler.length > 0 && <OlcumPanelleri kapsam={kapsam} />}
      </div>
    );
  }

  const bolum = BOLUMLER.find((b) => b.kod === gorunum)!;

  return (
    <div className="sfec-fade flex flex-col gap-4">
      <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <button type="button" onClick={() => degistir(null)}
          className="sfec-btn mb-3 flex items-center gap-1 text-xs font-bold" style={{ color: TEXT_MUTED }}>
          <ChevronLeft size={14} /> Sınıf Analizi
        </button>
        <h2 className="text-lg font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{bolum.baslik}</h2>
        <p className="mt-0.5 text-[11px] font-bold" style={{ color: bolum.renk }}>{bolum.aciklama}</p>
        {gorunum === "net" && tur && (
          <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>
            {turEtiketi(tur)} · {deneme === ORTALAMA ? "öğrencinin bu türdeki tüm denemelerinin ortalaması" : "tek deneme"}; farklı türler karıştırılmaz.
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {sinifSecilebilir && siniflar.length > 1 && (
            <select value={sinifId} onChange={(e) => { setSinifId(e.target.value); setSayfa(1); }}
              aria-label="Sınıf süz"
              className="rounded-xl px-3 py-2 text-xs outline-none"
              style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
              <option value={TUM_SINIFLAR}>Tüm sınıflar ({kapsamEtiketi})</option>
              {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
            </select>
          )}
          {gorunum === "net" && turler.length > 0 && (
            <div role="tablist" aria-label="Deneme türü" className="flex flex-wrap gap-2">
              {turler.map((t) => (
                <button key={t} type="button" role="tab" aria-selected={t === tur} onClick={() => turDegistir(t)}
                  className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold"
                  style={{ border: `2px solid ${t === tur ? BORDER_STRONG : BORDER}`, background: t === tur ? BG1_ALT : "transparent", color: t === tur ? TEXT : TEXT_MUTED }}>
                  {turEtiketi(t)}
                </button>
              ))}
            </div>
          )}
          {gorunum === "net" && tur && turSecenekleri.length > 0 && (
            <select value={deneme} onChange={(e) => { setDeneme(e.target.value); setSayfa(1); }}
              aria-label="Deneme seç"
              className="rounded-xl px-3 py-2 text-xs outline-none"
              style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
              {turSecenekleri.map((d) => (
                <option key={d.anahtar} value={d.anahtar}>
                  {d.tarih} · {d.yayinevi} ({d.tur}) — {d.katilan} kişi
                </option>
              ))}
              <option value={ORTALAMA}>Kişisel deneme ortalaması ({turEtiketi(tur)})</option>
            </select>
          )}
        </div>
      </div>

      {gorunum === "kayip"
        ? <KayipNesil kayitlar={kayipKapsam} sinifSecildiMi={secilenSinifAdi !== null} />
        : <Liste gorunum={gorunum} kapsam={gorunum === "net" ? [...kapsam, ...hesapsizNetKapsam] : kapsam} sayfalaniyorMu={sayfalaniyorMu}
            sayfa={sayfa} setSayfa={setSayfa} denemeVarMi={denemeSecenekleri.length > 0}
            ortalamaMi={deneme === ORTALAMA} />}
    </div>
  );
}

function Baslik({ kapsamEtiketi, ogrenciSayisi }: { kapsamEtiketi: string; ogrenciSayisi: number }) {
  return (
    <div className="rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 className="text-lg font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Sınıf Analizi</h2>
      <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
        {kapsamEtiketi} · {ogrenciSayisi} öğrenci
      </p>
    </div>
  );
}

function Bos({ metin }: { metin: string }) {
  return (
    <div className="rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <p className="text-sm" style={{ color: TEXT_MUTED }}>{metin}</p>
    </div>
  );
}

function Satir({ sira, ad, altMetin, sag, sagRenk }: {
  sira: number; ad: string; altMetin: string | null; sag: string; sagRenk: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl px-3 py-2.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
      <span className="w-6 shrink-0 text-center text-xs font-extrabold" style={{ color: TEXT_MUTED }}>{sira}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold" style={{ color: TEXT }}>{ad}</span>
        {altMetin && <span className="block truncate text-[10px]" style={{ color: TEXT_MUTED }}>{altMetin}</span>}
      </span>
      <span className="shrink-0 text-sm font-extrabold tabular-nums" style={{ color: sagRenk }}>{sag}</span>
    </div>
  );
}

function Liste({ gorunum, kapsam, sayfalaniyorMu, sayfa, setSayfa, denemeVarMi, ortalamaMi }: {
  gorunum: Exclude<Gorunum, "kayip">;
  kapsam: AnalizOgrencisi[];
  sayfalaniyorMu: boolean;
  sayfa: number;
  setSayfa: (n: number) => void;
  denemeVarMi: boolean;
  /** Net sırası tek denemeye değil tüm denemelerin ortalamasına göre. */
  ortalamaMi: boolean;
}) {
  type Satirlar =
    | { tip: "net"; v: SiraliSatir<number>[] }
    | { tip: "aktif"; v: SiraliSatir<number>[] }
    | { tip: "gorev"; v: ReturnType<typeof gorevAdamlari> }
    | { tip: "uzaklasan"; v: ReturnType<typeof uzaklasanlar> }
    | { tip: "sessiz"; v: ReturnType<typeof sessizler> };

  const hepsi: Satirlar =
    gorunum === "net" ? { tip: "net", v: netSiralamasi(kapsam) }
    : gorunum === "aktif" ? { tip: "aktif", v: aktifKullanicilar(kapsam) }
    : gorunum === "gorev" ? { tip: "gorev", v: gorevAdamlari(kapsam) }
    : gorunum === "uzaklasan" ? { tip: "uzaklasan", v: uzaklasanlar(kapsam) }
    : { tip: "sessiz", v: sessizler(kapsam) };

  // "Görev adamları" ve "uzaklaşanlar" ilk 5 ile sınırlı (kullanıcı kararı);
  // diğerleri sayfalanır.
  const kisaMi = hepsi.tip === "gorev" || hepsi.tip === "uzaklasan";
  const tumSatirlar = hepsi.v as SiraliSatir<unknown>[];
  const gosterilecek = kisaMi
    ? { satirlar: tumSatirlar.slice(0, KISA_LISTE), sayfaSayisi: 1, sayfa: 1 }
    : sayfalaniyorMu ? sayfala(tumSatirlar, sayfa) : { satirlar: tumSatirlar, sayfaSayisi: 1, sayfa: 1 };

  if (tumSatirlar.length === 0) {
    const mesaj =
      hepsi.tip === "net"
        ? (!denemeVarMi ? "Henüz deneme sonucu yok."
          : ortalamaMi ? "Bu kapsamda seçili türde deneme sonucu olan öğrenci yok."
          : "Bu denemeye bu kapsamdan kimse girmemiş.")
        : hepsi.tip === "aktif" ? `Son ${AKTIFLIK_PENCERESI} günde veri giren yok.`
        : hepsi.tip === "gorev" ? `En az ${GOREV_MIN_SAYI} görevi olup tamamlayan yok.`
        : hepsi.tip === "uzaklasan" ? `Son ${TREND_PENCERESI} günde gerileyen yok — iyi haber.`
        : "Herkes sistemi kullanmış.";
    return <Bos metin={mesaj} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {gosterilecek.satirlar.map((s) => {
        const o = (s as SiraliSatir<unknown>).ogrenci;
        const alt = [o.sinifAdi, o.okulNo ? `No ${o.okulNo}` : null, o.hesapsiz ? ON_KAYIT_ETIKETI : null].filter(Boolean).join(" · ");
        if (hepsi.tip === "net") {
          // Ortalamada deneme SAYISI da gösteriliyor: farklı yayınevi ve
          // farklı sayıda denemenin ortalaması alınıyor, okuyan neye
          // baktığını bilsin.
          return <Satir key={o.ogrenciId} sira={s.sira} ad={o.ad}
            altMetin={ortalamaMi ? `${alt} · ${o.denemeSayisi} deneme (kişisel ortalama; denemelerin zorluğu farklı olabilir)` : alt}
            sag={`${(s.deger as number).toFixed(2)}${ortalamaMi ? " ort." : " net"}`} sagRenk={MINT} />;
        }
        if (hepsi.tip === "aktif") {
          return <Satir key={o.ogrenciId} sira={s.sira} ad={o.ad} altMetin={alt} sag={`${s.deger as number} kayıt`} sagRenk={SKY} />;
        }
        if (hepsi.tip === "gorev") {
          const d = s.deger as { oran: number; tamamlanan: number; toplam: number };
          return <Satir key={o.ogrenciId} sira={s.sira} ad={o.ad} altMetin={`${alt} · ${d.tamamlanan}/${d.toplam} görev`} sag={`%${Math.round(d.oran * 100)}`} sagRenk={MINT} />;
        }
        if (hepsi.tip === "uzaklasan") {
          const d = s.deger as { dusus: number; sonDonem: number; oncekiDonem: number };
          return <Satir key={o.ogrenciId} sira={s.sira} ad={o.ad}
            altMetin={`${alt} · ${d.oncekiDonem} → ${d.sonDonem} kayıt`}
            sag={d.sonDonem === 0 ? "bıraktı" : `−${d.dusus}`} sagRenk={BUTTER} />;
        }
        const sebep = s.deger as "hesap-acilmamis" | "hic-veri-yok";
        return <Satir key={o.ogrenciId} sira={s.sira} ad={o.ad} altMetin={alt}
          sag={sebep === "hesap-acilmamis" ? "hiç girmemiş" : "veri yok"} sagRenk={BLUSH} />;
      })}

      {gosterilecek.sayfaSayisi > 1 && (
        <div className="mt-1 flex items-center justify-center gap-3">
          <button type="button" disabled={gosterilecek.sayfa <= 1} onClick={() => setSayfa(gosterilecek.sayfa - 1)}
            className="sfec-btn rounded-xl p-2 disabled:opacity-40" style={{ border: `2px solid ${BORDER_STRONG}` }} aria-label="Önceki sayfa">
            <ChevronLeft size={14} color={TEXT_MUTED} />
          </button>
          <span className="text-xs font-bold tabular-nums" style={{ color: TEXT_MUTED }}>
            {gosterilecek.sayfa} / {gosterilecek.sayfaSayisi}
          </span>
          <button type="button" disabled={gosterilecek.sayfa >= gosterilecek.sayfaSayisi} onClick={() => setSayfa(gosterilecek.sayfa + 1)}
            className="sfec-btn rounded-xl p-2 disabled:opacity-40" style={{ border: `2px solid ${BORDER_STRONG}` }} aria-label="Sonraki sayfa">
            <ChevronRight size={14} color={TEXT_MUTED} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Kurum genelinde 311/502 kişi hesapsız (%62) — düz liste eyleme dönmüyor,
 * bu yüzden SINIF KIRILIMLI SAYI gösteriliyor. Adlar yalnızca sınıf
 * seçiliyken, yani liste kısa ve eyleme dönüştürülebilirken açılıyor.
 */
function KayipNesil({ kayitlar, sinifSecildiMi }: { kayitlar: KayipNesilKaydi[]; sinifSecildiMi: boolean }) {
  const eksikler = kayitlar.filter((k) => !k.hesabiVarMi);
  if (eksikler.length === 0) {
    return <Bos metin={kayitlar.length === 0 ? "Bu kapsam için resmî öğrenci listesi yüklenmemiş." : "Listedeki herkesin hesabı açılmış."} />;
  }

  if (sinifSecildiMi) {
    return (
      <div className="flex flex-col gap-2">
        {eksikler
          .sort((a, b) => a.adSoyad.localeCompare(b.adSoyad, "tr"))
          .map((k, i) => (
            <Satir key={`${k.okulNo}-${k.adSoyad}`} sira={i + 1} ad={k.adSoyad}
              altMetin={[k.sinifAdi, k.okulNo ? `No ${k.okulNo}` : null, ON_KAYIT_ETIKETI].filter(Boolean).join(" · ")}
              sag={Object.keys(k.denemeNetleri).length > 0 ? `${Object.keys(k.denemeNetleri).length} deneme yüklü` : "hesap yok"} sagRenk={BLUSH} />
          ))}
      </div>
    );
  }

  const ozet = kayipNesilOzeti(kayitlar);
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-2xl px-4 py-3" style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
        <p className="text-sm font-bold" style={{ color: TEXT }}>
          Resmî listede {kayitlar.length} kişi var, <span style={{ color: BLUSH }}>{eksikler.length}</span> kişinin hesabı yok.
        </p>
        <p className="mt-1 text-[11px]" style={{ color: TEXT_MUTED }}>
          Adları görmek için yukarıdan bir sınıf seçin.
        </p>
      </div>
      {ozet.map((s) => (
        <div key={s.sinifAdi} className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
          style={{ background: BG1_ALT, border: `2px solid ${BORDER}` }}>
          <span className="min-w-0 flex-1 truncate text-sm font-bold" style={{ color: TEXT }}>{s.sinifAdi}</span>
          <span className="shrink-0 text-xs tabular-nums" style={{ color: TEXT_MUTED }}>{s.toplam} kişilik</span>
          <span className="shrink-0 text-sm font-extrabold tabular-nums" style={{ color: BLUSH }}>{s.eksik} eksik</span>
        </div>
      ))}
    </div>
  );
}

/**
 * ÜÇ ÖLÇÜM PANELİ (kullanıcı isteği 09.10.2026) — giriş ekranındaki iki
 * sütunluk buton ızgarasının ALTINDA, yan yana üç panel.
 *
 * Görünüm "rack ünitesi": gövdeden biraz koyu yüzey, üstten gelen ince
 * pay ışığı, 9px versal seyrek başlık, sağ üstte kendi rengiyle yanan LED.
 * Koyu temada rack gövdeden KOYU, açık temada AÇIK olur — ışık mantığı
 * tersine döner, bu yüzden iki durum ayrı tanımlı.
 *
 * Bölümün ruhuna uyması için kural aynı: her panel TEK bir ham gerçeği
 * gösteriyor, birleşik bir "başarı puanı" üretmiyor.
 */
function OlcumPanelleri({ kapsam }: { kapsam: AnalizOgrencisi[] }) {
  const siniflar = sinifAktiflikSiralamasi(kapsam);
  const katilim = katilimDagilimi(kapsam);
  const gorev = gorevAkibeti(kapsam);

  const enAktif = siniflar[0]?.aktif ?? 0;
  const toplamOgrenci = kapsam.length;
  const girmeyen = katilim.find((k) => k.kod === "yok")?.sayi ?? 0;
  const girmeyenYuzde = toplamOgrenci > 0 ? Math.round((girmeyen / toplamOgrenci) * 100) : 0;
  const renkler: Record<string, string> = { aktif: MINT, eski: BUTTER, yok: BLUSH };

  // Halka: dilimler yüzdeye çevrilip uç uca diziliyor (dasharray 100 birim).
  // Ofset birikimli; render sırasında değişken yeniden atamak yerine
  // önceki dilimlerin toplamından türetiliyor (React derleyicisi atamayı
  // "Cannot reassign variable after render completes" ile reddediyor).
  const yuzdeler = katilim.map((d) => (toplamOgrenci > 0 ? (d.sayi / toplamOgrenci) * 100 : 0));
  const halka = katilim.map((d, i) => ({
    ...d,
    yuzde: yuzdeler[i],
    // 25 = 12 yönünden başlat; her dilim öncekilerin toplamı kadar geriye.
    offset: 25 - yuzdeler.slice(0, i).reduce((t, y) => t + y, 0),
  }));

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Rack baslik="En Aktif Sınıf" led={MINT}>
        {siniflar.length === 0 ? <RackBos metin="Sınıf verisi yok." /> : (
          <>
            <div className="flex flex-1 items-end gap-2">
              {siniflar.map((s, i) => (
                <div key={s.sinifAdi} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="text-[13px] font-extrabold tabular-nums"
                    style={{ color: i === 0 ? MINT : TEXT_MUTED, fontFamily: "var(--font-baloo)" }}>{s.aktif}</span>
                  <div className="w-full rounded-[3px]"
                    style={{ height: `${enAktif > 0 ? Math.max(3, (s.aktif / enAktif) * 70) : 3}px`, background: i === 0 ? MINT : TEXT_MUTED }} />
                  <span className="w-full truncate text-center text-[9px] font-semibold" style={{ color: TEXT_MUTED }}>{s.sinifAdi}</span>
                </div>
              ))}
            </div>
            <p className="m-0 text-[10px] leading-snug" style={{ color: TEXT_MUTED }}>
              {siniflar[0].sinifAdi} · {siniflar[0].mevcut} kişilik sınıfın {siniflar[0].aktif}&apos;i aktif.
            </p>
          </>
        )}
      </Rack>

      <Rack baslik="Katılım" led={BLUSH}>
        <div className="relative flex flex-1 items-center justify-center">
          <svg width="116" height="116" viewBox="0 0 42 42" aria-hidden="true">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke={BORDER} strokeWidth="5" />
            {halka.map((d) => (
              <circle key={d.kod} cx="21" cy="21" r="15.9" fill="none" stroke={renkler[d.kod]} strokeWidth="5"
                strokeDasharray={`${d.yuzde} ${100 - d.yuzde}`} strokeDashoffset={d.offset} />
            ))}
          </svg>
          <span className="absolute text-center">
            <span className="block text-[22px] font-extrabold leading-none tabular-nums"
              style={{ color: BLUSH, fontFamily: "var(--font-baloo)" }}>%{girmeyenYuzde}</span>
            <span className="block text-[9px]" style={{ color: TEXT_MUTED }}>hiç giriş yok</span>
          </span>
        </div>
        <RackLejant satirlar={katilim.map((d) => ({ ad: d.etiket, sayi: d.sayi, renk: renkler[d.kod] }))} />
      </Rack>

      <Rack baslik="Görev Akıbeti" led={BUTTER}>
        {gorev.oran === null ? <RackBos metin="Bu kapsamda görev atanmamış." /> : (
          <>
            <div className="py-1 text-center">
              <span className="block text-[32px] font-extrabold leading-none tabular-nums"
                style={{ color: BLUSH, fontFamily: "var(--font-baloo)" }}>%{Math.round(gorev.oran * 100)}</span>
              <span className="mt-0.5 block text-[9px]" style={{ color: TEXT_MUTED }}>{gorev.toplam} görevin tamamlanma oranı</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-[3px]" style={{ border: `1px solid ${BORDER}` }}>
              <span style={{ width: `${(gorev.tamamlandi / gorev.toplam) * 100}%`, background: MINT }} />
              <span style={{ width: `${(gorev.bekliyor / gorev.toplam) * 100}%`, background: BUTTER }} />
              <span style={{ flex: 1, background: BLUSH }} />
            </div>
            <div className="mt-auto">
              <RackLejant satirlar={[
                { ad: "Tamamlandı", sayi: gorev.tamamlandi, renk: MINT },
                { ad: "Bekliyor", sayi: gorev.bekliyor, renk: BUTTER },
                { ad: "Tamamlanmadı", sayi: gorev.tamamlanmadi, renk: BLUSH },
              ]} />
            </div>
          </>
        )}
      </Rack>
    </div>
  );
}

function Rack({ baslik, led, children }: { baslik: string; led: string; children: React.ReactNode }) {
  return (
    <section className="sfec-olcum-rack flex min-h-[196px] flex-col gap-2.5 rounded-2xl p-3.5"
      style={{ border: `1px solid ${BORDER_STRONG}` }}>
      {/* Başlık GERÇEK başlık: panelin diğer başlıklarıyla aynı Baloo,
          normal yazım. Önce 9px versal + seyrek harf + alt çizgiydi;
          kullanıcı "şeritte emanet duruyor, bannere yedirilmiş" dedi —
          haklı: o biçim başlık değil şerit süsü gibi okunuyordu. LED
          başlığın önünde madde imi olarak duruyor, ayrı bant yok. */}
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: led, boxShadow: `0 0 6px ${led}` }} />
        <span className="text-[13px] font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{baslik}</span>
      </div>
      {children}
    </section>
  );
}

function RackBos({ metin }: { metin: string }) {
  return <p className="m-auto text-center text-[11px]" style={{ color: TEXT_MUTED }}>{metin}</p>;
}

function RackLejant({ satirlar }: { satirlar: { ad: string; sayi: number; renk: string }[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {satirlar.map((s) => (
        <span key={s.ad} className="flex items-center gap-1.5 text-[10px]" style={{ color: TEXT_MUTED }}>
          <span className="h-1.5 w-1.5 shrink-0 rounded-[2px]" style={{ background: s.renk }} />
          <span className="flex-1 truncate">{s.ad}</span>
          <span className="font-bold tabular-nums" style={{ color: TEXT }}>{s.sayi}</span>
        </span>
      ))}
    </div>
  );
}
