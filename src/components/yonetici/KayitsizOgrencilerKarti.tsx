import { kayitsizOgrencileriGetir } from "@/app/yonetici/on-kayitli-eslesme-actions";
import { BG1, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";
import { ON_KAYIT_BEKLEME_GUNU, ON_KAYIT_ETIKETI } from "@/lib/on-kayitli";
import { KayitsizOgrenciTablosu } from "@/components/yonetici/KayitsizOgrenciTablosu";

// Admin ve moderatör için: okul listesinde olup henüz üye olmamış TÜM öğrenciler.
// Rehber/öğretmen ekranlarındaki sınıf-seviye kapsamı burada uygulanmaz (kullanıcı
// isteği 26.10.2026). Admin her kurumu, moderatör kendi kurumunu görür.
// yurtDuzenle (yalnız admin, kullanıcı isteği 28.10.2026): yurtlu kurumda
// hesapsız öğrencinin yurt öğrencisi kararını verir; moderatör yalnız görür.
export async function KayitsizOgrencilerKarti({ kurumId, yurtDuzenle = false }: { kurumId?: string; yurtDuzenle?: boolean }) {
  const { error, okullar } = await kayitsizOgrencileriGetir(kurumId);
  if (error) return <p className="text-xs" style={{ color: TEXT_MUTED }}>{ON_KAYIT_ETIKETI} listesi okunamadı.</p>;
  if (okullar.length === 0) return null;
  const toplam = okullar.reduce((t, o) => t + o.ogrenciler.length, 0);
  return (
    <section className="sfec-fade rounded-3xl p-5" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
      <h2 className="text-[15px] font-bold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>{ON_KAYIT_ETIKETI}</h2>
      <p className="mt-1 text-xs" style={{ color: TEXT_MUTED }}>
        Okul listesinde olup henüz üye olmamış {toplam} öğrenci. Bayrak, aktiflik ve görev hesabı yapılmaz; yalnız yüklenen denemeleri görünür.
        Onlara verilen ödev ve duyurular {ON_KAYIT_BEKLEME_GUNU} gün saklanır, üye olurlarsa eklenir.
      </p>
      {okullar.map((okul) => (
        <details key={okul.schoolId} className="mt-3 rounded-2xl p-3" style={{ border: `2px dashed ${BORDER}` }} open={okullar.length === 1}>
          <summary className="cursor-pointer text-xs font-semibold" style={{ color: TEXT }}>
            {okul.okulAdi} ({okul.ogrenciler.length} öğrenci) · {okul.ogrenciler.filter((k) => k.denemeSayisi > 0).length} kişinin yüklü denemesi var
            {okul.yurtlu && ` · ${okul.yurtListeIdleri.length} yurt öğrencisi`}
          </summary>
          <KayitsizOgrenciTablosu schoolId={okul.schoolId} ogrenciler={okul.ogrenciler} yurtlu={okul.yurtlu}
            yurtListeIdleri={okul.yurtListeIdleri} yurtDuzenle={yurtDuzenle} />
        </details>
      ))}
    </section>
  );
}
