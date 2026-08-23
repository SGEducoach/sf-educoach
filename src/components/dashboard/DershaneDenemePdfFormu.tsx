"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { denemePdfIceriAktar } from "@/app/dashboard/deneme-pdf-actions";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// DERSHANE MODU (Faz D5) — toplu deneme sonucu PDF'i yükle, Claude vision
// ile ayrıştırılıp ad-soyad ile öğrencilerle eşleştirilir. Belirsiz/
// eşleşmeyen satırlar admin'in (/yonetici) inceleme kuyruğuna düşer.
export function DershaneDenemePdfFormu() {
  const dosyaRef = useRef<HTMLInputElement>(null);
  const [yayinevi, setYayinevi] = useState("");
  const [tarih, setTarih] = useState("");
  const [tur, setTur] = useState<"TYT" | "AYT" | "BRANS">("TYT");
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{
    toplam: number;
    otomatikEslesen: number;
    kayitBekleyen: number;
    incelemeBekleyen: number;
  } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function yukle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setSonuc(null);
    const dosya = dosyaRef.current?.files?.[0];
    if (!dosya) return setHata("Bir PDF dosyası seçin.");
    if (!yayinevi.trim()) return setHata("Yayınevi gerekli.");
    if (!tarih) return setHata("Uygulama tarihi gerekli.");

    const formData = new FormData();
    formData.set("dosya", dosya);
    formData.set("yayinevi", yayinevi.trim());
    formData.set("tarih", tarih);
    formData.set("tur", tur);

    setYukleniyor(true);
    const yanit = await denemePdfIceriAktar(formData);
    setYukleniyor(false);
    if (yanit.error) return setHata(yanit.error);
    setSonuc({
      toplam: yanit.toplam,
      otomatikEslesen: yanit.otomatikEslesen,
      kayitBekleyen: yanit.kayitBekleyen,
      incelemeBekleyen: yanit.incelemeBekleyen,
    });
    if (dosyaRef.current) dosyaRef.current.value = "";
  }

  return (
    <div className="sfec-fade rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
          <FileSpreadsheet size={18} color={MINT} />
        </div>
        <div>
          <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Toplu deneme sonucu yükle</h2>
          <p style={{ color: TEXT_MUTED }} className="text-xs">Deneme sonuç PDF&apos;i öğrencilerle ad-soyad ile otomatik eşleştirilir; belirsiz satırlar site yöneticisine düşer.</p>
        </div>
      </div>

      <form onSubmit={yukle} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Deneme sonuç PDF&apos;i</span>
          <input ref={dosyaRef} type="file" accept="application/pdf"
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-2 file:text-xs file:font-bold"
            style={{ color: TEXT }} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Yayınevi</span>
            <input required value={yayinevi} onChange={(e) => setYayinevi(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Uygulama Tarihi</span>
            <input required type="date" value={tarih} onChange={(e) => setTarih(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          </label>
        </div>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Tür</span>
          <select value={tur} onChange={(e) => setTur(e.target.value as typeof tur)}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
            <option value="TYT">TYT</option>
            <option value="AYT">AYT</option>
            <option value="BRANS">Branş Denemesi (9-10. sınıf)</option>
          </select>
        </label>

        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        {sonuc && (
          <div className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: MINT_BG, color: MINT }}>
            {sonuc.toplam} öğrenci bulundu — {sonuc.otomatikEslesen} aktif öğrenciye işlendi
            {sonuc.kayitBekleyen > 0 && `, ${sonuc.kayitBekleyen} ön kayıt sonucu öğrenci hesabını açınca otomatik işlenmek üzere saklandı`}
            {sonuc.incelemeBekleyen > 0 && `, ${sonuc.incelemeBekleyen} sonuç site yöneticisinin incelemesine bırakıldı`}.
          </div>
        )}

        <button type="submit" disabled={yukleniyor}
          className="sfec-btn w-fit text-sm font-bold px-4 py-2.5 rounded-xl disabled:opacity-60"
          style={{ background: MINT, color: MINT_ON }}>
          {yukleniyor ? "İşleniyor... (biraz sürebilir)" : "Yükle ve ayrıştır"}
        </button>
      </form>
    </div>
  );
}
