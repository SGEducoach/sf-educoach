"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { hataBildirimiCozulduIsaretle, type HataBildirimSonuc } from "@/app/yonetici/actions";
import { BG0, BG1_ALT, BORDER, MINT, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";
import type { UserRole } from "@/lib/types";

const ROL_ETIKET: Record<UserRole, string> = {
  ogrenci: "Öğrenci", veli: "Veli", ogretmen: "Öğretmen", mudur: "Müdür", admin: "Admin (Claude notu)",
};

function tarihFormat(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function HataBildirimListesi({ bildirimler, salt = false }: { bildirimler: HataBildirimSonuc[]; salt?: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      {bildirimler.map((b) => <Satir key={b.id} bildirim={b} salt={salt} />)}
    </div>
  );
}

function Satir({ bildirim, salt }: { bildirim: HataBildirimSonuc; salt: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-2xl p-4" style={{ background: BG1_ALT, border: `2px solid ${BORDER}`, opacity: bildirim.durum === "cozuldu" ? 0.6 : 1 }}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div style={{ color: TEXT }} className="text-sm font-bold">{bildirim.bildirenAd ?? "—"} <span style={{ color: TEXT_MUTED }} className="font-normal">· {ROL_ETIKET[bildirim.bildirenRol]}</span></div>
          <div style={{ color: TEXT_MUTED }} className="text-[11px] mt-0.5">{tarihFormat(bildirim.createdAt)}{bildirim.sayfa ? ` · ${bildirim.sayfa}` : ""}</div>
          <p style={{ color: TEXT, background: BG0 }} className="text-sm mt-2 rounded-xl px-3 py-2 whitespace-pre-wrap">{bildirim.mesaj}</p>
        </div>
        {!salt && bildirim.durum === "bekliyor" && (
          <button type="button" disabled={pending}
            onClick={() => startTransition(async () => { await hataBildirimiCozulduIsaretle(bildirim.id); router.refresh(); })}
            className="sfec-btn shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}>
            <Check size={13} /> Çözüldü işaretle
          </button>
        )}
      </div>
    </div>
  );
}
