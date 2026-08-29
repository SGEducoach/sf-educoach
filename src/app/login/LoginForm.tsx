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
import { sifreGecerliMi, SIFRE_IPUCU } from "@/lib/validators";
import { VELI_KVKK_METNI } from "@/lib/veli-kvkk";
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

  // Veli akışı sadeleştirmesi (29.08.2026 kullanıcı isteği): "kodum var /
  // kodum yok" ayrımı kalktı — veli tek bir "Kod veya Şifre" alanına
  // yazıyor (state: kod, isim korunuyor). Bu değer önce TAZE bir kod mu
  // diye denenir (/api/veli/dogrula); tutarsa buradaki 2. aşama (şifre
  // belirle) açılır — mevcut hesap tamamlama akışının (eskiden /signup'ta)
  // birebir aynısı, sadece buraya taşındı. Tutmazsa normal şifre olarak
  // /api/giris'e gider.
  const [veliAsama, setVeliAsama] = useState<"giris" | "sifreBelirle">("giris");
  const [veliOnaylananAd, setVeliOnaylananAd] = useState<string | null>(null);
  const [veliSifreYeni, setVeliSifreYeni] = useState("");
  const [veliSifreYeniTekrar, setVeliSifreYeniTekrar] = useState("");
  const [veliKvkkOnay, setVeliKvkkOnay] = useState(false);

  function veliDurumunuSifirla() {
    setVeliAsama("giris"); setVeliOnaylananAd(null);
    setVeliSifreYeni(""); setVeliSifreYeniTekrar(""); setVeliKvkkOnay(false);
  }

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

    if (role === "veli") return veliGirisYap();

    setYukleniyor(true);

    let girisEmail = email;
    const girisSifre = password;

    if (role === "ogrenci") {
      const { data: cozulenEmail } = await supabase.rpc("resolve_ogrenci_email", { p_school_id: schoolId, p_okul_no: okulNo.trim() });
      if (!cozulenEmail) {
        setYukleniyor(false);
        return setHata("Bu numarayla kayıtlı bir öğrenci bulunamadı.");
      }
      girisEmail = cozulenEmail;
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
      body: JSON.stringify({ role, schoolId, okulNo: okulNo.trim(), email: email.trim(), password: girisSifre }),
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

  // Veli girişi (29.08.2026 sadeleştirmesi): tek alan (kod state'i) —
  // önce TAZE bir kod mu diye denenir, tutarsa 2. aşama (şifre belirle)
  // açılır; tutmazsa aynı değer normal ŞİFRE olarak /api/giris'e gider.
  async function veliGirisYap() {
    setYukleniyor(true);
    const dogrulaRes = await fetch("/api/veli/dogrula", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school_id: schoolId, okul_no: okulNo.trim(), kod: kod.trim() }),
    });
    if (dogrulaRes.ok) {
      const gövde = await dogrulaRes.json() as { veliAd: string };
      setYukleniyor(false);
      setVeliOnaylananAd(gövde.veliAd);
      setVeliAsama("sifreBelirle");
      return;
    }

    const response = await fetch("/api/giris", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "veli", schoolId, okulNo: okulNo.trim(), password: kod.trim() }),
    });
    const sonuc = await response.json() as { error?: string };
    setYukleniyor(false);
    if (!response.ok) return setHata(sonuc.error ?? "Öğrenci no veya kod/şifre hatalı.");
    router.push("/dashboard");
    router.refresh();
  }

  async function veliSifreOlustur(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    if (!veliKvkkOnay) return setHata("Devam etmek için KVKK aydınlatma metnini onaylamanız gerekiyor.");
    if (!sifreGecerliMi(veliSifreYeni)) return setHata(SIFRE_IPUCU);
    if (veliSifreYeni !== veliSifreYeniTekrar) return setHata("Şifreler aynı değil.");
    setYukleniyor(true);
    const response = await fetch("/api/veli/tamamla", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ school_id: schoolId, okul_no: okulNo.trim(), kod: kod.trim(), sifre: veliSifreYeni, kvkkOnay: true }),
    });
    const sonuc = await response.json() as { error?: string };
    setYukleniyor(false);
    if (!response.ok) return setHata(sonuc.error ?? "Bir hata oluştu.");
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

        <KurumTuruSecici deger={kurumTuru} onChange={(t) => { setKurumTuru(t); setSchoolId(""); setHata(null); veliDurumunuSifirla(); }} />

        <div className="flex gap-1 p-1 rounded-full mb-4" style={{ background: "rgba(255,255,255,0.06)", border: `2px solid ${BORDER}` }}>
          {rolSecenekleri.map((r) => {
            const Icon = r.icon;
            const aktif = role === r.id;
            return (
              <button key={r.id} type="button" onClick={() => { setRole(r.id); setHata(null); setSifirlamaModu(false); setSifirlamaSonuc(null); veliDurumunuSifirla(); }}
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
        <form onSubmit={role === "veli" && veliAsama === "sifreBelirle" ? veliSifreOlustur : girisYap}
          className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          {role === "veli" && veliAsama === "sifreBelirle" ? (
            <>
              <div className="rounded-xl p-3" style={{ background: BG0, border: `2px solid ${BORDER_STRONG}` }}>
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Bu kod şu kişiye onaylandı</span>
                <p style={{ color: TEXT }} className="text-sm font-bold mt-1">{veliOnaylananAd}</p>
                <p style={{ color: BLUSH }} className="text-[11px] leading-relaxed mt-1.5">
                  Bu siz değilseniz devam ETMEYİN — &quot;Geri&quot; ile dönüp kurumunuzla iletişime geçin.
                </p>
              </div>
              <p style={{ color: TEXT_MUTED }} className="text-xs leading-relaxed">Kod yalnız hesabı eşleştirmek için kullanılacak. Bundan sonraki girişlerinizde burada oluşturacağınız şifreyi kullanacaksınız.</p>

              <div className="flex flex-col gap-1.5">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">KVKK Aydınlatma Metni ve Rıza Beyanı</span>
                <div className="text-[11px] leading-relaxed whitespace-pre-line rounded-xl p-3 max-h-40 overflow-y-auto"
                  style={{ background: BG0, border: `2px solid ${BORDER_STRONG}`, color: TEXT_MUTED }}>
                  {VELI_KVKK_METNI}
                </div>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={veliKvkkOnay} onChange={(e) => setVeliKvkkOnay(e.target.checked)} className="mt-0.5" />
                <span style={{ color: TEXT }} className="text-xs leading-snug">
                  Yukarıdaki metni okudum, velisi/vasisi olduğum öğrencinin kişisel verilerinin işlenmesine <strong>açık rızam ile onay veriyorum.</strong>
                </span>
              </label>

              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Yeni Şifre</span>
                <input type="password" required value={veliSifreYeni} onChange={(e) => setVeliSifreYeni(e.target.value)}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Yeni Şifre Tekrar</span>
                <input type="password" required value={veliSifreYeniTekrar} onChange={(e) => setVeliSifreYeniTekrar(e.target.value)}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              <p style={{ color: TEXT_MUTED }} className="text-[11px] leading-relaxed">{SIFRE_IPUCU}</p>

              {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => { setHata(null); veliDurumunuSifirla(); }} disabled={yukleniyor}
                  className="sfec-btn flex-1 rounded-xl py-2.5 text-sm font-bold" style={{ background: BG0, color: TEXT, border: `2px solid ${BORDER_STRONG}` }}>
                  Geri
                </button>
                <button type="submit" disabled={yukleniyor}
                  className="sfec-btn flex-1 text-sm font-bold py-2.5 rounded-xl disabled:opacity-60" style={{ background: MINT, color: MINT_ON }}>
                  {yukleniyor ? "Tamamlanıyor..." : "Şifreyi oluştur"}
                </button>
              </div>
            </>
          ) : (
          <>
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
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">{role === "veli" ? "Kod veya Şifre" : "Şifre"}</span>
                <input type="password" required
                  value={role === "veli" ? kod : password}
                  onChange={(e) => (role === "veli" ? setKod(e.target.value) : setPassword(e.target.value))}
                  className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
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
          </>
          )}
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
