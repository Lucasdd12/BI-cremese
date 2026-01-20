import { NextRequest, NextResponse } from 'next/server'
// This route is deprecated - use InstantDB auth directly from the frontend
// import { generateMagicLink } from '@/lib/server/authService'

export async function POST(req: NextRequest) {
  return NextResponse.json(
    { message: 'Esta rota não está mais disponível. Use a autenticação via InstantDB no frontend.' },
    { status: 410 }
  )
}
