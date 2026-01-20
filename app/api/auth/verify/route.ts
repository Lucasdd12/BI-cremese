import { NextRequest, NextResponse } from 'next/server'
import { verifyMagicLink, createSessionFromUser } from '@/lib/server/authService'
import { setSessionResponse } from '@/lib/server/session'

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    const redirectTo = req.nextUrl.searchParams.get('redirect') || '/dashboard'

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=token_invalido', req.nextUrl.origin))
    }

    // Verify magic link
    const user = await verifyMagicLink(token)

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=token_invalido_ou_expirado', req.nextUrl.origin))
    }

    // Create session
    const sessionData = await createSessionFromUser(user)

    // Create response with redirect
    const response = NextResponse.redirect(new URL(redirectTo, req.nextUrl.origin))
    
    // Set session cookie
    setSessionResponse(response, sessionData)

    return response
  } catch (error) {
    console.error('[auth/verify] Erro:', error)
    return NextResponse.redirect(new URL('/login?error=erro_ao_verificar', req.nextUrl.origin))
  }
}
