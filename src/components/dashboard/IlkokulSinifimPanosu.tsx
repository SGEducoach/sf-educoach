import Link from "next/link";
import { CalendarDays, ChevronRight, ClipboardList, HeartHandshake, Users } from "lucide-react";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, BLUSH, BLUSH_BG, BUTTER, BUTTER_BG, MINT, MINT_BG, SKY, SKY_BG, TEXT, TEXT_MUTED,
} from "@/lib/theme";
import { OGRETMEN_KALEM_SAYISI, type SinifimOzeti } from "@/lib/ilkokul-sinifim";

// İlkokul sınıf öğretmeninin ana sayfası (kullanıcı kararı 18.10.2026):
// "Sınıflarım" değil "Sınıfım". Bu ayın gelişim raporu, etkinlikler, veli
// bağlantısı ve öğrenci listesi tek panoda; her kutu ilgili ekrana götürür.
function tarihGoster(iso: string): string {
  const [, a, g] = iso.split("-");
  return `${Number(g)}.${a}`;
}

function Kutu({ ikon: Ikon, renk, zemin, baslik, children, href, eylem }: {
  ikon: typeof Users; renk: string; zemin: string; baslik: string; children: React.ReactNode; href: string; eylem: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: zemin }}>
          <Ikon size={13} color={renk} aria-hidden="true" />
        </span>
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>{baslik}</span>
      </div>
      <div className="flex-1">{children}</div>
      <Link href={href} className="sfec-btn inline-flex w-fit items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold"
        style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
        {eylem} <ChevronRight size={13} aria-hidden="true" />
      </Link>
    </div>
  );
}

export function IlkokulSinifimPanosu({ sinifId, sinifAdi, ayEtiketi, ozet, bekleyenVeliTalebi }: {
  sinifId: string; sinifAdi: string; ayEtiketi: string; ozet: SinifimOzeti; bekleyenVeliTalebi: number;
}) {
  const toplam = ozet.ogrenciler.length;
  const raporOrani = toplam > 0 ? ozet.raporuTamam / toplam : 0;
  return (
    <div className="flex flex-col gap-4">
      <section className="sfec-fade relative overflow-hidden rounded-3xl p-6" style={{ background: "linear-gradient(150deg, #2d6f8f, #123049)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-8 -right-6 h-40 w-40 opacity-15"
          style={{ background: "url(/icon-192.png) center / contain no-repeat", filter: "grayscale(1) brightness(3)" }} />
        <div className="text-xs font-bold uppercase tracking-[0.12em] text-white/80">Sınıfım</div>
        <div className="mt-1 text-5xl font-black leading-none tracking-tight text-white" style={{ fontFamily: "var(--font-baloo)" }}>{sinifAdi}</div>
        <div className="mt-3 text-sm font-semibold text-white/85">{toplam} öğrenci · {ayEtiketi}</div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Kutu ikon={ClipboardList} renk={raporOrani >= 1 ? MINT : BUTTER} zemin={raporOrani >= 1 ? MINT_BG : BUTTER_BG}
          baslik={`Gelişim raporu · ${ayEtiketi}`} href="/dashboard/ilkokul-gelisim" eylem={raporOrani >= 1 ? "Raporu gör" : "Raporu doldur"}>
          <div className="text-3xl font-black" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{ozet.raporuTamam}/{toplam}</div>
          <div className="text-xs" style={{ color: TEXT_MUTED }}>öğrencinin bu ayki raporu tamam</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: BORDER }} aria-hidden="true">
            <div className="h-full rounded-full" style={{ width: `${Math.round(raporOrani * 100)}%`, background: raporOrani >= 1 ? MINT : BUTTER }} />
          </div>
          {ozet.raporaBaslanmamis > 0 && (
            <div className="mt-2 text-[11px] font-semibold" style={{ color: BLUSH }}>{ozet.raporaBaslanmamis} öğrenciye henüz başlanmadı</div>
          )}
        </Kutu>

        <Kutu ikon={CalendarDays} renk={SKY} zemin={SKY_BG} baslik={`Etkinlikler · ${ayEtiketi}`} href="/dashboard/ilkokul-gelisim" eylem="Etkinlik ekle">
          <div className="text-3xl font-black" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{ozet.etkinlikSayisi}</div>
          <div className="text-xs" style={{ color: TEXT_MUTED }}>bu ay sosyal etkinlik</div>
          {ozet.oneCikanEtkinlikler.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1 text-xs" style={{ color: TEXT, margin: 0, padding: 0, listStyle: "none" }}>
              {ozet.oneCikanEtkinlikler.map((e) => (
                <li key={`${e.tarih}-${e.ad}`} className="flex justify-between gap-2">
                  <span className="truncate font-semibold">{e.ad}</span>
                  <span className="shrink-0" style={{ color: e.gecti ? TEXT_MUTED : SKY }}>{tarihGoster(e.tarih)}{e.gecti ? ` · ${e.katilim} katılım` : " · yaklaşıyor"}</span>
                </li>
              ))}
            </ul>
          )}
        </Kutu>

        <Kutu ikon={HeartHandshake} renk={MINT} zemin={MINT_BG} baslik="Veliler" href="/dashboard/talepler"
          eylem={bekleyenVeliTalebi > 0 ? `${bekleyenVeliTalebi} talebi incele` : "Veli talepleri"}>
          <div className="text-3xl font-black" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{ozet.veliBagli}/{toplam}</div>
          <div className="text-xs" style={{ color: TEXT_MUTED }}>öğrencinin velisi sisteme bağlı</div>
          {bekleyenVeliTalebi > 0 && (
            <div className="mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: BLUSH_BG, color: BLUSH }}>{bekleyenVeliTalebi} bekleyen veli talebi</div>
          )}
        </Kutu>
      </div>

      <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }} aria-label="Öğrenciler">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: MINT_BG }}>
            <Users size={13} color={MINT} aria-hidden="true" />
          </span>
          <span className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Öğrenciler</span>
          <span className="text-xs" style={{ color: TEXT_MUTED }}>· öğrenciye tıklayınca gelişim raporu açılır</span>
        </div>
        {toplam === 0 ? (
          <p className="py-4 text-center text-sm" style={{ color: TEXT_MUTED }}>Sınıfınızda henüz öğrenci yok. Öğrenciler kurum yöneticisi tarafından eklenir.</p>
        ) : (
          <div className="sfec-liste">
            {ozet.ogrenciler.map((o) => {
              const tamam = o.yazilanKalem >= OGRETMEN_KALEM_SAYISI;
              const durum = tamam ? "Rapor tamam" : o.yazilanKalem === 0 ? "Başlanmadı" : `${o.yazilanKalem}/${OGRETMEN_KALEM_SAYISI} kalem`;
              const renk = tamam ? MINT : o.yazilanKalem === 0 ? BLUSH : BUTTER;
              const zemin = tamam ? MINT_BG : o.yazilanKalem === 0 ? BLUSH_BG : BUTTER_BG;
              return (
                <Link key={o.id} href={`/dashboard?bolum=ozet&sinif=${sinifId}&ogrenci=${o.id}`}
                  className="sfec-liste-satiri sfec-btn flex items-center gap-3 px-3 py-2.5">
                  <span className="w-8 shrink-0 text-xs font-bold tabular-nums" style={{ color: TEXT_MUTED }}>{o.okulNo}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: TEXT }}>{o.ad}</span>
                  <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: zemin, color: renk }}>{durum}</span>
                  <span className="hidden shrink-0 text-[10px] font-semibold sm:inline" style={{ color: o.veliBagli ? MINT : TEXT_MUTED }}>
                    {o.veliBagli ? "veli bağlı" : "veli yok"}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
