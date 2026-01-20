import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminHeaderName } from '@/lib/server/auth'
import {
  createIndicator,
  listIndicators,
  listObjectives,
} from '@/lib/server/objectivesService'

export async function GET(req: NextRequest) {
  try {
    const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'
    const objetivoId = req.nextUrl.searchParams.get('objetivoId')

    console.log('[GET /api/indicadores] Iniciando busca...')
    const indicadores = await listIndicators(includeInactive)
    const filtered = objetivoId
      ? indicadores.filter((ind) => ind.objetivoId === objetivoId)
      : indicadores

    console.log(`[GET /api/indicadores] Retornando ${filtered.length} indicadores (includeInactive: ${includeInactive}, objetivoId: ${objetivoId || 'todos'})`)
    return NextResponse.json({ indicadores: filtered })
  } catch (error) {
    console.error('[GET /api/indicadores] Erro completo:', error)
    const err = error as any
    const errorDetails = {
      message: err.message || 'Erro desconhecido',
      stack: err.stack,
      body: err.body,
      hint: err.hint,
      name: err.name,
      code: err.code,
    }
    console.error('[GET /api/indicadores] Detalhes do erro:', JSON.stringify(errorDetails, null, 2))
    
    // Em desenvolvimento, retornar mais detalhes
    const isDev = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        message: 'Erro ao listar indicadores', 
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
  const { codigo, nome, objetivoId, ativo } = body || {}

  if (!codigo || !nome || !objetivoId) {
    return NextResponse.json(
      { message: 'codigo, nome e objetivoId são obrigatórios' },
      { status: 400 }
    )
  }

  try {
    const objetivos = await listObjectives(true)
    const objetivo = objetivos.find((o: any) => o.id === objetivoId) as any
    if (!objetivo) {
      return NextResponse.json({ message: 'Objetivo não encontrado' }, { status: 404 })
    }

    await createIndicator({
      codigo,
      nome,
      objetivoId,
      objetivoCodigo: String(objetivo.codigo || ''),
      objetivoNome: String(objetivo.nome || ''),
      ativo: ativo ?? true,
    })

    return NextResponse.json(
      { message: 'Indicador criado com sucesso' },
      { status: 201, headers: { 'x-admin-header': getAdminHeaderName() } }
    )
  } catch (error) {
    console.error('Erro ao criar indicador', error)
    return NextResponse.json({ message: 'Erro ao criar indicador' }, { status: 500 })
  }
}
