import { getAdminDb } from './instantAdmin'
import { getUserByEmail, type User, type UserRole } from './userService'
import { NextRequest } from 'next/server'

/**
 * Get email from InstantDB auth token in request
 * InstantDB stores auth token in cookies - we verify it using Admin SDK
 */
export async function getEmailFromRequest(req: NextRequest): Promise<string | null> {
  try {
    const db = getAdminDb()
    
    // Try to get auth token from various possible cookie names
    const possibleCookieNames = [
      'instant_auth_token',
      'instant-auth-token',
      'auth_token',
      'instant_token',
    ]
    
    let authToken: string | undefined
    for (const cookieName of possibleCookieNames) {
      const cookie = req.cookies.get(cookieName)
      if (cookie?.value) {
        authToken = cookie.value
        break
      }
    }
    
    if (!authToken) {
      return null
    }

    // Verify token and get user
    try {
      const instantUser = await db.auth.verifyToken(authToken as any)
      return instantUser.email || null
    } catch (error) {
      console.error('[getEmailFromRequest] Erro ao verificar token:', error)
      return null
    }
  } catch (error) {
    console.error('[getEmailFromRequest] Erro:', error)
    return null
  }
}

/**
 * Get current user from InstantDB auth and sync with our custom users table
 * This function is used in API routes to get the authenticated user's role
 */
export async function getCurrentUserFromInstantDB(email: string): Promise<User | null> {
  if (!email) return null
  
  const user = await getUserByEmail(email)
  return user
}

/**
 * Require authentication - checks if user exists in our custom users table
 * Used in API routes that need to verify user role
 */
export async function requireAuth(req: NextRequest): Promise<User> {
  const email = await getEmailFromRequest(req)
  
  if (!email) {
    const error = new Error('Não autenticado')
    ;(error as any).status = 401
    throw error
  }

  const user = await getCurrentUserFromInstantDB(email)
  if (!user) {
    const error = new Error('Usuário não encontrado')
    ;(error as any).status = 404
    throw error
  }
  return user
}

/**
 * Require specific role
 */
export async function requireRole(role: UserRole, req: NextRequest): Promise<User> {
  const user = await requireAuth(req)
  if (user.role !== role) {
    const error = new Error('Acesso negado')
    ;(error as any).status = 403
    throw error
  }
  return user
}
