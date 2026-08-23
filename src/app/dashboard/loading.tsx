import { BG1, BORDER } from "@/lib/theme";

export default function DashboardYukleniyor() {
  return (
    <div className="min-h-screen w-full animate-pulse">
      <div className="h-24" style={{ background: BG1, borderBottom: `2px solid ${BORDER}` }} />
      <div className="mx-auto flex w-full max-w-[90rem] gap-6 px-4 py-7 sm:px-6">
        <div className="hidden h-80 w-60 rounded-3xl lg:block" style={{ background: BG1, border: `2px solid ${BORDER}` }} />
        <div className="h-96 flex-1 rounded-3xl" style={{ background: BG1, border: `2px solid ${BORDER}` }} />
      </div>
    </div>
  );
}
