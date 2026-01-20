import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/server/instantAdmin'

export async function GET(req: NextRequest) {
  try {
    // Teste básico de conexão
    console.log('[TEST] Testando conexão com adminDb...')
    
    const db = getAdminDb()
    
    // Tentar fazer uma query simples sem filtros
    const testQuery = await db.query({
      objetivos: {},
    })
    
    console.log('[TEST] Resultado da query objetivos:', JSON.stringify(testQuery, null, 2))
    
    const testQueryIndicadores = await db.query({
      indicadores: {},
    })
    
    console.log('[TEST] Resultado da query indicadores:', JSON.stringify(testQueryIndicadores, null, 2))
    
    return NextResponse.json({
      success: true,
      objetivos: {
        count: testQuery.objetivos?.length || 0,
        data: testQuery.objetivos || [],
      },
      indicadores: {
        count: testQueryIndicadores.indicadores?.length || 0,
        data: testQueryIndicadores.indicadores || [],
      },
      raw: {
        objetivos: testQuery,
        indicadores: testQueryIndicadores,
      },
    })
  } catch (error) {
    console.error('[TEST] Erro:', error)
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        stack: (error as Error).stack,
      },
      { status: 500 }
    )
  }
}
