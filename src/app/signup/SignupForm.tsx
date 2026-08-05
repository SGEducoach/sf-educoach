"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, BookOpen, Users, ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AytAlan, School, SchoolClass, UserRole } from "@/lib/types";
import { AYT_ALAN_ETIKET, BRANS_LISTESI } from "@/lib/types";
import {
  BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH,
} from "@/lib/theme";

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
      style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
  );
}

function Secim({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props}
      className="text-sm px-3 py-2 rounded-xl outline-none w-full"
      style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
      {children}
    </select>
  );
}

export default function SignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<UserRole>("ogrenci");
  const [schools, setSchools] = useState<School[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);

  useEffect(() => {
    supabase.from("schools").select("*").eq("tur", "okul").then(({ data }) => setSchools((data as School[]) ?? []));
    supabase.from("classes").select("*").then(({ data }) => setClasses((data as SchoolClass[]) ?? []));
  }, [supabase]);

  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div style={{ background: MINT, boxShadow: "0 4px 16px rgba(124,232,176,0.28)" }} className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3">
            <GraduationCap size={22} color={MINT_ON} />
          </div>
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold">Hesap oluşturun</h1>
        </div>

        <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}>
          {rolSecenekleri.map((r) => {
            const Icon = r.icon;
            const aktif = role === r.id;
            return (
              <button
                key={r.id} type="button" onClick={() => setRole(r.id)}
                className="sgec-btn flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[12px] font-bold"
                style={{ background: aktif ? MINT : "transparent", color: aktif ? MINT_ON : TEXT_MUTED }}>
                <Icon size={13} /> {r.ad}
              </button>
            );
          })}
        </div>

        {role === "ogrenci" && <OgrenciKayit schools={schools} classes={classes} router={router} supabase={supabase} />}
        {role === "ogretmen" && <OgretmenKayit schools={schools} classes={classes} router={router} supabase={supabase} />}
        {role === "veli" && <VeliKayit router={router} supabase={supabase} />}

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
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [basarili, setBasarili] = useState(false);

  const sinifOptions = classes.filter((c) => c.school_id === schoolId);
  const adim1Tamam = ad && okulNo && email && telefon && schoolId && classId && hedefBolum;

  function ileri(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!adim1Tamam) {
      setHata("Lütfen tüm alanları doldurun.");
      return;
    }
    setAdim(2);
  }

  async function kayitOl(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (password.length < 6) return setHata("Şifre en az 6 karakter olmalı.");
    if (password !== password2) return setHata("Şifreler eşleşmiyor.");

    setYukleniyor(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          role: "ogrenci", ad, telefon, okul_no: okulNo,
          school_id: schoolId, class_id: classId, ayt_alan: aytAlan, hedef_bolum: hedefBolum,
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
      <form onSubmit={kayitOl} className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <div className="rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: MINT_BG, color: MINT }}>
          Bilgileriniz tamam ✓ — şimdi şifrenizi belirleyin.
        </div>
        <label className="flex flex-col gap-1"><Etiket>Şifre</Etiket>
          <Girdi type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><Etiket>Şifre (tekrar)</Etiket>
          <Girdi type="password" required minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </label>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setAdim(1)} className="sgec-btn shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
            <ChevronLeft size={16} color={TEXT_MUTED} />
          </button>
          <button type="submit" disabled={yukleniyor} className="sgec-btn flex-1 text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            {yukleniyor ? "Kaydediliyor..." : "Kayıt ol"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={ileri} className="rounded-3xl p-6 flex flex-col gap-3" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <label className="flex flex-col gap-1"><Etiket>Ad Soyad</Etiket><Girdi required value={ad} onChange={(e) => setAd(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Okul No</Etiket><Girdi required value={okulNo} onChange={(e) => setOkulNo(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>E-posta</Etiket><Girdi type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Telefon</Etiket><Girdi type="tel" required value={telefon} onChange={(e) => setTelefon(e.target.value)} /></label>
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
      <div className="rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: MINT_BG, color: MINT }}>
        TYT: Zorunlu (otomatik dahil)
      </div>
      <label className="flex flex-col gap-1"><Etiket>AYT Alanı</Etiket>
        <Secim required value={aytAlan} onChange={(e) => setAytAlan(e.target.value as AytAlan)}>
          {(Object.entries(AYT_ALAN_ETIKET) as [AytAlan, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Secim>
      </label>
      <label className="flex flex-col gap-1"><Etiket>Hedef Bölüm</Etiket><Girdi required value={hedefBolum} onChange={(e) => setHedefBolum(e.target.value)} /></label>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" className="sgec-btn text-sm font-bold py-2.5 rounded-xl" style={{ background: MINT, color: MINT_ON }}>Devam et</button>
    </form>
  );
}

// ============ ÖĞRETMEN ============
function OgretmenKayit({ schools, classes, router, supabase }: {
  schools: School[]; classes: SchoolClass[]; router: ReturnType<typeof useRouter>;
  supabase: ReturnType<typeof createClient>;
}) {
  const [adim, setAdim] = useState<1 | 2>(1);
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [telefon, setTelefon] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [brans, setBrans] = useState<string>(BRANS_LISTESI[0]);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [basarili, setBasarili] = useState(false);

  const secilenOkul = schools.find((s) => s.id === schoolId);
  const dershaneMi = secilenOkul?.tur === "dershane";
  const sinifOptions = classes.filter((c) => c.school_id === schoolId);
  const adim1Tamam = ad && email && telefon && schoolId && brans && (dershaneMi || classId);

  function ileri(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!adim1Tamam) return setHata("Lütfen tüm alanları doldurun.");
    setAdim(2);
  }

  async function kayitOl(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (password.length < 6) return setHata("Şifre en az 6 karakter olmalı.");
    if (password !== password2) return setHata("Şifreler eşleşmiyor.");

    setYukleniyor(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        data: {
          role: "ogretmen", ad, telefon, school_id: schoolId,
          class_id: dershaneMi ? "" : classId, brans,
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
      <form onSubmit={kayitOl} className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
        <div className="rounded-xl px-3 py-2 text-[12px] font-semibold" style={{ background: MINT_BG, color: MINT }}>
          Bilgileriniz tamam ✓ — şimdi şifrenizi belirleyin.
        </div>
        <label className="flex flex-col gap-1"><Etiket>Şifre</Etiket>
          <Girdi type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1"><Etiket>Şifre (tekrar)</Etiket>
          <Girdi type="password" required minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </label>
        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <div className="flex gap-2">
          <button type="button" onClick={() => setAdim(1)} className="sgec-btn shrink-0 w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BG0, border: `1px solid ${BORDER_STRONG}` }}>
            <ChevronLeft size={16} color={TEXT_MUTED} />
          </button>
          <button type="submit" disabled={yukleniyor} className="sgec-btn flex-1 text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
            {yukleniyor ? "Kaydediliyor..." : "Kayıt ol"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={ileri} className="rounded-3xl p-6 flex flex-col gap-3" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <label className="flex flex-col gap-1"><Etiket>Ad Soyad</Etiket><Girdi required value={ad} onChange={(e) => setAd(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>E-posta</Etiket><Girdi type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Telefon</Etiket><Girdi type="tel" required value={telefon} onChange={(e) => setTelefon(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Okulu veya Dershanesi</Etiket>
        <Secim required value={schoolId} onChange={(e) => { setSchoolId(e.target.value); setClassId(""); }}>
          <option value="">Seçiniz</option>
          {schools.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
        </Secim>
      </label>
      {!dershaneMi && schoolId && (
        <label className="flex flex-col gap-1"><Etiket>Sınıf</Etiket>
          <Secim required value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Seçiniz</option>
            {sinifOptions.map((c) => <option key={c.id} value={c.id}>{c.seviye}-{c.sube}</option>)}
          </Secim>
        </label>
      )}
      <label className="flex flex-col gap-1"><Etiket>Branş</Etiket>
        <Secim required value={brans} onChange={(e) => setBrans(e.target.value)}>
          {BRANS_LISTESI.map((b) => <option key={b} value={b}>{b}</option>)}
        </Secim>
      </label>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" className="sgec-btn text-sm font-bold py-2.5 rounded-xl" style={{ background: MINT, color: MINT_ON }}>Devam et</button>
    </form>
  );
}

// ============ VELİ ============
function VeliKayit({ router, supabase }: { router: ReturnType<typeof useRouter>; supabase: ReturnType<typeof createClient> }) {
  const [mod, setMod] = useState<"talep" | "tamamla">("talep");

  return (
    <div className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <div className="flex gap-1 p-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}>
        <button type="button" onClick={() => setMod("talep")}
          className="sgec-btn flex-1 text-[11px] font-bold py-1.5 rounded-full"
          style={{ background: mod === "talep" ? MINT : "transparent", color: mod === "talep" ? MINT_ON : TEXT_MUTED }}>
          Kod talep et
        </button>
        <button type="button" onClick={() => setMod("tamamla")}
          className="sgec-btn flex-1 text-[11px] font-bold py-1.5 rounded-full"
          style={{ background: mod === "tamamla" ? MINT : "transparent", color: mod === "tamamla" ? MINT_ON : TEXT_MUTED }}>
          Kodum var, tamamla
        </button>
      </div>
      {mod === "talep" ? <VeliTalepForm supabase={supabase} /> : <VeliTamamlaForm router={router} supabase={supabase} />}
    </div>
  );
}

function VeliTalepForm({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [ad, setAd] = useState("");
  const [telefon, setTelefon] = useState("");
  const [okulNo, setOkulNo] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);

    const { data: student, error: bulmaHatasi } = await supabase
      .from("students").select("id").eq("okul_no", okulNo.trim()).single();

    if (bulmaHatasi || !student) {
      setYukleniyor(false);
      return setHata("Bu okul numarasıyla kayıtlı bir öğrenci bulunamadı.");
    }

    const { error } = await supabase.from("veli_link_requests").insert({
      student_id: student.id, veli_ad: ad, veli_telefon: telefon,
    });
    setYukleniyor(false);
    if (error) return setHata(error.message);
    setGonderildi(true);
  }

  if (gonderildi) {
    return (
      <p style={{ color: TEXT_MUTED }} className="text-sm leading-relaxed">
        Talebiniz alındı. <strong style={{ color: TEXT }}>Öğrencinin sınıf öğretmeninden veya dershaneden kodu almanız</strong> gerekiyor — talebiniz onların paneline düştü. Kodu aldıktan sonra yukarıdan <strong style={{ color: MINT }}>&quot;Kodum var, tamamla&quot;</strong>ya geçin.
      </p>
    );
  }

  return (
    <form onSubmit={gonder} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1"><Etiket>Ad Soyad</Etiket><Girdi required value={ad} onChange={(e) => setAd(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Telefon</Etiket><Girdi type="tel" required value={telefon} onChange={(e) => setTelefon(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Öğrenci Okul No</Etiket><Girdi required value={okulNo} onChange={(e) => setOkulNo(e.target.value)} /></label>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" disabled={yukleniyor} className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {yukleniyor ? "Gönderiliyor..." : "Kod talep et"}
      </button>
    </form>
  );
}

function VeliTamamlaForm({ router }: { router: ReturnType<typeof useRouter>; supabase: ReturnType<typeof createClient> }) {
  const [okulNo, setOkulNo] = useState("");
  const [kod, setKod] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function tamamla(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);
    const res = await fetch("/api/veli/tamamla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ okul_no: okulNo.trim(), kod: kod.trim() }),
    });
    const body = await res.json();
    setYukleniyor(false);
    if (!res.ok) return setHata(body.error ?? "Bir hata oluştu.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={tamamla} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1"><Etiket>Öğrenci Okul No</Etiket><Girdi required value={okulNo} onChange={(e) => setOkulNo(e.target.value)} /></label>
      <label className="flex flex-col gap-1"><Etiket>Kod</Etiket><Girdi required value={kod} onChange={(e) => setKod(e.target.value)} /></label>
      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
      <button type="submit" disabled={yukleniyor} className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
        {yukleniyor ? "Tamamlanıyor..." : "Kaydı tamamla"}
      </button>
    </form>
  );
}

function KayitTamamMesaji({ email }: { email: string }) {
  return (
    <div className="text-center rounded-3xl p-6" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
      <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-lg font-bold mb-2">E-postanızı kontrol edin</h2>
      <p style={{ color: TEXT_MUTED }} className="text-sm">Hesabınızı doğrulamak için {email} adresine bir bağlantı gönderdik.</p>
      <Link href="/login" style={{ color: MINT }} className="text-sm font-semibold mt-4 inline-block">Girişe dön</Link>
    </div>
  );
}
