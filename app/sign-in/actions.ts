"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { emailSchema } from "@/lib/validation";

export async function requestMagicLink(formData: FormData) {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) redirect("/sign-in?error=invalid-email");
  const supabase = await createServerSupabaseClient();
  const origin = process.env.APP_ORIGIN;
  if (!origin) redirect("/sign-in?error=configuration");
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) redirect("/sign-in?error=sign-in-failed");
  redirect("/sign-in?sent=1");
}
