"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  aktifKullanicilar, gorevAdamlari, kayipNesilOzeti, netSiralamasi,
  sayfala, sessizler, uzaklasanlar,
  AKTIFLIK_PENCERESI, GOREV_MIN_SAYI, KISA_LISTE, TREND_PENCERESI,
  type AnalizOgrencisi, type SiraliSatir,
} from "@/lib/sinif-analizi";
import type { AnalizOgrencisiHam, DenemeSecenegi, KayipNesilKaydi } from "@/lib/sinif-analizi-verisi";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, BUTTER, MINT, SKY, TEXT, TEXT_MUTED } from "@/lib/theme";

type Gorunum = "net" | "aktif" | "gorev" | "uzaklasan" | "sessiz" | "kayip";

const BOLUMLER: { kod: Gorunum; baslik: string; aciklama: string; renk: string }[] = [
  { kod: "net", baslik: "Deneme Net Sırası", aciklama: "Seçilen denemede toplam net", renk: MINT },
  { kod: "aktif", baslik: "Aktif Kullanıcılar", aciklama: `Son ${AKTIFLIK_PENCERESI} günde veri girenler`, renk: SKY },
  { kod: "gorev", baslik: "Görev Adamları", aciklama: "Görevlerini tamamlayanlar", renk: MINT },
  { kod: "uzaklasan", baslik: "Sistemden Uzaklaşanlar", aciklama: "Veri girişi gerileyenler", renk: BUTTER },
  { kod: "sessiz", baslik: "Sessizler", aciklama: "Sistemi hiç kullanmayanlar", renk: BLUSH },
  { kod: "kayip", baslik: "Kayıp Nesil", aciklama: "Listede var, hesabı yok", renk: BLUSH },
];

const TUM_SINIFLAR = "tumu";

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
  const [deneme, setDeneme] = useState<string>(denemeSecenekleri[0]?.anahtar ?? "");
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
    .map(({ denemeNetleri, ...o }) => ({ ...o, secilenDenemeNeti: denemeNetleri[deneme] ?? null })),
  [ogrenciler, sinifId, deneme]);

  const kayipKapsam = useMemo(
    () => kayipNesil.filter((k) => secilenSinifAdi === null || k.sinifAdi === secilenSinifAdi),
    [kayipNesil, secilenSinifAdi],
  );

  // Sınıf seçiliyken liste zaten tek sayfa (sınıf başına ~13 kişi);
  // sayfalama yalnızca kurum geneli görünümünde anlamlı.
  const sayfalaniyorMu = sinifId === TUM_SINIFLAR;
  const degistir = (yeni: Gorunum | null) => { setGorunum(yeni); setSayfa(1); };

  if (gorunum === null) {
    return (
      <div className="sfec-fade flex flex-col gap-4">
        <Baslik kapsamEtiketi={kapsamEtiketi} ogrenciSayisi={ogrenciler.length} />
        {siniflar.length === 0 ? (
          <Bos metin="Görebileceğiniz bir sınıf yok. Sınıf öğretmeniyseniz sınıfınızın tanımlı olduğundan emin olun." />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {BOLUMLER.map((b) => (
              <button
                key={b.kod}
                type="button"
                onClick={() => degistir(b.kod)}
                className="sfec-btn flex items-center gap-3 rounded-3xl p-4 text-left"
                style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}
              >
                <Image src="/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
                    {b.baslik}
                  </span>
                  <span className="block truncate text-[10px] font-bold" style={{ color: b.renk }}>{b.aciklama}</span>
                </span>
              </button>
            ))}
          </div>
        )}
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
          {gorunum === "net" && denemeSecenekleri.length > 0 && (
            <select value={deneme} onChange={(e) => { setDeneme(e.target.value); setSayfa(1); }}
              aria-label="Deneme seç"
              className="rounded-xl px-3 py-2 text-xs outline-none"
              style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
              {denemeSecenekleri.map((d) => (
                <option key={d.anahtar} value={d.anahtar}>
                  {d.tarih} · {d.yayinevi} ({d.tur}) — {d.katilan} kişi
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {gorunum === "kayip"
        ? <KayipNesil kayitlar={kayipKapsam} sinifSecildiMi={secilenSinifAdi !== null} />
        : <Liste gorunum={gorunum} kapsam={kapsam} sayfalaniyorMu={sayfalaniyorMu}
            sayfa={sayfa} setSayfa={setSayfa} denemeVarMi={denemeSecenekleri.length > 0} />}
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

function Liste({ gorunum, kapsam, sayfalaniyorMu, sayfa, setSayfa, denemeVarMi }: {
  gorunum: Exclude<Gorunum, "kayip">;
  kapsam: AnalizOgrencisi[];
  sayfalaniyorMu: boolean;
  sayfa: number;
  setSayfa: (n: number) => void;
  denemeVarMi: boolean;
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
        ? (denemeVarMi ? "Bu denemeye bu kapsamdan kimse girmemiş." : "Henüz deneme sonucu yok.")
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
        const alt = [o.sinifAdi, o.okulNo ? `No ${o.okulNo}` : null].filter(Boolean).join(" · ");
        if (hepsi.tip === "net") {
          return <Satir key={o.ogrenciId} sira={s.sira} ad={o.ad} altMetin={alt} sag={`${(s.deger as number).toFixed(2)} net`} sagRenk={MINT} />;
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
              altMetin={[k.sinifAdi, k.okulNo ? `No ${k.okulNo}` : null].filter(Boolean).join(" · ")}
              sag="hesap yok" sagRenk={BLUSH} />
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
