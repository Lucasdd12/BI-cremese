// @ts-nocheck
const { init, id } = require('@instantdb/admin')
const { objetivosSeed } = require('../lib/objectives')

const appId = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID
const adminToken = process.env.INSTANTDB_ADMIN_TOKEN

if (!appId || !adminToken) {
  console.error('Defina NEXT_PUBLIC_INSTANTDB_APP_ID e INSTANTDB_ADMIN_TOKEN antes de rodar o seed.')
  process.exit(1)
}

const db = init({
  appId,
  adminToken,
})

function now() {
  return new Date().toISOString()
}

async function upsertObjective(codigo: string, nome: string, descricao = '') {
  const timestamp = now()
  const existing = await db.query({
    objetivos: {
      $: {
        where: { codigo },
      },
    },
  })

  if (existing.objetivos?.length) {
    const obj = existing.objetivos[0]
    await db.transact([
      db.tx.objetivos[obj.id].update({
        nome,
        descricao,
        ativo: true,
        updatedAt: timestamp,
      }),
    ])
    return obj.id as string
  }

  const newId = id()
  await db.transact([
    db.tx.objetivos[newId].update({
      codigo,
      nome,
      descricao,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ])
  return newId
}

async function upsertIndicator(
  codigo: string,
  nome: string,
  objetivoId: string,
  objetivoCodigo: string,
  objetivoNome: string
) {
  const timestamp = now()

  const existing = await db.query({
    indicadores: {
      $: {
        where: { codigo, objetivoCodigo },
      },
    },
  })

  if (existing.indicadores?.length) {
    const ind = existing.indicadores[0]
    await db.transact([
      db.tx.indicadores[ind.id].update({
        nome,
        objetivoId,
        objetivoCodigo,
        objetivoNome,
        ativo: true,
        updatedAt: timestamp,
      }),
    ])
    return
  }

  await db.transact([
    db.tx.indicadores[id()].update({
      codigo,
      nome,
      objetivoId,
      objetivoCodigo,
      objetivoNome,
      ativo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ])
}

async function main() {
  for (const objetivo of objetivosSeed) {
    const objetivoId = await upsertObjective(objetivo.codigo, objetivo.nome, objetivo.descricao || '')

    for (const indicador of objetivo.indicadores) {
      await upsertIndicator(
        indicador.codigo,
        indicador.nome,
        objetivoId,
        objetivo.codigo,
        objetivo.nome
      )
    }
  }

  console.log('Seed concluído com sucesso.')
}

main().catch((err) => {
  console.error('Erro ao rodar seed:', err)
  if (err?.body) {
    console.error('Detalhe body:', JSON.stringify(err.body, null, 2))
  }
  if (err?.hint) {
    console.error('Detalhe hint:', JSON.stringify(err.hint, null, 2))
  }
  process.exit(1)
})
