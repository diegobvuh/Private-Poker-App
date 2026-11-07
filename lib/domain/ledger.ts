import type { BalanceKind, LedgerEntry } from "./types";

export const MILLICENTS_PER_CENT = 1_000n;

export function assertIntegerAmount(amount: bigint): void {
  if (amount === 0n) throw new Error("Ledger entries cannot be zero");
}

export function balancesByAccount(entries: readonly LedgerEntry[]): Map<string, Record<BalanceKind, bigint>> {
  const balances = new Map<string, Record<BalanceKind, bigint>>();
  for (const entry of entries) {
    assertIntegerAmount(entry.amount);
    const current = balances.get(entry.accountId) ?? {
      IRL_REAL_VALUE: 0n,
      PRACTICE_CHIPS: 0n,
      FRACTIONAL_REMAINDER: 0n,
    };
    current[entry.kind] += entry.amount;
    balances.set(entry.accountId, current);
  }
  return balances;
}

export function settleMilliCents(amount: bigint): { wholeCents: bigint; remainderMilliCents: bigint } {
  const wholeCents = amount / MILLICENTS_PER_CENT;
  return { wholeCents, remainderMilliCents: amount - wholeCents * MILLICENTS_PER_CENT };
}

export function correctionFor(entry: LedgerEntry, id: string, reasonCorrelationId: string): LedgerEntry {
  if (entry.reversesEntryId) throw new Error("A correction cannot reverse another correction");
  return {
    ...entry,
    id,
    amount: -entry.amount,
    eventType: "CORRECTION",
    correlationId: reasonCorrelationId,
    reversesEntryId: entry.id,
    createdAt: new Date().toISOString(),
  };
}

export function assertNamespaceTransfer(from: BalanceKind, to: BalanceKind): void {
  if (from !== to) throw new Error("Balance namespaces cannot be converted");
}
