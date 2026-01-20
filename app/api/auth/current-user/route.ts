import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/server/instantAdmin'
import { getUserByEmail } from '@/lib/server/userService'

export async function GET(req: NextRequest) {
  return handleRequest(req)
}

export async function POST(req: NextRequest) {
  return handleRequest(req)
}

async function handleRequest(req: NextRequest) {
  try {
    const db = getAdminDb()
    
    // Try to get auth token from Authorization header first
    const authHeader = req.headers.get('Authorization')
    let authToken: string | undefined
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7)
    } else {
      // Fallback: Try to get from cookies
      const possibleCookieNames = [
        'instant_auth_token',
        'instant-auth-token',
        'auth_token',
        'instant_token',
      ]
      
      for (const cookieName of possibleCookieNames) {
        const cookie = req.cookies.get(cookieName)
        if (cookie?.value) {
          authToken = cookie.value
          break
        }
      }
    }

    let instantUserEmail: string | null = null

    // If we have a token, verify it
    if (authToken) {
      try {
        const instantUser = await db.auth.verifyToken(authToken as any)
        if (instantUser?.email) {
          instantUserEmail = instantUser.email
        }
      } catch (error) {
        console.error('[auth/current-user] Erro ao verificar token:', error)
      }
    }

    // If no token or token verification failed, try to get email from request body
    if (!instantUserEmail) {
      try {
        const body = await req.json().catch(() => ({}))
        if (body.email) {
          instantUserEmail = body.email
        }
      } catch (error) {
        // Ignore JSON parse errors
      }
    }

    if (!instantUserEmail) {
      return NextResponse.json(
        { message: 'Não autenticado' },
        { status: 401 }
      )
    }
    
    // Get custom user data (role) from our users table
    const customUser = await getUserByEmail(instantUserEmail)
    
    if (!customUser) {
      // Return 404 but with instantUser info so frontend can create it
      // Get instantUser info if we have a token
      let instantUserInfo = null
      if (authToken) {
        try {
          const instantUser = await db.auth.verifyToken(authToken as any)
          if (instantUser) {
            instantUserInfo = {
              id: instantUser.id,
              email: instantUser.email,
            }
          }
        } catch (error) {
          // Ignore token errors here
        }
      }
      
      return NextResponse.json({
        message: 'Usuário não encontrado na base de dados',
        instantUser: instantUserInfo,
      }, { status: 404 })
    }

    // Get instantUser ID if we have a token
    let instantUserId: string | undefined
    if (authToken) {
      try {
        const instantUser = await db.auth.verifyToken(authToken as any)
        if (instantUser) {
          instantUserId = instantUser.id
        }
      } catch (error) {
        // Ignore token errors here
      }
    }

    return NextResponse.json({
      id: customUser.id,
      email: customUser.email,
      name: customUser.name,
      role: customUser.role,
      instantUserId: instantUserId,
    })
  } catch (error) {
    console.error('[auth/current-user] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao obter usuário atual' },
      { status: 500 }
    )
  }
}
