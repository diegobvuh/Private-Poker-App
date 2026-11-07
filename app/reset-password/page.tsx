import { getSupabaseConfig } from "@/lib/supabase/config";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  const { url, publishableKey } = getSupabaseConfig();
  return <ResetPasswordForm supabaseUrl={url} publishableKey={publishableKey} />;
}
