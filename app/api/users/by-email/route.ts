import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/server/userService'

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email')

    if (!email) {
      return NextResponse.json({ message: 'Email é obrigatório' }, { status: 400 })
    }

    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({ message: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    console.error('[users/by-email] Erro:', error)
    return NextResponse.json(
      { message: (error as Error).message || 'Erro ao obter usuário' },
      { status: 500 }
    )
  }
}
