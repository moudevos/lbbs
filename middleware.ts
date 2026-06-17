import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";
import {
  getRequestHostname,
  getSubdomainRootRoute,
  isInternalSubdomain,
  resolveSubdomain
} from "@/lib/subdomains/resolve-subdomain-route";

const publicAssetPattern = /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|html)$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    publicAssetPattern.test(pathname)
  ) {
    return NextResponse.next();
  }

  const subdomain = resolveSubdomain(getRequestHostname(request.headers));

  if (pathname === "/" && subdomain) {
    if (subdomain === "control") {
      const { supabase, response: sessionResponse } = createMiddlewareClient(request);
      const { data: { user } } = await supabase.auth.getUser();
      const redirect = redirectTo(request, getSubdomainRootRoute(subdomain, Boolean(user)), true);
      sessionResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
    return redirectTo(request, getSubdomainRootRoute(subdomain), isInternalSubdomain(subdomain));
  }

  if (pathname === "/app/login") {
    const response = NextResponse.next();
    if (isInternalSubdomain(subdomain)) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    return response;
  }

  if (!pathname.startsWith("/app/control")) {
    const response = NextResponse.next();
    if (isInternalSubdomain(subdomain) || pathname.startsWith("/local")) {
      response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    }
    return response;
  }

  const { supabase, response } = createMiddlewareClient(request);
  const { data: { user } } = await supabase.auth.getUser();

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
    return redirectTo(request, "/app/control/cambiar-password", true);
  }

  if (!employee.must_change_password && pathname === "/app/control/cambiar-password") {
    return redirectTo(request, "/app/control", true);
  }

  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

function redirectTo(request: NextRequest, pathname: string, noIndex = false) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const response = NextResponse.redirect(url);
  if (noIndex) response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|html)$).*)"
  ]
};
