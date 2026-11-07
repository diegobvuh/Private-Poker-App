# Security best-practices review

## Executive summary

No critical or high-confidence exploitable code findings remain in the current implementation. The code uses current patched Next.js, strict runtime validation, server-side authorization, RLS, immutable records, nonce CSP, safe error responses, and no dangerous HTML/eval/storage patterns. Three production-readiness items remain: apply and test the database policies, add distributed rate limiting, and complete authoritative reducers for networked practice play.

## High severity

No confirmed high-severity findings in repository code.

## Medium severity

### SEC-001 — Database security controls are written but not provider-verified

- Location: `supabase/migrations/202611060001_private_club.sql:315`
- Evidence: RLS is enabled and policies are defined in the migration, but no authenticated Supabase project or local database was available to apply and exercise them.
- Impact: a SQL syntax, grant, or policy error could block legitimate use or expose club data after deployment.
- Fix: apply the migration to a nonproduction Supabase project and run an anonymous/player/dealer/owner policy matrix before real use.
- Mitigation: keep the site private and do not add real game records until the matrix passes.
- False-positive note: the policies are structurally present; this finding concerns provider verification, not an identified bypass.

### SEC-002 — Distributed abuse controls depend on deployment configuration

- Location: `app/api/ledger/route.ts:8`, `app/api/game/command/route.ts:8`
- Evidence: both routes enforce authentication, exact origin, content type, and payload sizes, but the repository has no durable cross-instance throttle.
- Impact: an authenticated or internet attacker could create request volume that degrades availability or increases provider cost.
- Fix: configure Vercel edge rate limits and Supabase Auth rate limits for sign-in, ledger, and command endpoints; key authenticated limits by user ID and public limits by IP.
- Mitigation: database uniqueness/version checks make replays idempotent and reduce integrity impact.
- False-positive note: Vercel or Supabase account-level limits may already exist but are not visible in this repository.

### SEC-003 — Networked practice games need game-specific authoritative reducers

- Location: `supabase/migrations/202611060001_private_club.sql:265`, `app/api/game/command/route.ts:7`
- Evidence: the database atomically versions commands and events, but `PLAYER_ACTION` payloads are not yet evaluated by Hold’em, Blackjack, or Speed rule reducers before acceptance.
- Impact: if networked multiplayer were enabled now, a malicious member could submit a syntactically valid but illegal move.
- Fix: add deterministic server reducers per game, validate turn ownership and hidden state, and emit only audience-appropriate event payloads before enabling online multiplayer.
- Mitigation: current practice interactions are local, clearly nonredeemable simulations; the connected multiplayer UI is not enabled.
- False-positive note: this is not exploitable in the current local practice demo.

## Low severity

### SEC-004 — Development dependency audit reports moderate advisories

- Location: `package-lock.json:1`
- Evidence: `npm audit --omit=dev` reports zero vulnerabilities; the full audit reports moderate findings in lint tooling transitive dependencies.
- Impact: limited to developer/CI processing of repository-controlled source patterns.
- Fix: update `eslint-config-next` and transitive TypeScript ESLint packages when patched compatible releases are available.
- Mitigation: CI uses a lockfile and untrusted users cannot supply lint inputs.

## Verified controls

- Production dependencies: `npm audit --omit=dev` reports zero known vulnerabilities.
- Auth/session: server-side `getUser`, invite-only OTP, cookie refresh in Proxy, and database role checks.
- Input: Zod strict schemas, explicit size bounds, integer money representation, and sanitized error responses.
- Browser: nonce-based CSP, clickjacking/nosniff/referrer/permissions headers, React escaping, and no raw HTML or eval sinks.
- Data: RLS on exposed tables, fixed `search_path` for security-definer functions, no service-role key, immutable financial/game/audit records.
- Supply chain: exact dependency versions, lockfile, read-only CI permissions, lint/type/unit/build gates.
