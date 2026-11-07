export type SpeedCard = { rank: number; suit: "clubs" | "diamonds" | "hearts" | "spades" };

export function canPlaySpeed(card: SpeedCard, pile: SpeedCard): boolean {
  const distance = Math.abs(card.rank - pile.rank);
  return distance === 1 || distance === 12;
}
