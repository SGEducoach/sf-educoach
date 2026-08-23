"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { dershaneRosterTekEkle } from "@/app/dashboard/actions";
import { telefonSanitize, TELEFON_IPUCU } from "@/lib/validators";
import { AYT_ALAN_ETIKET } from "@/lib/types";
import type { AytAlan } from "@/lib/types";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// DERSHANE MODU — Faz D2 için geçici (stopgap) tek-tek roster ekleme
// ekranı. Faz D3'te tam Müdür paneli (6 sekme, toplu .xlsx yükleme,
// moderatör listesiyle birleşik görünüm) bunun yerini alacak — bu
// arada müdür↔öğrenci kayıt akışının uçtan uca çalıştığını doğrulamak
// için asgari bir arayüz.
export function DershaneRosterEkleFormu({ siniflar }: { siniflar: { id: string; seviye: string; sube: string }[] }) {
  const [ad, setAd] = useState("");
  const [telefon, setTelefon] = useState("");
  const [veliTelefon, setVeliTelefon] = useState("");
  const [classId, setClassId] = useState(siniflar[0]?.id ?? "");
  const [aytAlan, setAytAlan] = useState<AytAlan>("SAY");
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setBasari(null);
    setYukleniyor(true);
    const sonuc = await dershaneRosterTekEkle({ ad, telefon, veliTelefon: veliTelefon || undefined, classId, aytAlan });
    setYukleniyor(false);
    if (sonuc.error) return setHata(sonuc.error);
    setBasari(`${ad} eklendi — öğrenci kendi telefonuyla /signup üzerinden kaydını tamamlayabilir.`);
    setAd(""); setTelefon(""); setVeliTelefon("");
  }

  return (
    <div className="sfec-fade rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
          <UserPlus size={18} color={MINT} />
        </div>
        <div>
          <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Öğrenci ekle (dershane)</h2>
          <p style={{ color: TEXT_MUTED }} className="text-xs">
            Tam müdür paneli (toplu .xlsx yükleme, öğretmen ekleme, denemeler vb.) yakında — şimdilik tek tek roster ekleyebilirsiniz.
          </p>
        </div>
      </div>

      <form onSubmit={ekle} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ad Soyad</span>
          <input required value={ad} onChange={(e) => setAd(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Telefon</span>
          <input required value={telefon} inputMode="numeric" placeholder="5xxxxxxxxx"
            onChange={(e) => setTelefon(telefonSanitize(e.target.value))}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          <span style={{ color: TEXT_MUTED }} className="text-[10px]">Öğrenci kaydını tamamlarken bu telefonu kullanacak. {TELEFON_IPUCU}</span>
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Veli Telefonu (opsiyonel)</span>
          <input value={veliTelefon} inputMode="numeric" placeholder="5xxxxxxxxx"
            onChange={(e) => setVeliTelefon(telefonSanitize(e.target.value))}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Sınıf</span>
            <select required value={classId} onChange={(e) => setClassId(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              {siniflar.length === 0 && <option value="">Önce bir şube oluşturun</option>}
              {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Alan</span>
            <select required value={aytAlan} onChange={(e) => setAytAlan(e.target.value as AytAlan)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              {(Object.entries(AYT_ALAN_ETIKET) as [AytAlan, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>

        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        {basari && <div style={{ color: MINT }} className="text-xs font-semibold">{basari}</div>}

        <button type="submit" disabled={yukleniyor || !classId}
          className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
          style={{ background: MINT, color: MINT_ON }}>
          {yukleniyor ? "Ekleniyor..." : "Öğrenci ekle"}
        </button>
      </form>
    </div>
  );
}
