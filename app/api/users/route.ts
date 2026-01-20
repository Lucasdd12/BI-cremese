import { NextRequest, NextResponse } from 'next/server'
import { listUsers, createUser, getUserByEmail } from '@/lib/server/userService'
import { getAdminDb } from '@/lib/server/instantAdmin'

async function requireAdmin(req: NextRequest) {
  const db = getAdminDb()
  
  // Try to get auth token from Authorization header first
  const authHeader = req.headers.get('Authorization')
  let authToken: string | undefined
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    authToken = authHeader.substring(7)
  } else {
    // Fallback: Try to get from cookies
    const allCookies = req.cookies.getAll()
    for (const cookie of allCookies) {
      const name = cookie.name.toLowerCase()
      if (name.includes('instant') || name.includes('auth') || name.includes('refresh')) {
        authToken = cookie.value
        break
      }
    }
  }
  
  if (!authToken) {
    const error = new Error('Não autenticado')
    ;(error as any).status = 401
    throw error
  }
  
  try {
    // Clean the token - remove any whitespace or newlines
    const cleanToken = authToken.trim()
    
    // Validate token is not empty
    if (!cleanToken || cleanToken.length === 0) {
      const error = new Error('Token de autenticação vazio')
      ;(error as any).status = 401
      throw error
    }
    
    // Verify token with InstantDB
    // Note: verifyToken expects a refresh token, not an access token
    let instantUser
    try {
      instantUser = await db.auth.verifyToken(cleanToken as any)
    } catch (verifyError: any) {
      // Check if it's the malformed parameter error
      const errorMessage = verifyError?.message || ''
      if (errorMessage.includes('Malformed parameter') || errorMessage.includes('refresh-token')) {
        console.error('[requireAdmin] Erro ao verificar token - token pode estar em formato incorreto:', {
          tokenLength: cleanToken.length,
          tokenPreview: cleanToken.substring(0, 20) + '...',
          error: errorMessage,
        })
        const error = new Error('Token de autenticação inválido ou expirado')
        ;(error as any).status = 401
        throw error
      }
      // Re-throw other errors
      throw verifyError
    }
    
    if (!instantUser || !instantUser.email) {
      const error = new Error('Token inválido ou usuário não encontrado')
      ;(error as any).status = 401
      throw error
    }
    
    const currentUser = await getUserByEmail(instantUser.email)
    
    if (!currentUser || currentUser.role !== 'admin') {
      const error = new Error('Acesso negado')
      ;(error as any).status = 403
      throw error
    }
    
    return currentUser
  } catch (error: any) {
    // If error already has a status, throw it as is
    if (error.status) throw error
    
    // Log the error for debugging
    console.error('[requireAdmin] Erro ao verificar token:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
    })
    
    // Create a new error with 401 status
    const newError = new Error(error?.message || 'Erro ao verificar autenticação')
    ;(newError as any).status = 401
    throw newError
  }
}

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req)
    const users = await listUsers()
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
    await requireAdmin(req)
    
    const body = await req.json()
    const { email, name, role } = body

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
      await db.auth.sendMagicCode({ email: normalizedEmail })
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
