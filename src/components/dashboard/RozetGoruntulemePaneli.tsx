import { Medal, Users } from "lucide-react";
import { Rozetlerim } from "@/components/dashboard/Rozetlerim";
import { RozetOgrenciSecici } from "@/components/dashboard/RozetOgrenciSecici";
import type { RozetGorunumu } from "@/lib/rozet-gorunumu";
import { BG1, BG1_ALT, BORDER, BORDER_STRONG, MINT, TEXT, TEXT_MUTED } from "@/lib/theme";

export function RozetGoruntulemePaneli({ gorunum, action, kapsam, gizliAlanlar = {}, seciciGoster = true }: {
  gorunum: RozetGorunumu;
  action: string;
  kapsam: string;
  gizliAlanlar?: Record<string, string>;
  seciciGoster?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5">
      <section className="sfec-fade rounded-3xl p-5 sm:p-6" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
                <Medal size={20} color={MINT} aria-hidden="true" />
              </span>
              <div>
                <h1 className="text-xl font-extrabold" style={{ color: TEXT, fontFamily: "var(--font-baloo)" }}>Öğrenci rozetleri</h1>
                <p className="text-xs" style={{ color: TEXT_MUTED }}>{kapsam}</p>
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: TEXT, background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
            <Users size={13} color={MINT} /> {seciciGoster ? `${gorunum.ogrenciler.length} öğrenci` : (gorunum.seciliOgrenci?.ad ?? "Bağlı öğrenci yok")}
          </span>
        </div>

        {seciciGoster && gorunum.ogrenciler.length > 0 ? (
          <RozetOgrenciSecici key={`${action}-${gorunum.kurumAdi}-${gorunum.seciliSinifId}-${gorunum.seciliOgrenci?.id}`} action={action} ogrenciler={gorunum.ogrenciler} siniflar={gorunum.siniflar}
            seciliSinifId={gorunum.seciliSinifId} seciliOgrenciId={gorunum.seciliOgrenci?.id} gizliAlanlar={gizliAlanlar} />
        ) : gorunum.ogrenciler.length === 0 ? (
          <p className="mt-5 rounded-2xl p-4 text-sm" style={{ color: TEXT_MUTED, background: BG1_ALT, border: `1px solid ${BORDER_STRONG}` }}>
            Bu kapsamda görüntülenecek öğrenci bulunamadı.
          </p>
        ) : null}
      </section>

      {gorunum.seciliOgrenci && (
        <Rozetlerim
          durum={gorunum.durum}
          oyunSayaclari={gorunum.oyunSayaclari}
          dogrulukSeviyesi={gorunum.dogrulukSeviyesi}
          sinifSeviyesi={gorunum.seciliOgrenci.sinifSeviyesi}
          baslik={`${gorunum.seciliOgrenci.ad} · Rozetler`}
          altBaslik={`${gorunum.seciliOgrenci.sinifAdi} · #${gorunum.seciliOgrenci.okulNo} · Disiplin rozetleri ve SRO skill ağaçları`}
        />
      )}
    </div>
  );
}
