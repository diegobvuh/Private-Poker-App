import { NextResponse } from "next/server";
import { ledgerMutationSchema } from "@/lib/validation";
import { requireClubRole } from "@/lib/server/auth";
import { assertSameOrigin, safeApiError } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (Number(request.headers.get("content-length") ?? 0) > 16_384) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const body = await request.json();
    const parsed = ledgerMutationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid ledger entry", issues: parsed.error.issues.map((issue) => issue.path.join(".")) }, { status: 400 });
    const { supabase } = await requireClubRole(["owner", "dealer"]);
    const { data, error } = await supabase.rpc("append_ledger_entry", {
      p_account_id: parsed.data.accountId,
      p_session_id: parsed.data.sessionId,
      p_kind: parsed.data.kind,
      p_event_type: parsed.data.eventType,
      p_amount_millicents: parsed.data.amount,
      p_idempotency_key: parsed.data.idempotencyKey,
      p_note: parsed.data.note ?? null,
      p_reverses_entry_id: parsed.data.reversesEntryId ?? null,
    });
    if (error) throw new Error(error.code === "42501" ? "FORBIDDEN" : "LEDGER_WRITE_FAILED");
    return NextResponse.json({ entry: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status, headers: { "Cache-Control": "no-store" } });
  }
}
