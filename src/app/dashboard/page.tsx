import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/dashboard/Header";
import { StudentPanel, type StudentPanelData } from "@/components/dashboard/StudentPanel";
import { CoachParentShell } from "@/components/dashboard/CoachParentShell";
import type { Exam, Notification, StudySession, UserRole } from "@/lib/types";

async function loadStudentPanelData(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  ad: string,
  hedefPuan: number,
  hedefBolum: string,
  ogrenciNo?: string,
  baglantiKodu?: string,
): Promise<StudentPanelData> {
  const [{ data: exams }, { data: studySessions }, { data: notifications }] = await Promise.all([
    supabase.from("exams").select("*").eq("student_id", studentId).order("tarih", { ascending: true }),
    supabase.from("study_sessions").select("*").eq("student_id", studentId).order("tarih", { ascending: true }),
    supabase.from("notifications").select("*").eq("student_id", studentId).order("tarih", { ascending: false }),
  ]);

  return {
    id: studentId,
    ad,
    hedefPuan,
    hedefBolum,
    ogrenciNo,
    baglantiKodu,
    exams: (exams as Exam[]) ?? [],
    studySessions: (studySessions as StudySession[]) ?? [],
    notifications: (notifications as Notification[]) ?? [],
  };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("ad, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Trigger henüz profil oluşturmamış olabilir (ör. e-posta onayı bekleniyor).
    redirect("/login");
  }

  const role = profile.role as UserRole;

  if (role === "ogrenci") {
    const { data: student } = await supabase
      .from("students")
      .select("hedef_puan, hedef_bolum, ogrenci_no, baglanti_kodu")
      .eq("id", user.id)
      .single();

    const panelData = await loadStudentPanelData(
      supabase, user.id, profile.ad,
      student?.hedef_puan ?? 0, student?.hedef_bolum ?? "",
      student?.ogrenci_no, student?.baglanti_kodu,
    );

    return (
      <div style={{ minHeight: "100vh", width: "100%" }} className="flex-1 flex flex-col">
        <Header ad={profile.ad} role={role} />
        <div className="max-w-6xl mx-auto px-6 py-7 w-full flex-1">
          <StudentPanel student={panelData} canAddExam canAddStudy canAddNotification={false} />
        </div>
      </div>
    );
  }

  // koc veya veli: bağlı öğrencilerin listesini çek
  const linkTable = role === "koc" ? "coach_students" : "parent_students";
  const linkColumn = role === "koc" ? "coach_id" : "parent_id";

  const { data: links } = await supabase
    .from(linkTable)
    .select("student_id, students(hedef_puan, hedef_bolum, profiles!students_id_fkey(ad))")
    .eq(linkColumn, user.id);

  type LinkRow = {
    student_id: string;
    students: { hedef_puan: number; hedef_bolum: string; profiles: { ad: string } | null } | null;
  };

  const rows = (links as unknown as LinkRow[]) ?? [];

  const students = await Promise.all(
    rows
      .filter((r) => r.students)
      .map((r) =>
        loadStudentPanelData(
          supabase, r.student_id, r.students!.profiles?.ad ?? "İsimsiz öğrenci",
          r.students!.hedef_puan, r.students!.hedef_bolum,
        )
      )
  );

  return (
    <div style={{ minHeight: "100vh", width: "100%" }} className="flex-1 flex flex-col">
      <Header ad={profile.ad} role={role} />
      <div className="max-w-6xl mx-auto px-6 py-7 w-full flex-1">
        <CoachParentShell students={students} kind={role === "koc" ? "coach" : "parent"} />
      </div>
    </div>
  );
}
