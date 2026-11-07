import Link from "next/link";
import { registerWithPassword, requestPasswordReset, signInWithPassword } from "./actions";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function SignInPage({ searchParams }: Props) {
  const query = await searchParams;
  const mode = query.mode === "register" ? "register" : query.mode === "forgot" ? "forgot" : "signin";
  const registered = query.registered === "1";
  const resetSent = query.resetSent === "1";
  const error = typeof query.error === "string" ? query.error : undefined;
  const errorMessage = error === "invalid-credentials"
    ? "The email or password is incorrect. If this account used the old magic-link system, set a password below."
    : error === "invalid-registration"
      ? "Enter a name, a valid email, and a password of at least 10 characters."
      : error === "membership-request"
        ? "Your account is signed in, but its approval request could not be created. Ask the host to check the setup."
        : "That request could not be completed. Check the information and try again.";

  return (
    <main className="auth-shell">
      <Link href="/" className="brand"><span className="brand-mark">HR</span><span>HOUSE RULES</span></Link>
      <section className="auth-card">
        <span className="kicker">PRIVATE CLUB ACCESS</span>
        <h1>{mode === "register" ? <>Create your<br/>player account.</> : mode === "forgot" ? <>Set a new<br/>password.</> : <>Welcome back<br/>to the table.</>}</h1>
        <p>{mode === "register" ? "Create an email-and-password account. It stays locked until the master host approves it." : mode === "forgot" ? "We’ll email a secure password-reset link. This link only changes your password—it is not a sign-in method." : "Sign in with your email and password. No login magic links."}</p>

        {registered ? <div className="notice success" role="status">Account created. Confirm your email, then return here to sign in. Host approval is still required.</div> : null}
        {resetSent ? <div className="notice success" role="status">If that account exists, a password setup email is on its way.</div> : null}
        {error ? <div className="notice error" role="alert">{errorMessage}</div> : null}

        {mode === "signin" ? <form action={signInWithPassword} className="auth-form">
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required minLength={10} maxLength={72} />
          <button className="button button-primary" type="submit">Sign in <span aria-hidden>→</span></button>
        </form> : null}

        {mode === "register" ? <form action={registerWithPassword} className="auth-form">
          <label htmlFor="name">Display name</label>
          <input id="name" name="name" type="text" autoComplete="name" placeholder="Your name" required minLength={1} maxLength={48} />
          <label htmlFor="register-email">Email address</label>
          <input id="register-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
          <label htmlFor="new-password">Password</label>
          <input id="new-password" name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72} aria-describedby="password-hint" />
          <small id="password-hint" className="field-hint">Use at least 10 characters. A password manager is recommended.</small>
          <button className="button button-primary" type="submit">Create account <span aria-hidden>→</span></button>
        </form> : null}

        {mode === "forgot" ? <form action={requestPasswordReset} className="auth-form">
          <label htmlFor="reset-email">Email address</label>
          <input id="reset-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={254} />
          <button className="button button-primary" type="submit">Send password setup <span aria-hidden>→</span></button>
        </form> : null}

        <nav className="auth-switcher" aria-label="Account options">
          {mode !== "signin" ? <Link href="/sign-in">Sign in</Link> : <Link href="/sign-in?mode=forgot">Forgot or need a password?</Link>}
          {mode !== "register" ? <Link href="/sign-in?mode=register">Create account</Link> : null}
        </nav>
        <div className="auth-divider"><span>PRIVATE HOUSE TABLE</span></div>
        <p className="auth-footnote">Creating an account never grants club access. The owner approves every member.</p>
      </section>
    </main>
  );
}
