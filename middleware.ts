import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Get the pathname of the request
    const path = request.nextUrl.pathname;

    // Check if the path is the login page
    const isLoginPage = path === '/login';

    // Get the token from the cookies
    const isAuthenticated = request.cookies.get('isAuthenticated')?.value;

    // If the user is not authenticated and trying to access a protected route
    if (!isAuthenticated && !isLoginPage) {
        // Redirect to the login page
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // If the user is authenticated and trying to access the login page
    if (isAuthenticated && isLoginPage) {
        // Redirect to the home page
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Continue with the request
    return NextResponse.next();
}

// Configure the middleware to run on specific paths
export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}; 