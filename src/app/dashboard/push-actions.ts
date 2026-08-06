"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function pushAbonelikKaydet(sub: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("push_subscriptions").upsert(
    { profile_id: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    { onConflict: "endpoint" },
  );
  if (error) return { error: error.message };
  return { error: null };
}

export async function pushAbonelikSil(endpoint: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("push_subscriptions").delete().eq("profile_id", user.id).eq("endpoint", endpoint);
  if (error) return { error: error.message };
  return { error: null };
}
