import { NextResponse } from "next/server";
import { gameCommandSchema } from "@/lib/validation";
import { requireUser } from "@/lib/server/auth";
import { assertSameOrigin, safeApiError } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (Number(request.headers.get("content-length") ?? 0) > 32_768) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const parsed = gameCommandSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid command", issues: parsed.error.issues.map((issue) => issue.path.join(".")) }, { status: 400 });
    const { supabase } = await requireUser();
    const { data, error } = await supabase.rpc("submit_game_command", {
      p_command_id: parsed.data.commandId,
      p_game_id: parsed.data.gameId,
      p_expected_version: parsed.data.expectedVersion,
      p_command_type: parsed.data.type,
      p_payload: parsed.data.payload,
    });
    if (error) throw new Error(error.code === "42501" ? "FORBIDDEN" : "COMMAND_FAILED");
    return NextResponse.json({ command: data }, { status: data.status === "ACCEPTED" ? 200 : 409, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status, headers: { "Cache-Control": "no-store" } });
  }
}
