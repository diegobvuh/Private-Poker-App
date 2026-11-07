"use client";

import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export function ResetPasswordForm({ supabaseUrl, publishableKey }: { supabaseUrl: string; publishableKey: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(supabaseUrl, publishableKey, {
    auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true },
  }), [publishableKey, supabaseUrl]);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let resolved = false;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) { resolved = true; setReady(true); }
    });
    supabase.auth.getSession().then(({ data }) => { if (active && data.session) { resolved = true; setReady(true); } });
    const timeout = window.setTimeout(() => {
      if (active && !resolved) setError((current) => current ?? "This recovery link is invalid or expired. Request a new one.");
    }, 3500);
    return () => { active = false; window.clearTimeout(timeout); listener.subscription.unsubscribe(); };
  }, [supabase]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmation = String(formData.get("confirmation") ?? "");
    if (password.length < 10 || password !== confirmation) {
      setError("Passwords must match and contain at least 10 characters.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("The password could not be updated. Request a new recovery email and try again.");
      setBusy(false);
      return;
    }
    router.replace("/club");
    router.refresh();
  }

  return <main className="auth-shell">
    <Link href="/" className="brand"><span className="brand-mark">HR</span><span>HOUSE RULES</span></Link>
    <section className="auth-card">
      <span className="kicker">SECURE ACCOUNT SETUP</span>
      <h1>Choose your<br/>new password.</h1>
      <p>{ready ? "Choose the password you’ll use for every future sign-in." : "Verifying your one-time recovery link…"}</p>
      {error ? <div className="notice error" role="alert">{error}</div> : null}
      {ready ? <form onSubmit={submit} className="auth-form">
        <label htmlFor="password">New password</label>
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} />
        <label htmlFor="confirmation">Confirm new password</label>
        <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" required minLength={10} maxLength={72} />
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Saving…" : "Save password"} <span aria-hidden>→</span></button>
      </form> : null}
      {!ready && error ? <Link className="button button-ghost full" href="/sign-in?mode=forgot">Request a new email</Link> : null}
    </section>
  </main>;
}
