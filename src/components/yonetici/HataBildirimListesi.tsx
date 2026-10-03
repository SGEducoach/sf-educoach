"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Send } from "lucide-react";
import { hataBildirimiCozulduIsaretle, hataBildirimiYanitla, type HataBildirimSonuc } from "@/app/yonetici/actions";
import { BG0, BLUSH, BORDER, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import type { UserRole } from "@/lib/types";

const ROL_ETIKET: Record<UserRole, string> = {
  ogrenci: "Öğrenci", veli: "Veli", ogretmen: "Öğretmen", mudur: "Müdür", admin: "Admin (Claude notu)",
};

function tarihFormat(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// 2026-08-26 kullanıcı isteği: çözülen bildirimler artık silinip listeden
// tamamen kalkıyor (bkz. hataBildirimiCozulduIsaretle) — bu bileşene gelen
// her satır her zaman "bekliyor" durumunda, ayrı bir salt-okunur mod
// gerekmiyor (önceden "Çözülenler" bölümü için vardı).
export function HataBildirimListesi({ bildirimler }: { bildirimler: HataBildirimSonuc[] }) {
  return (
    <div className="sfec-liste">
      {bildirimler.map((b) => <Satir key={b.id} bildirim={b} />)}
    </div>
  );
}

function Satir({ bildirim }: { bildirim: HataBildirimSonuc }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cevapAcik, setCevapAcik] = useState(false);
  const [cevap, setCevap] = useState("");
  const [hata, setHata] = useState<string | null>(null);

  function yanitla() {
    if (!cevap.trim()) return;
    startTransition(async () => {
      const sonuc = await hataBildirimiYanitla(bildirim.id, cevap);
      if (sonuc.error) return setHata(sonuc.error);
      setCevap("");
      setCevapAcik(false);
      setHata(null);
      router.refresh();
    });
  }

  function cozuldu() {
    startTransition(async () => {
      const sonuc = await hataBildirimiCozulduIsaretle(bildirim.id);
      if (sonuc.error) return setHata(sonuc.error);
      router.refresh();
    });
  }

  return (
    <div className="sfec-liste-satiri px-2 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div style={{ color: TEXT }} className="text-sm font-bold">{bildirim.bildirenAd ?? "—"} <span style={{ color: TEXT_MUTED }} className="font-normal">· {ROL_ETIKET[bildirim.bildirenRol]}</span></div>
          <div style={{ color: TEXT_MUTED }} className="text-[11px] mt-0.5">{tarihFormat(bildirim.createdAt)}{bildirim.sayfa ? ` · ${bildirim.sayfa}` : ""}</div>
          <p style={{ color: TEXT, background: BG0 }} className="text-sm mt-2 rounded-xl px-3 py-2 whitespace-pre-wrap">{bildirim.mesaj}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {bildirim.bildirenId && bildirim.bildirenRol !== "admin" && (
            <button type="button" onClick={() => setCevapAcik((v) => !v)} disabled={pending}
              className="sfec-btn flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-60"
              style={{ color: MINT, border: `1px solid ${BORDER}` }}><Send size={13} /> Cevapla</button>
          )}
          <button type="button" disabled={pending} onClick={cozuldu}
            className="sfec-btn flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}><Check size={13} /> Çözüldü</button>
        </div>
      </div>
      {bildirim.yanitlar.length > 0 && <div className="mt-3 space-y-2">
        {bildirim.yanitlar.map((y) => <div key={y.id} className="rounded-xl px-3 py-2 text-xs whitespace-pre-wrap"
          style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>
          <span className="font-bold">{y.gonderenRol === "admin" ? "Yönetici" : "Bildiren kişi"}</span>
          <span style={{ color: TEXT_MUTED }}> · {tarihFormat(y.createdAt)}</span>
          <p className="mt-1">{y.mesaj}</p>
        </div>)}
      </div>}
      {cevapAcik && <div className="mt-3 flex flex-col gap-2">
        <textarea value={cevap} onChange={(e) => setCevap(e.target.value)} rows={3} maxLength={2000}
          aria-label={`${bildirim.bildirenAd ?? "Kullanıcı"} için yanıt`} placeholder="Yol gösterin veya ek bilgi isteyin..."
          className="w-full rounded-xl px-3 py-2 text-sm" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }} />
        <button type="button" onClick={yanitla} disabled={pending || !cevap.trim()}
          className="sfec-btn self-end rounded-full px-4 py-2 text-xs font-bold disabled:opacity-60"
          style={{ background: MINT, color: MINT_ON }}>Yanıtı gönder</button>
      </div>}
      {hata && <p role="alert" className="mt-2 text-xs" style={{ color: BLUSH }}>{hata}</p>}
    </div>
  );
}
