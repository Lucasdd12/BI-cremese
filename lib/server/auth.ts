import { NextRequest } from 'next/server'
import { ADMIN_HEADER_NAME } from '../constants'

export function requireAdmin(req: NextRequest) {
  const headerToken = req.headers.get(ADMIN_HEADER_NAME) || ''
  const envToken = process.env.ADMIN_API_TOKEN || ''

  if (!envToken) {
    throw new Error('ADMIN_API_TOKEN não configurado no ambiente.')
  }

  if (headerToken !== envToken) {
    const error = new Error('Acesso não autorizado')
    ;(error as any).status = 401
    throw error
  }
}

export function getAdminHeaderName() {
  return ADMIN_HEADER_NAME
}
