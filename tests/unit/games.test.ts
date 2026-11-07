import { describe, expect, it } from "vitest";
import { blackjackValue, dealerShouldHit } from "@/lib/domain/blackjack";
import { canPlaySpeed } from "@/lib/domain/speed";

describe("practice games", () => {
  it("handles soft blackjack hands", () => {
    expect(blackjackValue(["A", "6"])).toEqual({ total: 17, soft: true, bust: false });
    expect(blackjackValue(["A", "6", "10"])).toEqual({ total: 17, soft: false, bust: false });
    expect(dealerShouldHit(["10", "6"])).toBe(true);
  });
  it("allows adjacent and wrapping speed cards", () => {
    expect(canPlaySpeed({ rank: 13, suit: "spades" }, { rank: 1, suit: "hearts" })).toBe(true);
    expect(canPlaySpeed({ rank: 8, suit: "spades" }, { rank: 6, suit: "hearts" })).toBe(false);
  });
});
