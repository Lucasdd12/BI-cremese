import { id } from '@instantdb/admin'
import { getAdminDb } from './instantAdmin'

export type ObjectivePayload = {
  codigo: string
  nome: string
  descricao?: string
  ativo?: boolean
}

export type IndicatorPayload = {
  codigo: string
  nome: string
  objetivoId: string
  objetivoCodigo: string
  objetivoNome: string
  ativo?: boolean
}

function now() {
  return new Date().toISOString()
}

export async function listObjectives(includeInactive = false) {
  try {
    console.log('[listObjectives] Iniciando busca de objetivos...')
    console.log('[listObjectives] Variáveis de ambiente:', {
      hasAppId: !!process.env.NEXT_PUBLIC_INSTANTDB_APP_ID,
      hasAdminToken: !!process.env.INSTANTDB_ADMIN_TOKEN,
    })
    
    const db = getAdminDb()
    console.log('[listObjectives] adminDb obtido com sucesso')
    
    // Tentar query simples primeiro
    console.log('[listObjectives] Executando query...')
    const res = await db.query({
      objetivos: {},
    })
    
    console.log('[listObjectives] Query executada com sucesso')
    console.log('[listObjectives] Tipo da resposta:', typeof res)
    console.log('[listObjectives] Resposta bruta do banco:', JSON.stringify(res, null, 2))
    
    const objetivos = res?.objetivos || []
    console.log(`[listObjectives] Encontrados ${objetivos.length} objetivos no banco (includeInactive: ${includeInactive})`)
    
    // Ordenar por código
    const sorted = objetivos.sort((a: any, b: any) => (a.codigo || '').localeCompare(b.codigo || ''))
    
    // Filtrar no código se necessário
    const filtered = includeInactive ? sorted : sorted.filter((o: any) => o.ativo === true)
    console.log(`[listObjectives] Retornando ${filtered.length} objetivos após filtro`)
    
    return filtered
  } catch (error) {
    console.error('[listObjectives] ERRO ao buscar objetivos:', error)
    const err = error as any
    if (err.body) {
      console.error('[listObjectives] Detalhe body:', JSON.stringify(err.body, null, 2))
    }
    if (err.hint) {
      console.error('[listObjectives] Detalhe hint:', JSON.stringify(err.hint, null, 2))
    }
    if (err.stack) {
      console.error('[listObjectives] Stack trace:', err.stack)
    }
    // Re-throw com mensagem mais clara
    throw new Error(`Erro ao listar objetivos: ${err.message || 'Erro desconhecido'}`)
  }
}

export async function listIndicators(includeInactive = false) {
  try {
    console.log('[listIndicators] Iniciando busca de indicadores...')
    console.log('[listIndicators] Variáveis de ambiente:', {
      hasAppId: !!process.env.NEXT_PUBLIC_INSTANTDB_APP_ID,
      hasAdminToken: !!process.env.INSTANTDB_ADMIN_TOKEN,
    })
    
    const db = getAdminDb()
    console.log('[listIndicators] adminDb obtido com sucesso')
    
    // Tentar query simples primeiro
    console.log('[listIndicators] Executando query...')
    const res = await db.query({
      indicadores: {},
    })
    
    console.log('[listIndicators] Query executada com sucesso')
    console.log('[listIndicators] Tipo da resposta:', typeof res)
    console.log('[listIndicators] Resposta bruta do banco:', JSON.stringify(res, null, 2))
    
    const indicadores = res?.indicadores || []
    console.log(`[listIndicators] Encontrados ${indicadores.length} indicadores no banco (includeInactive: ${includeInactive})`)
    
    // Ordenar por nome
    const sorted = indicadores.sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || ''))
    
    const filtered = includeInactive ? sorted : sorted.filter((i: any) => i.ativo === true)
    console.log(`[listIndicators] Retornando ${filtered.length} indicadores após filtro`)
    return filtered
  } catch (error) {
    console.error('[listIndicators] ERRO ao buscar indicadores:', error)
    const err = error as any
    if (err.body) {
      console.error('[listIndicators] Detalhe body:', JSON.stringify(err.body, null, 2))
    }
    if (err.hint) {
      console.error('[listIndicators] Detalhe hint:', JSON.stringify(err.hint, null, 2))
    }
    if (err.stack) {
      console.error('[listIndicators] Stack trace:', err.stack)
    }
    // Re-throw com mensagem mais clara
    throw new Error(`Erro ao listar indicadores: ${err.message || 'Erro desconhecido'}`)
  }
}

export async function createObjective(payload: ObjectivePayload) {
  const db = getAdminDb()
  const timestamp = now()
  const newId = id()
  await db.transact([
    db.tx.objetivos[newId].update({
      codigo: payload.codigo,
      nome: payload.nome,
      descricao: payload.descricao || '',
      ativo: payload.ativo ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ])
  return newId
}

export async function updateObjective(objectiveId: string, payload: Partial<ObjectivePayload>) {
  const db = getAdminDb()
  await db.transact([
    db.tx.objetivos[objectiveId].update({
      ...payload,
      updatedAt: now(),
    }),
  ])
}

export async function softDeleteObjective(objectiveId: string) {
  const db = getAdminDb()
  const timestamp = now()
  await db.transact([
    db.tx.objetivos[objectiveId].update({
      ativo: false,
      updatedAt: timestamp,
    }),
  ])
  // Desativar indicadores vinculados
  const indicadores = await db.query({
    indicadores: {
      $: {
        where: { objetivoId },
      },
    },
  })

  const txs =
    indicadores.indicadores?.map((ind) =>
      db.tx.indicadores[ind.id].update({ ativo: false, updatedAt: timestamp })
    ) || []

  if (txs.length) {
    await db.transact(txs)
  }
}

export async function createIndicator(payload: IndicatorPayload) {
  const db = getAdminDb()
  const timestamp = now()
  const newId = id()
  await db.transact([
    db.tx.indicadores[newId].update({
      codigo: payload.codigo,
      nome: payload.nome,
      objetivoId: payload.objetivoId,
      objetivoCodigo: payload.objetivoCodigo,
      objetivoNome: payload.objetivoNome,
      ativo: payload.ativo ?? true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ])
  return newId
}

export async function updateIndicator(indicatorId: string, payload: Partial<IndicatorPayload>) {
  const db = getAdminDb()
  await db.transact([
    db.tx.indicadores[indicatorId].update({
      ...payload,
      updatedAt: now(),
    }),
  ])
}

export async function softDeleteIndicator(indicatorId: string) {
  const db = getAdminDb()
  await db.transact([
    db.tx.indicadores[indicatorId].update({
      ativo: false,
      updatedAt: now(),
    }),
  ])
}
