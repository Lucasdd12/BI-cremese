import { NextRequest, NextResponse } from 'next/server'
import { objetivosSeed } from '@/lib/objectives'
import { requireAdmin, getAdminHeaderName } from '@/lib/server/auth'
import {
  createIndicator,
  createObjective,
  listIndicators,
  listObjectives,
  updateIndicator,
  updateObjective,
} from '@/lib/server/objectivesService'

export async function POST(req: NextRequest) {
  try {
    requireAdmin(req)
  } catch (error) {
    const status = (error as any).status || 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }

  const existentesObjetivos = await listObjectives(true)
  const existentesIndicadores = await listIndicators(true)

  let createdObjectives = 0
  let updatedObjectives = 0
  let createdIndicators = 0
  let updatedIndicators = 0

  for (const objetivo of objetivosSeed) {
    const encontrado = existentesObjetivos.find((o) => o.codigo === objetivo.codigo)
    let objetivoId = encontrado?.id

    if (encontrado) {
      await updateObjective(encontrado.id, {
        nome: objetivo.nome,
        descricao: objetivo.descricao,
        ativo: true,
        codigo: objetivo.codigo,
      })
      objetivoId = encontrado.id
      updatedObjectives++
    } else {
      objetivoId = await createObjective({
        codigo: objetivo.codigo,
        nome: objetivo.nome,
        descricao: objetivo.descricao,
        ativo: true,
      })
      createdObjectives++
    }

    for (const indicador of objetivo.indicadores) {
      const indicadorExistente = existentesIndicadores.find(
        (ind) => ind.codigo === indicador.codigo && ind.objetivoCodigo === objetivo.codigo
      )

      if (indicadorExistente) {
        await updateIndicator(indicadorExistente.id, {
          nome: indicador.nome,
          objetivoId: objetivoId!,
          objetivoCodigo: objetivo.codigo,
          objetivoNome: objetivo.nome,
          ativo: true,
          codigo: indicador.codigo,
        })
        updatedIndicators++
      } else {
        await createIndicator({
          codigo: indicador.codigo,
          nome: indicador.nome,
          objetivoId: objetivoId!,
          objetivoCodigo: objetivo.codigo,
          objetivoNome: objetivo.nome,
          ativo: true,
        })
        createdIndicators++
      }
    }
  }

  return NextResponse.json(
    {
      message: 'Seed aplicada com sucesso.',
      createdObjectives,
      updatedObjectives,
      createdIndicators,
      updatedIndicators,
    },
    { headers: { 'x-admin-header': getAdminHeaderName() } }
  )
}
