"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { dershaneRosterTopluEkle, type TopluRosterSonuc } from "@/app/dashboard/actions";
import { BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// DERSHANE MODU (Faz D4) — toplu öğrenci ön kayıt listesi yükleme. Şablon
// /api/dershane/roster-sablonu'ndan (gerçek .xlsx, Alan/Sınıf/Hafta
// İçi-Sonu kolonlarında açılır menü doğrulamalı) indirilir, doldurulup
// buradan geri yüklenir. Satır satır sonuç raporu gösterilir.
export function DershaneRosterTopluEkleFormu() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [sonuclar, setSonuclar] = useState<TopluRosterSonuc[] | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function yukle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setSonuclar(null);
    const dosya = inputRef.current?.files?.[0];
    if (!dosya) return setHata("Bir .xlsx dosyası seçin.");

    const formData = new FormData();
    formData.set("dosya", dosya);
    setYukleniyor(true);
    const sonuc = await dershaneRosterTopluEkle(formData);
    setYukleniyor(false);
    if (sonuc.error) return setHata(sonuc.error);
    setSonuclar(sonuc.sonuclar);
    if (inputRef.current) inputRef.current.value = "";
    if (sonuc.sonuclar.some((s) => !s.hata)) router.refresh();
  }

  const basariliSayisi = sonuclar?.filter((s) => !s.hata).length ?? 0;

  return (
    <div className="sfec-fade rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
          <Upload size={18} color={MINT} />
        </div>
        <div>
          <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Toplu öğrenci ön kaydı</h2>
          <p style={{ color: TEXT_MUTED }} className="text-xs">
            Listeyle eklenenler ön kayıt olur; öğrenci daha sonra telefonuyla kaydını tamamlar.
          </p>
        </div>
      </div>

      <a href="/api/dershane/roster-sablonu"
        className="sfec-btn inline-flex w-fit items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"
        style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        <Download size={13} /> Şablonu indir (.xlsx)
      </a>

      <form onSubmit={yukle} className="flex flex-col gap-3">
        <input ref={inputRef} type="file" accept=".xlsx"
          className="text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-xs file:font-bold"
          style={{ color: TEXT }} />
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <button type="submit" disabled={yukleniyor}
          className="sfec-btn w-fit text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-60"
          style={{ background: MINT, color: MINT_ON }}>
          {yukleniyor ? "Ön kayıtlar yükleniyor..." : "Ön kayıt listesini yükle"}
        </button>
      </form>

      {sonuclar && (
        <div className="flex flex-col gap-2">
          <div style={{ color: TEXT }} className="text-xs font-bold">
            {basariliSayisi}/{sonuclar.length} ön kayıt eklendi.
          </div>
          <div className="max-h-64 overflow-y-auto rounded-xl" style={{ border: `2px solid ${BORDER}` }}>
            <table className="w-full text-xs">
              <tbody>
                {sonuclar.map((s) => (
                  <tr key={s.satir} style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <td className="px-2 py-1.5" style={{ color: TEXT_MUTED }}>Satır {s.satir}</td>
                    <td className="px-2 py-1.5" style={{ color: TEXT }}>{s.ad}</td>
                    <td className="px-2 py-1.5" style={{ color: s.hata ? BLUSH : MINT }}>{s.hata ?? "Ön kayıt eklendi"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
