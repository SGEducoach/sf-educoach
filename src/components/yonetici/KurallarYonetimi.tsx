"use client";

import { useEffect, useState, useTransition } from "react";
import { FileText, Save } from "lucide-react";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { kurallarGetir, kurallarGuncelle } from "@/app/yonetici/actions";

// Kayıt sayfasındaki "Kayıt ve kullanım kuralları" metni artık kodda sabit
// değil — burada düzenlenip kaydedildiğinde versiyon otomatik bump'lanır,
// bu da daha önce eski metni kabul etmiş kullanıcılara yeniden sorulmasını
// sağlar.
export function KurallarYonetimi() {
  const [metin, setMetin] = useState<string | null>(null);
  const [versiyon, setVersiyon] = useState<string | null>(null);
  const [duzenlemeMetni, setDuzenlemeMetni] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    kurallarGetir().then((res) => {
      if (res.error) return setHata(res.error);
      setMetin(res.metin);
      setVersiyon(res.versiyon);
      setDuzenlemeMetni(res.metin ?? "");
    });
  }, []);

  function kaydet() {
    if (!window.confirm("Metin kaydedilsin mi? Yeni bir versiyon oluşturulacak ve daha önce kuralları kabul etmiş tüm kullanıcılara bir sonraki girişte tekrar sorulacak.")) return;
    setHata(null);
    setBasarili(false);
    startTransition(async () => {
      const res = await kurallarGuncelle(duzenlemeMetni);
      if (res.error) return setHata(res.error);
      setVersiyon(res.versiyon);
      setMetin(duzenlemeMetni.trim());
      setBasarili(true);
      setTimeout(() => setBasarili(false), 3000);
    });
  }

  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
          <FileText size={13} color={LILAC} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Kayıt ve kullanım kuralları</span>
        {versiyon && <span style={{ color: TEXT_MUTED }} className="text-[11px]">· {versiyon}</span>}
      </div>

      {metin === null ? (
        hata ? (
          <div style={{ color: BLUSH }} className="text-xs font-semibold py-3 text-center">{hata}</div>
        ) : (
          <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Yükleniyor...</p>
        )
      ) : (
        <div className="flex flex-col gap-2">
          <textarea
            value={duzenlemeMetni}
            onChange={(e) => setDuzenlemeMetni(e.target.value)}
            rows={14}
            className="text-xs px-3 py-2.5 rounded-xl outline-none resize-y leading-relaxed"
            style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}
          />
          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
          {basarili && <div style={{ color: MINT }} className="text-xs font-semibold">Kaydedildi.</div>}
          <button type="button" onClick={kaydet} disabled={pending || duzenlemeMetni.trim() === metin}
            className="sfec-btn self-start flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}>
            <Save size={12} /> {pending ? "Kaydediliyor..." : "Kaydet (yeni versiyon)"}
          </button>
        </div>
      )}
    </div>
  );
}
