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
    .select("role, display_name, status")
    .eq("user_id", user.id)
    .single();
  if (!membership) redirect("/sign-in?error=membership-request");
  if (membership.status !== "ACTIVE") {
    return (
      <main className="auth-shell pending-shell">
        <section className="auth-card pending-card">
          <span className="pending-orb" aria-hidden>✓</span>
          <span className="kicker">ACCOUNT UNAVAILABLE</span>
          <h1>Your club access<br/>is paused.</h1>
          <p>This account is suspended. Ask the host if you believe this is a mistake.</p>
          <div className="notice success" role="status">Signed in as {user.email}</div>
          <p className="auth-footnote">New accounts normally enter immediately as players.</p>
        </section>
      </main>
    );
  }
  return <ClubCockpit mode="connected" currentUser={membership.display_name ?? user.email ?? "Member"} role={membership.role} />;
}
