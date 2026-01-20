import { init } from '@instantdb/admin'
// import { dbSchema } from '@/schema'

const appId = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID
const adminToken = process.env.INSTANTDB_ADMIN_TOKEN

if (!appId) {
  console.error('[instantdb] ERRO: NEXT_PUBLIC_INSTANTDB_APP_ID não configurado.')
}

if (!adminToken) {
  console.error('[instantdb] ERRO: INSTANTDB_ADMIN_TOKEN não configurado. Operações admin vão falhar.')
}

// Inicializar adminDb apenas se tiver as credenciais necessárias
// Removendo schema temporariamente para testar - pode estar causando problemas
let adminDb: ReturnType<typeof init> | null = null

try {
  if (appId && adminToken) {
    console.log('[instantAdmin] Inicializando adminDb...')
    console.log('[instantAdmin] appId:', appId ? `${appId.substring(0, 10)}...` : 'não configurado')
    console.log('[instantAdmin] adminToken:', adminToken ? `${adminToken.substring(0, 10)}...` : 'não configurado')
    adminDb = init({
      appId,
      adminToken,
      // schema: dbSchema, // Comentado temporariamente - pode estar causando erro
    })
    console.log('[instantAdmin] adminDb inicializado com sucesso')
  } else {
    const missing = []
    if (!appId) missing.push('NEXT_PUBLIC_INSTANTDB_APP_ID')
    if (!adminToken) missing.push('INSTANTDB_ADMIN_TOKEN')
    console.error(`[instantAdmin] ERRO: Não foi possível inicializar adminDb - faltam: ${missing.join(', ')}`)
  }
} catch (error) {
  console.error('[instantAdmin] ERRO ao inicializar adminDb:', error)
  if (error instanceof Error) {
    console.error('[instantAdmin] Mensagem:', error.message)
    console.error('[instantAdmin] Stack:', error.stack)
  }
}

// Exportar adminDb ou lançar erro se não estiver configurado
export { adminDb }

// Função helper para garantir que adminDb está configurado
export function getAdminDb() {
  if (!adminDb) {
    const missing = []
    if (!process.env.NEXT_PUBLIC_INSTANTDB_APP_ID) missing.push('NEXT_PUBLIC_INSTANTDB_APP_ID')
    if (!process.env.INSTANTDB_ADMIN_TOKEN) missing.push('INSTANTDB_ADMIN_TOKEN')
    const errorMsg = `adminDb não está inicializado. Variáveis faltando: ${missing.join(', ')}`
    console.error(`[getAdminDb] ${errorMsg}`)
    throw new Error(errorMsg)
  }
  return adminDb
}
