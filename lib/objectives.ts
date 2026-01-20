export type IndicatorSeed = {
  codigo: string
  nome: string
  ativo?: boolean
}

export type ObjectiveSeed = {
  codigo: string
  nome: string
  descricao?: string
  ativo?: boolean
  indicadores: IndicatorSeed[]
}

export const objetivosSeed: ObjectiveSeed[] = [
  {
    codigo: 'OB1',
    nome: 'OB1 - Manter a Sustentabilidade Financeira',
    ativo: true,
    indicadores: [
      { codigo: 'IPJ', nome: 'IPJ - Inadimplência PJ' },
      { codigo: 'IPF', nome: 'IPF - Inadimplência PF' },
      { codigo: 'SUC', nome: 'SUC - Superavit Contábil' },
      { codigo: 'ISF', nome: 'ISF - Índice de Segurança Financeira' },
      { codigo: 'IVU', nome: 'IVU - Índice de Vida útil' },
      { codigo: 'EPC', nome: 'EPC - Índice de Execução do Plano de Contratação' },
    ],
  },
  {
    codigo: 'OB2',
    nome: 'OB2 - Maximizar a Satisfação dos Clientes',
    ativo: true,
    indicadores: [
      { codigo: 'ISM', nome: 'ISM - Índice de Satisfação do Cliente Médico' },
      { codigo: 'ISJ', nome: 'ISJ - Índice de Satisfação do Cliente PJ' },
      { codigo: 'ISG', nome: 'ISG - Índice de Satisfação Global' },
      { codigo: 'EMC', nome: 'EMC - Índice de Educação Médica Continuada' },
    ],
  },
  {
    codigo: 'OB3',
    nome: 'OB3 - Otimizar a Tramitação dos Processos e Sindicâncias',
    ativo: true,
    indicadores: [
      { codigo: 'TMS', nome: 'TMS - Tempo Médio de Tramitação de Sindicâncias' },
      { codigo: 'TMP', nome: "TMP - Tempo Médio de Tramitação de PEP's" },
      { codigo: 'INP', nome: 'INP - Índice de Nulidades Processuais' },
      { codigo: 'IPP', nome: 'IPP - Índice de processos prescritos' },
      { codigo: 'ISJ', nome: 'ISJ - Índice de Sindicâncias Julgadas' },
      { codigo: 'IPJ', nome: "IPJ - Índice de PEP's Julgados" },
      { codigo: 'ISJP', nome: 'ISJP - Índice de Sindicâncias Julgadas no Prazo' },
      { codigo: 'IPJP', nome: "IPJP - Índice de PEP's Julgados no Prazo" },
      { codigo: 'IDR', nome: 'IDR - Índice de Decisões Reformadas pelo CFM' },
    ],
  },
  {
    codigo: 'OB4',
    nome: 'OB4 - Aumentar a Eficácia no Processo de Fiscalização',
    ativo: true,
    indicadores: [
      { codigo: 'IFP', nome: 'IFP - Índice de Fiscalização Proativa' },
      { codigo: 'IEFc', nome: 'IEFc - Índice de Eficácia da Fiscalização CODAME' },
      { codigo: 'IEFr', nome: 'IEFr - Índice de Eficácia da Fiscalização REGULARIZAÇÃO' },
    ],
  },
  {
    codigo: 'OB5',
    nome: 'OB5 - Aumentar a Eficácia no Processo Cartorial',
    ativo: true,
    indicadores: [
      { codigo: 'INCPF', nome: 'INCPF - Inscrições PF' },
      { codigo: 'INCPJ', nome: 'INCPJ - Inscrições PJ' },
      { codigo: 'INCRQE', nome: 'INCRQE - Inscrições RQE' },
    ],
  },
]

export const indicadoresSeed = objetivosSeed.flatMap((objetivo) =>
  objetivo.indicadores.map((indicador) => ({
    ...indicador,
    objetivoCodigo: objetivo.codigo,
    objetivoNome: objetivo.nome,
  }))
)
