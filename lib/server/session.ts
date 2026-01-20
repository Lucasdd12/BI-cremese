import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const SESSION_COOKIE_NAME = 'auth_session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days in seconds

export interface SessionData {
  userId: string
  email: string
  name: string
  role: 'admin' | 'staff'
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)
  
  if (!sessionCookie?.value) {
    return null
  }

  try {
    // In a production app, you'd decrypt/verify the cookie
    // For now, we'll store JSON directly (not secure for production)
    const session = JSON.parse(sessionCookie.value) as SessionData
    return session
  } catch (error) {
    console.error('[session] Error parsing session cookie:', error)
    return null
  }
}

export async function setSession(sessionData: SessionData): Promise<void> {
  const cookieStore = await cookies()
  
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export function setSessionResponse(
  response: NextResponse,
  sessionData: SessionData
): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
  return response
}

export function clearSessionResponse(response: NextResponse): NextResponse {
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}

export function getSessionFromRequest(request: NextRequest): SessionData | null {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)
  
  if (!sessionCookie?.value) {
    return null
  }

  try {
    const session = JSON.parse(sessionCookie.value) as SessionData
    return session
  } catch (error) {
    console.error('[session] Error parsing session cookie:', error)
    return null
  }
}
