import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/app/login?verified=1";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      const admin = createAdminClient();
      await admin
        .from("employees")
        .update({
          email_confirmed_at: user.email_confirmed_at ?? new Date().toISOString(),
          onboarding_status: "pending_password_change"
        })
        .eq("user_id", user.id);
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
