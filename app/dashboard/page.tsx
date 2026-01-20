'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db } from '@/db'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList, Cell, ReferenceLine } from 'recharts'
import Link from 'next/link'
import { FileText, Settings } from 'lucide-react'
// import Image from 'next/image'
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

// Função para extrair número de uma string (ex: "1,4 Mil" -> 1400, "72 pontos" -> 72, "15.8%" -> 15.8)
function parseValue(value: string): number {
  if (!value) return 0
  // Remove texto e mantém apenas números, vírgulas, pontos e hífens
  const cleaned = value.replace(/[^\d,.-]/g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  if (value.toLowerCase().includes('mil')) {
    return num * 1000
  }
  return isNaN(num) ? 0 : num
}

// Função para formatar valor para exibição
function formatValue(value: number, original: string): string {
  if (original.toLowerCase().includes('mil')) {
    return `${(value / 1000).toFixed(1).replace('.', ',')} Mil`
  }
  if (original.includes('%')) {
    return `${value.toFixed(1)}%`
  }
  if (original.toLowerCase().includes('pontos')) {
    return `${Math.round(value)} pontos`
  }
  if (original.toLowerCase().includes('dias')) {
    return `${Math.round(value)} dias`
  }
  return original
}

// Função para determinar situação baseada na tendência
function getSituacao(medicoes: Measurement[]): string {
  if (medicoes.length < 2) return 'Estável'
  
  const valores = medicoes.map(m => parseValue(m.resultadoAtual))
  const recente = valores[0]
  const anterior = valores[1]
  
  if (recente > anterior) return 'Crescente'
  if (recente < anterior) return 'Decrescente'
  return 'Estável'
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = db.useAuth()
  const router = useRouter()
  
  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/dashboard')
    }
  }, [user, authLoading, router])

  const { data, isLoading, error } = db.useQuery({
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

  // Debug: log para verificar o estado
  useEffect(() => {
    console.log('=== DASHBOARD DEBUG ===')
    console.log('isLoading:', isLoading)
    console.log('data:', data)
    console.log('error:', error)
    console.log('medicoes count:', data?.medicoes?.length || 0)
    console.log('=======================')
  }, [isLoading, data, error])

  const [objetivoSelecionado, setObjetivoSelecionado] = useState('')
  const [indicadorSelecionado, setIndicadorSelecionado] = useState<string>('')
  const [anoSelecionado, setAnoSelecionado] = useState<string>('2025')
  const [mesSelecionado, setMesSelecionado] = useState<number | null>(null) // 0-11 ou null

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
    if (!objetivoSelecionado && objetivosLista.length) {
      setObjetivoSelecionado(objetivosLista[0].id)
    }
  }, [objetivoSelecionado, objetivosLista])

  // Função para garantir que o indicador sempre apareça no formato "SIGLA - Nome por extenso"
  const formatarIndicador = useCallback((indicador: string): string => {
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
  }, [indicadoresLista])

  const medicoes: Measurement[] = data?.medicoes || []

  // Obter nome completo do objetivo
  const objetivoCompleto = objetivosLista.find(o => o.id === objetivoSelecionado)?.nome || ''

  // Filtrar medições pelo objetivo selecionado
  const medicoesDoObjetivo = useMemo(() => {
    return medicoes.filter(m => m.objetivo === objetivoCompleto)
  }, [medicoes, objetivoCompleto])

  // Obter indicadores disponíveis para o objetivo
  const indicadoresDisponiveis = useMemo(() => {
    const objetivo = objetivosLista.find((o) => o.id === objetivoSelecionado)
    if (!objetivo) return []
    return indicadoresLista.filter(
      (ind) => ind.objetivoId === objetivo.id || ind.objetivoCodigo === objetivo.codigo
    )
  }, [indicadoresLista, objetivoSelecionado, objetivosLista])

  // Filtrar medições pelo indicador selecionado
  const medicoesFiltradas = useMemo(() => {
    if (!indicadorSelecionado) return medicoesDoObjetivo
    // Compara tanto o formato completo quanto apenas a sigla
    return medicoesDoObjetivo.filter(m => {
      const indicadorFormatado = formatarIndicador(m.indicador)
      return indicadorFormatado === indicadorSelecionado || 
             m.indicador === indicadorSelecionado ||
             indicadorFormatado.split(' - ')[0] === indicadorSelecionado.split(' - ')[0]
    })
  }, [medicoesDoObjetivo, indicadorSelecionado, formatarIndicador])

  // Função para formatar número mantendo o formato original
  const formatarNumero = useCallback((valor: number, formatoOriginal: string): string => {
    // Detectar se o formato original tem casas decimais
    const temDecimais = /\.\d+/.test(formatoOriginal) || /,\d+/.test(formatoOriginal)
    
    // Contar casas decimais no formato original
    let casasDecimais = 0
    if (temDecimais) {
      const match = formatoOriginal.match(/(?:\.|,)(\d+)/)
      if (match) {
        casasDecimais = match[1].length
      }
    }
    
    // Formatar o número
    let numeroFormatado: string
    if (casasDecimais > 0) {
      numeroFormatado = valor.toFixed(casasDecimais)
    } else {
      numeroFormatado = Math.round(valor).toString()
    }
    
    // Aplicar o formato original (%, pontos, dias, R$, etc)
    if (formatoOriginal.includes('%')) {
      return `${numeroFormatado}%`
    } else if (formatoOriginal.toLowerCase().includes('pontos')) {
      return `${numeroFormatado} pontos`
    } else if (formatoOriginal.toLowerCase().includes('dias')) {
      return `${numeroFormatado} dias`
    } else if (formatoOriginal.includes('R$')) {
      return `R$ ${numeroFormatado.replace('.', ',')}`
    }
    
    return numeroFormatado
  }, [])

  // medicaoAtual agora é calculado acima baseado no mês selecionado

  // Preparar dados para o gráfico mensal (todos os 12 meses do ano selecionado)
  const dadosGrafico = useMemo(() => {
    const mesesDoAno = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ]
    
    // Filtrar medições do ano selecionado
    const medicoesDoAno = medicoesFiltradas.filter(med => {
      const data = new Date(med.data)
      return data.getFullYear().toString() === anoSelecionado
    })
    
    // Criar mapa com última medição de cada mês
    const mesesMap: Record<number, { valor: number; data: Date; medicao: Measurement }> = {}
    
    medicoesDoAno.forEach(med => {
      const data = new Date(med.data)
      const mes = data.getMonth() // 0-11
      const valor = parseValue(med.resultadoAtual)
      
      if (!mesesMap[mes] || data > mesesMap[mes].data) {
        mesesMap[mes] = { valor, data, medicao: med }
      }
    })

    // Retornar array com todos os 12 meses
    return mesesDoAno.map((nomeMes, index) => {
      const mesData = mesesMap[index]
      if (!mesData) {
        return {
          mes: nomeMes,
          mesIndex: index,
          valor: 0,
          valorFormatado: '',
          medicao: null
        }
      }
      
      // Formatar valor mantendo o formato original
      const formatoOriginal = mesData.medicao.resultadoAtual
      const valorFormatado = formatarNumero(mesData.valor, formatoOriginal)
      
      // Calcular meta do mês
      const metaDoMes = parseValue(mesData.medicao.meta || '0')
      
      return {
        mes: nomeMes,
        mesIndex: index,
        valor: mesData.valor,
        valorFormatado: valorFormatado,
        meta: metaDoMes,
        medicao: mesData.medicao
      }
    })
  }, [medicoesFiltradas, anoSelecionado, formatarNumero])

  // Filtrar medição pelo mês selecionado
  const medicaoDoMesSelecionado = useMemo(() => {
    if (mesSelecionado === null) return null
    
    const medicoesDoAno = medicoesFiltradas.filter(med => {
      const data = new Date(med.data)
      return data.getFullYear().toString() === anoSelecionado && 
             data.getMonth() === mesSelecionado
    })
    
    // Retornar a medição mais recente do mês
    return medicoesDoAno.sort((a, b) => 
      new Date(b.data).getTime() - new Date(a.data).getTime()
    )[0] || null
  }, [medicoesFiltradas, anoSelecionado, mesSelecionado])

  // Calcular média do ano quando nenhum mês está selecionado
  const mediaDoAno = useMemo(() => {
    if (mesSelecionado !== null) return null
    
    const medicoesDoAno = medicoesFiltradas.filter(med => {
      const data = new Date(med.data)
      return data.getFullYear().toString() === anoSelecionado
    })
    
    if (medicoesDoAno.length === 0) return null
    
    // Pegar a última medição de cada mês (usando o mesmo mapa do gráfico)
    const mesesMap: Record<number, { valor: number; data: Date; medicao: Measurement }> = {}
    medicoesDoAno.forEach(med => {
      const data = new Date(med.data)
      const mes = data.getMonth()
      const valor = parseValue(med.resultadoAtual)
      
      if (!mesesMap[mes] || data > mesesMap[mes].data) {
        mesesMap[mes] = { valor, data, medicao: med }
      }
    })
    
    const valores = Object.values(mesesMap).map(m => m.valor).filter(v => v > 0)
    if (valores.length === 0) return null
    
    const soma = valores.reduce((acc, val) => acc + val, 0)
    const media = soma / valores.length
    
    // Criar um objeto de medição "virtual" com a média
    const primeiraMedicao = Object.values(mesesMap)[0]?.medicao || medicoesDoAno[0]
    const formatoOriginal = primeiraMedicao.resultadoAtual
    
    // Formatar mantendo o formato original
    const resultadoFormatado = formatarNumero(media, formatoOriginal)
    
    return {
      ...primeiraMedicao,
      resultadoAtual: resultadoFormatado,
      meta: primeiraMedicao.meta || '',
      fatoresResultado: 'Média anual calculada a partir dos meses disponíveis',
      condutaMelhoria: 'Baseado na média dos meses do ano'
    }
  }, [medicoesFiltradas, anoSelecionado, mesSelecionado])

  // Usar medição do mês selecionado, média do ano, ou a mais recente
  const medicaoAtual = medicaoDoMesSelecionado || mediaDoAno || medicoesFiltradas[0] || null

  // Atualizar indicador selecionado quando objetivo mudar
  useEffect(() => {
    if (indicadoresDisponiveis.length === 0) {
      setIndicadorSelecionado('')
      return
    }
    const existe = indicadoresDisponiveis.some((ind) => ind.nome === indicadorSelecionado)
    if (!existe) {
      setIndicadorSelecionado(indicadoresDisponiveis[0].nome)
    }
  }, [objetivoSelecionado, indicadoresDisponiveis, indicadorSelecionado])

  // Resetar mês selecionado quando ano ou indicador mudar
  useEffect(() => {
    setMesSelecionado(null)
  }, [anoSelecionado, indicadorSelecionado])

  // Obter anos únicos das medições
  const anosDisponiveis = useMemo(() => {
    const anos = new Set<string>()
    medicoes.forEach(med => {
      const data = new Date(med.data)
      anos.add(data.getFullYear().toString())
    })
    return Array.from(anos).sort().reverse()
  }, [medicoes])

  // Calcular situação baseada nas medições (do mês selecionado ou todas)
  const medicoesParaSituacao = useMemo(() => {
    if (mesSelecionado !== null) {
      return medicoesFiltradas.filter(med => {
        const data = new Date(med.data)
        return data.getFullYear().toString() === anoSelecionado && 
               data.getMonth() === mesSelecionado
      })
    }
    return medicoesFiltradas
  }, [medicoesFiltradas, anoSelecionado, mesSelecionado])

  const situacao = getSituacao(medicoesParaSituacao)
  const valorAtual = medicaoAtual ? parseValue(medicaoAtual.resultadoAtual) : 0
  const valorMeta = medicaoAtual ? parseValue(medicaoAtual.meta) : 0
  const percentualProgresso = valorMeta > 0 ? (valorAtual / valorMeta) * 100 : 0
  const metaAtingida = valorAtual >= valorMeta && valorMeta > 0

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#179dd4] flex items-center justify-center p-8">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Erro ao carregar dados</h2>
          <p className="text-lg mb-4">{error.message || 'Erro desconhecido'}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-white text-[#179dd4] rounded-lg hover:bg-gray-100"
          >
            Recarregar página
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#179dd4] flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000000] to-[#179dd4] p-4 md:p-6">
      {/* Header com título */}
      <div className="flex flex-row justify-between items-center mb-4 md:mb-6 gap-4">
        <div>
          <h1 className="text-white text-xl md:text-2xl font-bold">Dashboard Estratégico - CREMESE</h1>
        </div>
        {/* Logo - Adicione a imagem em public/assets/logors2.png */}
        {/* <div className="flex-shrink-0">
          <Image
            src="/assets/logors2.png"
            alt="RS2 Consultoria"
            width={60}
            height={30}
            className="object-contain"
            priority
          />
        </div> */}
      </div>

      {/* Abas de Objetivos com botões de navegação */}
      <div className="relative flex flex-col md:flex-row gap-3 mb-6 md:mb-8 items-stretch md:items-center">
        {/* Botões de navegação - lado esquerdo */}
        <div className="flex gap-2 md:absolute md:left-0">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 shadow-lg"
          >
            <FileText className="w-4 h-4" />
            Lançamentos
          </Link>
          <Link
            href="/admin"
            className="flex items-center justify-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 transition-all duration-200 shadow-lg"
          >
            <Settings className="w-4 h-4" />
            Admin
          </Link>
        </div>
        {/* Botões de objetivos - centralizados no desktop */}
        <div className="flex flex-wrap gap-2 md:gap-3 justify-center md:flex-nowrap md:w-full md:justify-center">
          {objetivosLista.map((obj) => (
            <button
              key={obj.id}
              onClick={() => setObjetivoSelecionado(obj.id)}
              className={`flex-1 md:flex-none px-4 md:px-6 py-2 md:py-3 rounded-lg font-semibold text-sm md:text-base transition-all duration-200 shadow-lg ${
                objetivoSelecionado === obj.id
                  ? 'bg-white text-[#179dd4] shadow-xl md:scale-105'
                  : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
              }`}
              title={obj.nome}
            >
              {obj.codigo}
            </button>
          ))}
        </div>
      </div>

      {/* Painel Principal */}
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 md:p-8 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8">
          {/* Coluna Esquerda - Medição e Gráfico */}
          <div className="md:col-span-2 space-y-4 md:space-y-6">
            {/* Painel Responsável pelo Indicador */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <div className="bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] text-white px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base">
                Responsável pelo Indicador
              </div>
              <div className="p-4 md:p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-[#179dd4] to-[#0d7ba8] rounded-full flex items-center justify-center text-white font-bold text-base md:text-lg shadow-md">
                    {medicaoAtual?.responsavel?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 font-medium">Responsável</p>
                    <p className="text-base md:text-lg font-semibold text-gray-800">
                      {medicaoAtual?.responsavel || 'Não informado'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Painel Medição */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <div className="bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] text-white px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base">
                Medição
              </div>
              <div className="p-4 md:p-6">
                <div className="relative">
                  {/* Valor atual */}
                  <div className="mb-4">
                    <span className="text-lg md:text-xl font-bold text-gray-800">
                      {medicaoAtual?.resultadoAtual || 'N/A'}
                    </span>
                  </div>
                  
                  {/* Barra de progresso */}
                  <div className="relative h-8 md:h-10 bg-gray-200 rounded-full overflow-visible shadow-inner">
                    {/* Barra preenchida */}
                    <div
                      className={`h-full transition-all duration-500 shadow-sm rounded-full ${
                        metaAtingida
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                      }`}
                      style={{ width: `${Math.min(percentualProgresso, 100)}%` }}
                    />
                  </div>
                  
                  {/* Informações abaixo da barra - alinhadas em lados opostos */}
                  <div className="mt-2 flex justify-between items-center">
                    {/* Porcentagem da meta - lado esquerdo */}
                    {valorMeta > 0 && (
                      <div className="flex items-center">
                        <div className={`px-3 py-1 rounded-full text-xs md:text-sm font-semibold ${
                          metaAtingida
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {percentualProgresso.toFixed(1)}% da Meta
                        </div>
                      </div>
                    )}
                    {/* Meta - lado direito, abaixo do final da barra */}
                    {medicaoAtual?.meta && (
                      <div className="flex items-center">
                        <span className="text-xs md:text-sm font-medium text-gray-600">
                          Meta: {medicaoAtual.meta}
                        </span>
                      </div>
                    )}
                    {/* Espaço vazio quando não há meta ou porcentagem */}
                    {!medicaoAtual?.meta && !valorMeta && <div></div>}
                  </div>
                </div>
              </div>
            </div>

            {/* Painel Acompanhamento do Indicador */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <div className="bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] text-white px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base flex flex-col md:flex-row justify-between items-start md:items-center gap-2 md:gap-0">
                <span>Acompanhamento do indicador</span>
                {mesSelecionado !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm font-normal bg-white/20 px-2 md:px-3 py-1 rounded-full">
                      {dadosGrafico[mesSelecionado]?.mes} {anoSelecionado}
                    </span>
                    <button
                      onClick={() => setMesSelecionado(null)}
                      className="text-white hover:bg-white/20 rounded-full p-1 transition-colors"
                      title="Limpar seleção"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 md:p-6">
                {mesSelecionado === null && (
                  <p className="text-xs text-gray-500 mb-2 text-center">
                    💡 Clique em uma barra para ver os detalhes daquele mês
                  </p>
                )}
                {dadosGrafico.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300} className="md:h-[400px]">
                    <BarChart 
                      data={dadosGrafico}
                      margin={{ top: 10, right: 10, left: 10, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="mes" 
                        tick={{ fontSize: 10, fill: '#6b7280' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} />
                      {/* Linha de meta verde */}
                      {valorMeta > 0 && (
                        <ReferenceLine 
                          y={valorMeta} 
                          stroke="#10b981" 
                          strokeWidth={2}
                          strokeDasharray="5 5"
                          label={{ value: "Meta", position: "right", fill: "#10b981", fontSize: 12 }}
                        />
                      )}
                      <Bar 
                        dataKey="valor" 
                        fill="url(#colorGradient)"
                        radius={[8, 8, 0, 0]}
                        onClick={(data: any, index: number) => {
                          if (data && data.mesIndex !== undefined) {
                            setMesSelecionado(data.mesIndex === mesSelecionado ? null : data.mesIndex)
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {dadosGrafico.map((entry: any, index: number) => {
                          const isSelected = mesSelecionado !== null && entry.mesIndex === mesSelecionado
                          const shouldBeTransparent = mesSelecionado !== null && entry.mesIndex !== mesSelecionado
                          const atingiuMeta = entry.valor > 0 && entry.meta > 0 && entry.valor >= entry.meta
                          
                          // Determinar cor da barra
                          let fillColor = 'url(#colorGradient)'
                          if (atingiuMeta) {
                            fillColor = 'url(#colorGradientGreen)'
                          }
                          
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={fillColor}
                              opacity={shouldBeTransparent ? 0.3 : 1}
                            />
                          )
                        })}
                        <LabelList 
                          dataKey="valorFormatado" 
                          position="inside" 
                          style={{ fontSize: '11px', fill: '#ffffff', fontWeight: '600' }}
                          formatter={(value: any, entry: any) => {
                            if (!value || value === '') return ''
                            if (entry && entry.payload && entry.payload.valor === 0) return ''
                            return value
                          }}
                        />
                      </Bar>
                      <defs>
                        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#179dd4" />
                          <stop offset="100%" stopColor="#0d7ba8" />
                        </linearGradient>
                        <linearGradient id="colorGradientGreen" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-400">
                    Nenhum dado disponível para o gráfico
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Coluna Direita - Filtros e Informações */}
          <div className="space-y-4 md:space-y-6">
            {/* Filtros de Ano e Indicador */}
            <div className="bg-white rounded-xl p-3 md:p-4 shadow-lg border border-gray-100 space-y-3 md:space-y-4">
              {/* Filtro de Anos */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3">Ano</div>
                <div className="space-y-2">
                  {anosDisponiveis.length > 0 ? (
                    anosDisponiveis.map((ano) => (
                      <button
                        key={ano}
                        onClick={() => setAnoSelecionado(ano)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
                          anoSelecionado === ano
                            ? 'bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#179dd4]'
                        }`}
                      >
                        {ano}
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400 text-center py-2">Nenhum ano disponível</div>
                  )}
                </div>
              </div>

              {/* Filtro de Indicadores */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-3">Indicadores</div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {indicadoresDisponiveis.length > 0 ? (
                    indicadoresDisponiveis.map((ind) => (
                      <button
                        key={ind.id}
                        onClick={() => setIndicadorSelecionado(ind.nome)}
                        className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 shadow-sm ${
                          indicadorSelecionado === ind.nome
                            ? 'bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] text-white shadow-md'
                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-[#179dd4]'
                        }`}
                      >
                        {ind.nome}
                      </button>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400 text-center py-2">Nenhum indicador disponível</div>
                  )}
                </div>
              </div>
            </div>

            {/* Situação Atual do Indicador */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <div className="bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] text-white px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base">
                Situação atual do indicador
              </div>
              <div className="p-4 md:p-6">
                <div className="text-2xl md:text-4xl font-bold text-center text-gray-800 py-2 md:py-4">
                  {situacao}
                </div>
              </div>
            </div>

            {/* Fatores que levaram a esse resultado */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <div className="bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] text-white px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base">
                Fatores que levaram a esse resultado
              </div>
              <div className="p-4 md:p-6">
                <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
                  {medicaoAtual?.fatoresResultado || 'Nenhum fator registrado'}
                </p>
              </div>
            </div>

            {/* Conduta de Melhoria */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg border border-gray-100">
              <div className="bg-gradient-to-r from-[#179dd4] to-[#0d7ba8] text-white px-4 md:px-6 py-3 md:py-4 font-semibold text-sm md:text-base">
                Conduta de Melhoria
              </div>
              <div className="p-4 md:p-6">
                <p className="text-xs md:text-sm text-gray-700 leading-relaxed">
                  {medicaoAtual?.condutaMelhoria || 'Nenhuma conduta registrada'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
