"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { GraduationCap, BookOpen, Users, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { School, UserRole } from "@/lib/types";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { YukleniyorOverlay } from "@/components/YukleniyorOverlay";

const rolSecenekleri: { id: UserRole; ad: string; icon: typeof BookOpen }[] = [
  { id: "ogrenci", ad: "Öğrenci", icon: BookOpen },
  { id: "ogretmen", ad: "Öğretmen", icon: GraduationCap },
  { id: "veli", ad: "Veli", icon: Users },
  { id: "mudur", ad: "Müdür", icon: Building2 },
];

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [role, setRole] = useState<UserRole>("ogrenci");

  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [okulNo, setOkulNo] = useState("");
  const [kod, setKod] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    supabase.from("schools").select("*").eq("tur", "okul").then(({ data }) => setSchools((data as School[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function girisYap(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);

    // okul_no sadece okul içinde benzersiz olduğu için öğrenci/veli
    // girişinde okul seçimi zorunlu (bkz. migration 0023).
    if ((role === "ogrenci" || role === "veli") && !schoolId) {
      return setHata("Okul seçin.");
    }
    setYukleniyor(true);

    let girisEmail = email;
    let girisSifre = password;

    if (role === "ogrenci") {
      const { data: cozulenEmail } = await supabase.rpc("resolve_ogrenci_email", { p_school_id: schoolId, p_okul_no: okulNo.trim() });
      if (!cozulenEmail) {
        setYukleniyor(false);
        return setHata("Bu okul numarasıyla kayıtlı bir öğrenci bulunamadı.");
      }
      girisEmail = cozulenEmail;
    } else if (role === "veli") {
      const { data: cozulenEmail } = await supabase.rpc("resolve_veli_login", { p_school_id: schoolId, p_okul_no: okulNo.trim(), p_kod: kod.trim() });
      if (!cozulenEmail) {
        setYukleniyor(false);
        return setHata("Okul no veya kod hatalı.");
      }
      girisEmail = cozulenEmail;
      girisSifre = password;
    } else if (role === "mudur") {
      const { data: cozulenEmail } = await supabase.rpc("resolve_mudur_email", { p_okul_kodu: okulNo.trim() });
      if (!cozulenEmail) {
        setYukleniyor(false);
        return setHata("Okul kodu hatalı.");
      }
      girisEmail = cozulenEmail;
    }

    void girisEmail;
    const response = await fetch("/api/giris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, schoolId, okulNo: okulNo.trim(), kod: kod.trim(), email: email.trim(), password: girisSifre }),
    });
    const sonuc = await response.json() as { error?: string };
    const error = response.ok ? null : { message: sonuc.error ?? "Giriş yapılamadı." };
    setYukleniyor(false);
    if (error) {
      setHata(error.message === "Invalid login credentials" ? "Bilgiler hatalı." : error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-7">
          <div className="w-16 h-16 rounded-full overflow-hidden mb-3" style={{ boxShadow: "0 4px 16px rgba(124,232,176,0.28)" }}>
            <Image src="/logo.png" alt="SF EduCoach" width={64} height={64} className="w-full h-full object-cover" priority />
          </div>
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold">SF EduCoach</h1>
          <p style={{ color: TEXT_MUTED }} className="text-xs mt-1 italic">Her zaman bir adım ötesini düşün</p>
        </div>

        <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
          {rolSecenekleri.map((r) => {
            const Icon = r.icon;
            const aktif = role === r.id;
            return (
              <button key={r.id} type="button" onClick={() => { setRole(r.id); setHata(null); }}
                className="sfec-btn flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[12px] font-bold"
                style={{ background: aktif ? MINT : "transparent", color: aktif ? MINT_ON : TEXT_MUTED }}>
                <Icon size={13} /> {r.ad}
              </button>
            );
          })}
        </div>

        <form onSubmit={girisYap} className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          {role === "ogretmen" ? (
            <>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">E-posta</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Şifre</span>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
            </>
          ) : (
            <>
              {(role === "ogrenci" || role === "veli") && (
                <label className="flex flex-col gap-1">
                  <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Okul</span>
                  <select required value={schoolId} onChange={(e) => setSchoolId(e.target.value)}
                    className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
                    <option value="">Seçiniz</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{role === "mudur" ? "Okul Kodu" : "Okul No"}</span>
                <input required value={okulNo} onChange={(e) => setOkulNo(e.target.value)}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{role === "veli" ? "Kod" : "Şifre"}</span>
                <input type={role === "veli" ? "text" : "password"} required
                  value={role === "veli" ? kod : password}
                  maxLength={role === "veli" ? 12 : undefined}
                  autoCapitalize={role === "veli" ? "characters" : undefined}
                  onChange={(e) => (role === "veli" ? setKod(e.target.value.toUpperCase()) : setPassword(e.target.value))}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              {role === "veli" && (
                <label className="flex flex-col gap-1">
                  <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Şifre</span>
                  <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                    className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
                </label>
              )}
            </>
          )}

          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}

          <button type="submit" disabled={yukleniyor}
            className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}>
            {yukleniyor ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>

        <p style={{ color: TEXT_MUTED }} className="text-xs text-center mt-5">
          Hesabınız yok mu?{" "}
          <Link href="/signup" style={{ color: MINT }} className="font-semibold">Kayıt olun</Link>
        </p>
      </div>
      <YukleniyorOverlay visible={yukleniyor} mesaj="Giriş yapılıyor..." />
    </div>
  );
}
