import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/api/auth']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Protected routes
  const protectedRoutes = ['/', '/dashboard', '/admin']
  const isProtectedRoute = protectedRoutes.some((route) => {
    if (route === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(route)
  })

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  // InstantDB stores auth in localStorage on the client side, not in HTTP cookies
  // So middleware can't verify auth. We'll let the client handle auth checks.
  // The ProtectedRoute component and useAuth hook will handle redirects.
  
  // Allow the request through - client-side will check auth and redirect if needed
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
