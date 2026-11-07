import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const configuredOrigin = process.env.APP_ORIGIN;
  if (!configuredOrigin) return NextResponse.redirect(new URL("/sign-in?error=configuration", requestUrl.origin));

  if (tokenHash && type === "recovery") {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL("/reset-password", configuredOrigin));
  }

  return NextResponse.redirect(new URL("/sign-in?mode=forgot&error=expired-recovery", configuredOrigin));
}
