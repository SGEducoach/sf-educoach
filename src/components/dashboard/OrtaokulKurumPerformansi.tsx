import { Users, Clock, ListChecks, HandHelping } from "lucide-react";
import {
  YETERLILIK_ETIKET, YETERLILIK_SIRASI,
  type HaftaNoktasi, type OrtaokulKurumOzeti, type SeviyeOzeti,
} from "@/lib/ortaokul-kurum-ozeti";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED, MINT, MINT_BG, SKY, SKY_BG, BUTTER, BUTTER_BG, LILAC,
} from "@/lib/theme";

// Ortaokul kurumunun Ana Sayfa'sı (bkz. ortaokul-kurum-ozeti.ts). Lise
// karşılığı net/deneme grafikleri gösterir; burada çalışma, görev,
// öğretmen kararı ve açık yardım var. Her sayı kendi paydasıyla yazılır,
// birleşik "başarı puanı" yok, kırmızı yok.

const SEVIYE_RENK: Record<string, string> = { "5": MINT, "6": SKY, "7": BUTTER, "8": LILAC };
const renk = (seviye: string) => SEVIYE_RENK[seviye] ?? TEXT_MUTED;

function tarihFormat(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}

function Kart({ icon: Icon, etiket, deger, alt, rengi, bg }: {
  icon: typeof Users; etiket: string; deger: string | number; alt?: string; rengi: string; bg: string;
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-3xl p-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ background: bg }}>
        <Icon size={20} style={{ color: rengi }} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold" style={{ color: TEXT_MUTED }}>{etiket}</span>
        <span className="block text-2xl font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{deger}</span>
        {alt && <span className="block text-[11px]" style={{ color: TEXT_MUTED }}>{alt}</span>}
      </span>
    </div>
  );
}

// Sekiz haftalık aktif öğrenci sütunları. Yükseklik o seviyenin öğrenci
// sayısına göre ölçeklenir: 3/30 ile 3/3 aynı görünmesin.
function Sutunlar({ noktalar, tavan, rengi }: { noktalar: HaftaNoktasi[]; tavan: number; rengi: string }) {
  return (
    <div className="flex h-16 items-end gap-1" role="img"
      aria-label={`Son ${noktalar.length} hafta çalışan öğrenci sayıları: ${noktalar.map((n) => n.aktifOgrenci).join(", ")}`}>
      {noktalar.map((n) => (
        <div key={n.haftaBaslangic} className="flex flex-1 flex-col items-center justify-end gap-0.5"
          title={`${tarihFormat(n.haftaBaslangic)} haftası: ${n.aktifOgrenci} öğrenci, ${n.dakika} dk`}>
          <div className="w-full rounded-t-md" style={{ background: rengi, opacity: n.aktifOgrenci > 0 ? 1 : 0.18, height: `${Math.max(6, tavan > 0 ? (n.aktifOgrenci / tavan) * 100 : 0)}%` }} />
        </div>
      ))}
    </div>
  );
}

function YeterlilikSerit({ s }: { s: SeviyeOzeti }) {
  const toplam = YETERLILIK_SIRASI.reduce((t, d) => t + s.yeterlilik[d], 0);
  if (toplam === 0) {
    return <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Öğretmenler henüz konu yeterliliği kararı girmedi.</p>;
  }
  return (
    <p className="text-[11px] leading-5" style={{ color: TEXT_MUTED }}>
      {YETERLILIK_SIRASI.filter((d) => s.yeterlilik[d] > 0).map((d) => `${YETERLILIK_ETIKET[d]} ${s.yeterlilik[d]}`).join(" · ")}
      <span> — toplam {toplam} karar</span>
    </p>
  );
}

function SeviyeKarti({ s }: { s: SeviyeOzeti }) {
  const r = renk(s.seviye);
  const tavan = Math.max(s.ogrenciSayisi, ...s.noktalar.map((n) => n.aktifOgrenci));
  return (
    <section className="flex flex-col gap-3 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-extrabold" style={{ color: r, fontFamily: "var(--font-baloo)" }}>{s.seviye}. sınıf</h3>
        <span className="text-[11px] font-bold" style={{ color: TEXT_MUTED }}>{s.ogrenciSayisi} öğrenci</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[12px]" style={{ color: TEXT }}>
        <div className="rounded-2xl p-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
          <strong>{s.buHaftaAktif}/{s.ogrenciSayisi}</strong> öğrenci bu hafta çalıştı
        </div>
        <div className="rounded-2xl p-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
          <strong>{s.buHaftaDakika}</strong> dk · <strong>{s.buHaftaSoru}</strong> soru
        </div>
        <div className="rounded-2xl p-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
          Görev: {s.gorevToplam > 0 ? <><strong>{s.gorevTamamlanan}/{s.gorevToplam}</strong> tamamlandı</> : "verilmemiş"}
        </div>
        <div className="rounded-2xl p-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
          Doğruluk: {s.dogrulukYuzde !== null
            ? <><strong>%{s.dogrulukYuzde}</strong> <span style={{ color: TEXT_MUTED }}>({s.cevaplananSoru} soru)</span></>
            : <span style={{ color: TEXT_MUTED }}>yeterli soru yok</span>}
        </div>
      </div>

      <div>
        <span className="mb-1 block text-[11px] font-bold" style={{ color: TEXT_MUTED }}>Haftalık çalışan öğrenci (son 8 hafta)</span>
        <Sutunlar noktalar={s.noktalar} tavan={tavan} rengi={r} />
      </div>

      <YeterlilikSerit s={s} />
      {s.acikYardim > 0 && (
        <p className="text-[12px] font-bold" style={{ color: TEXT }}>
          <HandHelping size={13} className="mr-1 inline" style={{ color: r }} />
          {s.acikYardim} açık yardım isteği var
        </p>
      )}
    </section>
  );
}

export function OrtaokulKurumPerformansi({ veri }: { veri: OrtaokulKurumOzeti }) {
  if (veri.ogrenciSayisi === 0) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}`, color: TEXT_MUTED }}>
        Kurumunuzda henüz kayıtlı 5-8. sınıf öğrencisi yok — öğrenciler eklendikçe çalışma özeti burada görünecek.
        {veri.ilkokulOgrenciSayisi > 0 && " İlkokul öğrencileri Gelişim Raporu'ndan izlenir."}
      </div>
    );
  }
  const bu = veri.genel[veri.genel.length - 1];
  const buAktif = veri.seviyeler.reduce((t, s) => t + s.buHaftaAktif, 0);
  const acik = veri.seviyeler.reduce((t, s) => t + s.acikYardim, 0);
  return (
    <div className="sfec-fade flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Kart icon={Users} etiket="Bu hafta çalışan" deger={`${buAktif}/${veri.ogrenciSayisi}`} alt="5-8. sınıf öğrencisi" rengi={MINT} bg={MINT_BG} />
        <Kart icon={Clock} etiket="Bu hafta çalışma süresi" deger={`${bu.dakika} dk`} rengi={SKY} bg={SKY_BG} />
        <Kart icon={ListChecks} etiket="Bu hafta çözülen soru" deger={bu.soru} rengi={MINT} bg={MINT_BG} />
        <Kart icon={HandHelping} etiket="Açık yardım isteği" deger={acik} rengi={BUTTER} bg={BUTTER_BG} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {veri.seviyeler.map((s) => <SeviyeKarti key={s.seviye} s={s} />)}
      </div>
      {veri.ilkokulOgrenciSayisi > 0 && (
        <p className="text-[11px]" style={{ color: TEXT_MUTED }}>
          {veri.ilkokulOgrenciSayisi} ilkokul öğrencisi bu özete girmez: sisteme kendileri girmedikleri için Gelişim Raporu'ndan izlenir.
        </p>
      )}
    </div>
  );
}
