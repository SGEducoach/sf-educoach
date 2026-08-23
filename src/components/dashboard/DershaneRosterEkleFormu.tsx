"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { dershaneOgrenciKesinKaydet } from "@/app/dashboard/actions";
import {
  kullaniciAdiGecerliMi,
  kullaniciAdiSanitize,
  telefonSanitize,
  KULLANICI_ADI_IPUCU,
  TELEFON_IPUCU,
} from "@/lib/validators";
import { AYT_ALAN_ETIKET } from "@/lib/types";
import type { AytAlan } from "@/lib/types";
import { BG0, BG1, BORDER, BORDER_STRONG, MINT, MINT_BG, MINT_ON, TEXT, TEXT_MUTED, BLUSH } from "@/lib/theme";

// DERSHANE MODU — müdür/moderatörün tekli kesin öğrenci kaydı. Bu form
// doğrudan aktif hesap açar; yanındaki Excel yükleme formu ön kayıt üretir.
export function DershaneRosterEkleFormu({ siniflar }: { siniflar: { id: string; seviye: string; sube: string }[] }) {
  const [ad, setAd] = useState("");
  const [kullaniciAdi, setKullaniciAdi] = useState("");
  const [telefon, setTelefon] = useState("");
  const [veliTelefon, setVeliTelefon] = useState("");
  const [classId, setClassId] = useState(siniflar[0]?.id ?? "");
  const [aytAlan, setAytAlan] = useState<AytAlan>("SAY");
  const [hata, setHata] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<{
    ad: string;
    kullaniciAdi: string;
    sifre: string;
    aktarilanDenemeSayisi: number;
  } | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  // Müdür yeni bir şube ekleyip sayfa yenilendiğinde (router.refresh) bu
  // bileşen yeniden mount OLMUYOR — sadece siniflar prop'u değişiyor. classId
  // ilk mount'ta boşsa (henüz şube yoktu) sonradan gelen ilk şubeyi otomatik
  // seçmesi için render sırasında düzeltiyoruz (bkz. bu oturumdaki
  // Gorevlerim.tsx'teki aynı desen).
  const [sonSiniflarUzunlugu, setSonSiniflarUzunlugu] = useState(siniflar.length);
  if (siniflar.length !== sonSiniflarUzunlugu) {
    setSonSiniflarUzunlugu(siniflar.length);
    if (!classId && siniflar[0]) setClassId(siniflar[0].id);
  }

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata(null);
    setSonuc(null);
    if (!kullaniciAdiGecerliMi(kullaniciAdi)) return setHata(`Kullanıcı adı geçersiz. ${KULLANICI_ADI_IPUCU}`);
    setYukleniyor(true);
    const yanit = await dershaneOgrenciKesinKaydet({
      ad,
      kullaniciAdi,
      telefon,
      veliTelefon: veliTelefon || undefined,
      classId,
      aytAlan,
    });
    setYukleniyor(false);
    if (yanit.error || !yanit.sifre || !yanit.kullaniciAdi) return setHata(yanit.error ?? "Öğrenci hesabı oluşturulamadı.");
    setSonuc({
      ad,
      kullaniciAdi: yanit.kullaniciAdi,
      sifre: yanit.sifre,
      aktarilanDenemeSayisi: yanit.aktarilanDenemeSayisi,
    });
    setAd(""); setKullaniciAdi(""); setTelefon(""); setVeliTelefon("");
  }

  return (
    <div className="sfec-fade rounded-3xl p-6 flex flex-col gap-4" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl" style={{ background: MINT_BG }}>
          <UserPlus size={18} color={MINT} />
        </div>
        <div>
          <h2 style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-base font-bold">Öğrenci kesin kaydı</h2>
          <p style={{ color: TEXT_MUTED }} className="text-xs">
            Aktif öğrenci hesabı hemen oluşturulur; kullanıcı adı ve geçici şifreyi öğrenciye iletin.
          </p>
        </div>
      </div>

      {sonuc && (
        <div className="rounded-2xl p-4 text-xs" style={{ background: MINT_BG, border: `2px solid ${BORDER_STRONG}`, color: TEXT }}>
          <div className="mb-2 font-bold" style={{ color: MINT }}>{sonuc.ad} kesin kayıtla eklendi.</div>
          <div>Kullanıcı adı: <strong className="font-mono">{sonuc.kullaniciAdi}</strong></div>
          <div>Geçici şifre: <strong className="font-mono text-sm">{sonuc.sifre}</strong></div>
          {sonuc.aktarilanDenemeSayisi > 0 && (
            <div className="mt-2 font-semibold" style={{ color: MINT }}>
              {sonuc.aktarilanDenemeSayisi} bekleyen PDF denemesi hesaba aktarıldı.
            </div>
          )}
          <div className="mt-2" style={{ color: TEXT_MUTED }}>Bu bilgiler güvenlik nedeniyle yalnızca şimdi gösterilir.</div>
        </div>
      )}

      <form onSubmit={ekle} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Ad Soyad</span>
          <input required value={ad} onChange={(e) => setAd(e.target.value)}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Kullanıcı Adı</span>
          <input required value={kullaniciAdi} autoComplete="off" placeholder="En az 6 karakter"
            onChange={(e) => setKullaniciAdi(kullaniciAdiSanitize(e.target.value))}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          <span style={{ color: TEXT_MUTED }} className="text-[10px]">{KULLANICI_ADI_IPUCU}</span>
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Telefon</span>
          <input required value={telefon} inputMode="numeric" placeholder="5xxxxxxxxx"
            onChange={(e) => setTelefon(telefonSanitize(e.target.value))}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
          <span style={{ color: TEXT_MUTED }} className="text-[10px]">{TELEFON_IPUCU}</span>
        </label>
        <label className="flex flex-col gap-1">
          <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Veli Telefonu (opsiyonel)</span>
          <input value={veliTelefon} inputMode="numeric" placeholder="5xxxxxxxxx"
            onChange={(e) => setVeliTelefon(telefonSanitize(e.target.value))}
            className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Sınıf</span>
            <select required value={classId} onChange={(e) => setClassId(e.target.value)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              {siniflar.length === 0 && <option value="">Önce bir şube oluşturun</option>}
              {siniflar.map((s) => <option key={s.id} value={s.id}>{s.seviye}-{s.sube}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold uppercase tracking-wide">Alan</span>
            <select required value={aytAlan} onChange={(e) => setAytAlan(e.target.value as AytAlan)}
              className="text-sm px-3 py-2 rounded-xl outline-none" style={{ border: `2px solid ${BORDER_STRONG}`, background: BG0, color: TEXT }}>
              {(Object.entries(AYT_ALAN_ETIKET) as [AytAlan, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
        </div>

        {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold">{hata}</div>}
        <button type="submit" disabled={yukleniyor || !classId}
          className="sfec-btn text-sm font-bold py-2.5 rounded-xl disabled:opacity-60"
          style={{ background: MINT, color: MINT_ON }}>
          {yukleniyor ? "Kesin kayıt oluşturuluyor..." : "Kesin kaydı oluştur"}
        </button>
      </form>
    </div>
  );
}
