import { NextRequest, NextResponse } from 'next/server'
import { generateMagicLink } from '@/lib/server/authService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Email é obrigatório' },
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

    // Get base URL from request
    const origin = req.headers.get('origin') || req.nextUrl.origin
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || origin

    // Generate magic link
    const magicLink = await generateMagicLink(email.toLowerCase().trim(), baseUrl)

    // In development, return the link in the response
    const isDevelopment = process.env.NODE_ENV === 'development'

    return NextResponse.json({
      message: isDevelopment
        ? 'Link de acesso gerado. Verifique o console do servidor ou use o link abaixo.'
        : 'Link de acesso enviado para seu email.',
      ...(isDevelopment && { magicLink }),
    })
  } catch (error) {
    console.error('[auth/login] Erro:', error)
    return NextResponse.json(
      { message: (error as Error).message || 'Erro ao gerar link de acesso' },
      { status: 500 }
    )
  }
}
