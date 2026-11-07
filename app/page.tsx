import Link from "next/link";
import { connection } from "next/server";

export default async function HomePage() {
  await connection();
  return (
    <main className="landing">
      <nav className="landing-nav">
        <Link href="/" className="brand"><span className="brand-mark">HR</span><span>HOUSE RULES</span></Link>
        <Link href="/sign-in" className="nav-link">Member sign in</Link>
      </nav>
      <section className="hero">
        <div className="eyebrow"><span className="pulse-dot" /> PRIVATE TABLE · INVITE ONLY</div>
        <h1>Your table.<br/><em>Fully alive.</em></h1>
        <p className="hero-copy">A live companion for one private home game—dealer controls, transparent accounting, and practice tables between game nights.</p>
        <div className="hero-actions">
          <Link href="/sign-in" className="button button-primary">Enter the club <span aria-hidden>→</span></Link>
          <Link href="/demo" className="button button-ghost">Explore the cockpit</Link>
        </div>
        <p className="legal-line">Adults only · No rake · The house never holds funds</p>
      </section>
      <section className="feature-rail" aria-label="Core features">
        <article><span className="feature-index">01</span><h2>Live table</h2><p>See stacks, pots, and table movement without turning the game into screen time.</p></article>
        <article><span className="feature-index">02</span><h2>Clean books</h2><p>Immutable entries keep buy-ins, rebuys, and cash-out reconciliation honest.</p></article>
        <article><span className="feature-index">03</span><h2>Dealer control</h2><p>A calm command center for seats, joins, checkpoints, and corrections.</p></article>
      </section>
    </main>
  );
}
