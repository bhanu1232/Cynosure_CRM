import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that are fully public — no cookie auth required
const PUBLIC_ROUTES = ['/login', '/live'];

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // Allow public routes through without any auth check
    const isPublicRoute = PUBLIC_ROUTES.some(r => path === r || path.startsWith(r + '/'));

    // Get the authentication cookie
    const isAuthenticated = request.cookies.get('isAuthenticated')?.value;

    // If not authenticated and trying to access a protected route → redirect to login
    if (!isAuthenticated && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If already authenticated and visiting login → redirect to home
    if (isAuthenticated && path === '/login') {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - api routes
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
};