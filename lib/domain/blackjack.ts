export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

export function blackjackValue(cards: readonly Rank[]): { total: number; soft: boolean; bust: boolean } {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card === "A") { total += 11; aces += 1; }
    else if (["J", "Q", "K"].includes(card)) total += 10;
    else total += Number(card);
  }
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  return { total, soft: aces > 0, bust: total > 21 };
}

export function dealerShouldHit(cards: readonly Rank[]): boolean {
  const value = blackjackValue(cards);
  return value.total < 17;
}
