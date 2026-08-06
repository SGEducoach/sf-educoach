"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shield, Building2, ScrollText } from "lucide-react";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { sinifOgretmeniAta } from "@/app/dashboard/actions";
import { SinifEkleFormu } from "@/components/dashboard/OgretmenPanel";

interface OkulSatiri {
  id: string;
  ad: string;
  okul_kodu: string;
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
          {okullar.length > 0 && (
            <div className="flex items-center gap-2">
              <Building2 size={14} color={TEXT_MUTED} />
              <select
                value={gorunecekOkulId ?? ""}
                onChange={(e) => router.push(`/dashboard?okul=${e.target.value}`)}
                className="text-xs font-bold px-3 py-1.5 rounded-full outline-none"
                style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
                {okullar.map((o) => (
                  <option key={o.id} value={o.id}>{o.ad}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {!gorunenOkul ? (
          <p style={{ color: TEXT_MUTED }} className="text-sm py-4 text-center">Henüz kayıtlı okul yok.</p>
        ) : (
          <>
            <SinifEkleFormu schoolId={gorunenOkul.id} />

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
