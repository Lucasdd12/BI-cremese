import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/server/userService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = body.email

    if (!email) {
      return NextResponse.json({ message: 'Email é obrigatório' }, { status: 400 })
    }

    console.log('[sync-user] Sincronizando usuário:', email)

    // Check if user exists in our custom users table
    const user = await getUserByEmail(email)

    // If user doesn't exist, return 404 - user must be created by admin first
    if (!user) {
      console.log('[sync-user] Usuário não encontrado:', email)
      return NextResponse.json(
        { message: 'Usuário não encontrado. Entre em contato com o administrador.' },
        { status: 404 }
      )
    }

    console.log('[sync-user] Usuário encontrado:', user.id)

    return NextResponse.json({
      message: 'Usuário sincronizado',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('[auth/sync-user] Erro:', error)
    return NextResponse.json(
      { message: (error as Error).message || 'Erro ao sincronizar usuário' },
      { status: 500 }
    )
  }
}
