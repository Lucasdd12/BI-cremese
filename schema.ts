import { i } from '@instantdb/react'

export const dbSchema = i.schema({
  entities: {
    medicoes: i.entity({
      data: i.string(),
      objetivo: i.string(),
      indicador: i.string(),
      responsavel: i.string(),
      resultadoAtual: i.string(),
      meta: i.string(),
      fatoresResultado: i.string(),
      condutaMelhoria: i.string(),
      createdAt: i.string(),
    }),
    objetivos: i.entity({
      codigo: i.string(),
      nome: i.string(),
      descricao: i.string().optional(),
      ativo: i.boolean(),
      createdAt: i.string(),
      updatedAt: i.string(),
    }),
    indicadores: i.entity({
      codigo: i.string(),
      nome: i.string(),
      objetivoId: i.string(),
      objetivoCodigo: i.string(),
      objetivoNome: i.string(),
      ativo: i.boolean(),
      createdAt: i.string(),
      updatedAt: i.string(),
    }),
    users: i.entity({
      email: i.string(),
      name: i.string(),
      role: i.string(), // 'admin' | 'staff'
      createdAt: i.string(),
      updatedAt: i.string(),
    }),
    // Note: magicLinks are managed by InstantDB's native auth system
    // We keep our custom users table for role management
  },
})

export type AppSchema = typeof dbSchema
