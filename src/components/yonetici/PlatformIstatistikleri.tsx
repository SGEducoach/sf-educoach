"use client";

import { useEffect, useState } from "react";
import { Activity, Building2, GraduationCap, Users, UserCheck, Flame, Radio } from "lucide-react";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED, BLUSH, LILAC } from "@/lib/theme";
import { platformIstatistikleriGetir, type PlatformIstatistikleri as Istatistik } from "@/app/yonetici/actions";

// Admin'in tek bakışta platformun genel durumunu görmesi için — "tek kontrol
// noktası" ilkesinin bir parçası.
export function PlatformIstatistikleri() {
  const [ist, setIst] = useState<Istatistik | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    platformIstatistikleriGetir().then((res) => {
      if (res.error) return setHata(res.error);
      setIst(res.istatistik);
    });
  }, []);

  return (
    <div className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(199,182,255,0.15)" }}>
          <Activity size={13} color={LILAC} />
        </div>
        <span style={{ color: TEXT, fontFamily: "var(--font-baloo)" }} className="text-[15px] font-bold">Platform durumu</span>
      </div>

      {hata && <div style={{ color: BLUSH }} className="text-xs font-semibold mb-2">{hata}</div>}

      {!ist ? (
        <p style={{ color: TEXT_MUTED }} className="text-sm py-3 text-center">Yükleniyor...</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          <Kart ikon={Radio} deger={ist.suAnAktifKullanici} etiket="Şu an aktif kullanıcı" renk={ist.suAnAktifKullanici > 0 ? MINT : undefined} />
          <Kart ikon={Building2} deger={`${ist.aktifOkulSayisi}/${ist.okulSayisi}`} etiket="Okul (aktif/toplam)" />
          <Kart ikon={GraduationCap} deger={ist.ogrenciSayisi} etiket="Öğrenci" />
          <Kart ikon={Users} deger={ist.ogretmenSayisi} etiket="Öğretmen" />
          <Kart ikon={Users} deger={ist.veliSayisi} etiket="Veli" />
          <Kart ikon={Flame} deger={ist.son7GunAktifOgrenci} etiket="Son 7 gün aktif öğrenci" renk={MINT} />
          <Kart ikon={UserCheck} deger={ist.bekleyenVeliTalebi} etiket="Bekleyen veli talebi" renk={ist.bekleyenVeliTalebi > 0 ? "#FFC46B" : undefined} />
        </div>
      )}
    </div>
  );
}

function Kart({ ikon: Ikon, deger, etiket, renk }: { ikon: typeof Building2; deger: string | number; etiket: string; renk?: string }) {
  return (
    <div className="rounded-2xl p-3 flex flex-col gap-1.5" style={{ background: BG1_ALT, border: `2px solid ${BORDER_STRONG}` }}>
      <Ikon size={14} color={renk ?? TEXT_MUTED} />
      <span style={{ color: renk ?? TEXT }} className="text-lg font-bold">{deger}</span>
      <span style={{ color: TEXT_MUTED }} className="text-[10px] font-semibold leading-tight">{etiket}</span>
    </div>
  );
}
