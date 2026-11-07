"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { emailSchema, passwordSchema, registrationSchema } from "@/lib/validation";

export async function signInWithPassword(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!email.success || !password.success) redirect("/sign-in?error=invalid-credentials");

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });
  if (error) redirect("/sign-in?error=invalid-credentials");
  redirect("/club");
}

export async function registerWithPassword(formData: FormData) {
  const parsed = registrationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) redirect("/sign-in?mode=register&error=invalid-registration");

  const origin = process.env.APP_ORIGIN;
  if (!origin) redirect("/sign-in?mode=register&error=configuration");
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });
  if (error) redirect("/sign-in?mode=register&error=registration-failed");

  if (data.session) {
    const { error: membershipError } = await supabase.rpc("request_club_membership", {
      p_display_name: parsed.data.name,
    });
    if (membershipError) redirect("/sign-in?error=membership-request");
    redirect("/club");
  }
  redirect("/sign-in?registered=1");
}

export async function requestPasswordReset(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const origin = process.env.APP_ORIGIN;
  if (!email.success || !origin) redirect("/sign-in?mode=forgot&error=invalid-email");
  const supabase = await createServerSupabaseClient();
  await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  redirect("/sign-in?resetSent=1");
}
