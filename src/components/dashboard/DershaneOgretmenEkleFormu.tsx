"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import { dershaneOgretmenEkle } from "@/app/dashboard/actions";
import { telefonSanitize, telefonGecerliMi, TELEFON_IPUCU } from "@/lib/validators";
import { BRANS_LISTESI } from "@/lib/types";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// DERSHANE MODU — müdürün öğretmen eklemesi. Admin'in ogretmenEkleManuel'i
// sınıf öğretmenliğini ayrı bir adımda (admin-only) atarken, burada
// YARATMA anında opsiyonel olarak seçilebiliyor (teachers_class_id_guard
// trigger'ı sadece UPDATE'i kısıtlıyor — bkz. dershaneOgretmenEkle).
export function DershaneOgretmenEkleFormu({ siniflar }: { siniflar: { id: string; seviye: string; sube: string }[] }) {
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [brans, setBrans] = useState<string>(BRANS_LISTESI[0]);
  const [classId, setClassId] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{ email: string; sifre: string } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!telefonGecerliMi(telefon)) return setHata("Telefon numarası geçersiz. " + TELEFON_IPUCU);
    setYukleniyor(true);
    const sonucYaniti = await dershaneOgretmenEkle({ ad, email, telefon, brans, classId: classId || undefined });
    setYukleniyor(false);
    if (sonucYaniti.error || !sonucYaniti.sifre) return setHata(sonucYaniti.error ?? "Öğretmen eklenemedi.");
    setSonuc({ email: email.trim().toLowerCase(), sifre: sonucYaniti.sifre });
    setAd(""); setEmail(""); setTelefon(""); setClassId("");
  }

  return (
    <div className="sfec-fade rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
          <GraduationCap size={18} color={MINT} />
        </div>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Öğretmen ekle</h2>
      </div>

      {sonuc && (
        <div className="rounded-2xl px-4 py-3" style={{ background: MINT_BG, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide mb-1">{sonuc.email} — geçici şifre</div>
          <div style={{ color: MINT, fontFamily: "monospace" }} className="text-xl font-bold tracking-widest">{sonuc.sifre}</div>
        </div>
      )}

      <form onSubmit={ekle} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ad Soyad</span>
          <input required value={ad} onChange={(e) => setAd(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">E-posta</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Telefon</span>
          <input required value={telefon} inputMode="numeric" placeholder="5xxxxxxxxx" onChange={(e) => setTelefon(telefonSanitize(e.target.value))}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          <span style={{ color: TEXT_MUTED }} className="text-[10px]">{TELEFON_IPUCU}</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Branş</span>
            <select required value={brans} onChange={(e) => setBrans(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              {BRANS_LISTESI.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Sınıf Öğretmenliği (varsa)</span>
            <select value={classId} onChange={(e) => setClassId(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              <option value="">Yok</option>
              {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
            </select>
          </label>
        </div>

        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}

        <button type="submit" disabled={yukleniyor}
          className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
          style={{ background: MINT, color: MINT_ON }}>
          {yukleniyor ? "Ekleniyor..." : "Öğretmen ekle"}
        </button>
      </form>
    </div>
  );
}
