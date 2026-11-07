import { NextResponse } from "next/server";
import { dealerApplicationSchema } from "@/lib/validation";
import { requireClubRole } from "@/lib/server/auth";
import { assertSameOrigin, safeApiError } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { supabase, membership } = await requireClubRole(["owner", "dealer", "player"]);
    const reviewer = membership.role === "owner" || membership.role === "dealer";
    const { data, error } = reviewer
      ? await supabase.rpc("list_pending_dealer_applications")
      : await supabase.rpc("get_my_dealer_application");
    if (error) throw new Error(error.code === "42501" ? "FORBIDDEN" : "DEALER_APPLICATION_LIST_FAILED");
    return NextResponse.json(reviewer ? { applications: data ?? [] } : { application: data ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (Number(request.headers.get("content-length") ?? 0) > 4_096) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const parsed = dealerApplicationSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid dealer application" }, { status: 400 });
    const { supabase } = await requireClubRole(parsed.data.action === "apply" ? ["player"] : ["owner", "dealer"]);
    const { data, error } = parsed.data.action === "apply"
      ? await supabase.rpc("request_dealer_access", { p_note: parsed.data.note })
      : await supabase.rpc("review_dealer_application", { p_application_id: parsed.data.applicationId, p_approve: parsed.data.action === "approve" });
    if (error) throw new Error(error.code === "42501" ? "FORBIDDEN" : "DEALER_APPLICATION_UPDATE_FAILED");
    return NextResponse.json({ application: data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const safe = safeApiError(error);
    return NextResponse.json({ error: safe.message }, { status: safe.status, headers: { "Cache-Control": "no-store" } });
  }
}
