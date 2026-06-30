import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (formerly middleware) that protects routes behind authentication.
 * Checks for the `gbsa_session` cookie. If missing, redirects to /login.
 */
export function proxy(request: NextRequest) {
  const session = request.cookies.get("gbsa_session");
  const { pathname } = request.nextUrl;

  const isLoginPage = pathname === "/login" || pathname === "/";
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/templates") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico";

  if (isStaticAsset) {
    return NextResponse.next();
  }

  // If not logged in and not on login page, redirect to /login
  if (!session && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // If logged in and trying to access /login, redirect to dashboard
  if (session && isLoginPage) {
    const dashboardUrl = new URL("/search", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|CompanySearch.mp4).*)"],
};
