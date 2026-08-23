import { BG1, BG1_ALT, BORDER } from "@/lib/theme";

// Bulgu 01 — önceden dashboard/loading.tsx iki düz, tamamen boş kutuydu
// ("bir butona tıklandığında iki boş kutu beliriyor, bozuk gibi duruyor"
// şikayeti). Artık gerçek arayüzün taslağını çiziyor: header'da logo+ikon
// yer tutucuları, sol menüde satır satır bağlantı taslakları, ana alanda
// kart taslakları — kullanıcı "sayfa geliyor" hisseder, "bir şey bozuldu"
// değil. /dashboard, /yonetici ve /moderator üçü de aynı Header +
// DashboardYanMenu kabuğunu kullandığı için tek bir paylaşılan iskelet
// üçünde de kullanılıyor.
export function DashboardIskeleti() {
  return (
    <div className="min-h-screen w-full animate-pulse">
      <div className="flex h-[72px] items-center gap-3 px-4 sm:h-20 sm:px-6" style={{ background: "var(--sfec-nav-bg)", borderBottom: `2px solid ${BORDER}` }}>
        <div className="h-10 w-10 shrink-0 rounded-xl" style={{ background: BG1_ALT }} />
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-28 rounded-full" style={{ background: BG1_ALT }} />
          <div className="h-2 w-20 rounded-full" style={{ background: BG1_ALT }} />
        </div>
        <div className="ml-auto hidden items-center gap-2 sm:flex">
          <div className="h-8 w-8 rounded-full" style={{ background: BG1_ALT }} />
          <div className="h-8 w-8 rounded-full" style={{ background: BG1_ALT }} />
          <div className="h-8 w-8 rounded-full" style={{ background: BG1_ALT }} />
        </div>
      </div>
      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-[100rem] items-stretch gap-6 px-4 py-7 sm:px-6">
        <div className="hidden w-64 shrink-0 flex-col gap-2 rounded-3xl p-4 lg:flex xl:w-72" style={{ background: BG1, border: `2px solid ${BORDER}` }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
              <div className="h-8 w-8 shrink-0 rounded-xl" style={{ background: BG1_ALT }} />
              <div className="h-3 flex-1 rounded-full" style={{ background: BG1_ALT }} />
            </div>
          ))}
        </div>
        <div className="flex min-h-[calc(100dvh-10rem)] flex-1 flex-col gap-4">
          <div className="h-32 rounded-3xl" style={{ background: BG1, border: `2px solid ${BORDER}` }} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="h-28 rounded-3xl" style={{ background: BG1, border: `2px solid ${BORDER}` }} />
            <div className="h-28 rounded-3xl" style={{ background: BG1, border: `2px solid ${BORDER}` }} />
            <div className="h-28 rounded-3xl" style={{ background: BG1, border: `2px solid ${BORDER}` }} />
          </div>
          <div className="flex-1 rounded-3xl" style={{ background: BG1, border: `2px solid ${BORDER}` }} />
        </div>
      </div>
    </div>
  );
}
