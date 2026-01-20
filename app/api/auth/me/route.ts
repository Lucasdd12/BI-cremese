import { NextRequest, NextResponse } from 'next/server'
// This route is deprecated - use /api/auth/current-user instead
// import { getCurrentUser } from '@/lib/server/authService'

export async function GET(req: NextRequest) {
  // Redirect to the current-user endpoint
  return NextResponse.redirect(new URL('/api/auth/current-user', req.nextUrl.origin))
}
