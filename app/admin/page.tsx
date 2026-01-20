'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { ADMIN_HEADER_NAME } from '@/lib/constants'
import { Save, Trash2, Eye, EyeOff, ShieldAlert, RefreshCcw, UserPlus, Users, Edit2, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/hooks/useAuth'

type Objective = {
  id: string
  codigo: string
  nome: string
  descricao?: string
  ativo: boolean
}

type Indicator = {
  id: string
  codigo: string
  nome: string
  objetivoId: string
  objetivoCodigo: string
  objetivoNome: string
  ativo: boolean
}

type Toast = { type: 'success' | 'error'; text: string }

type User = {
  id: string
  email: string
  name: string
  role: 'admin' | 'staff'
  createdAt: string
  updatedAt: string
}

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  // Try to get auth token from InstantDB localStorage as fallback
  // Cookies should be sent automatically, but this ensures token is available
  let authToken: string | null = null
  if (typeof window !== 'undefined') {
    const appId = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || '1ba42d05-90b9-4d1a-80c7-38e9cb8ce7d2'
    const possibleKeys = [
      `instant_auth_token_${appId}`,
      `instant-auth-token-${appId}`,
      'instant_auth_token',
      'instant-auth-token',
      'instant_refresh_token',
      'instant-refresh-token',
    ]
    for (const key of possibleKeys) {
      const token = localStorage.getItem(key)
      if (token) {
        authToken = token
        break
      }
    }
  }
  
  // Merge headers to include Authorization if token found
  const headers = new Headers(init?.headers)
  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`)
  }
  
  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include', // Ensure cookies are sent
  })
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const errorMsg = body.message || body.error || 'Erro na requisição'
    const details = body.details ? `\nDetalhes: ${JSON.stringify(body.details, null, 2)}` : ''
    console.error(`[fetchJson] Erro ${res.status} em ${url}:`, body)
    throw new Error(`${errorMsg}${details}`)
  }
  return res.json()
}

export default function AdminPage() {
  const { user: currentUser, isAdmin, logout, loading: authLoading } = useAuth()
  const [objetivos, setObjetivos] = useState<Objective[]>([])
  const [indicadores, setIndicadores] = useState<Indicator[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const [adminToken, setAdminToken] = useState('')
  const [saving, setSaving] = useState(false)

  // Debug: log auth state
  useEffect(() => {
    console.log('[AdminPage] Auth state:', {
      currentUser,
      isAdmin,
      authLoading,
    })
  }, [currentUser, isAdmin, authLoading])

  const [novoObjetivo, setNovoObjetivo] = useState({ codigo: '', nome: '', descricao: '' })
  const [novoIndicador, setNovoIndicador] = useState({
    codigo: '',
    nome: '',
    objetivoId: '',
  })
  const [novoUsuario, setNovoUsuario] = useState({ email: '', name: '', role: 'staff' as 'admin' | 'staff' })
  const [editingUser, setEditingUser] = useState<User | null>(null)

  const indicadoresPorObjetivo = useMemo(() => {
    return indicadores.reduce<Record<string, Indicator[]>>((acc, indicador) => {
      if (!acc[indicador.objetivoId]) acc[indicador.objetivoId] = []
      acc[indicador.objetivoId].push(indicador)
      return acc
    }, {})
  }, [indicadores])

  // Função para formatar código e nome sem duplicar a sigla
  const formatarCodigoNome = (codigo: string, nome: string) => {
    // Se o nome já começa com o código seguido de " - ", retorna apenas o nome
    if (nome.startsWith(`${codigo} - `)) {
      return nome
    }
    // Caso contrário, retorna "código - nome"
    return `${codigo} - ${nome}`
  }

  const showToast = useCallback((next: Toast) => {
    setToast(next)
    setTimeout(() => setToast(null), 3500)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [objRes, indRes] = await Promise.all([
        fetchJson<{ objetivos: Objective[] }>('/api/objetivos?includeInactive=true'),
        fetchJson<{ indicadores: Indicator[] }>('/api/indicadores?includeInactive=true'),
      ])
      console.log('[AdminPage] Objetivos recebidos:', objRes.objetivos?.length || 0)
      console.log('[AdminPage] Indicadores recebidos:', indRes.indicadores?.length || 0)
      setObjetivos(objRes.objetivos || [])
      setIndicadores(indRes.indicadores || [])
      if ((objRes.objetivos || []).length === 0 && (indRes.indicadores || []).length === 0) {
        showToast({ 
          type: 'error', 
          text: 'Nenhum dado encontrado. Verifique se o seed foi executado ou se há dados no banco.' 
        })
      }
    } catch (error) {
      console.error('[AdminPage] Erro ao carregar dados:', error)
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setIsLoading(false)
    }
  }, [showToast])

  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      setUsers([])
      return
    }
    try {
      const res = await fetchJson<{ users: User[] }>('/api/users')
      setUsers(res.users || [])
      console.log('[AdminPage] Usuários carregados:', res.users?.length || 0)
    } catch (error) {
      console.error('[AdminPage] Erro ao carregar usuários:', error)
      // Don't show toast for 401/403 errors - user might not be admin yet
      const err = error as any
      if (err.message?.includes('Acesso negado') || err.message?.includes('Não autenticado')) {
        setUsers([])
        return
      }
      showToast({ type: 'error', text: (error as Error).message })
    }
  }, [isAdmin, showToast])

  useEffect(() => {
    const stored = window.localStorage.getItem('adminToken')
    if (stored) {
      setAdminToken(stored)
    }
    loadData()
  }, [loadData])

  // Load users when admin status changes
  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    } else {
      setUsers([])
    }
  }, [isAdmin, loadUsers])

  const authHeaders = useMemo((): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (adminToken) {
      headers[ADMIN_HEADER_NAME] = adminToken
    }
    return headers
  }, [adminToken])

  const ensureToken = () => {
    if (!adminToken) {
      showToast({ type: 'error', text: 'Informe o token de admin para salvar.' })
      return false
    }
    window.localStorage.setItem('adminToken', adminToken)
    return true
  }

  const handleCreateObjetivo = async () => {
    if (!ensureToken()) return
    if (!novoObjetivo.codigo || !novoObjetivo.nome) {
      showToast({ type: 'error', text: 'Código e nome são obrigatórios.' })
      return
    }
    setSaving(true)
    try {
      await fetchJson('/api/objetivos', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(novoObjetivo),
      })
      setNovoObjetivo({ codigo: '', nome: '', descricao: '' })
      await loadData()
      showToast({ type: 'success', text: 'Objetivo criado.' })
    } catch (error) {
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleObjetivo = async (objetivo: Objective) => {
    if (!ensureToken()) return
    setSaving(true)
    try {
      await fetchJson(`/api/objetivos/${objetivo.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ ...objetivo, ativo: !objetivo.ativo }),
      })
      await loadData()
      showToast({ type: 'success', text: 'Status do objetivo atualizado.' })
    } catch (error) {
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteObjetivo = async (objetivo: Objective) => {
    if (!ensureToken()) return
    if (!confirm('Desativar este objetivo e seus indicadores?')) return
    setSaving(true)
    try {
      await fetchJson(`/api/objetivos/${objetivo.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      await loadData()
      showToast({ type: 'success', text: 'Objetivo desativado.' })
    } catch (error) {
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateIndicador = async () => {
    if (!ensureToken()) return
    if (!novoIndicador.codigo || !novoIndicador.nome || !novoIndicador.objetivoId) {
      showToast({ type: 'error', text: 'Preencha código, nome e objetivo.' })
      return
    }
    setSaving(true)
    try {
      await fetchJson('/api/indicadores', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify(novoIndicador),
      })
      setNovoIndicador({ codigo: '', nome: '', objetivoId: '' })
      await loadData()
      showToast({ type: 'success', text: 'Indicador criado.' })
    } catch (error) {
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleIndicador = async (indicador: Indicator) => {
    if (!ensureToken()) return
    setSaving(true)
    try {
      await fetchJson(`/api/indicadores/${indicador.id}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ ...indicador, ativo: !indicador.ativo }),
      })
      await loadData()
      showToast({ type: 'success', text: 'Status do indicador atualizado.' })
    } catch (error) {
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteIndicador = async (indicador: Indicator) => {
    if (!ensureToken()) return
    if (!confirm('Desativar este indicador?')) return
    setSaving(true)
    try {
      await fetchJson(`/api/indicadores/${indicador.id}`, {
        method: 'DELETE',
        headers: authHeaders,
      })
      await loadData()
      showToast({ type: 'success', text: 'Indicador desativado.' })
    } catch (error) {
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleRunSeed = async () => {
    if (!ensureToken()) return
    setSaving(true)
    try {
      await fetchJson('/api/admin/seed', {
        method: 'POST',
        headers: authHeaders,
      })
      await loadData()
      showToast({ type: 'success', text: 'Seed aplicada com sucesso.' })
    } catch (error) {
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleCreateUser = async () => {
    if (!isAdmin) {
      showToast({ type: 'error', text: 'Apenas administradores podem criar usuários.' })
      return
    }
    if (!novoUsuario.email || !novoUsuario.name) {
      showToast({ type: 'error', text: 'Email e nome são obrigatórios.' })
      return
    }
    setSaving(true)
    try {
      const result = await fetchJson<{ message: string; userId: string }>('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoUsuario),
      })
      setNovoUsuario({ email: '', name: '', role: 'staff' })
      await loadUsers()
      showToast({ 
        type: 'success', 
        text: result.message || 'Usuário criado com sucesso. Um código de acesso foi enviado para o email.' 
      })
    } catch (error) {
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateUser = async (user: User) => {
    if (!isAdmin) return
    setSaving(true)
    try {
      await fetchJson(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editingUser?.email || user.email,
          name: editingUser?.name || user.name,
          role: editingUser?.role || user.role,
        }),
      })
      setEditingUser(null)
      await loadUsers()
      showToast({ type: 'success', text: 'Usuário atualizado com sucesso.' })
    } catch (error) {
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!isAdmin) return
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return
    setSaving(true)
    try {
      await fetchJson(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
      await loadUsers()
      showToast({ type: 'success', text: 'Usuário deletado com sucesso.' })
    } catch (error) {
      showToast({ type: 'error', text: (error as Error).message })
    } finally {
      setSaving(false)
    }
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0c2c3f] to-[#0d7ba8] p-4 md:p-8">
      <div className="max-w-5xl mx-auto bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Administração</h1>
            <p className="text-gray-600">Gerencie objetivos e indicadores.</p>
            {authLoading && <p className="text-xs text-gray-500 mt-1">Carregando autenticação...</p>}
            {!authLoading && (
              <p className="text-xs text-gray-500 mt-1">
                {isAdmin ? '✓ Você é administrador' : '⚠ Você não é administrador'}
                {currentUser && ` - ${currentUser.name} (${currentUser.role})`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              Voltar
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition"
            >
              Dashboard
            </Link>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="md:col-span-2">
            <label className="text-sm text-gray-700 font-medium">Token de Admin</label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder={`Header ${ADMIN_HEADER_NAME}`}
              className="w-full mt-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              O token é salvo localmente para facilitar os próximos acessos.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 transition disabled:opacity-60"
            >
              <RefreshCcw className="w-4 h-4" />
              Recarregar
            </button>
            <button
              onClick={handleRunSeed}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              Rodar seed
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Novo Objetivo</h2>
              <ShieldAlert className="w-5 h-5 text-gray-500" />
            </div>
            <div className="space-y-3">
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent"
                placeholder="Código (ex: OB6)"
                value={novoObjetivo.codigo}
                onChange={(e) => setNovoObjetivo((prev) => ({ ...prev, codigo: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent"
                placeholder="Nome completo"
                value={novoObjetivo.nome}
                onChange={(e) => setNovoObjetivo((prev) => ({ ...prev, nome: e.target.value }))}
              />
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent"
                placeholder="Descrição (opcional)"
                rows={2}
                value={novoObjetivo.descricao}
                onChange={(e) =>
                  setNovoObjetivo((prev) => ({ ...prev, descricao: e.target.value }))
                }
              />
              <button
                onClick={handleCreateObjetivo}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-[#179dd4] text-white px-4 py-2 rounded-lg hover:bg-[#0d7ba8] transition disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                Criar Objetivo
              </button>
            </div>
          </section>

          <section className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Novo Indicador</h2>
              <ShieldAlert className="w-5 h-5 text-gray-500" />
            </div>
            <div className="space-y-3">
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent"
                value={novoIndicador.objetivoId}
                onChange={(e) =>
                  setNovoIndicador((prev) => ({ ...prev, objetivoId: e.target.value }))
                }
              >
                <option value="">Selecione um objetivo</option>
                {objetivos.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {formatarCodigoNome(obj.codigo, obj.nome)}
                  </option>
                ))}
              </select>
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent"
                placeholder="Código (ex: IND01)"
                value={novoIndicador.codigo}
                onChange={(e) => setNovoIndicador((prev) => ({ ...prev, codigo: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent"
                placeholder="Nome"
                value={novoIndicador.nome}
                onChange={(e) => setNovoIndicador((prev) => ({ ...prev, nome: e.target.value }))}
              />
              <button
                onClick={handleCreateIndicador}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-[#179dd4] text-white px-4 py-2 rounded-lg hover:bg-[#0d7ba8] transition disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                Criar Indicador
              </button>
            </div>
          </section>
        </div>

        <div className="mt-8 space-y-6">
          <section className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Objetivos</h3>
              {isLoading && <span className="text-sm text-gray-500">Carregando...</span>}
            </div>
            <div className="space-y-2">
              {objetivos.map((obj) => (
                <div
                  key={obj.id}
                  className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formatarCodigoNome(obj.codigo, obj.nome)}
                    </p>
                    {obj.descricao && <p className="text-sm text-gray-600">{obj.descricao}</p>}
                    <p className="text-xs text-gray-500">
                      {obj.ativo ? 'Ativo' : 'Inativo'} ·{' '}
                      {(indicadoresPorObjetivo[obj.id] || []).length} indicadores
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleObjetivo(obj)}
                      className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                    >
                      {obj.ativo ? (
                        <span className="flex items-center gap-1">
                          <EyeOff className="w-4 h-4" /> Ocultar
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" /> Reativar
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteObjetivo(obj)}
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                    >
                      <span className="flex items-center gap-1">
                        <Trash2 className="w-4 h-4" /> Desativar
                      </span>
                    </button>
                  </div>
                </div>
              ))}
              {objetivos.length === 0 && (
                <p className="text-sm text-gray-500">Nenhum objetivo cadastrado.</p>
              )}
            </div>
          </section>

          <section className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Indicadores</h3>
              {isLoading && <span className="text-sm text-gray-500">Carregando...</span>}
            </div>
            <div className="space-y-2">
              {indicadores.map((ind) => (
                <div
                  key={ind.id}
                  className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {formatarCodigoNome(ind.codigo, ind.nome)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Objetivo: {formatarCodigoNome(ind.objetivoCodigo, ind.objetivoNome)}
                    </p>
                    <p className="text-xs text-gray-500">{ind.ativo ? 'Ativo' : 'Inativo'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleIndicador(ind)}
                      className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                    >
                      {ind.ativo ? (
                        <span className="flex items-center gap-1">
                          <EyeOff className="w-4 h-4" /> Ocultar
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" /> Reativar
                        </span>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteIndicador(ind)}
                      className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                    >
                      <span className="flex items-center gap-1">
                        <Trash2 className="w-4 h-4" /> Desativar
                      </span>
                    </button>
                  </div>
                </div>
              ))}
              {indicadores.length === 0 && (
                <p className="text-sm text-gray-500">Nenhum indicador cadastrado.</p>
              )}
            </div>
          </section>

          {isAdmin && (
            <section className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Gerenciar Usuários
                </h3>
                {isLoading && <span className="text-sm text-gray-500">Carregando...</span>}
              </div>

              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Novo Usuário</h4>
                <div className="space-y-3">
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent"
                    placeholder="Email"
                    type="email"
                    value={novoUsuario.email}
                    onChange={(e) => setNovoUsuario((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <input
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent"
                    placeholder="Nome"
                    value={novoUsuario.name}
                    onChange={(e) => setNovoUsuario((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent"
                    value={novoUsuario.role}
                    onChange={(e) => setNovoUsuario((prev) => ({ ...prev, role: e.target.value as 'admin' | 'staff' }))}
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={handleCreateUser}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-[#179dd4] text-white px-4 py-2 rounded-lg hover:bg-[#0d7ba8] transition disabled:opacity-60"
                  >
                    <UserPlus className="w-4 h-4" />
                    Criar Usuário
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="border border-gray-200 rounded-lg p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                  >
                    {editingUser?.id === user.id ? (
                      <div className="flex-1 space-y-2">
                        <input
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        />
                        <input
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          value={editingUser.name}
                          onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                        />
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as 'admin' | 'staff' })}
                        >
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateUser(user)}
                            disabled={saving}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          <p className="text-xs text-gray-500">
                            {user.role === 'admin' ? 'Administrador' : 'Staff'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingUser({ ...user })}
                            className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                          >
                            <span className="flex items-center gap-1">
                              <Edit2 className="w-4 h-4" /> Editar
                            </span>
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="px-3 py-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                            >
                              <span className="flex items-center gap-1">
                                <Trash2 className="w-4 h-4" /> Deletar
                              </span>
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-sm text-gray-500">Nenhum usuário cadastrado.</p>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg text-white ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.text}
        </div>
      )}
    </div>
  )
}
