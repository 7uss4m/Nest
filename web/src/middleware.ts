import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // No server-side token check (tokens are in localStorage).
  // Protection is handled client-side; this middleware just ensures
  // the auth routes are always accessible.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|public).*)"],
};
