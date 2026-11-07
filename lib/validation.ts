import { z } from "zod";

export const gameCommandSchema = z.object({
  commandId: z.uuid(),
  gameId: z.uuid(),
  expectedVersion: z.int().min(0).max(1_000_000),
  type: z.enum(["START_GAME", "PAUSE_GAME", "RESUME_GAME", "PLAYER_ACTION", "RECORD_CHECKPOINT", "SETTLE_GAME"]),
  payload: z.record(z.string(), z.unknown()),
}).strict();

export const emailSchema = z.email().max(254).transform((value) => value.trim().toLowerCase());

export const ledgerMutationSchema = z.object({
  accountId: z.uuid(),
  sessionId: z.uuid(),
  kind: z.enum(["IRL_REAL_VALUE", "PRACTICE_CHIPS", "FRACTIONAL_REMAINDER"]),
  eventType: z.enum(["BUY_IN", "REBUY", "CASH_OUT", "PRACTICE_GRANT", "PRACTICE_WAGER", "PRACTICE_WIN", "CORRECTION", "FRACTIONAL_CARRY"]),
  amount: z.string().regex(/^-?[1-9]\d{0,18}$/),
  idempotencyKey: z.uuid(),
  note: z.string().trim().max(240).optional(),
  reversesEntryId: z.uuid().optional(),
}).strict();
