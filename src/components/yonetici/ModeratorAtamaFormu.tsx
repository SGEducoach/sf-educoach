"use client";

import { useEffect, useState, useTransition } from "react";
import { ShieldCheck, ShieldOff, UserCog } from "lucide-react";
import { moderatorYetkisiAl, moderatorYetkisiVer, okulOgretmenleriModeratorlukGetir, type OkulOgretmeni } from "@/app/yonetici/moderatorler-actions";
import { yonetimOkullariGetir, type YonetimOkulu } from "@/app/yonetici/actions";
import { BG0, BG1_ALT, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// 2026-08-26 kullanıcı isteği: admin bir okul seçip o okulun öğretmen/müdür
// hesaplarına moderatörlük yetkisi verip alabilsin — önceden bu bölüm sadece
// mevcut moderatörleri görüntülüyordu.
export function ModeratorAtamaFormu() {
  const [okullar, setOkullar] = useState<YonetimOkulu[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [ogretmenler, setOgretmenler] = useState<OkulOgretmeni[] | null>(null);
  // Hangi okul için yüklendiğini ayrıca tutuyoruz — okul değişince veriyi
  // effect gövdesinde senkron null'a düşürmek yerine (lint: set-state-in-effect)
  // sadece "bu okul için henüz yüklenmedi" durumunu render'da türetiyoruz.
  const [ogretmenlerSchoolId, setOgretmenlerSchoolId] = useState("");
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    yonetimOkullariGetir().then((r) => setOkullar(r.okullar));
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    okulOgretmenleriModeratorlukGetir(schoolId).then((r) => {
      if (r.error) setMesaj(`Hata: ${r.error}`);
      setOgretmenler(r.ogretmenler);
      setOgretmenlerSchoolId(schoolId);
    });
  }, [schoolId]);

  const gosterilecekOgretmenler = ogretmenlerSchoolId === schoolId ? ogretmenler : null;

  function yenile() {
    okulOgretmenleriModeratorlukGetir(schoolId).then((r) => { setOgretmenler(r.ogretmenler); setOgretmenlerSchoolId(schoolId); });
  }

  function toggle(o: OkulOgretmeni) {
    setMesaj(null);
    startTransition(async () => {
      const r = o.moderatorMu ? await moderatorYetkisiAl(o.id) : await moderatorYetkisiVer(o.id, schoolId);
      if (r.error) return setMesaj(`Hata: ${r.error}`);
      setMesaj(o.moderatorMu ? `${o.ad} moderatörlükten çıkarıldı.` : `${o.ad} moderatör yapıldı.`);
      yenile();
    });
  }

  return (
    <div className="rounded-3xl p-5 mb-5" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
      <div className="flex items-center gap-2 mb-3">
        <UserCog size={16} color={TEXT_MUTED} />
        <h3 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-sm font-bold">Moderatörlük yetkisi ver/al</h3>
      </div>
      <select value={schoolId} onChange={(e) => setSchoolId(e.target.value)}
        className="rounded-xl px-3 py-2 text-sm outline-none w-full sm:w-72" style={{ background: BG1_ALT, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
        <option value="">Okul seçin</option>
        {okullar.map((o) => <option key={o.id} value={o.id}>{o.ad}</option>)}
      </select>
      {mesaj && <div style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT }} className="text-xs font-bold mt-2">{mesaj}</div>}
      {schoolId && (
        <div className="mt-3 flex flex-col gap-2">
          {gosterilecekOgretmenler === null ? (
            <p style={{ color: TEXT_MUTED }} className="text-xs">Yükleniyor...</p>
          ) : gosterilecekOgretmenler.length === 0 ? (
            <p style={{ color: TEXT_MUTED }} className="text-xs">Bu okulda öğretmen/müdür kaydı yok.</p>
          ) : (
            gosterilecekOgretmenler.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
                <div className="min-w-0">
                  <div style={{ color: TEXT }} className="text-xs font-bold truncate">{o.ad}</div>
                  <div style={{ color: TEXT_MUTED }} className="text-[11px]">{o.mudurMu ? "Müdür" : o.brans}</div>
                </div>
                <button type="button" disabled={pending} onClick={() => toggle(o)}
                  className="sfec-btn shrink-0 flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold disabled:opacity-60"
                  style={{ background: o.moderatorMu ? MINT : "transparent", color: o.moderatorMu ? MINT_ON : TEXT_MUTED, border: `2px solid ${o.moderatorMu ? MINT : BORDER_STRONG}` }}>
                  {o.moderatorMu ? <><ShieldOff size={12} /> Yetkiyi al</> : <><ShieldCheck size={12} /> Moderatör yap</>}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
