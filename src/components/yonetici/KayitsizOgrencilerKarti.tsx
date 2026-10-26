import { kayitsizOgrencileriGetir } from "@/app/yonetici/on-kayitli-eslesme-actions";
import { BG1, BORDER, TEXT, TEXT_MUTED } from "@/lib/theme";
import { ON_KAYIT_BEKLEME_GUNU, ON_KAYIT_ETIKETI } from "@/lib/on-kayitli";

// Admin ve moderatör için: okul listesinde olup henüz üye olmamış TÜM öğrenciler.
// Rehber/öğretmen ekranlarındaki sınıf-seviye kapsamı burada uygulanmaz (kullanıcı
// isteği 26.10.2026). Admin her kurumu, moderatör kendi kurumunu görür.
export async function KayitsizOgrencilerKarti({ kurumId }: { kurumId?: string }) {
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
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-left">
              <thead>
                <tr style={{ color: TEXT_MUTED }} className="text-[11px] uppercase tracking-wider">
                  <th className="pb-1.5 pr-3 font-semibold">Öğrenci</th>
                  <th className="pb-1.5 pr-3 font-semibold">Sınıf</th>
                  <th className="pb-1.5 font-semibold">Yüklü deneme</th>
                </tr>
              </thead>
              <tbody>
                {okul.ogrenciler.map((k) => (
                  <tr key={k.listeId} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td className="py-1.5 pr-3 text-sm font-semibold" style={{ color: TEXT }}>
                      {k.ad}{k.okulNo && <span className="ml-1.5 text-[11px] font-normal" style={{ color: TEXT_MUTED }}>#{k.okulNo}</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-xs" style={{ color: TEXT_MUTED }}>{k.sinifAdi}</td>
                    <td className="py-1.5 text-xs" style={{ color: TEXT }}>
                      {k.denemeSayisi > 0
                        ? <>{k.sonNet} net <span style={{ color: TEXT_MUTED }}>· {k.denemeSayisi} deneme · son {k.sonDenemeTarihi}</span></>
                        : <span style={{ color: TEXT_MUTED }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </section>
  );
}
