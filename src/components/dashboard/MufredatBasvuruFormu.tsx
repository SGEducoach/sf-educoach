"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { mufredatBasvurusuGonder } from "@/app/dashboard/mufredat-basvuru-actions";
import { MUFREDAT_HATA_TURLERI, mufredatProgramlari, mufredatBasvurusuDogrula,
  type MufredatBasvuruGirdisi } from "@/lib/mufredat-basvurusu";
import { MUFREDAT_KONULARI } from "@/lib/mufredat-konulari";
import { BG0, BG1, BORDER_STRONG, BLUSH, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

const bos: MufredatBasvuruGirdisi = {
  kademe: "lise", program: "Maarif", sinif: "", ders: "", konu: "", altBaslik: "",
  hataTuru: "alt_baslik_eksik", tespit: "", oneri: "", onerilenSinif: "", kaynak: "",
};
const girdiStili = { background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` };
const girdiSinifi = "w-full rounded-xl px-3 py-2.5 text-sm";
const dersler = [...new Set([...MUFREDAT_KONULARI.map((k) => k.ders), "Fen Bilimleri", "Sosyal Bilgiler", "İngilizce", "Din Kültürü ve Ahlak Bilgisi"])]
  .sort((a, b) => a.localeCompare(b, "tr"));

export function MufredatBasvuruFormu({ acilisSayisi }: { acilisSayisi: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [acilisSayisi]);
  const id = useId();
  const pathname = usePathname();
  const [veri, setVeri] = useState<MufredatBasvuruGirdisi>(bos);
  const [adim, setAdim] = useState<1 | 2>(1);
  const [hata, setHata] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [tamam, setTamam] = useState(false);
  const siniflar = veri.kademe === "ortaokul" ? [5, 6, 7, 8] : [9, 10, 11, 12];
  const konular = MUFREDAT_KONULARI.filter((k) => k.ders === veri.ders && k.seviye === `${veri.sinif}. Sınıf`);
  const degistir = <K extends keyof MufredatBasvuruGirdisi>(alan: K, deger: MufredatBasvuruGirdisi[K]) => {
    setVeri((v) => ({ ...v, [alan]: deger })); setHata(null);
  };
  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    const kontrol = mufredatBasvurusuDogrula(veri, adim === 1);
    if (kontrol.error !== null) return setHata(kontrol.error);
    if (adim === 1) { setHata(null); setAdim(2); return; }
    setPending(true); setHata(null);
    try {
      const sonuc = await mufredatBasvurusuGonder(kontrol.veri, pathname);
      if (sonuc.error) setHata(sonuc.error);
      else setTamam(true);
    } catch { setHata("Bağlantı sorunu oluştu. Başvurunuzun kaydedilip kaydedilmediğini Hata bildir → Açık bildirimlerim bölümünden kontrol edin."); }
    finally { setPending(false); }
  }
  return <dialog ref={dialog} aria-labelledby={`${id}-baslik`} onCancel={(e) => { if (pending) e.preventDefault(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl p-5 backdrop:bg-black/60"
      style={{ background: BG1, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div><h2 id={`${id}-baslik`} className="text-lg font-bold">Müfredat düzeltme başvurusu</h2>
          <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>Önce hatayı açıklayın, ardından nasıl düzeltilmesini önerdiğinizi yazın. Konular otomatik değişmez.</p></div>
        <button type="button" disabled={pending} onClick={() => dialog.current?.close()} aria-label="Başvuruyu kapat" className="rounded-xl p-2 disabled:opacity-50"><X size={20} /></button>
      </div>
      {tamam ? <div role="status" className="space-y-3">
        <p className="font-bold" style={{ color: MINT }}>Başvurunuz admine iletildi.</p>
        <p className="text-sm">Admin başvurunuzu inceleyip düzeltme istemi olarak kopyalayabilir. Yanıtları Hata bildir → Açık bildirimlerim bölümünden takip edebilirsiniz.</p>
        <button type="button" onClick={() => { setVeri(bos); setAdim(1); setTamam(false); }} className="sfec-btn rounded-xl px-4 py-2 text-sm" style={girdiStili}>Yeni başvuru</button>
      </div> : <form onSubmit={gonder}>
        <p className="mb-3 text-xs font-bold" aria-live="polite">Adım {adim} / 2 · {adim === 1 ? "Hata tespiti" : "Düzeltme önerisi"}</p>
        <fieldset disabled={pending} className="min-w-0 space-y-3 disabled:opacity-60">
          {adim === 1 ? <>
            <div className="grid grid-cols-2 gap-3">
              <Alan id={`${id}-kademe`} etiket="Kademe"><select id={`${id}-kademe`} value={veri.kademe} onChange={(e) => {
                setVeri((v) => ({ ...v, kademe: e.target.value as MufredatBasvuruGirdisi["kademe"], program: "Maarif", sinif: "", onerilenSinif: "", ders: "", konu: "", altBaslik: "" }));
              }} className={girdiSinifi} style={girdiStili}><option value="lise">Lise</option><option value="ortaokul">Ortaokul</option></select></Alan>
              <Alan id={`${id}-program`} etiket="Program / konu listesi"><select id={`${id}-program`} value={veri.program} onChange={(e) => degistir("program", e.target.value)} className={girdiSinifi} style={girdiStili}>
                {mufredatProgramlari(veri.kademe).map((p) => <option key={p}>{p}</option>)}
              </select></Alan>
              <Alan id={`${id}-sinif`} etiket="Sistemde görünen sınıf"><select required id={`${id}-sinif`} value={veri.sinif} onChange={(e) => degistir("sinif", e.target.value)} className={girdiSinifi} style={girdiStili}>
                <option value="">Sınıf seçin</option>{siniflar.map((s) => <option key={s} value={s}>{s}. sınıf</option>)}
              </select></Alan>
              <Alan id={`${id}-ders`} etiket="Ders"><input required id={`${id}-ders`} list={`${id}-dersler`} value={veri.ders} maxLength={60} onChange={(e) => degistir("ders", e.target.value)} className={girdiSinifi} style={girdiStili} /></Alan>
            </div>
            <datalist id={`${id}-dersler`}>{dersler.map((d) => <option key={d} value={d} />)}</datalist>
            <Alan id={`${id}-konu`} etiket="Ana konu / ünite"><input required id={`${id}-konu`} list={`${id}-konular`} value={veri.konu} maxLength={120} onChange={(e) => degistir("konu", e.target.value)} placeholder="Örn. Trigonometri" className={girdiSinifi} style={girdiStili} /></Alan>
            <datalist id={`${id}-konular`}>{[...new Set(konular.map((k) => k.konu))].map((k) => <option key={k} value={k} />)}</datalist>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>Konu listede yoksa adını kendiniz yazabilirsiniz. Sınıfını da listede eksik olduğunu düşündüğünüz yere göre seçin.</p>
            <Alan id={`${id}-alt`} etiket="İlgili alt başlık (varsa)"><input id={`${id}-alt`} value={veri.altBaslik} maxLength={120} onChange={(e) => degistir("altBaslik", e.target.value)} className={girdiSinifi} style={girdiStili} /></Alan>
            <Alan id={`${id}-tur`} etiket="Yanlış olduğunu düşündüğünüz durum"><select id={`${id}-tur`} value={veri.hataTuru} onChange={(e) => {
              setVeri((v) => ({ ...v, hataTuru: e.target.value as MufredatBasvuruGirdisi["hataTuru"], onerilenSinif: "" }));
            }} className={girdiSinifi} style={girdiStili}>{Object.entries(MUFREDAT_HATA_TURLERI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Alan>
            <Alan id={`${id}-tespit`} etiket="Tespitiniz: Şu anda ne yanlış görünüyor?"><textarea required minLength={10} maxLength={400} rows={3} id={`${id}-tespit`} value={veri.tespit} onChange={(e) => degistir("tespit", e.target.value)} placeholder="Örn. 11. sınıf Trigonometri altında şu alt başlık eksik görünüyor…" className={girdiSinifi} style={girdiStili} /></Alan>
          </> : <>
            <div className="rounded-xl p-3 text-sm" style={girdiStili}>
              <p className="font-bold">{veri.ders} · {veri.sinif}. sınıf · {veri.program}</p>
              <p>{veri.konu}{veri.altBaslik ? ` → ${veri.altBaslik}` : ""}</p>
              <p className="mt-1">{MUFREDAT_HATA_TURLERI[veri.hataTuru]}</p>
              <p className="mt-2 whitespace-pre-wrap">{veri.tespit}</p>
            </div>
            {veri.hataTuru === "yanlis_sinif" && <Alan id={`${id}-onerilen`} etiket="Konu hangi sınıfta olmalı?"><select required id={`${id}-onerilen`} value={veri.onerilenSinif} onChange={(e) => degistir("onerilenSinif", e.target.value)} className={girdiSinifi} style={girdiStili}>
              <option value="">Doğru sınıfı seçin</option>{siniflar.map((s) => <option key={s} value={s}>{s}. sınıf</option>)}
            </select></Alan>}
            <Alan id={`${id}-oneri`} etiket="Öneriniz: Nasıl düzeltilmeli?"><textarea required minLength={10} maxLength={400} rows={4} id={`${id}-oneri`} value={veri.oneri} onChange={(e) => degistir("oneri", e.target.value)} placeholder="Eklenecek / çıkarılacak başlığı veya doğru adlandırmayı açıkça yazın." className={girdiSinifi} style={girdiStili} /></Alan>
            <Alan id={`${id}-kaynak`} etiket="Dayanak / kaynak (isteğe bağlı)"><input maxLength={180} id={`${id}-kaynak`} value={veri.kaynak} onChange={(e) => degistir("kaynak", e.target.value)} placeholder="Örn. program adı, yayınevi, kitap, sayfa veya bağlantı" className={girdiSinifi} style={girdiStili} /></Alan>
            <p className="text-xs" style={{ color: TEXT_MUTED }}>Öğrenci adı veya kişisel veri eklemeyin. Başvuru, inceleme ve onay olmadan müfredatı değiştirmez.</p>
          </>}
          <div className="flex justify-end gap-2 pt-2">
            {adim === 2 && <button type="button" onClick={() => { setAdim(1); setHata(null); }} className="sfec-btn rounded-xl px-4 py-2.5 text-sm" style={girdiStili}>Tespiti düzenle</button>}
            <button type="submit" className="sfec-btn rounded-xl px-4 py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>
              {pending ? "Gönderiliyor…" : adim === 1 ? "Öneri adımına geç" : "Admine başvuruyu gönder"}
            </button>
          </div>
        </fieldset>
        {hata && <p role="alert" className="mt-3 text-sm" style={{ color: BLUSH }}>{hata}</p>}
      </form>}
    </dialog>;
}

function Alan({ id, etiket, children }: { id: string; etiket: string; children: ReactNode }) {
  return <div><label htmlFor={id} className="mb-1 block text-xs font-semibold">{etiket}</label>{children}</div>;
}
