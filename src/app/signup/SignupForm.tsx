"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap, BookOpen, Users, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AytAlan, School, SchoolClass, UserRole } from "@/lib/types";
import { AYT_ALAN_ETIKET, BRANS_LISTESI, dokuzOnSinifMi, sinifSiraKarsilastir } from "@/lib/types";
import {
  BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH,
} from "@/lib/theme";
import {
  telefonSanitize, telefonGecerliMi, okulNoSanitize, sifreGecerliMi, SIFRE_IPUCU, TELEFON_IPUCU, adNormalize, rastgeleSifre,
} from "@/lib/validators";
import { YukleniyorOverlay } from "@/components/YukleniyorOverlay";
import { SeFuSlogan } from "@/components/SeFuWordmark";

const rolSecenekleri: { id: UserRole; ad: string; icon: typeof BookOpen }[] = [
  { id: "ogrenci", ad: "Öğrenci", icon: BookOpen },
  { id: "ogretmen", ad: "Öğretmen", icon: GraduationCap },
  { id: "veli", ad: "Veli", icon: Users },
];

function Etiket({ children }: { children: React.ReactNode }) {
  return <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{children}</span>;
}

function Girdi(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props}
      className={`text-sm px-3 py-2 rounded-xl outline-none w-full ${props.className ?? ""}`}
      style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
  );
}

function Secim({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props}
      className="text-sm px-3 py-2 rounded-xl outline-none w-full"
      style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
      {children}
    </select>
  );
}

// ============ Kayıt kuralları onayı ============
// Onay sadece tarayıcıda (localStorage) tutuluyor; metin ve versiyonu artık
// admin panelinden düzenlenip app_ayarlari tablosundan geliyor (bkz.
// src/app/signup/page.tsx, src/lib/app-ayarlari.ts). Admin metni her
// güncellediğinde versiyon otomatik bump'lanır, böylece daha önce eski
// metni kabul etmiş kullanıcılara yeni metin tekrar sorulur.
const KURALLAR_STORAGE_KEY = "sfec_kurallar_kabul";

function kurallarOnayliMi(versiyon: string) {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KURALLAR_STORAGE_KEY) === versiyon;
  } catch {
    return false;
  }
}

function KurallarModal({ metin, versiyon, onKabul }: { metin: string; versiyon: string; onKabul: () => void }) {
  const [okundu, setOkundu] = useState(false);

  function kabulEt() {
    try {
      window.localStorage.setItem(KURALLAR_STORAGE_KEY, versiyon);
    } catch {
      // localStorage kullanılamıyorsa (ör. gizli sekme) sessizce devam et —
      // her seferinde tekrar sorulur, işlevi engellemez.
    }
    onKabul();
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center px-4 py-8" style={{ background: "rgba(0,0,0,0.65)" }}>
      <div className="w-full max-w-md rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}`, maxHeight: "90vh" }}>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-lg font-bold">Kayıt ve kullanım kuralları</h2>
        <div className="overflow-y-auto rounded-xl p-3.5 text-xs leading-relaxed whitespace-pre-line"
          style={{ background: BG0, color: TEXT_MUTED, border: `2px solid ${BORDER_STRONG}`, maxHeight: "45vh" }}>
          {metin}
        </div>
        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={okundu} onChange={(e) => setOkundu(e.target.checked)} className="mt-0.5" />
          <span style={{ color: TEXT }} className="text-xs font-semibold">Kuralları okudum, kabul ediyorum.</span>
        </label>
        <button type="button" disabled={!okundu} onClick={kabulEt}
          className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-50"
          style={{ background: MINT, color: MINT_ON }}>
          Devam et
        </button>
      </div>
    </div>
  );
}

export default function SignupForm({ kurallarMetni, kurallarVersiyon }: { kurallarMetni: string; kurallarVersiyon: string }) {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<UserRole>("ogrenci");
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [kurallarKabul, setKurallarKabul] = useState(false);

  useEffect(() => {
    supabase.from("schools").select("*").eq("tur", "okul").then(({ data }) => setSchools((data as School[]) ?? []));
    supabase.from("classes").select("*").then(({ data }) => {
      setClasses(((data as SchoolClass[]) ?? []).sort(sinifSiraKarsilastir));
    });
  }, [supabase]);

  useEffect(() => {
    const zamanlayici = window.setTimeout(() => setKurallarKabul(kurallarOnayliMi(kurallarVersiyon)), 0);
    return () => window.clearTimeout(zamanlayici);
  }, [kurallarVersiyon]);

  if (!kurallarKabul) {
    return <KurallarModal metin={kurallarMetni} versiyon={kurallarVersiyon} onKabul={() => setKurallarKabul(true)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo.png" alt="SeFu Koç" width={800} height={395} className="h-24 w-auto max-w-full object-contain mb-2" priority />
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold">Hesap oluşturun</h1>
          <p className="text-xs mt-1 italic"><SeFuSlogan /></p>
        </div>

        <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
          {rolSecenekleri.map((r) => {
            const Icon = r.icon;
            const aktif = role === r.id;
            return (
              <button
                key={r.id} type="button" onClick={() => setRole(r.id)}
                className="sfec-btn flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[12px] font-bold"
                style={{ background: aktif ? MINT : "transparent", color: aktif ? MINT_ON : TEXT_MUTED }}>
                <Icon size={13} /> {r.ad}
              </button>
            );
          })}
        </div>

        {role === "ogrenci" && <OgrenciKayit schools={schools} classes={classes} router={router} supabase={supabase} />}
        {role === "ogretmen" && <OgretmenKayit schools={schools} classes={classes} router={router} supabase={supabase} />}
        {role === "veli" && <VeliKayit schools={schools} router={router} supabase={supabase} />}

        <p style={{ color: TEXT_MUTED }} className="text-xs text-center mt-5">
          Zaten hesabınız var mı?{" "}
          <Link href="/login" style={{ color: MINT }} className="font-semibold">Giriş yapın</Link>
        </p>
      </div>
    </div>
  );
}

// ============ ÖĞRENCİ ============
function OgrenciKayit({ schools, classes, router, supabase }: {
  schools: School[]; classes: SchoolClass[]; router: ReturnType<typeof useRouter>;
  supabase: ReturnType<typeof createClient>;
}) {
  const [adim, setAdim] = useState<1 | 2>(1);
  const [ad, setAd] = useState("");
  const [okulNo, setOkulNo] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [aytAlan, setAytAlan] = useState<AytAlan>("SAY");
  const [hedefBolum, setHedefBolum] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [basarili, setBasarili] = useState(false);
  const [geciciSifre, setGeciciSifre] = useState("");
  const [oturumVar, setOturumVar] = useState(false);

  const sinifOptions = classes.filter((c) => c.school_id === schoolId);
  // 9-10. sınıfta TYT/AYT sorulmuyor — Branş Denemesi modeli kullanılıyor
  // (bkz. 9_10_sinif_ekleme_senaryosu.pdf). ayt_alan sütunu yine de NOT
  // NULL olduğu için varsayılan "SAY" sessizce gönderiliyor, öğrenciye
  // hiçbir yerde gösterilmiyor.
  const dokuzOnMu = dokuzOnSinifMi(sinifOptions.find((c) => c.id === classId)?.seviye);
  const adim1Tamam = ad && okulNo && email && telefon && schoolId && classId && hedefBolum;

  function ileri(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!adim1Tamam) {
      setHata("Lütfen tüm alanları doldurun.");
      return;
    }
    if (!telefonGecerliMi(telefon)) return setHata("Telefon numarası geçersiz. " + TELEFON_IPUCU);
    setAdim(2);
  }

  async function kayitOl(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);

    const sifre = rastgeleSifre();
    setYukleniyor(true);
    const { error } = await supabase.auth.signUp({
      email, password: sifre,
      options: {
        data: {
          role: "ogrenci", ad: adNormalize(ad), telefon, okul_no: okulNo,
          school_id: schoolId, class_id: classId, ayt_alan: aytAlan, hedef_bolum: hedefBolum,
          gecici_sifre: true,
        },
      },
    });
    setYukleniyor(false);
    if (error) return setHata(error.message);

    const { data: { session } } = await supabase.auth.getSession();
    setGeciciSifre(sifre);
    setOturumVar(!!session);
    setBasarili(true);
  }

  if (basarili) {
    return (
      <div className="text-center rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-lg font-bold">Kaydınız tamamlandı 🎉</h2>
        <p style={{ color: TEXT_MUTED }} className="text-sm leading-relaxed">
          Aşağıdaki geçici şifrenizi not alın. İlk girişten sonra kendi şifrenizi belirlemeniz istenecek.
        </p>
        <div className="rounded-2xl px-4 py-3" style={{ background: MINT_BG, border: `2px solid ${BORDER_STRONG}` }}>
          <div style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide mb-1">Geçici şifreniz</div>
          <div style={{ color: MINT, fontFamily: "monospace" }} className="text-2xl font-bold tracking-widest">{geciciSifre}</div>
        </div>
        {oturumVar ? (
          <button type="button" onClick={() => { router.push("/dashboard"); router.refresh(); }}
            className="sfec-btn text-sm font-bold py-2.5 rounded-xl" style={{ background: MINT, color: MINT_ON }}>
            Panele git
          </button>
        ) : (
          <>
            <p style={{ color: TEXT_MUTED }} className="text-xs">Giriş yapmak için bu şifreyi kullanın.</p>
            <Link href="/login" style={{ color: MINT }} className="text-sm font-semibold">Girişe git</Link>
          </>
        )}
      </div>
    );
  }

  if (adim === 2) {
    return (
      <>
        <form onSubmit={kayitOl} className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: MINT_BG, color: MINT }}>
            Bilgileriniz tamam ✓ — kaydınızı tamamlayabilirsiniz.
          </div>
          <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">
            Şifrenizi sistem sizin için oluşturacak ve kayıt tamamlandığında ekranda gösterecek. İlk girişten sonra kendi şifrenizi belirleyebileceksiniz.
          </p>
          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdim(1)} className="sfec-btn shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
              <ChevronLeft size={16} color={TEXT_MUTED} />
            </button>
            <button type="submit" disabled={yukleniyor} className="sfec-btn flex-1 text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
              {yukleniyor ? "Kaydediliyor..." : "Kayıt ol"}
            </button>
          </div>
        </form>
        <YukleniyorOverlay visible={yukleniyor} mesaj="Kaydediliyor..." />
      </>
    );
  }

  return (
    <form onSubmit={ileri} className="rounded-3xl p-6 flex flex-col gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <label className="flex flex-col gap-1"><Etiket>Ad Soyad</Etiket><Girdi required value={ad} onChange={(e) => setAd(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Okul No</Etiket><Girdi required value={okulNo} inputMode="numeric" maxLength={5} placeholder="örn. 1234" onChange={(e) => setOkulNo(okulNoSanitize(e.target.value))} /></label>
      <label className="flex flex-col gap-1"><Etiket>E-posta</Etiket><Girdi type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Telefon</Etiket><Girdi type="tel" required value={telefon} inputMode="numeric" placeholder="5xxxxxxxxx" onChange={(e) => setTelefon(telefonSanitize(e.target.value))} /></label>
      <label className="flex flex-col gap-1"><Etiket>Okul</Etiket>
        <Secim required value={schoolId} onChange={(e) => { setSchoolId(e.target.value); setClassId(""); }}>
          <option value="">Seçiniz</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
        </Secim>
      </label>
      <label className="flex flex-col gap-1"><Etiket>Sınıf</Etiket>
        <Secim required value={classId} onChange={(e) => setClassId(e.target.value)} disabled={!schoolId}>
          <option value="">Seçiniz</option>
          {sinifOptions.map((c) => <option key={c.id} value={c.id}>{c.seviye}-{c.sube}</option>)}
        </Secim>
      </label>
      {dokuzOnMu ? (
        <div className="rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: MINT_BG, color: MINT }}>
          Sınav türü: Branş Denemesi (9-10. sınıf)
        </div>
      ) : (
        <>
          <div className="rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: MINT_BG, color: MINT }}>
            TYT: Zorunlu (otomatik dahil)
          </div>
          <label className="flex flex-col gap-1"><Etiket>AYT Alanı</Etiket>
            <Secim required value={aytAlan} onChange={(e) => setAytAlan(e.target.value as AytAlan)}>
              {(Object.entries(AYT_ALAN_ETIKET) as [AytAlan, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Secim>
          </label>
        </>
      )}
      <label className="flex flex-col gap-1"><Etiket>Hedef Bölüm</Etiket><Girdi required value={hedefBolum} onChange={(e) => setHedefBolum(e.target.value)} /></label>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" className="sfec-btn text-sm font-bold py-2.5 rounded-xl" style={{ background: MINT, color: MINT_ON }}>Devam et</button>
    </form>
  );
}

// ============ ÖĞRETMEN ============
function OgretmenKayit({ schools, router, supabase }: {
  schools: School[]; classes: SchoolClass[]; router: ReturnType<typeof useRouter>;
  supabase: ReturnType<typeof createClient>;
}) {
  const [adim, setAdim] = useState<1 | 2>(1);
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [brans, setBrans] = useState<string>(BRANS_LISTESI[0]);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [basarili, setBasarili] = useState(false);

  const adim1Tamam = ad && email && telefon && schoolId && brans;

  function ileri(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!adim1Tamam) return setHata("Lütfen tüm alanları doldurun.");
    if (!telefonGecerliMi(telefon)) return setHata("Telefon numarası geçersiz. " + TELEFON_IPUCU);
    setAdim(2);
  }

  async function kayitOl(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!sifreGecerliMi(password)) return setHata("Şifre geçersiz. " + SIFRE_IPUCU);
    if (password !== password2) return setHata("Şifreler eşleşmiyor.");

    setYukleniyor(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          // class_id kasıtlı olarak gönderilmiyor — sınıf öğretmenliği artık
          // sadece müdür tarafından (Yönetim panelinden) atanıyor.
          role: "ogretmen", ad: adNormalize(ad), telefon, school_id: schoolId, brans,
        },
      },
    });
    setYukleniyor(false);
    if (error) return setHata(error.message);

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setBasarili(true);
  }

  if (basarili) return <KayitTamamMesaji email={email} />;

  if (adim === 2) {
    return (
      <>
        <form onSubmit={kayitOl} className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          <div className="rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: MINT_BG, color: MINT }}>
            Bilgileriniz tamam ✓ — şimdi şifrenizi belirleyin.
          </div>
          <label className="flex flex-col gap-1"><Etiket>Şifre</Etiket>
            <Girdi type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
            <span style={{ color: TEXT_MUTED }} className="text-[10px]">{SIFRE_IPUCU}</span>
          </label>
          <label className="flex flex-col gap-1"><Etiket>Şifre (tekrar)</Etiket>
            <Girdi type="password" required minLength={8} value={password2} onChange={(e) => setPassword2(e.target.value)} />
          </label>
          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setAdim(1)} className="sfec-btn shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
              <ChevronLeft size={16} color={TEXT_MUTED} />
            </button>
            <button type="submit" disabled={yukleniyor} className="sfec-btn flex-1 text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
              {yukleniyor ? "Kaydediliyor..." : "Kayıt ol"}
            </button>
          </div>
        </form>
        <YukleniyorOverlay visible={yukleniyor} mesaj="Kaydediliyor..." />
      </>
    );
  }

  return (
    <form onSubmit={ileri} className="rounded-3xl p-6 flex flex-col gap-3" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <label className="flex flex-col gap-1"><Etiket>Ad Soyad</Etiket><Girdi required value={ad} onChange={(e) => setAd(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>E-posta</Etiket><Girdi type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Telefon</Etiket><Girdi type="tel" required value={telefon} inputMode="numeric" placeholder="5xxxxxxxxx" onChange={(e) => setTelefon(telefonSanitize(e.target.value))} /></label>
      <label className="flex flex-col gap-1"><Etiket>Okulu veya Dershanesi</Etiket>
        <Secim required value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
          <option value="">Seçiniz</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
        </Secim>
      </label>
      <div className="rounded-xl px-3 py-2 text-[11px] leading-snug" style={{ background: "rgba(143,198,255,0.14)", color: TEXT_MUTED }}>
        Sınıf öğretmenliği ataması kayıt sırasında yapılmaz — okul müdürünüz sizi Yönetim panelinden bir sınıfa atayabilir.
      </div>
      <label className="flex flex-col gap-1"><Etiket>Branş</Etiket>
        <Secim required value={brans} onChange={(e) => setBrans(e.target.value)}>
          {BRANS_LISTESI.map((b) => <option key={b} value={b}>{b}</option>)}
        </Secim>
      </label>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" className="sfec-btn text-sm font-bold py-2.5 rounded-xl" style={{ background: MINT, color: MINT_ON }}>Devam et</button>
    </form>
  );
}

// ============ VELİ ============
function VeliKayit({ schools, router, supabase }: { schools: School[]; router: ReturnType<typeof useRouter>; supabase: ReturnType<typeof createClient> }) {
  const [mod, setMod] = useState<"talep" | "tamamla">("talep");

  return (
    <div className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex gap-1 p-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
        <button type="button" onClick={() => setMod("talep")}
          className="sfec-btn flex-1 text-[11px] font-bold py-1.5 rounded-full"
          style={{ background: mod === "talep" ? MINT : "transparent", color: mod === "talep" ? MINT_ON : TEXT_MUTED }}>
          Kod talep et
        </button>
        <button type="button" onClick={() => setMod("tamamla")}
          className="sfec-btn flex-1 text-[11px] font-bold py-1.5 rounded-full"
          style={{ background: mod === "tamamla" ? MINT : "transparent", color: mod === "tamamla" ? MINT_ON : TEXT_MUTED }}>
          Kodum var, tamamla
        </button>
      </div>
      {mod === "talep" ? <VeliTalepForm schools={schools} /> : <VeliTamamlaForm schools={schools} router={router} supabase={supabase} />}
    </div>
  );
}

function VeliTalepForm({ schools }: { schools: School[] }) {
  const [ad, setAd] = useState("");
  const [telefon, setTelefon] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [okulNo, setOkulNo] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!telefonGecerliMi(telefon)) return setHata("Telefon numarası geçersiz. " + TELEFON_IPUCU);
    if (!schoolId) return setHata("Okul seçin.");
    setYukleniyor(true);

    const res = await fetch("/api/veli/talep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: schoolId, okul_no: okulNo.trim(), veli_ad: adNormalize(ad), veli_telefon: telefon,
      }),
    });
    const body = await res.json();
    setYukleniyor(false);
    if (!res.ok) return setHata(body.error ?? "Talep oluşturulamadı.");
    setGonderildi(true);
  }

  function yeniTalep() {
    setAd(""); setTelefon(""); setSchoolId(""); setOkulNo(""); setGonderildi(false);
  }

  return (
    <>
      <form onSubmit={gonder} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1"><Etiket>Ad Soyad</Etiket><Girdi required value={ad} onChange={(e) => setAd(e.target.value)} /></label>
        <label className="flex flex-col gap-1"><Etiket>Telefon</Etiket><Girdi type="tel" required value={telefon} inputMode="numeric" placeholder="5xxxxxxxxx" onChange={(e) => setTelefon(telefonSanitize(e.target.value))} /></label>
        <label className="flex flex-col gap-1"><Etiket>Öğrencinin Okulu</Etiket>
          <Secim required value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
            <option value="">Seçiniz</option>
            {schools.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
          </Secim>
        </label>
        <label className="flex flex-col gap-1"><Etiket>Öğrenci Okul No</Etiket><Girdi required value={okulNo} inputMode="numeric" maxLength={5} onChange={(e) => setOkulNo(okulNoSanitize(e.target.value))} /></label>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <button type="submit" disabled={yukleniyor} className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {yukleniyor ? "Gönderiliyor..." : "Kod talep et"}
        </button>
      </form>
      <YukleniyorOverlay visible={yukleniyor} mesaj="Gönderiliyor..." />

      {gonderildi && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}>
          <div className="sfec-fade rounded-3xl p-6 max-w-sm w-full text-center" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <p style={{ color: TEXT }} className="text-sm font-bold leading-relaxed mb-3">
              Kod talebiniz alındı.
            </p>
            <div className="mb-4 flex flex-col gap-2 text-left">
              <div className="rounded-xl p-3" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
                <p style={{ color: TEXT }} className="text-xs font-bold">Öğrencinize yönlendirin</p>
                <p style={{ color: TEXT_MUTED }} className="mt-1 text-xs leading-relaxed">Sınıf öğretmeni talebi onayladığında kod öğrencinin <strong>Mesajlarım</strong> kutusuna gelir. Öğrencinizden bu kutuyu kontrol etmesini isteyin.</p>
              </div>
              <div className="rounded-xl p-3" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
                <p style={{ color: TEXT }} className="text-xs font-bold">Sınıf öğretmenine yönlendirin</p>
                <p style={{ color: TEXT_MUTED }} className="mt-1 text-xs leading-relaxed">Talebin onaylanması için öğrencinin sınıf öğretmenine ulaşabilirsiniz. Güvenlik nedeniyle burada öğrenci veya öğretmen bilgisi gösterilmez.</p>
              </div>
            </div>
            <p style={{ color: BLUSH }} className="mb-4 text-[11px] font-semibold leading-relaxed">Kodu yalnız doğrulanmış veli–öğrenci iletişiminde paylaşın. Kod mesajını veya ekran görüntüsünü üçüncü kişilere göndermeyin; ilk kayıt 48 saat içinde tamamlanmalıdır.</p>
            <button type="button" onClick={yeniTalep}
              className="sfec-btn text-sm font-bold py-2.5 px-8 rounded-xl" style={{ background: MINT, color: MINT_ON }}>
              Tamam
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const KVKK_METNI = `SeFu Koç olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, velisi/vasisi olduğunuz öğrencinin kişisel verilerinin işlenmesi hakkında sizi bilgilendirmek isteriz.

İşlenen veriler: öğrencinin adı-soyadı, okul/sınıf bilgisi, iletişim bilgileri, akademik performans verileri (deneme sonuçları, çalışma kayıtları, soru çözüm istatistikleri, motivasyon durumu).

İşleme amacı: öğrencinin akademik gelişiminin takip edilmesi, öğretmen tarafından değerlendirilmesi, size ve öğrenciye bu veriler hakkında bildirim ve rapor sunulması.

Veri aktarımı: veriler, Platform'un altyapı sağlayıcıları (barındırma ve e-posta hizmetleri) dışında üçüncü kişilerle paylaşılmaz.

Saklama süresi: hesap aktif olduğu sürece saklanır; hesap kapatma talebinde makul süre içinde silinir.

Haklarınız: KVKK madde 11 kapsamında verilerin düzeltilmesi, silinmesi, işlenme amacını öğrenme gibi haklara sahipsiniz.

Onay: Yukarıdaki bilgilendirmeyi okudum; velisi/vasisi olduğum öğrencinin belirtilen kapsamda kişisel verilerinin işlenmesine açık rızamla onay veriyorum.`;

function VeliTamamlaForm({ schools, router }: { schools: School[]; router: ReturnType<typeof useRouter>; supabase: ReturnType<typeof createClient> }) {
  const [asama, setAsama] = useState<1 | 2>(1);
  const [schoolId, setSchoolId] = useState("");
  const [okulNo, setOkulNo] = useState("");
  const [kod, setKod] = useState("");
  const [veliAd, setVeliAd] = useState("");
  const [veliTelefon, setVeliTelefon] = useState("");
  const [sifre, setSifre] = useState("");
  const [sifreTekrar, setSifreTekrar] = useState("");
  const [kvkkOnay, setKvkkOnay] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function tamamla(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!schoolId) return setHata("Okul seçin.");
    if (!veliAd.trim()) return setHata("Adınız Soyadınız gerekli.");
    if (!telefonGecerliMi(veliTelefon)) return setHata("Telefon numarası geçersiz. " + TELEFON_IPUCU);
    if (!kvkkOnay) return setHata("Devam etmek için KVKK aydınlatma metnini onaylamanız gerekiyor.");
    if (!sifreGecerliMi(sifre)) return setHata(SIFRE_IPUCU);
    if (sifre !== sifreTekrar) return setHata("Şifreler aynı değil.");
    setYukleniyor(true);
    const res = await fetch("/api/veli/tamamla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        school_id: schoolId, okul_no: okulNo.trim(), kod: kod.trim(), sifre, kvkkOnay: true,
        veli_ad: adNormalize(veliAd), veli_telefon: veliTelefon,
      }),
    });
    const body = await res.json();
    setYukleniyor(false);
    if (!res.ok) return setHata(body.error ?? "Bir hata oluştu.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <>
    <form onSubmit={tamamla} className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[11px] font-bold" style={{ color: TEXT_MUTED }}>
        <span className="rounded-full px-2.5 py-1" style={{ background: asama === 1 ? MINT : BG0, color: asama === 1 ? MINT_ON : TEXT_MUTED }}>1 · Kodu doğrula</span>
        <span>→</span>
        <span className="rounded-full px-2.5 py-1" style={{ background: asama === 2 ? MINT : BG0, color: asama === 2 ? MINT_ON : TEXT_MUTED }}>2 · Şifreni oluştur</span>
      </div>
      {asama === 1 ? <>
      <label className="flex flex-col gap-1"><Etiket>Öğrencinin Okulu</Etiket>
        <Secim required value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
          <option value="">Seçiniz</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
        </Secim>
      </label>
      <label className="flex flex-col gap-1"><Etiket>Öğrenci Okul No</Etiket><Girdi required value={okulNo} onChange={(e) => setOkulNo(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Kod</Etiket><Girdi required value={kod} maxLength={12} autoCapitalize="characters" onChange={(e) => setKod(e.target.value.toUpperCase())} /></label>
      <label className="flex flex-col gap-1"><Etiket>Adınız Soyadınız</Etiket><Girdi required value={veliAd} onChange={(e) => setVeliAd(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Telefon</Etiket><Girdi type="tel" required value={veliTelefon} inputMode="numeric" placeholder="5xxxxxxxxx" onChange={(e) => setVeliTelefon(telefonSanitize(e.target.value))} /></label>

      <div className="flex flex-col gap-1.5">
        <Etiket>KVKK Aydınlatma Metni ve Rıza Beyanı</Etiket>
        <div className="text-[11px] leading-relaxed whitespace-pre-line rounded-xl p-3 max-h-40 overflow-y-auto"
          style={{ background: BG0, border: `2px solid ${BORDER_STRONG}`, color: TEXT_MUTED }}>
          {KVKK_METNI}
        </div>
      </div>

      <label className="flex items-start gap-2 cursor-pointer">
        <input type="checkbox" checked={kvkkOnay} onChange={(e) => setKvkkOnay(e.target.checked)}
          className="mt-0.5" />
        <span style={{ color: TEXT }} className="text-xs leading-snug">
          Yukarıdaki metni okudum, velisi/vasisi olduğum öğrencinin kişisel verilerinin işlenmesine <strong>açık rızam ile onay veriyorum.</strong>
        </span>
      </label>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="button" onClick={() => {
        setHata(null);
        if (!schoolId) return setHata("Okul seçin.");
        if (!okulNo.trim() || !kod.trim()) return setHata("Okul no ve kod gerekli.");
        if (!veliAd.trim()) return setHata("Adınız Soyadınız gerekli.");
        if (!telefonGecerliMi(veliTelefon)) return setHata("Telefon numarası geçersiz. " + TELEFON_IPUCU);
        if (!kvkkOnay) return setHata("Devam etmek için KVKK metnini onaylayın.");
        setAsama(2);
      }} className="sfec-btn rounded-xl py-2.5 text-sm font-bold" style={{ background: MINT, color: MINT_ON }}>
        Devam et
      </button>
      </> : <>
      <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">Kod yalnız hesabı eşleştirmek için kullanılacak. Bundan sonraki girişlerinizde aşağıda oluşturduğunuz kişisel şifreyi kullanacaksınız.</p>
      <label className="flex flex-col gap-1"><Etiket>Yeni Şifre</Etiket><Girdi type="password" required value={sifre} onChange={(e) => setSifre(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Yeni Şifre Tekrar</Etiket><Girdi type="password" required value={sifreTekrar} onChange={(e) => setSifreTekrar(e.target.value)} /></label>
      <p style={{ color: TEXT_MUTED }} className="text-[11px] leading-relaxed">{SIFRE_IPUCU}</p>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <div className="flex gap-2">
        <button type="button" onClick={() => { setHata(null); setAsama(1); }} disabled={yukleniyor} className="sfec-btn flex-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>Geri</button>
        <button type="submit" disabled={yukleniyor} className="sfec-btn flex-1 text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
          {yukleniyor ? "Tamamlanıyor..." : "Şifreyi oluştur"}
        </button>
      </div>
      </>}
    </form>
    <YukleniyorOverlay visible={yukleniyor} mesaj="Tamamlanıyor..." />
    </>
  );
}

function KayitTamamMesaji({ email }: { email: string }) {
  return (
    <div className="text-center rounded-3xl p-6" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-lg font-bold mb-2">E-postanızı kontrol edin</h2>
      <p style={{ color: TEXT_MUTED }} className="text-sm">Hesabınızı doğrulamak için {email} adresine bir bağlantı gönderdik.</p>
      <Link href="/login" style={{ color: MINT }} className="text-sm font-semibold mt-4 inline-block">Girişe dön</Link>
    </div>
  );
}
