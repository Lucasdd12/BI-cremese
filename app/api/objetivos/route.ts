import { NextRequest, NextResponse } from 'next/server'
import { createObjective, listObjectives } from '@/lib/server/objectivesService'
import { requireAdmin, getAdminHeaderName } from '@/lib/server/auth'

export async function GET(req: NextRequest) {
  try {
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'
    console.log('[GET /api/objetivos] Iniciando busca...')
    const objetivos = await listObjectives(includeInactive)
    console.log(`[GET /api/objetivos] Retornando ${objetivos.length} objetivos (includeInactive: ${includeInactive})`)
    return NextResponse.json({ objetivos })
  } catch (error) {
    console.error('[GET /api/objetivos] Erro completo:', error)
    const err = error as any
    const errorDetails = {
      message: err.message || 'Erro desconhecido',
      stack: err.stack,
      body: err.body,
      hint: err.hint,
      name: err.name,
      code: err.code,
    }
    console.error('[GET /api/objetivos] Detalhes do erro:', JSON.stringify(errorDetails, null, 2))
    
    // Em desenvolvimento, retornar mais detalhes
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        message: 'Erro ao listar objetivos', 
        error: err.message || 'Erro desconhecido',
        ...(isDev && { details: errorDetails }),
      },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req)
  } catch (error) {
    const status = (error as any).status || 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }

  const body = await req.json()
  const { codigo, nome, descricao } = body || {}

  if (!codigo || !nome) {
    return NextResponse.json({ message: 'codigo e nome são obrigatórios' }, { status: 400 })
  }

  try {
    await createObjective({ codigo, nome, descricao, ativo: true })
    return NextResponse.json(
      { message: 'Objetivo criado com sucesso' },
      { status: 201, headers: { 'x-admin-header': getAdminHeaderName() } }
    )
  } catch (error) {
    console.error('Erro ao criar objetivo', error)
    return NextResponse.json({ message: 'Erro ao criar objetivo' }, { status: 500 })
  }
}
