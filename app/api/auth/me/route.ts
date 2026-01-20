import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/server/authService'

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { message: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Return user without sensitive data
    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })
  } catch (error) {
    console.error('[auth/me] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao obter usuário' },
      { status: 500 }
    )
  }
}
