import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig } from "./config";

export async function refreshSession(request: NextRequest, requestHeaders = new Headers(request.headers)) {
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const { url, publishableKey } = getSupabaseConfig();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: { headers: requestHeaders } });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const isProtected = request.nextUrl.pathname.startsWith("/club") || request.nextUrl.pathname.startsWith("/demo");
  if (isProtected && !user) {
    const urlToRedirect = request.nextUrl.clone();
    urlToRedirect.pathname = "/sign-in";
    urlToRedirect.searchParams.set("reason", "session-required");
    return NextResponse.redirect(urlToRedirect);
  }
  return response;
}
