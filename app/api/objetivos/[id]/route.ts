import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, getAdminHeaderName } from '@/lib/server/auth'
import { listObjectives, softDeleteObjective, updateObjective } from '@/lib/server/objectivesService'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const objetivos = await listObjectives(true)
  const objetivo = objetivos.find((o) => o.id === id)
  if (!objetivo) {
    return NextResponse.json({ message: 'Objetivo não encontrado' }, { status: 404 })
  }
  return NextResponse.json({ objetivo })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  try {
    requireAdmin(req)
  } catch (error) {
    const status = (error as any).status || 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }

  const body = await req.json()
  const { codigo, nome, descricao, ativo } = body || {}

  if (!codigo || !nome) {
    return NextResponse.json({ message: 'codigo e nome são obrigatórios' }, { status: 400 })
  }

  try {
    await updateObjective(id, { codigo, nome, descricao, ativo })
    return NextResponse.json(
      { message: 'Objetivo atualizado com sucesso' },
      { headers: { 'x-admin-header': getAdminHeaderName() } }
    )
  } catch (error) {
    console.error('Erro ao atualizar objetivo', error)
    return NextResponse.json({ message: 'Erro ao atualizar objetivo' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  try {
    requireAdmin(req)
  } catch (error) {
    const status = (error as any).status || 500
    return NextResponse.json({ message: (error as Error).message }, { status })
  }

  try {
    await softDeleteObjective(id)
    return NextResponse.json(
      { message: 'Objetivo desativado com sucesso' },
      { headers: { 'x-admin-header': getAdminHeaderName() } }
    )
  } catch (error) {
    console.error('Erro ao desativar objetivo', error)
    return NextResponse.json({ message: 'Erro ao desativar objetivo' }, { status: 500 })
  }
}
