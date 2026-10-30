"use client";
import { useRef, useState } from "react";
import { BG0, BG1_ALT, BORDER_STRONG, BLUSH, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import { DRIVE_EK_KABUL, DRIVE_EK_SAYISI, driveDosyasiDogrula, type DriveDurumu, type DriveEki } from "@/lib/whatsapp-drive";
import { driveApi, driveDosyasiYukle, driveDurumuOku, type DriveYuklemeTaslagi } from "@/components/dashboard/whatsapp-drive-istemci";

interface Satir { key: string; dosya: File; taslak?: DriveYuklemeTaslagi; ek?: DriveEki; hata?: string }
export function WhatsappDriveEkleri({ onDegis, onBekle, onEksik }: { onDegis: (ekler: DriveEki[]) => void; onBekle: (v: boolean) => void; onEksik: (v: boolean) => void }) {
  const [acik, setAcik] = useState(false), [durum, setDurum] = useState<DriveDurumu | null>(null), [bekle, setBekle] = useState(false);
  const [hata, setHata] = useState<string | null>(null), [satirlar, setSatirlar] = useState<Satir[]>([]);
  const ref = useRef<Satir[]>([]);
  const buton = "sfec-btn rounded-xl px-3 py-2 text-xs font-bold disabled:opacity-50";
  function guncelle(l: Satir[]) { ref.current = l; setSatirlar(l); onDegis(l.flatMap((s) => s.ek ? [s.ek] : [])); onEksik(l.some((s) => !s.ek)); }
  async function durumOku() {
    setBekle(true); setHata(null);
    try { setDurum(await driveDurumuOku<DriveDurumu>()); } catch (e) { setHata(e instanceof Error ? e.message : "Drive durumu okunamadı."); } finally { setBekle(false); }
  }
  function sec(dosyalar: FileList | null) {
    setHata(null); const l = [...ref.current];
    for (const dosya of Array.from(dosyalar ?? [])) {
      if (l.length >= DRIVE_EK_SAYISI) { setHata("En fazla 5 Drive dosyası eklenebilir."); break; }
      try { driveDosyasiDogrula({ ad: dosya.name, boyut: dosya.size }); } catch (e) { setHata(e instanceof Error ? e.message : "Geçersiz dosya."); continue; }
      if (!l.some((s) => s.dosya.name === dosya.name && s.dosya.size === dosya.size && s.dosya.lastModified === dosya.lastModified)) l.push({ key: crypto.randomUUID(), dosya });
    }
    guncelle(l);
  }
  async function yukle() {
    setBekle(true); onBekle(true); setHata(null);
    try {
      for (const s of [...ref.current]) {
        if (s.ek) continue;
        try {
          const yeniden = !!s.taslak;
          const taslak = s.taslak ?? await driveApi<DriveYuklemeTaslagi>("baslat", { ad: s.dosya.name, boyut: s.dosya.size });
          guncelle(ref.current.map((v) => v.key === s.key ? { ...v, taslak, hata: undefined } : v));
          const { ek } = await driveDosyasiYukle(s.dosya, taslak, yeniden);
          guncelle(ref.current.map((v) => v.key === s.key ? { ...v, ek } : v));
        } catch (e) {
          const mesaj = e instanceof Error && e.name !== "TimeoutError" ? e.message : "Bağlantı zaman aşımına uğradı. Yeniden deneyin.";
          guncelle(ref.current.map((v) => v.key === s.key ? { ...v, hata: mesaj } : v));
          setHata("Bazı dosyalar yüklenemedi. Yüklenenler korunur; kalanlar için yeniden deneyin."); break;
        }
      }
    } finally { setBekle(false); onBekle(false); }
  }
  return <div className="flex flex-col gap-2 rounded-xl p-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
    <button type="button" aria-expanded={acik} disabled={bekle} className={buton} style={{ background: BG0, color: TEXT }} onClick={() => { setAcik(!acik); if (!acik && !durum) void durumOku(); }}>Dosyaları Drive üzerinden paylaş {acik ? "−" : "+"}</button>
    {acik && <>
      <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Dosyalar ortak Drive klasörüne yüklenir. Öğrenci mesajdaki bağlantıdan veya karttaki QR koddan açar. Bağlantısı olan herkes erişebilir; öğrenciye özel sonuç yüklemeyin.</p>
      {durum && !durum.hazir && <p className="text-xs" style={{ color: TEXT_MUTED }}>Drive bağlantısı henüz hazır değil. Admin hesabı bağlayıp hedef klasörü seçmeli. Bu sırada dosyayı WhatsApp eki olarak paylaşabilirsiniz.</p>}
      {durum?.hazir && <>
        <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Hedef: {durum.klasorAdi} · En fazla 5 dosya, dosya başına 25 MB</p>
        <label className={`${buton} inline-flex cursor-pointer`} style={{ background: BG0, color: TEXT }}>
          Drive için dosya seç
          <input type="file" accept={DRIVE_EK_KABUL} multiple disabled={bekle} className="sr-only" onChange={(e) => { sec(e.target.files); e.target.value = ""; }} />
        </label>
        <ul className="flex flex-col gap-2 text-xs" style={{ color: TEXT }}>
          {satirlar.map((s) => <li key={s.key} className="rounded-lg p-2" style={{ background: BG0 }}>
            <div className="flex items-center gap-2"><span className="min-w-0 flex-1 break-all font-semibold">{s.dosya.name}</span>
              <button type="button" disabled={bekle} className="shrink-0 p-1 disabled:opacity-50" aria-label={`${s.dosya.name} Drive ekini karttan kaldır`} onClick={() => guncelle(ref.current.filter((v) => v.key !== s.key))}>Kaldır</button></div>
            {s.ek ? <a href={s.ek.adres} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block underline" style={{ color: MINT }}>İndir · Yüklendi</a> : <p className="mt-1 text-[11px]" style={{ color: s.hata ? BLUSH : TEXT_MUTED }}>{s.hata ?? "Yüklenmeyi bekliyor"}</p>}
          </li>)}
        </ul>
        {satirlar.some((s) => !s.ek) && <button type="button" disabled={bekle} className={buton} style={{ background: MINT, color: MINT_ON }} onClick={() => void yukle()}>{bekle ? "Drive'a yükleniyor…" : "Seçilenleri Drive'a yükle"}</button>}
        {!!satirlar.length && <p className="text-[10px]" style={{ color: TEXT_MUTED }}>Kaldır yalnız bu karttan çıkarır; Drive&apos;daki dosyayı silmez. Yüklemeyi tamamladıktan sonra bağlantıları kopyalayabilirsiniz.</p>}
      </>}
      {!durum?.hazir && <button type="button" disabled={bekle} className={buton} style={{ color: TEXT_MUTED }} onClick={() => void durumOku()}>Bağlantıyı yeniden kontrol et</button>}
      {bekle && <p role="status" className="text-[11px]" style={{ color: TEXT_MUTED }}>İşlem sürüyor…</p>}
      {hata && <p role="alert" className="text-[11px]" style={{ color: BLUSH }}>{hata}</p>}
    </>}
  </div>;
}
