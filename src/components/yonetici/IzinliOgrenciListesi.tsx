"use client";

import { useState, useTransition } from "react";
import { ShieldCheck, X, Trash2 } from "lucide-react";
import { BG0, BG1_ALT, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { izinliOgrencileriYukle, izinliOgrencileriGetir, izinliOgrenciSil, izinliOgrencileriTemizle } from "@/app/yonetici/actions";

// Liste yüklenmiş bir okulda, self-signup'ta girilen ad bu listede yoksa
// öğrenci hesabı açılamıyor (bkz. migration 0026). Liste boşsa (varsayılan)
// eski davranış (herkes kayıt olabilir) korunuyor — bu yüzden okula özel
// olarak "isteğe bağlı" bir güvenlik katmanı.
export function IzinliOgrenciListesi({ schoolId }: { schoolId: string }) {
  const [acik, setAcik] = useState(false);
  const [metin, setMetin] = useState("");
  const [isimler, setIsimler] = useState<string[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [basari, setBasari] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function listeyiYenile() {
    izinliOgrencileriGetir(schoolId).then((res) => {
      if (res.error) return setHata(res.error);
      setIsimler(res.isimler);
    });
  }

  function ac() {
    setAcik(true);
    if (isimler === null) listeyiYenile();
  }

  function yukle() {
    const satirlar = metin.split("\n").map((s) => s.trim()).filter(Boolean);
    if (satirlar.length === 0) return setHata("En az bir isim girin.");
    setHata(null);
    setBasari(null);
    startTransition(async () => {
      const res = await izinliOgrencileriYukle(schoolId, satirlar);
      if (res.error) return setHata(res.error);
      setBasari(`${res.eklenen} isim eklendi/güncellendi.`);
      setMetin("");
      listeyiYenile();
    });
  }

  function sil(ad: string) {
    startTransition(async () => {
      const res = await izinliOgrenciSil(schoolId, ad);
      if (res.error) return setHata(res.error);
      setIsimler((cur) => cur?.filter((x) => x !== ad) ?? null);
    });
  }

  function temizle() {
    if (!window.confirm("Tüm izinli isim listesi silinsin mi? Liste boşalınca bu okulda herkes tekrar kayıt olabilir.")) return;
    startTransition(async () => {
      const res = await izinliOgrencileriTemizle(schoolId);
      if (res.error) return setHata(res.error);
      setIsimler([]);
    });
  }

  if (!acik) {
    return (
      <button type="button" onClick={ac}
        className="sgec-btn flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl"
        style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED, border: `1px solid ${BORDER_STRONG}` }}>
        <ShieldCheck size={13} /> İzinli öğrenci listesi
      </button>
    );
  }

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center gap-1.5">
        <ShieldCheck size={13} color={MINT} />
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[13px] font-bold">İzinli öğrenci listesi</span>
      </div>
      <p style={{ color: TEXT_MUTED }} className="text-[11px]">
        Bu listeye eklenen isimler dışında kimse kendi kaydını oluşturamaz (admin&apos;in manuel/toplu eklediği hesapları etkilemez).
        Liste boşsa (varsayılan) herkes kayıt olabilir.
      </p>

      <textarea value={metin} onChange={(e) => setMetin(e.target.value)} rows={5} placeholder={"Her satıra bir isim:\nAhmet Yılmaz\nAyşe Kaya"}
        className="text-xs px-3 py-2.5 rounded-xl outline-none resize-y font-mono" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      {basari && <div style={{ color: MINT }} className="text-xs font-semibold">{basari}</div>}

      <div className="flex items-center gap-2">
        <button type="button" onClick={yukle} disabled={pending}
          className="sgec-btn text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {pending ? "Kaydediliyor..." : "Yükle"}
        </button>
        <button type="button" onClick={() => setAcik(false)}
          className="sgec-btn text-xs font-bold px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", color: TEXT_MUTED }}>
          Kapat
        </button>
      </div>

      {isimler !== null && (
        <div className="mt-1">
          <div className="flex items-center justify-between mb-1.5">
            <span style={{ color: TEXT_MUTED }} className="text-[11px] font-semibold">{isimler.length} isim kayıtlı</span>
            {isimler.length > 0 && (
              <button type="button" onClick={temizle} disabled={pending}
                className="sgec-btn flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full disabled:opacity-60"
                style={{ background: "rgba(255,255,255,0.06)", color: BLUSH, border: `1px solid ${BORDER_STRONG}` }}>
                <Trash2 size={10} /> Listeyi temizle
              </button>
            )}
          </div>
          {isimler.length > 0 && (
            <div className="max-h-40 overflow-y-auto flex flex-col gap-1">
              {isimler.map((ad) => (
                <div key={ad} className="flex items-center justify-between rounded-lg px-2.5 py-1" style={{ background: BG0 }}>
                  <span style={{ color: TEXT }} className="text-[11px]">{ad}</span>
                  <button type="button" onClick={() => sil(ad)} disabled={pending}
                    className="sgec-btn w-5 h-5 rounded-full flex items-center justify-center disabled:opacity-60" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <X size={9} color={BLUSH} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
