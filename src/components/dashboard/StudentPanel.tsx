"use client";

import { useMemo, useState, useTransition } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import {
  Target, Bell, Plus, Clock, CheckCircle2, AlertTriangle, Info, Sparkles,
} from "lucide-react";
import type { Exam, Notification, NotificationType, StudySession } from "@/lib/types";
import { DERS_LISTESI } from "@/lib/types";
import {
  BG1, BG1_ALT, BORDER, BORDER_STRONG, TEXT, TEXT_MUTED, MINT, MINT_BG, MINT_ON,
  SKY, SKY_BG, BUTTER, BUTTER_BG, BLUSH, BLUSH_BG,
} from "@/lib/theme";
import { HedefHalkasi, IstatKart, GirisAlani } from "./ui";
import { denemeEkle, calismaEkle, bildirimEkle } from "@/app/dashboard/actions";

function tarihFormat(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
}
function gunFarki(isoTarih: string) {
  const bugun = new Date();
  bugun.setHours(0, 0, 0, 0);
  const t = new Date(isoTarih);
  return Math.floor((bugun.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

const tipStil: Record<NotificationType, { bg: string; fg: string; icon: typeof CheckCircle2; etiket: string }> = {
  basari: { bg: MINT_BG, fg: MINT, icon: CheckCircle2, etiket: "Başarı" },
  uyari: { bg: BLUSH_BG, fg: BLUSH, icon: AlertTriangle, etiket: "Uyarı" },
  bilgi: { bg: SKY_BG, fg: SKY, icon: Info, etiket: "Bilgi" },
};

export interface StudentPanelData {
  id: string;
  ad: string;
  hedefPuan: number;
  hedefBolum: string;
  exams: Exam[];
  studySessions: StudySession[];
  notifications: Notification[];
}

export function StudentPanel({
  student, canAddExam, canAddStudy, canAddNotification,
}: {
  student: StudentPanelData;
  canAddExam: boolean;
  canAddStudy: boolean;
  canAddNotification: boolean;
}) {
  const [formAcik, setFormAcik] = useState<"deneme" | "calisma" | "bildirim" | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [bildirimTip, setBildirimTip] = useState<NotificationType>("bilgi");
  const [pending, startTransition] = useTransition();

  const denemeler = student.exams;
  const calismalar = student.studySessions;
  const bildirimler = student.notifications;

  const sonDeneme = denemeler[denemeler.length - 1];
  const oncekiDeneme = denemeler[denemeler.length - 2];
  const netFarki = sonDeneme && oncekiDeneme
    ? (sonDeneme.tyt_net + sonDeneme.ayt_net) - (oncekiDeneme.tyt_net + oncekiDeneme.ayt_net)
    : 0;
  const hedefYuzde = sonDeneme ? (sonDeneme.puan / student.hedefPuan) * 100 : 0;

  const sonCalismaTarihi = calismalar.length
    ? calismalar.reduce((a, b) => (a.tarih > b.tarih ? a : b)).tarih
    : null;
  const kacGundur = sonCalismaTarihi ? gunFarki(sonCalismaTarihi) : null;

  const buHaftaDakika = calismalar
    .filter((c) => gunFarki(c.tarih) <= 6)
    .reduce((t, c) => t + c.dakika, 0);

  const chartData = denemeler.map((d) => ({
    tarih: tarihFormat(d.tarih), "TYT net": d.tyt_net, "AYT net": d.ayt_net, Puan: d.puan,
  }));

  const calismaGrafik = useMemo(() => {
    const gunler: Record<string, number> = {};
    calismalar.forEach((c) => {
      const g = tarihFormat(c.tarih);
      gunler[g] = (gunler[g] || 0) + c.dakika;
    });
    return Object.entries(gunler).map(([gun, dakika]) => ({ gun, dakika }));
  }, [calismalar]);

  function submitDeneme(formData: FormData) {
    setHata(null);
    startTransition(async () => {
      const res = await denemeEkle(student.id, formData);
      if (res.error) setHata(res.error);
      else setFormAcik(null);
    });
  }
  function submitCalisma(formData: FormData) {
    setHata(null);
    startTransition(async () => {
      const res = await calismaEkle(student.id, formData);
      if (res.error) setHata(res.error);
      else setFormAcik(null);
    });
  }
  function submitBildirim(formData: FormData) {
    setHata(null);
    startTransition(async () => {
      const res = await bildirimEkle(student.id, formData);
      if (res.error) setHata(res.error);
      else setFormAcik(null);
    });
  }

  return (
    <div>
      {kacGundur !== null && kacGundur >= 3 && (
        <div className="sgec-fade rounded-2xl px-4 py-3 mb-6 flex items-center gap-2.5" style={{ background: BLUSH_BG, border: `1px solid rgba(255,159,180,0.3)` }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.08)" }}>
            <AlertTriangle size={13} color={BLUSH} />
          </div>
          <span style={{ color: BLUSH }} className="text-[13px] font-semibold">
            {student.ad} için {kacGundur} gündür çalışma kaydı girilmedi.
          </span>
        </div>
      )}

      <div className="flex items-end justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[27px] font-bold tracking-tight">{student.ad}</h1>
          <p style={{ color: TEXT_MUTED }} className="text-[13px] mt-1">Hedef puan {student.hedefPuan} &middot; {student.hedefBolum}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 mb-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <IstatKart icon={Target} etiket="Son puan" deger={sonDeneme ? sonDeneme.puan : "—"}
            altYazi={sonDeneme ? (netFarki !== 0 ? `önceki denemeye göre ${netFarki > 0 ? "+" : ""}${netFarki} net` : "ilk deneme") : "henüz deneme yok"}
            yon={netFarki > 0 ? "up" : netFarki < 0 ? "down" : null}
            renk={MINT} bg={MINT_BG} gecikme={0} />
          <IstatKart icon={Target} etiket="Toplam net" deger={sonDeneme ? sonDeneme.tyt_net + sonDeneme.ayt_net : "—"}
            altYazi={sonDeneme ? `TYT ${sonDeneme.tyt_net} · AYT ${sonDeneme.ayt_net}` : undefined} renk={SKY} bg={SKY_BG} gecikme={60} />
          <IstatKart icon={Clock} etiket="Bu hafta" deger={`${Math.floor(buHaftaDakika / 60)}s ${buHaftaDakika % 60}dk`}
            altYazi={`${calismalar.filter((c) => gunFarki(c.tarih) <= 6).length} çalışma kaydı`}
            renk={BUTTER} bg={BUTTER_BG} gecikme={120} />
        </div>
        <div className="sgec-fade rounded-3xl p-5 flex items-center justify-center" style={{ background: BG1, border: `1px solid ${BORDER}`, animationDelay: "160ms" }}>
          <HedefHalkasi yuzde={hedefYuzde} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}`, animationDelay: "80ms" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: SKY_BG }}>
                <Sparkles size={13} color={SKY} />
              </div>
              <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Deneme net trendi</span>
            </div>
            {canAddExam && (
              <button onClick={() => setFormAcik(formAcik === "deneme" ? null : "deneme")}
                className="sgec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
                style={{ background: formAcik === "deneme" ? MINT : MINT_BG, color: formAcik === "deneme" ? MINT_ON : MINT }}>
                <Plus size={12} /> Deneme ekle
              </button>
            )}
          </div>
          {formAcik === "deneme" && (
            <form action={submitDeneme} className="mb-4 p-3.5 rounded-2xl grid grid-cols-2 gap-2.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
              <div className="col-span-2"><GirisAlani label="Tarih" name="tarih" type="date" required /></div>
              <GirisAlani label="TYT net" name="tytNet" type="number" step="0.01" placeholder="0" required />
              <GirisAlani label="AYT net" name="aytNet" type="number" step="0.01" placeholder="0" required />
              <div className="col-span-2"><GirisAlani label="Puan" name="puan" type="number" step="0.01" placeholder="0" required /></div>
              {hata && <div className="col-span-2 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</div>}
              <button type="submit" disabled={pending} className="sgec-btn col-span-2 text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
                {pending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </form>
          )}
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="tarih" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
              <RTooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: `1px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} />
              <Legend wrapperStyle={{ fontSize: 11, color: TEXT_MUTED }} />
              <Line type="monotone" dataKey="TYT net" stroke={SKY} strokeWidth={2.25} dot={{ r: 3.5, fill: SKY, strokeWidth: 2, stroke: BG1 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="AYT net" stroke={MINT} strokeWidth={2.25} dot={{ r: 3.5, fill: MINT, strokeWidth: 2, stroke: BG1 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}`, animationDelay: "140ms" }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: BUTTER_BG }}>
                <Clock size={13} color={BUTTER} />
              </div>
              <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Günlük çalışma (dakika)</span>
            </div>
            {canAddStudy && (
              <button onClick={() => setFormAcik(formAcik === "calisma" ? null : "calisma")}
                className="sgec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
                style={{ background: formAcik === "calisma" ? MINT : MINT_BG, color: formAcik === "calisma" ? MINT_ON : MINT }}>
                <Plus size={12} /> Kayıt ekle
              </button>
            )}
          </div>
          {formAcik === "calisma" && (
            <form action={submitCalisma} className="mb-4 p-3.5 rounded-2xl grid grid-cols-2 gap-2.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
              <div className="col-span-2"><GirisAlani label="Tarih" name="tarih" type="date" required /></div>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ders</span>
                <select name="ders" defaultValue="Matematik" className="text-sm px-2.5 py-1.5 rounded-xl" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG1, color: TEXT }}>
                  {DERS_LISTESI.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>
              <GirisAlani label="Dakika" name="dakika" type="number" placeholder="0" required />
              {hata && <div className="col-span-2 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</div>}
              <button type="submit" disabled={pending} className="sgec-btn col-span-2 text-xs font-bold py-2 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
                {pending ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </form>
          )}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={calismaGrafik} margin={{ left: -20, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
              <XAxis dataKey="gun" tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: TEXT_MUTED }} axisLine={false} tickLine={false} />
              <RTooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: `1px solid ${BORDER_STRONG}`, background: BG1_ALT }} labelStyle={{ color: TEXT_MUTED }} />
              <Bar dataKey="dakika" fill={MINT} radius={[5, 5, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="sgec-fade rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}`, animationDelay: "200ms" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: SKY_BG }}>
              <Bell size={13} color={SKY} />
            </div>
            <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">YKS yolculuğu &middot; bildirimler</span>
          </div>
          {canAddNotification && (
            <button onClick={() => setFormAcik(formAcik === "bildirim" ? null : "bildirim")}
              className="sgec-btn flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-full"
              style={{ background: formAcik === "bildirim" ? MINT : MINT_BG, color: formAcik === "bildirim" ? MINT_ON : MINT }}>
              <Plus size={12} /> Hatırlatma gönder
            </button>
          )}
        </div>

        {formAcik === "bildirim" && (
          <form action={submitBildirim} className="mb-4 p-3.5 rounded-2xl flex flex-col gap-2.5" style={{ background: BG1_ALT, border: `1px solid ${BORDER}` }}>
            <div className="flex gap-2">
              {(Object.entries(tipStil) as [NotificationType, typeof tipStil.bilgi][]).map(([k, v]) => (
                <button type="button" key={k} onClick={() => setBildirimTip(k)}
                  className="sgec-btn text-[11px] px-3 py-1.5 rounded-full font-bold"
                  style={{ background: bildirimTip === k ? v.fg : "transparent", color: bildirimTip === k ? MINT_ON : TEXT_MUTED, border: `1px solid ${bildirimTip === k ? v.fg : BORDER_STRONG}` }}>
                  {v.etiket}
                </button>
              ))}
            </div>
            <input type="hidden" name="tip" value={bildirimTip} />
            <textarea name="mesaj" placeholder="Veliye veya öğrenciye iletilecek mesaj" required
              className="text-sm px-3 py-2.5 rounded-xl resize-none outline-none" rows={2} style={{ border: `1px solid ${BORDER_STRONG}`, background: BG1, color: TEXT }} />
            {hata && <div className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</div>}
            <button type="submit" disabled={pending} className="sgec-btn text-xs font-bold py-2 rounded-xl self-start px-4 disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
              {pending ? "Gönderiliyor..." : "Gönder"}
            </button>
          </form>
        )}

        <div className="relative">
          {bildirimler.length === 0 && (
            <p style={{ color: TEXT_MUTED }} className="text-xs py-6 text-center">Henüz bildirim yok.</p>
          )}
          {bildirimler.length > 0 && (
            <div style={{ position: "absolute", left: 13, top: 6, bottom: 6, width: 1.5, background: BORDER }} />
          )}
          <div className="flex flex-col gap-4">
            {bildirimler.map((b, i) => {
              const st = tipStil[b.tip];
              const Icon = st.icon;
              return (
                <div key={b.id} className="sgec-fade flex items-start gap-3 relative" style={{ animationDelay: `${240 + i * 50}ms` }}>
                  <div className="w-[27px] h-[27px] rounded-full flex items-center justify-center shrink-0 relative z-10" style={{ background: st.bg }}>
                    <Icon size={12} color={st.fg} />
                  </div>
                  <div className="flex-1 flex items-start justify-between gap-3 pt-0.5">
                    <span style={{ color: TEXT }} className="text-[13px] leading-snug">{b.mesaj}</span>
                    <span style={{ color: TEXT_MUTED }} className="text-[11px] whitespace-nowrap pt-0.5">{tarihFormat(b.tarih)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
