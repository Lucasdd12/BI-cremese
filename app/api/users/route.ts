import { NextRequest, NextResponse } from 'next/server'
import { listUsers, createUser, getUserByEmail } from '@/lib/server/userService'
import { getAdminDb } from '@/lib/server/instantAdmin'

async function requireAdmin(req: NextRequest, providedEmail?: string) {
  // Try to use the same logic as current-user endpoint which works better
  // Get user from InstantDB auth first
  const db = getAdminDb()
  
  // If email was provided directly, use it
  if (providedEmail) {
    const currentUser = await getUserByEmail(providedEmail)
    if (!currentUser) {
      const error = new Error('Usuário não encontrado na base de dados')
      ;(error as any).status = 404
      throw error
    }
    if (currentUser.role !== 'admin') {
      const error = new Error('Acesso negado - apenas administradores')
      ;(error as any).status = 403
      throw error
    }
    return currentUser
  }
  
  // Try to get auth token from Authorization header first
  const authHeader = req.headers.get('Authorization')
  let authToken: string | undefined
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authToken = authHeader.substring(7)
  } else {
    // Fallback: Try to get from cookies - InstantDB may use various cookie names
    const allCookies = req.cookies.getAll()
    
    // Lista completa de possíveis nomes de cookies do InstantDB
    const possibleCookieNames = [
      'instant_auth_token',
      'instant-auth-token',
      'instant_token',
      'instant-refresh-token',
      'instant_refresh_token',
      'auth_token',
      'refresh_token',
    ]
    
    // Primeiro tenta nomes exatos
    for (const cookieName of possibleCookieNames) {
      const cookie = req.cookies.get(cookieName)
      if (cookie?.value) {
        authToken = cookie.value
        break
      }
    }
    
    // Se não encontrou, tenta busca por substring
    if (!authToken) {
      for (const cookie of allCookies) {
        const name = cookie.name.toLowerCase()
        if (name.includes('instant') || name.includes('auth') || name.includes('refresh')) {
          authToken = cookie.value
          break
        }
      }
    }
  }
  
  let instantUserEmail: string | null = null
  
  // If we have a token, verify it
  if (authToken) {
    try {
      const cleanToken = authToken.trim()
      const instantUser = await db.auth.verifyToken(cleanToken as any)
      if (instantUser?.email) {
        instantUserEmail = instantUser.email
      }
    } catch (error) {
      console.error('[requireAdmin] Erro ao verificar token:', error)
      // Continue to try email from body as fallback
    }
  }
  
  if (!instantUserEmail) {
    const error = new Error('Não autenticado - faça login primeiro')
    ;(error as any).status = 401
    throw error
  }
  
  // Get user from our custom table
  const currentUser = await getUserByEmail(instantUserEmail)
  
  if (!currentUser) {
    const error = new Error('Usuário não encontrado na base de dados')
    ;(error as any).status = 404
    throw error
  }
  
  if (currentUser.role !== 'admin') {
    const error = new Error('Acesso negado - apenas administradores')
    ;(error as any).status = 403
    throw error
  }
  
  return currentUser
}

export async function GET(req: NextRequest) {
  try {
    // For GET, we can't read body, so use the same auth logic as current-user
    const db = getAdminDb()
    
    // Try to get auth token
    const authHeader = req.headers.get('Authorization')
    let authToken: string | undefined
    
    console.log('[users/GET] Verificando autenticação...')
    console.log('[users/GET] Authorization header:', authHeader ? 'presente' : 'ausente')
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.substring(7)
      console.log('[users/GET] Token encontrado no header')
    } else {
      const allCookies = req.cookies.getAll()
      console.log('[users/GET] Total de cookies:', allCookies.length)
      console.log('[users/GET] Nomes dos cookies:', allCookies.map(c => c.name).join(', '))
      
      for (const cookie of allCookies) {
        const name = cookie.name.toLowerCase()
        if (name.includes('instant') || name.includes('auth') || name.includes('refresh')) {
          authToken = cookie.value
          console.log('[users/GET] Token encontrado no cookie:', cookie.name)
          break
        }
      }
    }
    
    let instantUserEmail: string | null = null
    
    if (authToken) {
      try {
        const instantUser = await db.auth.verifyToken(authToken.trim() as any)
        if (instantUser?.email) {
          instantUserEmail = instantUser.email
          console.log('[users/GET] Email obtido do token:', instantUserEmail)
        }
      } catch (error) {
        console.error('[users/GET] Erro ao verificar token:', error)
        // Token verification failed, continue
      }
    } else {
      console.warn('[users/GET] Nenhum token encontrado')
    }
    
    if (!instantUserEmail) {
      console.error('[users/GET] Não foi possível obter email do usuário')
      const error = new Error('Não autenticado - faça login primeiro')
      ;(error as any).status = 401
      throw error
    }
    
    const currentUser = await getUserByEmail(instantUserEmail)
    console.log('[users/GET] Usuário encontrado:', currentUser ? `${currentUser.email} (${currentUser.role})` : 'não encontrado')
    
    if (!currentUser || currentUser.role !== 'admin') {
      const error = new Error('Acesso negado - apenas administradores')
      ;(error as any).status = 403
      throw error
    }
    
    const users = await listUsers()
    console.log('[users/GET] Total de usuários encontrados:', users.length)
    return NextResponse.json({ users })
  } catch (error: any) {
    console.error('[users/GET] Erro:', error)
    const status = error?.status || 500
    const errorMessage = error?.message || 'Erro ao listar usuários'
    
    // Always return a valid error message
    return NextResponse.json(
      { 
        message: errorMessage,
        error: errorMessage,
      },
      { status }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Read body first to get currentUserEmail for auth
    const body = await req.json()
    const { email, name, role, currentUserEmail } = body
    
    // Verify admin access using provided email
    await requireAdmin(req, currentUserEmail)

    if (!email || !name || !role) {
      return NextResponse.json(
        { message: 'Email, nome e role são obrigatórios' },
        { status: 400 }
      )
    }

    if (role !== 'admin' && role !== 'staff') {
      return NextResponse.json(
        { message: 'Role deve ser "admin" ou "staff"' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Email inválido' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists in our custom table
    const existingUser = await getUserByEmail(normalizedEmail)
    if (existingUser) {
      return NextResponse.json(
        { message: 'Usuário com este email já existe' },
        { status: 400 }
      )
    }

    // Try to create user in InstantDB by sending magic code
    // This will create the user in InstantDB if they don't exist
    try {
      await db.auth.sendMagicCode(normalizedEmail)
    } catch (instantError: any) {
      // Log the error for debugging
      console.error('[users/POST] Erro ao enviar magic code:', {
        message: instantError?.message,
        name: instantError?.name,
        email: normalizedEmail,
      })
      
      // If it's a validation error or user already exists, that's okay - we'll still add them to our table
      // Only fail if it's a critical error
      const errorMessage = instantError?.message || ''
      if (errorMessage.includes('Malformed parameter') || errorMessage.includes('refresh-token')) {
        // These errors might be related to InstantDB internal issues, but we can still proceed
        console.warn('[users/POST] Aviso: Erro ao enviar magic code, mas continuando com criação do usuário')
      } else if (errorMessage.includes('already exists') || errorMessage.includes('já existe')) {
        // User already exists is fine
        console.log('[users/POST] Usuário já existe no InstantDB')
      } else {
        // For other errors, log but continue - we'll still create the user in our table
        console.warn('[users/POST] Erro ao enviar magic code:', errorMessage)
      }
    }
    
    // Create in our custom table for role management
    const userId = await createUser({
      email: normalizedEmail,
      name: name.trim(),
      role,
    })

    return NextResponse.json(
      { 
        message: 'Usuário criado com sucesso. Um código de acesso foi enviado para o email (se o usuário não existia no InstantDB).', 
        userId 
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[users/POST] Erro:', error)
    const status = error?.status || 500
    return NextResponse.json(
      { message: error?.message || 'Erro ao criar usuário' },
      { status }
    )
  }
}
