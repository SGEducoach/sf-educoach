"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function veliTalepOnayla(requestId: string) {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("veli_talep_onayla", { p_request_id: requestId });
  if (error) return { error: error.message, kod: null };
  revalidatePath("/dashboard");
  return { error: null, kod: data as string };
}
