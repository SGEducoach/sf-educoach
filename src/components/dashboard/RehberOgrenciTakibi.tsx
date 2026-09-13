"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, CalendarPlus, ClipboardList, ListChecks, PenLine, Trash2, UserRound } from "lucide-react";
import { BG0, BG1, BG1_ALT, BLUSH, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { GOREV_DURUMU_ETIKET, GOREV_TURU_ETIKET } from "@/lib/types";
import type { GorevDurumu, GorevTuru } from "@/lib/types";
import { bugununTarihiTR } from "@/lib/tarih";
import { REHBER_GERIYE_DONUK_GUN } from "@/lib/rehberlik";
import { GorevVerBolumu } from "@/components/dashboard/OgretmenPanel";
import { DenemeForm, KonuCalismaForm, SoruCozumuForm } from "@/components/dashboard/OgrenciVeriGirisi";
import { PlanEkleModal } from "@/components/dashboard/Gorevlerim";
import { rehberGorevVer, rehberProgramSil } from "@/app/dashboard/rehber-ogrenci-actions";
import type { RehberOgrenci, RehberSecilenOgrenci } from "@/lib/dershane-rehber";

// Dershane rehberlik servisi (kullanıcı isteği 13.09.2026): dershane
// öğretmenleri öğrenci takibine genelde bakmadığı ve öğrenciler veri
// girişine direndiği için rehber öğretmen öğrenci adına ödev verir, veri
// girer, program yapar. Veri analizde sayılır, rozette sayılmaz; program
// kalemini öğrenci yalnızca tamamlar (bkz. migration 0107).
type Sekme = "odev" | "veri" | "program";
type VeriSekmesi = "konu" | "soru" | "deneme";

const SEKMELER: { id: Sekme; ad: string; ikon: typeof BookOpen }[] = [
  { id: "odev", ad: "Ödev ver", ikon: ListChecks },
  { id: "veri", ad: "Veri gir", ikon: PenLine },
  { id: "program", ad: "Program yap", ikon: CalendarPlus },
];

const VERI_SEKMELERI: { id: VeriSekmesi; ad: string; ikon: typeof BookOpen }[] = [
  { id: "konu", ad: "Konu Çalışma", ikon: BookOpen },
  { id: "soru", ad: "Soru Çözümü", ikon: PenLine },
  { id: "deneme", ad: "Deneme", ikon: ClipboardList },
];

function gunEtiketi(tarih: string) {
  return new Date(`${tarih}T00:00:00`).toLocaleDateString("tr-TR", { weekday: "short", day: "2-digit", month: "short" });
}

function saatEtiketi(saat: string | null) {
  return saat ? saat.slice(0, 5) : "--:--";
}

export function RehberOgrenciTakibi({ ogrenciler, secilen, konuOnerileri }: {
  ogrenciler: RehberOgrenci[];
  secilen: RehberSecilenOgrenci | null;
  konuOnerileri: { ders: string; konu: string; seviye?: string | null }[];
}) {
  const router = useRouter();
  const [sekme, setSekme] = useState<Sekme>(secilen ? "veri" : "odev");
  const [veriSekmesi, setVeriSekmesi] = useState<VeriSekmesi>("konu");
  const [basari, setBasari] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [planTarihi, setPlanTarihi] = useState(bugununTarihiTR);
  const [planAcik, setPlanAcik] = useState(false);
  const [pending, startTransition] = useTransition();

  const gorevOgrencileri = ogrenciler.map((o) => ({ id: o.id, ad: `${o.ad} · ${o.sinifAdi}`, okul_no: o.okulNo, yurtOgrencisi: false }));

  function ogrenciSec(id: string) {
    setBasari(null);
    setHata(null);
    router.push(id ? `/dashboard/ogrenci-takibi?ogrenci=${id}` : "/dashboard/ogrenci-takibi");
  }

  function basariGoster(mesaj: string) {
    setBasari(mesaj);
    setTimeout(() => setBasari(null), 3000);
  }

  function programKaleminiSil(atamaId: string) {
    if (!window.confirm("Bu kalem öğrencinin programından kaldırılsın mı?")) return;
    setHata(null);
    startTransition(async () => {
      const r = await rehberProgramSil(atamaId);
      if (r.error) setHata(r.error);
      else router.refresh();
    });
  }

  if (ogrenciler.length === 0) {
    return (
      <div className="sfec-fade rounded-3xl p-6 text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <p style={{ color: TEXT_MUTED }} className="text-sm">Dershanenizde henüz öğrenci yok.</p>
      </div>
    );
  }

  const ogrenciSecici = (
    <label className="flex flex-col gap-1">
      <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Öğrenci</span>
      <select value={secilen?.id ?? ""} onChange={(e) => ogrenciSec(e.target.value)}
        className="text-sm font-semibold px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }}>
        <option value="">Öğrenci seçin</option>
        {ogrenciler.map((o) => <option key={o.id} value={o.id}>{o.ad} · {o.sinifAdi}</option>)}
      </select>
    </label>
  );

  const ogrenciSecilmedi = (
    <div className="rounded-2xl p-5 text-center" style={{ background: BG0, border: `2px dashed ${BORDER}` }}>
      <UserRound size={20} color={TEXT_MUTED} className="mx-auto mb-2" />
      <p style={{ color: TEXT_MUTED }} className="text-sm">Devam etmek için yukarıdan bir öğrenci seçin.</p>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="mb-4">
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-extrabold">Öğrenci Takibi</h1>
          <p style={{ color: TEXT_MUTED }} className="text-xs mt-1">
            Öğrenci adına ödev verin, veri girin ve program yapın. Girdiğiniz veriler öğrencinin analizinde sayılır, rozetlerine sayılmaz.
          </p>
        </div>
        <div className="flex gap-1 p-1 rounded-full" style={{ background: BG0, border: `2px solid ${BORDER}` }}>
          {SEKMELER.map((s) => {
            const Ikon = s.ikon;
            const aktif = sekme === s.id;
            return (
              <button key={s.id} type="button" onClick={() => { setSekme(s.id); setBasari(null); setHata(null); }}
                className="sfec-btn flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-full text-[12px] font-bold"
                style={{ background: aktif ? MINT : "transparent", color: aktif ? MINT_ON : TEXT_MUTED }}>
                <Ikon size={13} /> {s.ad}
              </button>
            );
          })}
        </div>
      </div>

      {basari && (
        <div className="sfec-fade rounded-2xl px-4 py-2.5 text-[13px] font-semibold" style={{ background: MINT_BG, color: MINT }}>✓ {basari}</div>
      )}
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold px-1">{hata}</div>}

      {sekme === "odev" && (
        <GorevVerBolumu ogrenciler={gorevOgrencileri} konuOnerileri={konuOnerileri} gorevVerEylemi={rehberGorevVer} />
      )}

      {sekme === "veri" && (
        <div className="sfec-fade rounded-3xl p-5 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          {ogrenciSecici}
          {!secilen ? ogrenciSecilmedi : (
            <>
              <p style={{ color: TEXT_MUTED }} className="text-[11px]">
                {secilen.ad} adına giriş yapıyorsunuz. En fazla {REHBER_GERIYE_DONUK_GUN} gün geriye dönük girebilirsiniz.
              </p>
              <div className="flex gap-1 p-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
                {VERI_SEKMELERI.map((s) => {
                  const Ikon = s.ikon;
                  const aktif = veriSekmesi === s.id;
                  return (
                    <button key={s.id} type="button" onClick={() => setVeriSekmesi(s.id)}
                      className="sfec-btn flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[12px] font-bold"
                      style={{ background: aktif ? MINT : "transparent", color: aktif ? MINT_ON : TEXT_MUTED }}>
                      <Ikon size={13} /> {s.ad}
                    </button>
                  );
                })}
              </div>
              {veriSekmesi === "konu" && (
                <KonuCalismaForm key={`konu-${secilen.id}`} rehberOgrenciId={secilen.id} dersListesi={secilen.dersListesi} konuOnerileri={konuOnerileri}
                  sinifSeviyesi={secilen.sinifSeviyesi} mufredatAltKonulari={secilen.mufredatAltKonulari} gerekYokListesi={secilen.gerekYokListesi}
                  onBasari={(m) => basariGoster(`${secilen.ad}: ${m}`)} />
              )}
              {veriSekmesi === "soru" && (
                <SoruCozumuForm key={`soru-${secilen.id}`} rehberOgrenciId={secilen.id} dersListesi={secilen.dersListesi} konuOnerileri={konuOnerileri}
                  onBasari={(m) => basariGoster(`${secilen.ad}: ${m}`)} />
              )}
              {veriSekmesi === "deneme" && (
                <DenemeForm key={`deneme-${secilen.id}`} rehberOgrenciId={secilen.id} aytAlan={secilen.aytAlan} sinifSeviyesi={secilen.sinifSeviyesi}
                  onBasari={(m) => basariGoster(`${secilen.ad}: ${m}`)} />
              )}
            </>
          )}
        </div>
      )}

      {sekme === "program" && (
        <div className="sfec-fade rounded-3xl p-5 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          {ogrenciSecici}
          {!secilen ? ogrenciSecilmedi : (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1">
                  <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Gün</span>
                  <input type="date" value={planTarihi} onChange={(e) => setPlanTarihi(e.target.value)}
                    className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG1_ALT, color: TEXT }} />
                </label>
                <button type="button" onClick={() => planTarihi && setPlanAcik(true)} disabled={!planTarihi}
                  className="sfec-btn inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
                  <CalendarPlus size={14} /> Programa kalem ekle
                </button>
              </div>
              <p style={{ color: TEXT_MUTED }} className="text-[11px]">
                Eklediğiniz kalem öğrencinin programına doğrudan girer; öğrenci saatini değiştiremez, yalnızca tamamlar.
              </p>

              <div className="flex flex-col gap-2">
                <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Önümüzdeki 14 günün programı</span>
                {secilen.program.length === 0 ? (
                  <p style={{ color: TEXT_MUTED }} className="text-sm">Bu tarihlerde programda kalem yok.</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {secilen.program.map((k) => (
                      <li key={k.atamaId} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: BG0, border: `1px solid ${BORDER}` }}>
                        <div className="min-w-[92px] text-[11px] font-bold tabular-nums" style={{ color: TEXT_MUTED }}>
                          <div>{gunEtiketi(k.tarih)}</div>
                          <div>{saatEtiketi(k.baslangicSaat)}–{saatEtiketi(k.bitisSaat)}</div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate" style={{ color: TEXT }}>
                            {GOREV_TURU_ETIKET[k.tur as GorevTuru] ?? k.tur} · {k.ders}{k.konu ? ` · ${k.konu}` : ""}
                          </div>
                          <div className="text-[11px]" style={{ color: TEXT_MUTED }}>
                            {GOREV_DURUMU_ETIKET[k.durum as GorevDurumu] ?? k.durum}{k.rehberYerlestirdi ? " · Rehberlik servisi" : ""}
                          </div>
                        </div>
                        {k.rehberYerlestirdi && (
                          <button type="button" onClick={() => programKaleminiSil(k.atamaId)} disabled={pending} aria-label="Kalemi kaldır"
                            className="sfec-btn w-8 h-8 rounded-full flex items-center justify-center disabled:opacity-60" style={{ background: "rgba(255,255,255,0.06)" }}>
                            <Trash2 size={14} color={BLUSH} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {planAcik && (
                <PlanEkleModal rehberOgrenciId={secilen.id} tarih={planTarihi} dersListesi={secilen.dersListesi} konuOnerileri={konuOnerileri}
                  gerekYokListesi={secilen.gerekYokListesi} onKapat={() => { setPlanAcik(false); router.refresh(); }} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
