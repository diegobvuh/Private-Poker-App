"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { passwordSchema } from "@/lib/validation";

export async function updatePassword(formData: FormData) {
  const password = passwordSchema.safeParse(formData.get("password"));
  const confirmation = passwordSchema.safeParse(formData.get("confirmation"));
  if (!password.success || !confirmation.success || password.data !== confirmation.data) {
    redirect("/reset-password?error=invalid-password");
  }
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?mode=forgot&error=expired-recovery");
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) redirect("/reset-password?error=update-failed");
  redirect("/club");
}
