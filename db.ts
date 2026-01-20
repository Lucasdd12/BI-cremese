import { init } from '@instantdb/react'
import { dbSchema } from './schema'

export const db = init({
  appId: process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || '1ba42d05-90b9-4d1a-80c7-38e9cb8ce7d2',
  schema: dbSchema,
})
