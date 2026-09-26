import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, CalendarCheck, Database, UserPlus } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AKTIVITE_DONEMLERI, aktiviteDonemiEtiketi, ogrenciAktivitesiGetir, type AktiviteDonemi,
} from "@/lib/ogrenci-aktivitesi-verisi";
import { zamanGoster, type OgrenciOzeti } from "@/lib/ogrenci-aktivitesi";
import { AktiviteFiltresi, HareketListesi } from "@/components/yonetici/OgrenciAktivitesiIstemci";
import { BG1, BG1_ALT, BLUSH, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";

// Admin "Öğrenci Aktivitesi" (kullanıcı isteği, 26.09.2026) — İşlem
// Geçmişi'nden (yönetici işlemleri) BAĞIMSIZ: öğrencilerin kendi hareketleri.
// Üstte kurum bazlı üç kart, altta son 200 hareket.

function OgrenciAdi({ o, ek }: { o: OgrenciOzeti; ek?: ReactNode }) {
  return (
    <span className="min-w-0 block">
      <Link href={`/yonetici/kullanici/${o.id}`} style={{ color: TEXT }} className="font-bold hover:underline">{o.ad}</Link>
      <span style={{ color: TEXT_MUTED }} className="block text-[11px] truncate">{[o.sinif, o.kurum].filter(Boolean).join(" · ") || "—"}</span>
      {ek && <span style={{ color: TEXT_MUTED }} className="block text-[10px]">{ek}</span>}
    </span>
  );
}

function Kart({ baslik, aciklama, ikon, children }: { baslik: string; aciklama: string; ikon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl p-5 flex flex-col gap-3 min-w-0" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div>
        <div className="flex items-center gap-2">
          {ikon}
          <h3 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">{baslik}</h3>
        </div>
        <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-0.5">{aciklama}</p>
      </div>
      {children}
    </section>
  );
}

function Siralama<T>({ satirlar, bos, deger, ek }: {
  satirlar: { ogrenci: OgrenciOzeti; veri: T }[]; bos: string; deger: (v: T) => ReactNode; ek?: (v: T) => ReactNode;
}) {
  if (satirlar.length === 0) return <p style={{ color: TEXT_MUTED }} className="text-sm">{bos}</p>;
  return (
    <ol className="flex flex-col gap-2">
      {satirlar.map(({ ogrenci, veri }, i) => (
        <li key={ogrenci.id} className="flex items-center gap-2.5 rounded-xl px-3 py-2"
          style={{ background: i === 0 ? BG1_ALT : "transparent", border: i === 0 ? `1px solid ${BORDER}` : "1px solid transparent" }}>
          <span style={{ color: TEXT_MUTED }} className={`font-bold tabular-nums ${i === 0 ? "text-lg" : "text-xs"} w-5 text-center`}>{i + 1}</span>
          <span className="flex-1 min-w-0 text-sm"><OgrenciAdi o={ogrenci} ek={ek?.(veri)} /></span>
          <span className="text-right shrink-0">{deger(veri)}</span>
        </li>
      ))}
    </ol>
  );
}

export async function OgrenciAktivitesi({ kurumId, donem }: { kurumId: string | null; donem: AktiviteDonemi }) {
  const veri = await ogrenciAktivitesiGetir(createAdminClient(), { kurumId, donem });
  const kurumAdi = kurumId ? veri.kurumlar.find((k) => k.id === kurumId)?.ad ?? "Kurum" : "Tüm kurumlar";
  const donemEtiketi = aktiviteDonemiEtiketi(donem);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-3xl p-5 flex flex-wrap items-center justify-between gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div>
          <div className="flex items-center gap-2">
            <Activity size={16} color={TEXT_MUTED} aria-hidden="true" />
            <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Öğrenci Aktivitesi</h2>
          </div>
          <p style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">{kurumAdi} · {donemEtiketi.toLocaleLowerCase("tr-TR")}. Yönetici işlemleri için İşlem Geçmişi&apos;ne bakın.</p>
        </div>
        <AktiviteFiltresi kurumlar={veri.kurumlar} kurumId={kurumId} donem={donem} donemler={AKTIVITE_DONEMLERI} />
      </div>

      {veri.error && <p style={{ color: BLUSH }} className="text-sm font-semibold">Veri alınamadı: {veri.error}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <Kart baslik="En çok veri giren" aciklama={`${donemEtiketi} · girilen konu, soru ve deneme kayıtları`} ikon={<Database size={15} color={TEXT_MUTED} aria-hidden="true" />}>
          <Siralama bos="Bu dönemde veri girişi yok."
            satirlar={veri.veriSiralamasi.map((s) => ({ ogrenci: s.ogrenci, veri: s }))}
            deger={(s) => <span style={{ color: TEXT }} className="text-sm font-bold tabular-nums">{s.toplam}</span>}
            ek={(s) => `${s.konu} konu · ${s.soru} soru · ${s.deneme} deneme`} />
        </Kart>

        <Kart baslik="En çok giriş yapan" aciklama={`${donemEtiketi} · siteyi kullandığı farklı gün sayısı`} ikon={<CalendarCheck size={15} color={TEXT_MUTED} aria-hidden="true" />}>
          <Siralama bos="Bu dönemde aktif öğrenci yok." satirlar={veri.aktifGunSiralamasi.map((s) => ({ ogrenci: s.ogrenci, veri: s }))}
            deger={(s) => <span style={{ color: TEXT }} className="text-sm font-bold tabular-nums">{s.gunSayisi} gün</span>}
            ek={(s) => `son: ${s.sonGun.split("-").reverse().slice(0, 2).join(".")}`} />
          <p style={{ color: TEXT_MUTED, background: BG1_ALT }} className="text-[10px] rounded-xl px-3 py-2">
            {veri.girisTakibiVar
              ? "Siteye girdiği günler ile veri girdiği günler birlikte sayılır."
              : "Şimdilik yalnızca veri girdiği günler sayılıyor; giriş takibi migration 0124 uygulanınca eklenecek."}
            {veri.sonGorulenler[0] && <> Son görülen: <b>{veri.sonGorulenler[0].ogrenci.ad}</b> ({zamanGoster(veri.sonGorulenler[0].sonGorulme)}).</>}
          </p>
        </Kart>

        <Kart baslik="En son kayıt olan" aciklama="Sisteme en son katılan öğrenciler" ikon={<UserPlus size={15} color={TEXT_MUTED} aria-hidden="true" />}>
          <Siralama bos="Kayıtlı öğrenci yok." satirlar={veri.sonKayitlar.map((o) => ({ ogrenci: o, veri: o.kayitZamani }))}
            deger={(z) => <span style={{ color: TEXT_MUTED }} className="text-[11px] tabular-nums">{zamanGoster(z)}</span>} />
        </Kart>
      </div>

      <section className="rounded-3xl p-5 flex flex-col gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div>
          <h3 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Son hareketler</h3>
          <p style={{ color: TEXT_MUTED }} className="text-[11px] mt-0.5">
            Son 200 öğrenci hareketi, kaydın yapıldığı ana göre. Okulun toplu deneme yüklemeleri tek satırda.
          </p>
        </div>
        <HareketListesi hareketler={veri.hareketler} />
      </section>
    </div>
  );
}
