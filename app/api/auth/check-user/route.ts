import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/server/userService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const email = body.email

    if (!email) {
      return NextResponse.json({ message: 'Email é obrigatório' }, { status: 400 })
    }

    // Check if user exists in our custom users table
    const user = await getUserByEmail(email.toLowerCase().trim())

    if (!user) {
      return NextResponse.json(
        { message: 'Este email não está cadastrado. Entre em contato com o administrador.' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Usuário encontrado',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })
  } catch (error) {
    console.error('[auth/check-user] Erro:', error)
    return NextResponse.json(
      { message: (error as Error).message || 'Erro ao verificar usuário' },
      { status: 500 }
    )
  }
}
