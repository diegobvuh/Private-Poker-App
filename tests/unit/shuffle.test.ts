import { describe, expect, it } from "vitest";
import { deterministicShuffle, seedCommitment, verifyCommitment } from "@/lib/domain/shuffle";

describe("shuffle receipts", () => {
  it("is deterministic and verifiable", () => {
    const seed = "ab".repeat(32);
    const commitment = seedCommitment(seed);
    expect(verifyCommitment(seed, commitment)).toBe(true);
    expect(deterministicShuffle([1, 2, 3, 4, 5], seed)).toEqual(deterministicShuffle([1, 2, 3, 4, 5], seed));
    expect(deterministicShuffle([1, 2, 3, 4, 5], seed).sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
