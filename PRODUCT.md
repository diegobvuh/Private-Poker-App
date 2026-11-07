# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Adults in one private household poker group: the owner/dealer runs the game and invited friends or family join from their phones or tablets.

## Product Purpose

Private Poker Club makes an in-person home poker night more interactive by showing live tracked balances, game state, dealer controls, practice games, and auditable settlement records. Success means the table can stay focused on play while everyone sees a clear, trustworthy picture of the game.

## Positioning

It is a live companion for physical home games, not an online cash gambling platform. Physical money stays outside the application; online modes use nonredeemable practice chips.

## Operating Context

One private house and one event location. The dealer hosts the table and approves invited players, records buy-ins/rebuys/cash-outs, and oversees the session from a larger screen. Players use mobile devices at the table.

## Capabilities and Constraints

Invite-only authentication; owner, dealer, and player roles; rotating session QR codes; immutable integer ledger with compensating corrections; in-person Hold'em tracking; server-authoritative practice games; responsive PWA behavior; and a future camera-judge boundary without camera or AI implementation. No rake, organizer profit, payment processing, or redeemable online chips.

## Brand Commitments

The interface should feel like a Wii-era Frutiger Aero game show: optimistic, tactile, glossy, playful, spacious, and premium enough for a hosted table. It should feel like a game interface rather than generic enterprise software.

## Evidence on Hand

The repository contains the working Next.js interface, Supabase schema and server guards, domain game logic, live demo fixtures, and deployed production URL. No production photos, logos, or custom illustrations were supplied; do not invent real-world claims.

## Product Principles

- The dealer is the source of truth for physical-money records.
- Every balance change is visible, explainable, and auditable.
- Practice chips and tracked physical value never share a redeemable namespace.
- The table should understand the current state at a glance.
- Every interactive control must have a clear, useful result.

## Accessibility & Inclusion

Keyboard access, visible focus, strong contrast, readable type, reduced-motion support, touch-sized controls, and responsive layouts are required across desktop, tablet, and mobile.
