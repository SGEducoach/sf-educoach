"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, BookOpen, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/types";
import {
  BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH,
} from "@/lib/theme";

const rolSecenekleri: { id: UserRole; ad: string; icon: typeof BookOpen }[] = [
  { id: "ogrenci", ad: "Öğrenci", icon: BookOpen },
  { id: "veli", ad: "Veli", icon: Users },
  { id: "koc", ad: "Koç", icon: GraduationCap },
];

export default function SignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [role, setRole] = useState<UserRole>("ogrenci");
  const [ad, setAd] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hedefPuan, setHedefPuan] = useState("");
  const [hedefBolum, setHedefBolum] = useState("");
  const [sinif, setSinif] = useState("");
  const [ogrenciNo, setOgrenciNo] = useState("");
  const [baglantiKodu, setBaglantiKodu] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function kayitOl(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setYukleniyor(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          ad,
          role,
          ...(role === "ogrenci" && {
            hedef_puan: hedefPuan ? Number(hedefPuan) : 0,
            hedef_bolum: hedefBolum,
            sinif,
          }),
          ...(role === "veli" && {
            ogrenci_no: ogrenciNo.trim(),
            baglanti_kodu: baglantiKodu.trim(),
          }),
        },
      },
    });

    setYukleniyor(false);
    if (error) {
      setHata(error.message);
      return;
    }

    // Proje ayarında e-posta doğrulaması kapalıysa oturum hemen açılır.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    setBasarili(true);
  }

  if (basarili) {
    return (
      <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4">
        <div className="max-w-sm text-center rounded-3xl p-6" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-lg font-bold mb-2">E-postanızı kontrol edin</h1>
          <p style={{ color: TEXT_MUTED }} className="text-sm">
            Hesabınızı doğrulamak için {email} adresine bir bağlantı gönderdik.
          </p>
          <Link href="/login" style={{ color: MINT }} className="text-sm font-semibold mt-4 inline-block">Girişe dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: BG0 }} className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div style={{ background: MINT, boxShadow: "0 4px 16px rgba(124,232,176,0.28)" }} className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3">
            <GraduationCap size={22} color={MINT_ON} />
          </div>
          <h1 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-xl font-bold">Hesap oluşturun</h1>
        </div>

        <form onSubmit={kayitOl} className="rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `1px solid ${BORDER}` }}>
          <div className="flex gap-1 p-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${BORDER}` }}>
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

          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ad Soyad</span>
            <input required value={ad} onChange={(e) => setAd(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          </label>

          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">E-posta</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          </label>

          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Şifre</span>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          </label>

          {role === "ogrenci" && (
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl" style={{ background: MINT_BG }}>
              <label className="flex flex-col gap-1 col-span-2">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Hedef bölüm</span>
                <input value={hedefBolum} onChange={(e) => setHedefBolum(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Hedef puan</span>
                <input type="number" value={hedefPuan} onChange={(e) => setHedefPuan(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Sınıf</span>
                <input placeholder="11-C" value={sinif} onChange={(e) => setSinif(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
            </div>
          )}

          {role === "veli" && (
            <div className="grid grid-cols-2 gap-2.5 p-3 rounded-2xl" style={{ background: MINT_BG }}>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Öğrenci numarası</span>
                <input required placeholder="SG00001" value={ogrenciNo} onChange={(e) => setOgrenciNo(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Bağlantı kodu</span>
                <input required placeholder="8F3A2C" value={baglantiKodu} onChange={(e) => setBaglantiKodu(e.target.value)}
                  className="text-sm px-2.5 py-1.5 rounded-xl outline-none" style={{ border: `1px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
              </label>
              <p style={{ color: TEXT_MUTED }} className="text-[11px] col-span-2 leading-snug">
                Bu bilgileri çocuğunuz kendi hesabından (dashboard'unun üst kısmından) görüp size iletebilir.
              </p>
            </div>
          )}

          {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}

          <button type="submit" disabled={yukleniyor}
            className="sgec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
            style={{ background: MINT, color: MINT_ON }}>
            {yukleniyor ? "Kaydediliyor..." : "Kayıt ol"}
          </button>
        </form>

        <p style={{ color: TEXT_MUTED }} className="text-xs text-center mt-5">
          Zaten hesabınız var mı?{" "}
          <Link href="/login" style={{ color: MINT }} className="font-semibold">Giriş yapın</Link>
        </p>
      </div>
    </div>
  );
}
