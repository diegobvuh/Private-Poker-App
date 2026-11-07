import { NextResponse } from "next/server";
import { requireClubRole } from "@/lib/server/auth";
import { assertSameOrigin, safeApiError } from "@/lib/server/request-security";
import { membershipDecisionSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase } = await requireClubRole(["owner"]);
    const { data, error } = await supabase.rpc("list_pending_memberships");
    if (error) throw new Error(error.code === "42501" ? "FORBIDDEN" : "MEMBERSHIP_LIST_FAILED");
    return NextResponse.json({ memberships: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (Number(request.headers.get("content-length") ?? 0) > 4_096) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const parsed = membershipDecisionSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid membership decision" }, { status: 400 });
    const { supabase } = await requireClubRole(["owner"]);
    const functionName = parsed.data.action === "approve" ? "approve_club_membership" : "reject_club_membership";
    const args = parsed.data.action === "approve"
      ? { p_membership_id: parsed.data.membershipId, p_role: parsed.data.role }
      : { p_membership_id: parsed.data.membershipId };
    const { data, error } = await supabase.rpc(functionName, args);
    if (error) throw new Error(error.code === "42501" ? "FORBIDDEN" : "MEMBERSHIP_UPDATE_FAILED");
    return NextResponse.json({ membership: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status, headers: { "Cache-Control": "no-store" } });
  }
}
