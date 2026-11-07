import Link from "next/link";
import { requestMagicLink } from "./actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignInPage({ searchParams }: Props) {
  const query = await searchParams;
  const sent = query.sent === "1";
  const error = typeof query.error === "string" ? query.error : undefined;
  const errorMessage = error === "membership-request"
    ? "Your sign-in worked, but we could not create your approval request. Try the link again or ask the host to check the setup."
    : error === "sign-in-failed"
      ? "We could not send a sign-in link. Wait a moment, check the email address, and try again."
      : "That sign-in link is invalid or has expired. Request a fresh link below.";
  return (
    <main className="auth-shell">
      <Link href="/" className="brand"><span className="brand-mark">HR</span><span>HOUSE RULES</span></Link>
      <section className="auth-card">
        <span className="kicker">PRIVATE CLUB ACCESS</span>
        <h1>Request your<br/>seat at the table.</h1>
        <p>Enter any email to create an account or sign back in. New accounts stay locked until the master host approves them.</p>
        {sent ? <div className="notice success" role="status">Check your inbox. Your private link is on its way.</div> : null}
        {error ? <div className="notice error" role="alert">{errorMessage}</div> : null}
        <form action={requestMagicLink} className="auth-form">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
          <button className="button button-primary" type="submit">Send private link <span aria-hidden>→</span></button>
        </form>
        <div className="auth-divider"><span>PRIVATE HOUSE TABLE</span></div>
        <p className="auth-footnote">Creating an account does not grant club access. The host approves every member and every seat.</p>
      </section>
    </main>
  );
}
