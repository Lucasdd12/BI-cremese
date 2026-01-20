'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Calendar, Target, FileText, TrendingUp, Lightbulb, Trash2, BarChart3, Settings } from 'lucide-react'
import { id } from '@instantdb/react'
import { db } from '@/db'
import Link from 'next/link'
import { indicadoresSeed, objetivosSeed } from '@/lib/objectives'

interface Measurement {
  id: string
  data: string
  objetivo: string
  indicador: string
  responsavel: string
  resultadoAtual: string
  meta: string
  fatoresResultado: string
  condutaMelhoria: string
  createdAt: string
}

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

export default function LancamentoMedicoes() {
  const { user, isLoading: authLoading } = db.useAuth()
  const router = useRouter()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/')
    }
  }, [user, authLoading, router])

  const { data, isLoading } = db.useQuery({
    medicoes: {
      $: {
        order: { serverCreatedAt: 'desc' },
      },
    },
    objetivos: {
      $: {
        where: { ativo: true },
      },
    },
    indicadores: {
      $: {
        where: { ativo: true },
      },
    },
  })

  const [formData, setFormData] = useState({
    dataMedicao: '',
    objetivoEstrategico: '',
    nomeIndicador: '',
    responsavelIndicador: '',
    resultadoAtual: '',
    meta: '',
    fatoresResultado: '',
    condutaMelhoria: '',
  })

  const [selectedObjetivoId, setSelectedObjetivoId] = useState<string>('')

  const [showToast, setShowToast] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const historico: Measurement[] = (data?.medicoes || []) as Measurement[]

  const objetivosDb = (data?.objetivos || []) as Objective[]
  const indicadoresDb = (data?.indicadores || []) as Indicator[]

  const objetivosLista = useMemo(() => {
    if (objetivosDb.length) return objetivosDb
    return objetivosSeed.map((obj) => ({
      id: obj.codigo,
      codigo: obj.codigo,
      nome: obj.nome,
      descricao: obj.descricao,
      ativo: obj.ativo ?? true,
    }))
  }, [objetivosDb])

  const indicadoresLista = useMemo(() => {
    const lista = indicadoresDb.length 
      ? indicadoresDb
      : indicadoresSeed.map((ind) => ({
          id: `${ind.objetivoCodigo}-${ind.codigo}`,
          codigo: ind.codigo,
          nome: ind.nome,
          objetivoId: ind.objetivoCodigo,
          objetivoCodigo: ind.objetivoCodigo,
          objetivoNome: ind.objetivoNome,
          ativo: ind.ativo ?? true,
        }))
    return lista.sort((a, b) => a.nome.localeCompare(b.nome))
  }, [indicadoresDb])

  useEffect(() => {
    if (!selectedObjetivoId && objetivosLista.length) {
      const first = objetivosLista[0]
      setSelectedObjetivoId(first.id)
      setFormData((prev) => ({
        ...prev,
        objetivoEstrategico: first.nome,
      }))
    }
  }, [objetivosLista, selectedObjetivoId])

  const indicadoresDisponiveis = useMemo(() => {
    const objetivo = objetivosLista.find((o) => o.id === selectedObjetivoId)
    if (!objetivo) return []
    return indicadoresLista.filter(
      (ind) => ind.objetivoId === objetivo.id || ind.objetivoCodigo === objetivo.codigo
    )
  }, [indicadoresLista, objetivosLista, selectedObjetivoId])

  // Função para garantir que o indicador sempre apareça no formato "SIGLA - Nome por extenso"
  const formatarIndicador = (indicador: string): string => {
    if (!indicador) return indicador
    
    // Se já está no formato correto, retorna como está
    if (indicador.includes(' - ')) return indicador
    
    const encontrado = indicadoresLista.find(
      (ind) =>
        ind.codigo.toLowerCase() === indicador.toLowerCase() ||
        ind.nome.toLowerCase().includes(indicador.toLowerCase())
    )
    if (encontrado) return encontrado.nome
    
    // Se não encontrou, retorna como está
    return indicador
  }

  const handleObjetivoChange = (objetivoId: string) => {
    setSelectedObjetivoId(objetivoId)
    const objetivo = objetivosLista.find((obj) => obj.id === objetivoId)
    setFormData((prev) => ({
      ...prev,
      objetivoEstrategico: objetivo?.nome || '',
      nomeIndicador: '',
    }))
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validação básica
    if (
      !formData.dataMedicao ||
      !formData.objetivoEstrategico ||
      !formData.nomeIndicador ||
      !formData.responsavelIndicador ||
      !formData.resultadoAtual ||
      !formData.meta ||
      !formData.fatoresResultado ||
      !formData.condutaMelhoria
    ) {
      setToastMessage('Por favor, preencha todos os campos obrigatórios.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      return
    }

    try {
      db.transact([
        db.tx.medicoes[id()].update({
          data: formData.dataMedicao,
          objetivo: formData.objetivoEstrategico,
          indicador: formData.nomeIndicador,
          responsavel: formData.responsavelIndicador,
          resultadoAtual: formData.resultadoAtual,
          meta: formData.meta,
          fatoresResultado: formData.fatoresResultado,
          condutaMelhoria: formData.condutaMelhoria,
          createdAt: new Date().toISOString(),
        }),
      ])

      // Limpar formulário
      setFormData({
        dataMedicao: '',
        objetivoEstrategico: '',
        nomeIndicador: '',
        responsavelIndicador: '',
        resultadoAtual: '',
        meta: '',
        fatoresResultado: '',
        condutaMelhoria: '',
      })

      // Mostrar toast de sucesso
      setToastMessage('Medição salva com sucesso!')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      console.error('Erro ao salvar medição:', error)
      setToastMessage('Erro ao salvar medição. Tente novamente.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este lançamento?')) {
      return
    }

    try {
      db.transact([db.tx.medicoes[id].delete()])
      setToastMessage('Lançamento excluído com sucesso!')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      console.error('Erro ao excluir medição:', error)
      setToastMessage('Erro ao excluir medição. Tente novamente.')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#179dd4] p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-bold text-white mb-2">
              Lançamento de Medições Cremese
            </h1>
            <p className="text-white text-base md:text-lg opacity-90">
              Acompanhamento do Mapa Estratégico
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 shadow-lg"
            >
              <BarChart3 className="w-5 h-5" />
              Dashboard
            </Link>
            <Link
              href="/admin"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 shadow-lg"
            >
              <Settings className="w-5 h-5" />
              Admin
            </Link>
          </div>
        </div>

        {/* Card Principal */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 md:p-8 mb-6 md:mb-8">
          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Data da Medição */}
            <div>
              <label htmlFor="dataMedicao" className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline-block w-4 h-4 mr-2" />
                Data da Medição <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="dataMedicao"
                name="dataMedicao"
                value={formData.dataMedicao}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent outline-none transition"
              />
            </div>

            {/* Objetivo Estratégico */}
            <div>
              <label htmlFor="objetivoEstrategico" className="block text-sm font-medium text-gray-700 mb-2">
                <Target className="inline-block w-4 h-4 mr-2" />
                Objetivo Estratégico <span className="text-red-500">*</span>
              </label>
              <select
                id="objetivoEstrategico"
                name="objetivoEstrategico"
                value={selectedObjetivoId}
                onChange={(e) => handleObjetivoChange(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent outline-none transition"
              >
                <option value="">Selecione um objetivo estratégico</option>
                {objetivosLista.map((obj) => (
                  <option key={obj.id} value={obj.id}>
                    {obj.codigo} - {obj.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Nome do Indicador */}
            <div>
              <label htmlFor="nomeIndicador" className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="inline-block w-4 h-4 mr-2" />
                Nome do Indicador <span className="text-red-500">*</span>
              </label>
              <select
                id="nomeIndicador"
                name="nomeIndicador"
                value={formData.nomeIndicador}
                onChange={handleChange}
                required
                disabled={!selectedObjetivoId || indicadoresDisponiveis.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent outline-none transition disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="">
                  {selectedObjetivoId
                    ? indicadoresDisponiveis.length > 0
                      ? 'Selecione um indicador'
                      : 'Nenhum indicador cadastrado para este objetivo'
                    : 'Selecione primeiro um objetivo estratégico'}
                </option>
                {indicadoresDisponiveis.map(indicador => (
                  <option key={indicador.id} value={indicador.nome}>
                    {indicador.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Responsável pelo Indicador */}
            <div>
              <label htmlFor="responsavelIndicador" className="block text-sm font-medium text-gray-700 mb-2">
                Responsável pelo Indicador <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="responsavelIndicador"
                name="responsavelIndicador"
                value={formData.responsavelIndicador}
                onChange={handleChange}
                required
                placeholder="Ex: Viviane, Melba ..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent outline-none transition"
              />
            </div>

            {/* Resultado Atual do Indicador */}
            <div>
              <label htmlFor="resultadoAtual" className="block text-sm font-medium text-gray-700 mb-2">
                <TrendingUp className="inline-block w-4 h-4 mr-2" />
                Resultado Atual do Indicador <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="resultadoAtual"
                name="resultadoAtual"
                value={formData.resultadoAtual}
                onChange={handleChange}
                required
                placeholder="Ex: 72 pontos, 15.8%, 45 dias"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent outline-none transition"
              />
            </div>

            {/* Meta */}
            <div>
              <label htmlFor="meta" className="block text-sm font-medium text-gray-700 mb-2">
                <Target className="inline-block w-4 h-4 mr-2" />
                Meta <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="meta"
                name="meta"
                value={formData.meta}
                onChange={handleChange}
                required
                placeholder="Ex: 80 pontos, 20%, 30 dias"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent outline-none transition"
              />
            </div>

            {/* Fatores que levaram a esse resultado */}
            <div>
              <label htmlFor="fatoresResultado" className="block text-sm font-medium text-gray-700 mb-2">
                Fatores que levaram a esse resultado <span className="text-red-500">*</span>
              </label>
              <textarea
                id="fatoresResultado"
                name="fatoresResultado"
                value={formData.fatoresResultado}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Descreva os fatores que influenciaram esse resultado..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent outline-none transition resize-none"
              />
            </div>

            {/* Conduta de Melhoria */}
            <div>
              <label htmlFor="condutaMelhoria" className="block text-sm font-medium text-gray-700 mb-2">
                <Lightbulb className="inline-block w-4 h-4 mr-2" />
                Conduta de Melhoria <span className="text-red-500">*</span>
              </label>
              <textarea
                id="condutaMelhoria"
                name="condutaMelhoria"
                value={formData.condutaMelhoria}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Descreva o plano de ação ou correções a serem implementadas..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#179dd4] focus:border-transparent outline-none transition resize-none"
              />
            </div>

            {/* Botão Salvar */}
            <div className="pt-2 md:pt-4">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] hover:from-[#0d7ba8] hover:to-[#179dd4] text-white font-semibold py-2.5 md:py-3 px-4 md:px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm md:text-base"
              >
                <Save className="w-4 h-4 md:w-5 md:h-5" />
                Salvar Medição
              </button>
            </div>
          </form>
        </div>

        {/* Tabela de Histórico */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-4 md:p-8">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 md:mb-6">
            Histórico de Lançamentos
          </h2>
          {isLoading ? (
            <div className="text-center py-8 text-gray-600">Carregando...</div>
          ) : historico.length === 0 ? (
            <div className="text-center py-8 text-gray-500 opacity-60">
              Nenhum lançamento encontrado
            </div>
          ) : (
            <>
              {/* Versão Desktop - Tabela */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Data</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Objetivo</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Indicador</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Responsável</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Resultado</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((item) => (
                      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 text-sm text-gray-700">{formatDate(item.data)}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{item.objetivo}</td>
                        <td className="py-3 px-4 text-sm text-gray-700 font-medium">{formatarIndicador(item.indicador)}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{item.responsavel}</td>
                        <td className="py-3 px-4 text-sm text-gray-700">{item.resultadoAtual}</td>
                        <td className="py-3 px-4 text-sm">
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50"
                            title="Excluir lançamento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Versão Mobile - Cards */}
              <div className="md:hidden space-y-4">
                {historico.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 mb-1">Data</p>
                        <p className="text-sm font-semibold text-gray-800">{formatDate(item.data)}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50"
                        title="Excluir lançamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Objetivo</p>
                        <p className="text-sm text-gray-700">{item.objetivo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Indicador</p>
                        <p className="text-sm font-medium text-gray-700">{formatarIndicador(item.indicador)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Responsável</p>
                        <p className="text-sm text-gray-700">{item.responsavel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Resultado</p>
                        <p className="text-sm text-gray-700">{item.resultadoAtual}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg animate-slide-up z-50 ${
          toastMessage.includes('Erro') ? 'bg-red-500' : 'bg-green-500'
        } text-white`}>
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {toastMessage.includes('Erro') ? (
                <path d="M6 18L18 6M6 6l12 12"></path>
              ) : (
                <path d="M5 13l4 4L19 7"></path>
              )}
            </svg>
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  )
}
