import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const configuredOrigin = process.env.APP_ORIGIN;
  if (!configuredOrigin) return NextResponse.redirect(new URL("/sign-in?error=configuration", requestUrl.origin));
  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const suggestedName = String(user.user_metadata?.full_name ?? user.email?.split("@", 1)[0] ?? "Player")
          .replace(/[^\p{L}\p{N} .'-]/gu, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 48) || "Player";
        const { error: membershipError } = await supabase.rpc("request_club_membership", {
          p_display_name: suggestedName,
        });
        if (membershipError) return NextResponse.redirect(new URL("/sign-in?error=membership-request", configuredOrigin));
      }
      return NextResponse.redirect(new URL("/club", configuredOrigin));
    }
  }
  return NextResponse.redirect(new URL("/sign-in?error=invalid-link", configuredOrigin));
}
