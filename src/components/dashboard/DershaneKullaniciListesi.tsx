"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BarChart3, CalendarClock, KeyRound, Trash2, UserCheck, UserX } from "lucide-react";
import { moderatorAktiflikDegistir, moderatorHesapSil, moderatorSifreSifirla, type ModeratorKullanici } from "@/app/moderator/actions";
import { DersProgramiYonetimi } from "@/components/dashboard/DersProgramiYonetimi";
import type { DersProgramiSatiri } from "@/lib/ders-programi";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// DERSHANE MODU — müdürün Öğretmenler/Öğrenciler sekmelerindeki liste.
// Şifre sıfırlama/aktiflik/silme mevcut moderatör altyapısını (aynı server
// action'lar) kullanıyor — "müdür bölümü moderatör mantığı ile çalışsın"
// (kullanıcı notu). ModeratorPanel'in aksine burada arama/sayfalama yok
// (dershane roster'ları tipik olarak çok daha küçük) — gerekirse eklenir.
export function DershaneKullaniciListesi({ kullanicilar, kategori, siniflar, dersProgramlari }: {
  kullanicilar: ModeratorKullanici[];
  kategori: "ogretmen" | "ogrenci";
  // Ders Programı (2026-08-25) — sadece kategori==="ogretmen" iken dolu
  // geliyor (bkz. DershaneMudurPaneli.tsx).
  siniflar?: { id: string; seviye: string; sube: string }[];
  dersProgramlari?: Record<string, DersProgramiSatiri[]>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [acikProgramId, setAcikProgramId] = useState<string | null>(null);
  // Kullanıcı isteği (26.08.2026): "öğrenciler kısmı düzgün çalışmıyor,
  // farklı bir sınıf seçildiğinde..." — incelemede aslında bir yönlendirme
  // hatası değil, sınıf/şube bazlı bir filtrenin HİÇ olmaması sorunuydu
  // (ModeratorPanel.tsx'teki aynı desen burada eksikti). Client-side, sayfa
  // yönlendirmesi olmadan — mevcut kullanicilar listesi zaten tek sorguda
  // geliyor, ayrı bir sunucu isteği gerekmiyor.
  const [sinifFiltre, setSinifFiltre] = useState("tumu");
  const sinifSecenekleri = useMemo(
    () => [...new Set(kullanicilar.map((k) => k.sinif).filter((x): x is string => !!x))].sort(),
    [kullanicilar],
  );
  const gosterilenler = sinifFiltre === "tumu" ? kullanicilar : kullanicilar.filter((k) => k.sinif === sinifFiltre);

  if (kullanicilar.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center text-sm" style={{ color: TEXT_MUTED, background: BG1, border: `2px solid ${BORDER}` }}>
        Henüz {kategori === "ogretmen" ? "öğretmen" : "öğrenci"} eklenmedi.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {mesaj && <div className="rounded-xl p-3 text-xs font-bold" style={{ color: mesaj.startsWith("Hata") ? BLUSH : MINT, background: BG0, border: `2px solid ${BORDER_STRONG}` }}>{mesaj}</div>}
      {kategori === "ogrenci" && sinifSecenekleri.length > 0 && (
        <label className="flex items-center gap-2 self-start">
          <span style={{ color: TEXT_MUTED }} className="text-[11px] font-bold">Sınıf/şube:</span>
          <select value={sinifFiltre} onChange={(e) => setSinifFiltre(e.target.value)}
            className="rounded-xl px-3 py-1.5 text-xs font-bold outline-none" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
            <option value="tumu">Tüm sınıflar ({kullanicilar.length})</option>
            {sinifSecenekleri.map((s) => <option key={s} value={s}>{s} ({kullanicilar.filter((k) => k.sinif === s).length})</option>)}
          </select>
        </label>
      )}
      {gosterilenler.length === 0 ? (
        <div className="rounded-2xl p-6 text-center text-sm" style={{ color: TEXT_MUTED, background: BG1, border: `2px solid ${BORDER}` }}>
          Bu sınıfta kayıtlı öğrenci yok.
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {gosterilenler.map((k) => (
          <div key={k.id} className={`rounded-2xl p-3.5 ${acikProgramId === k.id ? "sm:col-span-2" : ""}`} style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <div style={{ color: TEXT }} className="text-sm font-bold">{k.ad}</div>
            <div style={{ color: TEXT_MUTED }} className="text-xs">{k.detay}{!k.aktif && " · Pasif"}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {kategori === "ogrenci" && (
                <Link href={`/dashboard?ogrenci=${k.id}`}
                  className="sfec-btn flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                  <BarChart3 size={12} /> Profil / Analiz
                </Link>
              )}
              {kategori === "ogretmen" && (
                <button onClick={() => setAcikProgramId(acikProgramId === k.id ? null : k.id)}
                  className="sfec-btn flex-1 flex items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold"
                  style={{ color: acikProgramId === k.id ? MINT : TEXT, border: `2px solid ${acikProgramId === k.id ? MINT : BORDER_STRONG}` }}>
                  <CalendarClock size={12} /> {acikProgramId === k.id ? "Programı gizle" : "Ders programı"}
                </button>
              )}
              <button disabled={pending} onClick={() => startTransition(async () => {
                const r = await moderatorSifreSifirla(k.id);
                setMesaj(r.error ? `Hata: ${r.error}` : `Geçici şifre (${k.ad}): ${r.sifre}`);
              })} className="sfec-btn flex-1 rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                <KeyRound className="mr-1 inline" size={12} />Şifre sıfırla
              </button>
              <button disabled={pending} onClick={() => startTransition(async () => {
                const r = await moderatorAktiflikDegistir(k.id, !k.aktif);
                setMesaj(r.error ? `Hata: ${r.error}` : "İşlem tamamlandı.");
                if (!r.error) router.refresh();
              })} className="sfec-btn flex-1 rounded-lg px-2 py-2 text-[11px] font-bold" style={{ color: k.aktif ? BLUSH : MINT, border: `2px solid ${BORDER_STRONG}` }}>
                {k.aktif ? <UserX className="mr-1 inline" size={12} /> : <UserCheck className="mr-1 inline" size={12} />} {k.aktif ? "Pasifleştir" : "Aktifleştir"}
              </button>
              <button disabled={pending} onClick={() => {
                if (!window.confirm(`${k.ad} hesabı kalıcı olarak silinsin mi?`)) return;
                startTransition(async () => {
                  const r = await moderatorHesapSil(k.id);
                  setMesaj(r.error ? `Hata: ${r.error}` : "Hesap silindi.");
                  if (!r.error) router.refresh();
                });
              }} className="sfec-btn rounded-lg px-3 py-2 text-[11px] font-bold" style={{ color: BLUSH, border: `2px solid ${BORDER_STRONG}` }}>
                <Trash2 className="mr-1 inline" size={12} />Sil
              </button>
            </div>
            {kategori === "ogretmen" && acikProgramId === k.id && (
              <div className="mt-3">
                <DersProgramiYonetimi teacherId={k.id} dershaneMi siniflar={siniflar ?? []} satirlar={dersProgramlari?.[k.id] ?? []} />
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  );
}
