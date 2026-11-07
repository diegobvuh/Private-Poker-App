import { describe, expect, it } from "vitest";
import { assertNamespaceTransfer, balancesByAccount, correctionFor, settleMilliCents } from "@/lib/domain/ledger";
import type { LedgerEntry } from "@/lib/domain/types";

const entry: LedgerEntry = { id: "1", accountId: "a", kind: "IRL_REAL_VALUE", amount: 12_345n, eventType: "BUY_IN", correlationId: "c", createdAt: "2026-01-01" };

describe("append-only ledger", () => {
  it("sums each namespace without floats", () => {
    const balances = balancesByAccount([entry, { ...entry, id: "2", kind: "PRACTICE_CHIPS", amount: 500n }]);
    expect(balances.get("a")).toEqual({ IRL_REAL_VALUE: 12_345n, PRACTICE_CHIPS: 500n, FRACTIONAL_REMAINDER: 0n });
  });
  it("settles whole cents and carries fractional remainder", () => {
    expect(settleMilliCents(12_345n)).toEqual({ wholeCents: 12n, remainderMilliCents: 345n });
  });
  it("creates an equal and opposite correction", () => {
    expect(correctionFor(entry, "2", "fix")).toMatchObject({ amount: -12_345n, eventType: "CORRECTION", reversesEntryId: "1" });
  });
  it("rejects conversion between real value and practice chips", () => {
    expect(() => assertNamespaceTransfer("IRL_REAL_VALUE", "PRACTICE_CHIPS")).toThrow("cannot be converted");
  });
});
