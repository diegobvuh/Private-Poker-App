export type Contribution = { playerId: string; amount: bigint; folded?: boolean };
export type SidePot = { amount: bigint; eligiblePlayerIds: string[] };

export function buildSidePots(contributions: readonly Contribution[]): SidePot[] {
  if (contributions.some((item) => item.amount < 0n)) throw new Error("Contributions cannot be negative");
  const levels = [...new Set(contributions.filter((item) => item.amount > 0n).map((item) => item.amount.toString()))]
    .map(BigInt)
    .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const pots: SidePot[] = [];
  let previous = 0n;
  for (const level of levels) {
    const participants = contributions.filter((item) => item.amount >= level);
    const amount = (level - previous) * BigInt(participants.length);
    if (amount > 0n) {
      pots.push({ amount, eligiblePlayerIds: participants.filter((item) => !item.folded).map((item) => item.playerId) });
    }
    previous = level;
  }
  return pots;
}

export function totalPot(pots: readonly SidePot[]): bigint {
  return pots.reduce((sum, pot) => sum + pot.amount, 0n);
}

export function splitPot(amount: bigint, winnerIds: readonly string[]): Map<string, bigint> {
  if (winnerIds.length === 0) throw new Error("A pot needs at least one winner");
  const share = amount / BigInt(winnerIds.length);
  let remainder = amount % BigInt(winnerIds.length);
  const result = new Map<string, bigint>();
  for (const winnerId of winnerIds) {
    const oddChip = remainder > 0n ? 1n : 0n;
    result.set(winnerId, share + oddChip);
    remainder -= oddChip;
  }
  return result;
}
