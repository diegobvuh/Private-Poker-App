"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PasswordRecoveryForm({ supabaseUrl, publishableKey }: { supabaseUrl: string; publishableKey: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const supabase = createBrowserClient(supabaseUrl, publishableKey, {
      auth: { flowType: "implicit", detectSessionInUrl: true, persistSession: true },
    });
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetError) {
      setError(resetError.status === 429 ? "Too many emails were requested. Wait a minute and try again." : "The password-reset email could not be sent.");
      setBusy(false);
      return;
    }
    router.replace("/sign-in?resetSent=1");
  }

  return <form onSubmit={submit} className="auth-form">
    <label htmlFor="reset-email">Email address</label>
    <input id="reset-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
    {error ? <div className="notice error" role="alert">{error}</div> : null}
    <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Sending…" : "Send password setup"} <span aria-hidden>→</span></button>
  </form>;
}
