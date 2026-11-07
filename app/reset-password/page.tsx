import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { updatePassword } from "./actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?mode=forgot&error=expired-recovery");
  const query = await searchParams;
  const hasError = typeof query.error === "string";
  return <main className="auth-shell">
    <Link href="/" className="brand"><span className="brand-mark">HR</span><span>HOUSE RULES</span></Link>
    <section className="auth-card">
      <span className="kicker">SECURE ACCOUNT SETUP</span>
      <h1>Choose your<br/>new password.</h1>
      <p>Set a password for {user.email}. You’ll use it for every future sign-in.</p>
      {hasError ? <div className="notice error" role="alert">Passwords must match and contain at least 10 characters.</div> : null}
      <form action={updatePassword} className="auth-form">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} />
        <label htmlFor="confirmation">Confirm new password</label>
        <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={10} maxLength={72} />
        <button className="button button-primary" type="submit">Save password <span aria-hidden>→</span></button>
      </form>
    </section>
  </main>;
}
