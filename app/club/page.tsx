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
          <span className="kicker">REQUEST RECEIVED</span>
          <h1>You’re on the<br/>waiting list.</h1>
          <p>Your account is ready, but Diego—the master host—must approve it before you can enter the club.</p>
          <div className="notice success" role="status">Signed in as {user.email}</div>
          <p className="auth-footnote">You can safely close this page. Return with the same email after the host approves you.</p>
        </section>
      </main>
    );
  }
  return <ClubCockpit mode="connected" currentUser={membership.display_name ?? user.email ?? "Member"} role={membership.role} />;
}
