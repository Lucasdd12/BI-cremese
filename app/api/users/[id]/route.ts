import { NextRequest, NextResponse } from 'next/server'
import { getUserById, updateUser, deleteUser, getUserByEmail } from '@/lib/server/userService'
import { getAdminDb } from '@/lib/server/instantAdmin'

async function requireAdmin(req: NextRequest) {
  const db = getAdminDb()
  const allCookies = req.cookies.getAll()
  let authToken: string | undefined
  
  for (const cookie of allCookies) {
    const name = cookie.name.toLowerCase()
    if (name.includes('instant') || name.includes('auth') || name.includes('refresh')) {
      authToken = cookie.value
      break
    }
  }
  
  if (!authToken) {
    const error = new Error('Não autenticado')
    ;(error as any).status = 401
    throw error
  }
  
  try {
    const instantUser = await db.auth.verifyToken(authToken as any)
    
    if (!instantUser || !instantUser.email) {
      const error = new Error('Token inválido')
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
    if (error.status) throw error
    const newError = new Error('Erro ao verificar autenticação')
    ;(newError as any).status = 401
    throw newError
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    await requireAdmin(req)
    const user = await getUserById(id)
    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
    }
    return NextResponse.json({ user })
  } catch (error: any) {
    console.error('[users/[id]/GET] Erro:', error)
    const status = error?.status || 500
    return NextResponse.json(
      { message: error?.message || 'Erro ao obter usuário' },
      { status }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    await requireAdmin(req)
    const body = await req.json()
    
    // Validate role if provided
    if (body.role && body.role !== 'admin' && body.role !== 'staff') {
      return NextResponse.json(
        { message: 'Role deve ser "admin" ou "staff"' },
        { status: 400 }
      )
    }
    
    // Validate email format if provided
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { message: 'Email inválido' },
          { status: 400 }
        )
      }
      body.email = body.email.toLowerCase().trim()
    }
    
    await updateUser(id, body)
    return NextResponse.json({ message: 'Usuário atualizado com sucesso' })
  } catch (error: any) {
    console.error('[users/[id]/PUT] Erro:', error)
    const status = error?.status || 500
    return NextResponse.json(
      { message: error?.message || 'Erro ao atualizar usuário' },
      { status }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    await requireAdmin(req)
    await deleteUser(id)
    return NextResponse.json({ message: 'Usuário deletado com sucesso' })
  } catch (error: any) {
    console.error('[users/[id]/DELETE] Erro:', error)
    const status = error?.status || 500
    return NextResponse.json(
      { message: error?.message || 'Erro ao deletar usuário' },
      { status }
    )
  }
}
