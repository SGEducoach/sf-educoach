"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check, Users, Eye, Plus } from "lucide-react";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, SKY, SKY_BG, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { veliTalepOnayla, sinifEkle, ogretmenDuyuruGonder } from "@/app/dashboard/actions";
import { DuyuruFormu } from "@/components/dashboard/DuyuruFormu";
import type { VeliLinkRequest } from "@/lib/types";

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

export function OgretmenPanel({
  role, bekleyenTalepler, ogrenciler, sinifAdi, siniflar, gorunecekSinifId, kendiSinifId, kendiSinifiMi,
}: {
  role: "ogretmen" | "mudur";
  bekleyenTalepler: (VeliLinkRequest & { ogrenci_ad: string })[];
  ogrenciler: OgrenciSatiri[];
  sinifAdi: string | null;
  siniflar: SinifSatiri[];
  gorunecekSinifId: string | null;
  kendiSinifId: string | null;
  kendiSinifiMi: boolean;
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
        { deger: "11", etiket: "11. Sınıflar" },
        { deger: "12", etiket: "12. Sınıflar" },
        ...siniflar.map((s) => ({ deger: s.id, etiket: `Sadece ${s.seviye}-${s.sube}` })),
      ]
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {duyuruMumkunMu && (
        <DuyuruFormu
          baslik={role === "mudur" ? "Okula duyuru gönder" : "Sınıfınıza duyuru gönder"}
          aciklama={role === "mudur"
            ? "Seçtiğiniz kapsamdaki öğrencilere ve bağlı velilere push bildirimi olarak gider."
            : "Sadece sınıf öğretmeni olduğunuz sınıftaki öğrencilere ve bağlı velilere push bildirimi olarak gider."}
          gonder={ogretmenDuyuruGonder}
          kapsamSecenekleri={duyuruKapsamSecenekleri}
        />
      )}

      {kendiSinifId && (
        <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
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
                <div key={t.id} className="rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
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
                <div key={t.id} className="rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
                  <div>
                    <div style={{ color: TEXT }} className="text-sm font-semibold">{t.veli_ad} <span style={{ color: TEXT_MUTED }} className="font-normal">· {t.veli_telefon}</span></div>
                    <div style={{ color: TEXT_MUTED }} className="text-xs mt-0.5">Öğrenci: {t.ogrenci_ad}</div>
                  </div>
                  <button onClick={() => onayla(t)} disabled={pending}
                    className="sgec-btn text-xs font-bold px-3.5 py-1.5 rounded-full disabled:opacity-60"
                    style={{ background: MINT, color: MINT_ON }}>
                    Onayla ve kod üret
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
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
              style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
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
              <button key={o.id} onClick={() => router.push(`/dashboard?sinif=${gorunecekSinifId}&ogrenci=${o.id}`)}
                className="sgec-btn rounded-xl px-3.5 py-2.5 flex items-center justify-between text-left"
                style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
                <span style={{ color: TEXT }} className="text-sm font-semibold">{o.ad}</span>
                <span style={{ color: TEXT_MUTED }} className="text-xs">#{o.okul_no}</span>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export function SinifEkleFormu({ schoolId }: { schoolId: string }) {
  const [seviye, setSeviye] = useState<"11" | "12">("11");
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
        <select value={seviye} onChange={(e) => setSeviye(e.target.value as "11" | "12")}
          className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
          <option value="11">11</option>
          <option value="12">12</option>
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Şube</span>
        <input value={sube} onChange={(e) => setSube(e.target.value)} placeholder="örn. E" maxLength={2}
          className="text-sm px-2.5 py-1.5 rounded-xl outline-none w-20" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
      </label>
      <button type="submit" disabled={pending}
        className="sgec-btn flex items-center gap-1 text-xs font-bold px-3.5 py-1.5 rounded-full disabled:opacity-60"
        style={{ background: MINT, color: MINT_ON }}>
        <Plus size={13} /> {pending ? "Ekleniyor..." : "Sınıf ekle"}
      </button>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      {basari && <div style={{ color: MINT }} className="text-xs font-semibold">{basari}</div>}
    </form>
  );
}
