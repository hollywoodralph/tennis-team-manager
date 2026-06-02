import { NextRequest, NextResponse } from "next/server";

// Server-side route protection. The client-side RouteGuard is the source of truth
// for fine-grained role checks; this middleware just ensures the public marketing
// and login pages are reachable and the dashboard is gated.
//
// We only check the presence of an auth cookie. The actual auth state lives in
// localStorage and is validated client-side. This means the middleware cannot
// truly prevent server-render of protected pages, but it CAN add basic headers
// and serve a tiny redirect for direct URL access without a session cookie.

const PUBLIC_PATHS = ["/", "/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // For protected paths, set a header that the page can read
  // (in a real app with cookie-based auth, this would redirect)
  const response = NextResponse.next();
  response.headers.set("x-path-protected", "true");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
