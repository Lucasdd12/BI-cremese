import { NextRequest, NextResponse } from 'next/server'
import { clearSession, clearSessionResponse } from '@/lib/server/session'

export async function POST(req: NextRequest) {
  try {
    await clearSession()
    
    const response = NextResponse.json({ message: 'Logout realizado com sucesso' })
    clearSessionResponse(response)
    
    return response
  } catch (error) {
    console.error('[auth/logout] Erro:', error)
    return NextResponse.json(
      { message: 'Erro ao fazer logout' },
      { status: 500 }
    )
  }
}
