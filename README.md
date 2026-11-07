# House Rules — Private Poker Club

An invite-only PWA for one private household poker table. It combines a dealer cockpit, append-only home-game accounting, and nonredeemable practice games. It never holds or transfers money, charges rake, verifies payments, or converts practice chips into value.

## What is implemented

- Premium responsive dealer/player cockpit with functional table, join, buy-in, rebuy, checkpoint, cash-out, ledger, settings, audit, and practice-room controls.
- Invite-only Supabase magic-link authentication (`shouldCreateUser: false`) and a protected `/club` route.
- PostgreSQL migration with explicit household-club scoping, owner/dealer/player roles, RLS, audit logs, rotating-token storage, realtime publications, and immutable ledger/game history.
- Integer mill-cent ledger with isolated `IRL_REAL_VALUE`, `PRACTICE_CHIPS`, and `FRACTIONAL_REMAINDER` namespaces; corrections are equal-and-opposite entries.
- Versioned, idempotent server command RPC and event stream foundation for authoritative play.
- Tested side-pot construction, odd-chip splitting, Blackjack scoring, Speed move validation, and commit/reveal deterministic shuffling.
- Interactive local practice experiences for Hold’em, Blackjack, and Speed at `/demo`.

## Integration status

The UI and domain foundation are implemented. Applying the Supabase migration, creating the first Auth user, adding the owner seed, enabling production rate limits, connecting realtime UI subscriptions, and deploying to Vercel require authenticated provider access. Online practice multiplayer currently has the authoritative command/event foundation and interactive local rounds; complete networked turn orchestration is a follow-on phase.

## Local setup

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Required environment variables:

- `SUPABASE_URL`: project URL.
- `SUPABASE_PUBLISHABLE_KEY`: browser-safe Supabase publishable key; never use a service-role key here.
- `APP_ORIGIN`: exact application origin, such as `http://localhost:3000` locally or the canonical HTTPS origin in production.

The public `/demo` route is always visibly marked as simulated and cannot write to the ledger.

Do not commit `.env.local`, database passwords, service-role keys, or session tokens.

## Supabase bootstrap

1. Create or select the Supabase project.
2. Apply [`supabase/migrations/202611060001_private_club.sql`](supabase/migrations/202611060001_private_club.sql).
3. In Supabase Authentication, create the household owner user. Public account creation stays disabled.
4. Copy [`supabase/seed.example.sql`](supabase/seed.example.sql), replace the placeholder with that Auth user UUID, and run the copy once.
5. Set the Auth redirect URL to `${APP_ORIGIN}/auth/callback` and verify email delivery.
6. Test each RLS role with separate accounts before inviting real players.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm audit --omit=dev
```

The browser suite covers desktop Chromium and mobile WebKit. The database migration should additionally be tested with Supabase CLI/pgTAP once a local Docker-capable Supabase runtime is available.

## Deployment boundary

- Deploy with Vercel production mode, never `next dev`.
- Store environment variables in Vercel, not in the repository.
- Add provider-level rate limits for sign-in, `/api/ledger`, and `/api/game/command`.
- Keep the site private while validating RLS, redirect URLs, CSP, and cookie behavior.
- This software is not legal advice. The designed boundary is an adults-only, no-rake private household game in which physical settlement remains entirely outside the app.

See [`Poker App-threat-model.md`](Poker%20App-threat-model.md) and [`security_best_practices_report.md`](security_best_practices_report.md) before production use.
