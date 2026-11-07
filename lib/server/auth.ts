import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ClubRole } from "@/lib/domain/types";

export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("UNAUTHENTICATED");
  return { supabase, user };
}

export async function requireClubRole(allowed: readonly ClubRole[]) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("club_memberships")
    .select("club_id, role, status")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();
  if (error || !data || !allowed.includes(data.role as ClubRole)) throw new Error("FORBIDDEN");
  return { supabase, user, membership: data };
}
