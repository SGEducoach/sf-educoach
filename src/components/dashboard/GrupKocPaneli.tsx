"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Copy, KeyRound, Pause, Play, UserPlus, Users, UsersRound, X } from "lucide-react";
import {
  grupOgrenciAktiflik, grupOgrenciSeviyeDegistir, grupOgrenciSifresiYenile, grupOgrencisiEkle,
  grupVeliAktiflik, grupVeliTalebiOnayla, grupVeliTalebiReddet,
  type GrupOgrencisi, type GrupVeliTalebi, type GrupVelisi,
} from "@/app/dashboard/grup-koc-actions";
import type { GrupBilgisi } from "@/lib/grup-koc-auth";
import { GRUP_SINIF_DUZEYLERI, kalanGun } from "@/lib/grup-kocluk";
import { SIFRE_IPUCU } from "@/lib/validators";
import { BG0, BG1, BG1_ALT, BLUSH, BLUSH_BG, BORDER, BORDER_STRONG, BUTTER, BUTTER_BG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED } from "@/lib/theme";

// Grup Koçluk — Faz 3 koç paneli "Grubum" (kullanıcı isteği 18.09.2026):
// grup kartı (kod, doluluk, kalan süre), öğrenci ekleme (kullanıcı adı +
// şifre koçtan), öğrenci hesap yönetimi. Takip (ödev/veri/program) mevcut
// rehber modülünde: Öğrenci Takibi.

const girdi = { background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` };

// Ad soyaddan kullanıcı adı önerisi: Türkçe harfler sadeleşir, boşluksuz.
function kullaniciAdiOner(ad: string): string {
  const harita: Record<string, string> = { ç: "c", ğ: "g", ı: "i", i: "i", ö: "o", ş: "s", ü: "u" };
  const sade = ad.toLocaleLowerCase("tr").split("").map((h) => harita[h] ?? h).join("").replace(/[^a-z0-9]+/g, "");
  return sade.slice(0, 20);
}

function GirisBilgisi({ baslik, satirlar, onKapat }: { baslik: string; satirlar: [string, string][]; onKapat: () => void }) {
  const [kopyalandi, setKopyalandi] = useState(false);
  const metin = ["SeFu Koç giriş bilgilerin:", ...satirlar.map(([a, b]) => `${a}: ${b}`), "Giriş: www.sefukoc.com/login → Grup Koçluk", "İlk girişte kendi şifreni belirleyeceksin."].join("\n");
  return (
    <div className="flex flex-col gap-2 rounded-2xl p-4" style={{ background: MINT_BG, border: `1px solid ${MINT}` }}>
      <p className="text-sm font-bold" style={{ color: TEXT }}>{baslik}</p>
      <pre className="whitespace-pre-wrap rounded-xl p-3 text-xs" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER}` }}>{metin}</pre>
      <p className="text-[11px]" style={{ color: TEXT_MUTED }}>Geçici şifre bir daha gösterilmez; unutulursa &quot;Şifre yenile&quot; ile yenisini verebilirsiniz.</p>
      <div className="flex gap-2">
        <button type="button" onClick={() => { navigator.clipboard?.writeText(metin).then(() => setKopyalandi(true)); }}
          className="sfec-btn flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>
          {kopyalandi ? <Check size={13} /> : <Copy size={13} />} {kopyalandi ? "Kopyalandı" : "Kopyala"}
        </button>
        <button type="button" onClick={onKapat} className="sfec-btn rounded-xl px-3 py-2 text-xs font-bold" style={{ background: BG1_ALT, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
          Tamam
        </button>
      </div>
    </div>
  );
}

export function GrupKocPaneli({ grup, ogrenciler, bugun, veliTalepleri, veliler }: {
  grup: GrupBilgisi; ogrenciler: GrupOgrencisi[]; bugun: string; veliTalepleri: GrupVeliTalebi[]; veliler: GrupVelisi[];
}) {
  const aktifSayi = ogrenciler.filter((o) => o.aktif).length;
  const dolu = aktifSayi >= grup.kapasite;
  const kalan = kalanGun(grup.bitisTarihi, bugun);
  const [kodKopyalandi, setKodKopyalandi] = useState(false);
  const bitisYazisi = new Date(`${grup.bitisTarihi}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="flex flex-col gap-4">
      <section className="sfec-section rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
              <UsersRound size={18} color={MINT} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{grup.ad}</h1>
              <p className="text-xs" style={{ color: TEXT_MUTED }}>Bitiş: {bitisYazisi}</p>
            </div>
          </div>
          <button type="button" onClick={() => { navigator.clipboard?.writeText(grup.kod).then(() => setKodKopyalandi(true)); }}
            className="sfec-btn flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}
            title="Öğrencileriniz girişte bu kodu kullanır">
            <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Grup kodu</span>
            <span className="font-mono text-base font-extrabold tracking-wider" style={{ color: TEXT }}>{grup.kod}</span>
            {kodKopyalandi ? <Check size={14} color={MINT} /> : <Copy size={14} color={TEXT_MUTED} />}
          </button>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs" style={{ color: TEXT_MUTED }}>
            <span>Aktif öğrenci</span>
            <span className="font-bold tabular-nums" style={{ color: TEXT }}>{aktifSayi} / {grup.kapasite}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: BG0 }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (aktifSayi / grup.kapasite) * 100)}%`, background: dolu ? BUTTER : MINT }} />
          </div>
        </div>

        {grup.suresiDoldu ? (
          <p className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: BUTTER_BG, color: BUTTER }}>
            Grubunuzun süresi doldu; veriler görünür ama yeni kayıt yapılamaz. Devam etmek için SeFu Koç yönetimiyle görüşün.
          </p>
        ) : kalan <= 14 ? (
          <p className="mt-3 rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: BUTTER_BG, color: BUTTER }}>
            Grubunuzun süresinin dolmasına {kalan} gün kaldı.
          </p>
        ) : null}
      </section>

      {!grup.suresiDoldu && <OgrenciEkle dolu={dolu} grupKodu={grup.kod} />}

      <section className="sfec-section rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <h2 className="mb-3 text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Öğrencilerim</h2>
        {ogrenciler.length === 0 ? (
          <p className="py-3 text-center text-sm" style={{ color: TEXT_MUTED }}>Henüz öğrenci eklemediniz.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {ogrenciler.map((o) => <OgrenciSatiri key={o.id} ogrenci={o} grupKodu={grup.kod} salt={grup.suresiDoldu} />)}
          </div>
        )}
      </section>

      <VeliBolumu talepler={veliTalepleri} veliler={veliler} grupKodu={grup.kod} salt={grup.suresiDoldu} />
    </div>
  );
}

function OgrenciEkle({ dolu, grupKodu }: { dolu: boolean; grupKodu: string }) {
  const router = useRouter();
  const [pending, startIslem] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [f, setF] = useState({ ad: "", kullaniciAdi: "", seviye: "12", sifre: "" });
  const [kendiSifrem, setKendiSifrem] = useState(false);
  const [adDegisti, setAdDegisti] = useState(false);
  const [sonuc, setSonuc] = useState<{ ad: string; kullaniciAdi: string; sifre: string } | null>(null);

  function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    startIslem(async () => {
      const r = await grupOgrencisiEkle({ ad: f.ad, kullaniciAdi: f.kullaniciAdi, seviye: f.seviye, sifre: kendiSifrem ? f.sifre : undefined });
      if (r.error || !r.sifre) return setHata(r.error ?? "Öğrenci eklenemedi.");
      setSonuc({ ad: f.ad.trim(), kullaniciAdi: f.kullaniciAdi.trim().toLowerCase(), sifre: r.sifre });
      setF({ ad: "", kullaniciAdi: "", seviye: f.seviye, sifre: "" });
      setAdDegisti(false);
      router.refresh();
    });
  }

  return (
    <section className="sfec-section rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <h2 className="mb-3 flex items-center gap-2 text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
        <UserPlus size={16} color={MINT} /> Öğrenci ekle
      </h2>
      {sonuc ? (
        <GirisBilgisi baslik={`${sonuc.ad} eklendi. Giriş bilgilerini öğrenciye iletin.`}
          satirlar={[["Grup kodu", grupKodu], ["Kullanıcı adı", sonuc.kullaniciAdi], ["Geçici şifre", sonuc.sifre]]}
          onKapat={() => setSonuc(null)} />
      ) : dolu ? (
        <p className="rounded-xl px-3 py-2 text-xs font-semibold" style={{ background: BUTTER_BG, color: BUTTER }}>
          Grup kapasitesi dolu. Yeni öğrenci için birini pasife alın ya da kapasite artırımı için SeFu Koç yönetimiyle görüşün.
        </p>
      ) : (
        <form onSubmit={gonder} className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Ad soyad</span>
              <input required value={f.ad} onChange={(e) => setF({ ...f, ad: e.target.value, kullaniciAdi: adDegisti ? f.kullaniciAdi : kullaniciAdiOner(e.target.value) })}
                className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Kullanıcı adı</span>
              <input required value={f.kullaniciAdi} onChange={(e) => { setAdDegisti(true); setF({ ...f, kullaniciAdi: e.target.value.replace(/\s/g, "") }); }}
                placeholder="en az 6 karakter" className="rounded-xl px-3 py-2 text-sm outline-none" style={girdi} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Sınıf düzeyi</span>
              <select value={f.seviye} onChange={(e) => setF({ ...f, seviye: e.target.value })} className="rounded-xl px-3 py-2 text-sm font-bold outline-none" style={girdi}>
                {GRUP_SINIF_DUZEYLERI.map((s) => <option key={s} value={s}>{s}. sınıf</option>)}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-xs" style={{ color: TEXT }}>
            <input type="checkbox" checked={kendiSifrem} onChange={(e) => setKendiSifrem(e.target.checked)} />
            Geçici şifreyi kendim belirleyeceğim (işaretlemezseniz otomatik oluşur)
          </label>
          {kendiSifrem && (
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Geçici şifre</span>
              <input value={f.sifre} onChange={(e) => setF({ ...f, sifre: e.target.value })} className="rounded-xl px-3 py-2 text-sm outline-none sm:max-w-xs" style={girdi} />
              <span className="text-[11px]" style={{ color: TEXT_MUTED }}>{SIFRE_IPUCU}</span>
            </label>
          )}
          {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
          <button type="submit" disabled={pending} className="sfec-btn self-start rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            {pending ? "Ekleniyor..." : "Öğrenciyi ekle"}
          </button>
        </form>
      )}
    </section>
  );
}

function OgrenciSatiri({ ogrenci: o, grupKodu, salt }: { ogrenci: GrupOgrencisi; grupKodu: string; salt: boolean }) {
  const router = useRouter();
  const [pending, startIslem] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [yeniSifre, setYeniSifre] = useState<string | null>(null);

  function islem(fn: () => Promise<{ error: string | null }>) {
    setHata(null);
    startIslem(async () => {
      const r = await fn();
      if (r.error) setHata(r.error); else router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl px-4 py-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER}`, opacity: o.aktif ? 1 : 0.7 }}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold" style={{ color: TEXT }}>{o.ad}</div>
          <div className="text-xs" style={{ color: TEXT_MUTED }}>
            <span className="font-mono">{o.kullaniciAdi}</span>
            {o.ilkGirisBekliyor && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: BUTTER_BG, color: BUTTER }}>İlk giriş bekleniyor</span>}
            {!o.aktif && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: BLUSH_BG, color: BLUSH }}>Pasif</span>}
          </div>
        </div>
        <select value={o.seviye} disabled={pending || salt} onChange={(e) => islem(() => grupOgrenciSeviyeDegistir(o.id, e.target.value))}
          className="rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none" style={girdi} title="Sınıf düzeyi">
          {GRUP_SINIF_DUZEYLERI.map((s) => <option key={s} value={s}>{s}. sınıf</option>)}
        </select>
        <Link href={`/dashboard/ogrenci-takibi?ogrenci=${o.id}`} className="sfec-btn rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>
          Takip
        </Link>
        {!salt && (
          <>
            <button type="button" disabled={pending} title="Yeni geçici şifre ver"
              onClick={() => {
                if (!window.confirm(`${o.ad} için yeni geçici şifre oluşturulsun mu? Eski şifre geçersiz olur.`)) return;
                setHata(null);
                startIslem(async () => {
                  const r = await grupOgrenciSifresiYenile(o.id);
                  if (r.error || !r.sifre) setHata(r.error ?? "Şifre yenilenemedi."); else { setYeniSifre(r.sifre); router.refresh(); }
                });
              }}
              className="sfec-btn flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold" style={{ background: BG0, color: TEXT, border: `1px solid ${BORDER_STRONG}` }}>
              <KeyRound size={12} /> Şifre yenile
            </button>
            <button type="button" disabled={pending}
              onClick={() => {
                if (o.aktif && !window.confirm(`${o.ad} pasife alınsın mı? Giriş yapamaz, kapasitede yer açılır; verileri korunur.`)) return;
                islem(() => grupOgrenciAktiflik(o.id, !o.aktif));
              }}
              className="sfec-btn flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold" style={{ background: BG0, color: o.aktif ? BLUSH : MINT, border: `1px solid ${BORDER_STRONG}` }}>
              {o.aktif ? <><Pause size={12} /> Pasife al</> : <><Play size={12} /> Aktifleştir</>}
            </button>
          </>
        )}
      </div>
      {yeniSifre && (
        <GirisBilgisi baslik={`${o.ad} için yeni geçici şifre oluşturuldu.`}
          satirlar={[["Grup kodu", grupKodu], ["Kullanıcı adı", o.kullaniciAdi], ["Geçici şifre", yeniSifre]]}
          onKapat={() => setYeniSifre(null)} />
      )}
      {hata && <p className="text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
    </div>
  );
}

// Faz 6: veli talepleri (koç onaylar) ve bağlı veliler.
function VeliBolumu({ talepler, veliler, grupKodu, salt }: { talepler: GrupVeliTalebi[]; veliler: GrupVelisi[]; grupKodu: string; salt: boolean }) {
  const router = useRouter();
  const [pending, startIslem] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);

  function islem(fn: () => Promise<{ error: string | null }>, basari?: string) {
    setHata(null); setBilgi(null);
    startIslem(async () => {
      const r = await fn();
      if (r.error) setHata(r.error); else { if (basari) setBilgi(basari); router.refresh(); }
    });
  }

  return (
    <section className="sfec-section rounded-3xl p-5" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <h2 className="mb-1 flex items-center gap-2 text-base font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>
        <Users size={16} color={MINT} /> Veliler
      </h2>
      <p className="mb-3 text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
        Veli, giriş ekranında Grup Koçluk → Veli → &quot;Kod talep edin&quot; ile grup kodunu (<span className="font-mono font-bold">{grupKodu}</span>) ve çocuğunun kullanıcı adını yazar.
        Onayladığınızda bağlantı kodu öğrencinin Mesajlarım kutusuna gider; kimliğini doğrulamadığınız talepleri reddedin.
      </p>

      {talepler.length > 0 && (
        <div className="mb-3 flex flex-col gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: TEXT_MUTED }}>Bekleyen talepler</p>
          {talepler.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3" style={{ background: BUTTER_BG, border: `1px solid ${BORDER}` }}>
              <div className="min-w-0 flex-1 text-sm" style={{ color: TEXT }}>
                <span className="font-bold">{t.veliAd}</span>
                <span style={{ color: TEXT_MUTED }}> → {t.ogrenciAd} (<span className="font-mono">{t.kullaniciAdi}</span>)</span>
              </div>
              {!salt && (
                <>
                  <button type="button" disabled={pending}
                    onClick={() => { if (window.confirm(`${t.veliAd}, ${t.ogrenciAd} öğrencisinin velisi olarak onaylansın mı?`)) islem(() => grupVeliTalebiOnayla(t.id), "Onaylandı. Bağlantı kodu öğrencinin Mesajlarım kutusuna gönderildi (48 saat geçerli)."); }}
                    className="sfec-btn flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: MINT, color: MINT_ON }}>
                    <Check size={12} /> Onayla
                  </button>
                  <button type="button" disabled={pending}
                    onClick={() => { if (window.confirm("Talep reddedilsin mi?")) islem(() => grupVeliTalebiReddet(t.id)); }}
                    className="sfec-btn flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold" style={{ background: BG0, color: BLUSH, border: `1px solid ${BORDER_STRONG}` }}>
                    <X size={12} /> Reddet
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {veliler.length === 0 ? (
        <p className="py-2 text-center text-sm" style={{ color: TEXT_MUTED }}>Henüz bağlı veli yok.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {veliler.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-2xl px-4 py-3" style={{ background: BG1_ALT, border: `1px solid ${BORDER}`, opacity: v.aktif ? 1 : 0.7 }}>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold" style={{ color: TEXT }}>
                  {v.ad}
                  {!v.aktif && <span className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: BLUSH_BG, color: BLUSH }}>Erişim kapalı</span>}
                </div>
                <div className="text-xs" style={{ color: TEXT_MUTED }}>Velisi: {v.ogrenciler.join(", ")}</div>
              </div>
              {!salt && (
                <button type="button" disabled={pending}
                  onClick={() => { if (!v.aktif || window.confirm(`${v.ad} için veli erişimi kapatılsın mı? Giriş yapamaz.`)) islem(() => grupVeliAktiflik(v.id, !v.aktif)); }}
                  className="sfec-btn flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold" style={{ background: BG0, color: v.aktif ? BLUSH : MINT, border: `1px solid ${BORDER_STRONG}` }}>
                  {v.aktif ? <><Pause size={12} /> Erişimi kapat</> : <><Play size={12} /> Erişimi aç</>}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {bilgi && <p className="mt-2 text-xs font-semibold" style={{ color: MINT }}>{bilgi}</p>}
      {hata && <p className="mt-2 text-xs font-semibold" style={{ color: BLUSH }}>{hata}</p>}
    </section>
  );
}
