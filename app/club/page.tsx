import { redirect } from "next/navigation";
import { ClubCockpit } from "@/components/club-cockpit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ClubPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: membership } = await supabase
    .from("club_memberships")
    .select("role, display_name")
    .eq("user_id", user.id)
    .eq("status", "ACTIVE")
    .single();
  if (!membership) redirect("/sign-in?error=not-a-member");
  return <ClubCockpit mode="connected" currentUser={membership.display_name ?? user.email ?? "Member"} role={membership.role} />;
}
