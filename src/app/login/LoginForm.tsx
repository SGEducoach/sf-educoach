"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, GraduationCap, BookOpen, Users, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { KurumTuru, School, UserRole } from "@/lib/types";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";
import { KURUM_ETIKET } from "@/lib/kurum";
import { YukleniyorOverlay } from "@/components/YukleniyorOverlay";
import { SeFuMarkaAdi, SeFuSlogan } from "@/components/SeFuWordmark";
import { KurumTuruSecici } from "@/components/KurumTuruSecici";

const rolSecenekleri: { id: UserRole; ad: string; icon: typeof BookOpen }[] = [
  { id: "ogrenci", ad: "Öğrenci", icon: BookOpen },
  { id: "ogretmen", ad: "Öğretmen", icon: GraduationCap },
  { id: "veli", ad: "Veli", icon: Users },
  { id: "mudur", ad: "Müdür", icon: Building2 },
];

// Kullanıcı isteği (27.08.2026): karşılama sayfasında (/) seçilen rol
// buraya ?rol= ile taşınıyor — devamlılık hissi kaybolmasın diye.
function baslangicRolu(searchParams: URLSearchParams): UserRole {
  const q = searchParams.get("rol");
  return q === "ogrenci" || q === "ogretmen" || q === "veli" || q === "mudur" ? q : "ogrenci";
}

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [kurumTuru, setKurumTuru] = useState<KurumTuru>("okul");
  const [role, setRole] = useState<UserRole>(() => baslangicRolu(searchParams));

  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [okulNo, setOkulNo] = useState("");
  const [kod, setKod] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  // Şifremi unuttum — SADECE öğretmen/müdür (gerçek e-postayla giriş yapan
  // roller). Öğrenci ve veli (dershane'de sentetik/teslim edilemez e-posta
  // kullanıyor, okulda da self-service reset kasıtlı olarak yok) yerine
  // yetkili moderatöre yönlendiriliyor — bkz. yonetici/actions.ts:130-132
  // yorumundaki tasarım kararı.
  const [sifirlamaModu, setSifirlamaModu] = useState(false);
  const [sifirlamaYukleniyor, setSifirlamaYukleniyor] = useState(false);
  const [sifirlamaSonuc, setSifirlamaSonuc] = useState<{ tur: "basari" | "hata"; mesaj: string } | null>(null);

  useEffect(() => {
    supabase.from("schools").select("*").eq("tur", kurumTuru).then(({ data }) => setSchools((data as School[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kurumTuru]);

  // Müdür normalde "Okul Kodu" ile giriş yapıyor (gerçek e-postasını hiç
  // yazmıyor) — sıfırlama bağlantısı yine de gerçek bir e-postaya gitmeli.
  // Bu yüzden burada de resolve_mudur_email RPC'si (login akışıyla AYNI)
  // kullanılıp okul kodundan gerçek e-posta çözülüyor; öğretmen zaten
  // e-postasını doğrudan yazıyor, ek bir çözümlemeye gerek yok.
  async function sifirlamaGonder(e: React.FormEvent) {
    e.preventDefault();
    setSifirlamaSonuc(null);
    setSifirlamaYukleniyor(true);

    let hedefEmail = email.trim();
    if (role === "mudur") {
      const { data: cozulenEmail } = await supabase.rpc("resolve_mudur_email", { p_okul_kodu: okulNo.trim() });
      if (!cozulenEmail) {
        setSifirlamaYukleniyor(false);
        setSifirlamaSonuc({ tur: "hata", mesaj: `${KURUM_ETIKET[kurumTuru].kod} hatalı.` });
        return;
      }
      hedefEmail = cozulenEmail as string;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(hedefEmail, {
      redirectTo: `${window.location.origin}/sifre-sifirla`,
    });
    setSifirlamaYukleniyor(false);
    if (error) {
      setSifirlamaSonuc({ tur: "hata", mesaj: "Sıfırlama bağlantısı gönderilemedi. Lütfen tekrar deneyin." });
      return;
    }
    setSifirlamaSonuc({ tur: "basari", mesaj: "Kayıtlı e-posta adresinize bir şifre sıfırlama bağlantısı gönderildi." });
  }

  async function girisYap(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);

    // okul_no sadece okul içinde benzersiz olduğu için öğrenci/veli
    // girişinde okul seçimi zorunlu (bkz. migration 0023).
    if ((role === "ogrenci" || role === "veli") && !schoolId) {
      return setHata(`${KURUM_ETIKET[kurumTuru].secim} seçin.`);
    }
    setYukleniyor(true);

    let girisEmail = email;
    let girisSifre = password;

    if (role === "ogrenci") {
      const { data: cozulenEmail } = await supabase.rpc("resolve_ogrenci_email", { p_school_id: schoolId, p_okul_no: okulNo.trim() });
      if (!cozulenEmail) {
        setYukleniyor(false);
        return setHata("Bu numarayla kayıtlı bir öğrenci bulunamadı.");
      }
      girisEmail = cozulenEmail;
    } else if (role === "veli") {
      const { data: cozulenEmail } = await supabase.rpc("resolve_veli_login", { p_school_id: schoolId, p_okul_no: okulNo.trim(), p_kod: kod.trim() });
      if (!cozulenEmail) {
        setYukleniyor(false);
        return setHata("Numara veya kod hatalı.");
      }
      girisEmail = cozulenEmail;
      girisSifre = password;
    } else if (role === "mudur") {
      const { data: cozulenEmail } = await supabase.rpc("resolve_mudur_email", { p_okul_kodu: okulNo.trim() });
      if (!cozulenEmail) {
        setYukleniyor(false);
        return setHata(`${KURUM_ETIKET[kurumTuru].kod} hatalı.`);
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
        {/* Kullanıcı isteği (27.08.2026): "Giriş yap ekranına ana sayfaya
            dön butonu eklenecek". */}
        <Link href="/" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: TEXT_MUTED }}>
          <ArrowLeft size={14} /> Ana sayfaya dön
        </Link>
        <div className="flex flex-col items-center mb-7">
          {/* Kullanıcı isteği (26.08.2026): "İsminde login yazan sadece giriş
              ekranı için kullanılacak" — bkz. dokumanlar/logo/. */}
          <Image src="/logo-login.png" alt="SeFu Koç" width={1153} height={965} className="sfec-brand-logo h-28 w-auto max-w-full object-contain mb-2" priority />
          {/* Kullanıcı isteği (26.08.2026): "giriş logosunun altındaki sefu
              koç yazısını da kaldır" — logonun kendisi zaten "//koç" alt
              yazılı, marka adı metni tekrar oluyordu. sr-only ile sayfanın
              H1'i (erişilebilirlik) korunuyor, sadece görsel olarak kaldırıldı. */}
          <SeFuMarkaAdi as="h1" className="sr-only" />
          <p className="text-xs mt-1 italic"><SeFuSlogan /></p>
        </div>

        <KurumTuruSecici deger={kurumTuru} onChange={(t) => { setKurumTuru(t); setSchoolId(""); setHata(null); }} />

        <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
          {rolSecenekleri.map((r) => {
            const Icon = r.icon;
            const aktif = role === r.id;
            return (
              <button key={r.id} type="button" onClick={() => { setRole(r.id); setHata(null); setSifirlamaModu(false); setSifirlamaSonuc(null); }}
                className="sfec-btn flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full text-[12px] font-bold"
                style={{ background: aktif ? MINT : "transparent", color: aktif ? MINT_ON : TEXT_MUTED }}>
                <Icon size={13} /> {r.ad}
              </button>
            );
          })}
        </div>

        {sifirlamaModu ? (
          <form onSubmit={sifirlamaGonder} className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
            <p style={{ color: TEXT_MUTED }} className="text-xs">
              {role === "mudur"
                ? `${KURUM_ETIKET[kurumTuru].kod}'nuzu girin, kayıtlı e-posta adresinize bir sıfırlama bağlantısı gönderelim.`
                : "E-posta adresinizi girin, size bir şifre sıfırlama bağlantısı gönderelim."}
            </p>
            {role === "mudur" ? (
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{KURUM_ETIKET[kurumTuru].kod}</span>
                <input required value={okulNo} onChange={(e) => setOkulNo(e.target.value)}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
            ) : (
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">E-posta</span>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
            )}

            {sifirlamaSonuc && (
              <div style={{ color: sifirlamaSonuc.tur === "basari" ? MINT : BLUSH }} className="text-xs font-semibold">{sifirlamaSonuc.mesaj}</div>
            )}

            <button type="submit" disabled={sifirlamaYukleniyor}
              className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
              style={{ background: MINT, color: MINT_ON }}>
              {sifirlamaYukleniyor ? "Gönderiliyor..." : "Sıfırlama bağlantısı gönder"}
            </button>
            <button type="button" onClick={() => { setSifirlamaModu(false); setSifirlamaSonuc(null); }}
              className="text-xs font-semibold text-center" style={{ color: TEXT_MUTED }}>
              Girişe dön
            </button>
          </form>
        ) : (
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
                  <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{KURUM_ETIKET[kurumTuru].secim}</span>
                  <select required value={schoolId} onChange={(e) => setSchoolId(e.target.value)}
                    className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
                    <option value="">Seçiniz</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
                  </select>
                </label>
              )}
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{role === "mudur" ? KURUM_ETIKET[kurumTuru].kod : KURUM_ETIKET[kurumTuru].no}</span>
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

          {(role === "ogretmen" || role === "mudur") && (
            <button type="button" onClick={() => { setSifirlamaModu(true); setHata(null); setSifirlamaSonuc(null); }}
              className="text-xs font-semibold self-end -mt-2" style={{ color: MINT }}>
              Şifremi unuttum
            </button>
          )}
          {(role === "ogrenci" || role === "veli") && (
            <p style={{ color: TEXT_MUTED }} className="text-[11px] -mt-2">
              Şifrenizi unuttuysanız kurumunuzun yetkili moderatörüyle iletişime geçin.
            </p>
          )}

          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}

          <button type="submit" disabled={yukleniyor}
            className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}>
            {yukleniyor ? "Giriş yapılıyor..." : "Giriş yap"}
          </button>
        </form>
        )}

        <p style={{ color: TEXT_MUTED }} className="text-xs text-center mt-5">
          Hesabınız yok mu?{" "}
          <Link href="/signup" style={{ color: MINT }} className="font-semibold">Kayıt olun</Link>
        </p>
        <p style={{ color: TEXT_MUTED }} className="text-[10px] text-center mt-6 opacity-70">
          © 2026 SeFu Koç. Tüm hakları saklıdır.
        </p>
      </div>
      <YukleniyorOverlay visible={yukleniyor} mesaj="Giriş yapılıyor..." />
    </div>
  );
}
