import { BG1, BORDER } from "@/lib/theme";

export default function DashboardYukleniyor() {
  return (
    <div className="min-h-screen w-full animate-pulse">
      <div className="h-24" style={{ background: BG1, borderBottom: `2px solid ${BORDER}` }} />
      <div className="mx-auto flex min-h-[calc(100dvh-6rem)] w-full max-w-[100rem] items-stretch gap-6 px-4 py-7 sm:px-6">
        <div className="hidden w-64 rounded-3xl lg:block xl:w-72" style={{ background: BG1, border: `2px solid ${BORDER}` }} />
        <div className="min-h-[calc(100dvh-10rem)] flex-1 rounded-3xl" style={{ background: BG1, border: `2px solid ${BORDER}` }} />
      </div>
    </div>
  );
}
