import Link from "next/link";
import { requestMagicLink } from "./actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignInPage({ searchParams }: Props) {
  const query = await searchParams;
  const sent = query.sent === "1";
  const error = typeof query.error === "string" ? query.error : undefined;
  const errorMessage = error === "not-invited"
    ? "This email has not been provisioned yet. The host must add it under Supabase → Poker App → Authentication → Users before a magic link can be sent."
    : error === "not-a-member"
      ? "Your sign-in worked, but this account is not attached to the private club yet. Ask the host to finish your membership setup."
      : "That sign-in link is invalid or the authentication service is not configured yet. Try again or ask the host to check the setup.";
  return (
    <main className="auth-shell">
      <Link href="/" className="brand"><span className="brand-mark">HR</span><span>HOUSE RULES</span></Link>
      <section className="auth-card">
        <span className="kicker">MEMBERS ONLY</span>
        <h1>Welcome back<br/>to the table.</h1>
        <p>Use the email address your host invited. We’ll send a short-lived sign-in link—no password to remember.</p>
        {sent ? <div className="notice success" role="status">Check your inbox. Your private link is on its way.</div> : null}
        {error ? <div className="notice error" role="alert">{errorMessage}</div> : null}
        <form action={requestMagicLink} className="auth-form">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
          <button className="button button-primary" type="submit">Send private link <span aria-hidden>→</span></button>
        </form>
        <div className="auth-divider"><span>PRIVATE HOUSE TABLE</span></div>
        <p className="auth-footnote">Only invited members can enter. Your host approves every player and every seat.</p>
      </section>
    </main>
  );
}
