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
    if (!error) return NextResponse.redirect(new URL("/club", configuredOrigin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=invalid-link", configuredOrigin));
}
