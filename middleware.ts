import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

const publicAssetPattern = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/app/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    publicAssetPattern.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (!pathname.startsWith("/app/control")) {
    return NextResponse.next();
  }

  const { supabase, response } = createMiddlewareClient(request);
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("id,is_active,must_change_password")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!employee || employee.is_active === false) {
    await supabase.auth.signOut();
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app/login";
    redirectUrl.searchParams.set("blocked", !employee ? "missing-profile" : "inactive");
    return NextResponse.redirect(redirectUrl);
  }

  if (employee.must_change_password && pathname !== "/app/control/cambiar-password") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app/control/cambiar-password";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (!employee.must_change_password && pathname === "/app/control/cambiar-password") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/app/control";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$).*)"
  ]
};
