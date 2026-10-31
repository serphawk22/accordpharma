import { NextRequest, NextResponse } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/reset-password', '/forgot-password'];

// Routes that should never be redirected (API routes, static files, etc.)
const SKIP_PREFIXES = ['/api/', '/_next/', '/favicon.ico', '/icons/', '/images/'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for Next.js internals, API routes, and static files
  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow public pages without auth
  if (PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Check for the session cookie set by AuthContext on login
  const sessionCookie = request.cookies.get('accord_session');
  const hasSession = sessionCookie?.value === 'active';

  if (!hasSession) {
    // Redirect to login with the original path as a query param
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files handled above
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
