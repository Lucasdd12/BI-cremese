import { NextRequest, NextResponse } from 'next/server'
// This route is deprecated - use InstantDB auth verification from frontend
// import { verifyMagicLink, createSessionFromUser } from '@/lib/server/authService'
// import { setSessionResponse } from '@/lib/server/session'

export async function GET(req: NextRequest) {
  // Redirect to login page
  return NextResponse.redirect(new URL('/login?error=rota_descontinuada', req.nextUrl.origin))
}
