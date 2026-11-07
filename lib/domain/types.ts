export type ClubRole = "owner" | "dealer" | "player";
export type BalanceKind = "IRL_REAL_VALUE" | "PRACTICE_CHIPS" | "FRACTIONAL_REMAINDER";
export type GameKind = "IRL_HOLDEM_FAST" | "IRL_HOLDEM_LIVE" | "PRACTICE_HOLDEM" | "PRACTICE_BLACKJACK" | "PRACTICE_SPEED";
export type GameStatus = "LOBBY" | "ACTIVE" | "PAUSED" | "SETTLED" | "CANCELLED";

export type LedgerEntry = {
  id: string;
  accountId: string;
  kind: BalanceKind;
  amount: bigint;
  eventType: "BUY_IN" | "REBUY" | "CASH_OUT" | "PRACTICE_GRANT" | "PRACTICE_WAGER" | "PRACTICE_WIN" | "CORRECTION" | "FRACTIONAL_CARRY";
  correlationId: string;
  reversesEntryId?: string;
  createdAt: string;
};

export type Seat = {
  id: string;
  name: string;
  initials: string;
  seat: number;
  stackMilliCents: bigint;
  status: "ACTIVE" | "AWAY" | "CASHED_OUT";
};

export type GameCommand = {
  commandId: string;
  gameId: string;
  expectedVersion: number;
  type: string;
  payload: Record<string, unknown>;
};
