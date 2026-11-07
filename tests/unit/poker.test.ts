import { describe, expect, it } from "vitest";
import { buildSidePots, splitPot, totalPot } from "@/lib/domain/poker";

describe("poker pots", () => {
  it("builds main and side pots for unequal all-ins", () => {
    const pots = buildSidePots([{ playerId: "a", amount: 50n }, { playerId: "b", amount: 100n }, { playerId: "c", amount: 200n }]);
    expect(pots).toEqual([
      { amount: 150n, eligiblePlayerIds: ["a", "b", "c"] },
      { amount: 100n, eligiblePlayerIds: ["b", "c"] },
      { amount: 100n, eligiblePlayerIds: ["c"] },
    ]);
    expect(totalPot(pots)).toBe(350n);
  });
  it("removes folded players from eligibility but keeps their chips", () => {
    expect(buildSidePots([{ playerId: "a", amount: 50n, folded: true }, { playerId: "b", amount: 50n }])[0]).toEqual({ amount: 100n, eligiblePlayerIds: ["b"] });
  });
  it("awards odd chips deterministically", () => {
    expect([...splitPot(5n, ["a", "b"]).entries()]).toEqual([["a", 3n], ["b", 2n]]);
  });
});
