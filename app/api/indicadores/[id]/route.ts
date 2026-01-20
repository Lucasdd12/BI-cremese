import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminHeaderName } from '@/lib/server/auth'
import {
  listIndicators,
  listObjectives,
  softDeleteIndicator,
  updateIndicator,
} from '@/lib/server/objectivesService'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const indicadores = await listIndicators(true)
  const indicador = indicadores.find((i) => i.id === params.id)
  if (!indicador) {
    return NextResponse.json({ message: 'Indicador não encontrado' }, { status: 404 })
  }
  return NextResponse.json({ indicador })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    const objetivo = objetivos.find((o) => o.id === objetivoId)
    if (!objetivo) {
      return NextResponse.json({ message: 'Objetivo não encontrado' }, { status: 404 })
    }

    await updateIndicator(params.id, {
      codigo,
      nome,
      objetivoId,
      objetivoCodigo: objetivo.codigo,
      objetivoNome: objetivo.nome,
      ativo,
    })

    return NextResponse.json(
      { message: 'Indicador atualizado com sucesso' },
      { headers: { 'x-admin-header': getAdminHeaderName() } }
    )
  } catch (error) {
    console.error('Erro ao atualizar indicador', error)
    return NextResponse.json({ message: 'Erro ao atualizar indicador' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    requireAdmin(req)
  } catch (error) {
    const status = (error as any).status || 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }

  try {
    await softDeleteIndicator(params.id)
    return NextResponse.json(
      { message: 'Indicador desativado com sucesso' },
      { headers: { 'x-admin-header': getAdminHeaderName() } }
    )
  } catch (error) {
    console.error('Erro ao desativar indicador', error)
    return NextResponse.json({ message: 'Erro ao desativar indicador' }, { status: 500 })
  }
}
