export const BASE_URL = 'https://legis.senado.leg.br/dadosabertos';

export const ENDPOINTS = {
  // Senadores
  SENADORES_ATUAIS: '/senador/lista/atual',
  SENADORES_LEGISLATURA: (leg: number) => `/senador/lista/legislatura/${leg}`,
  SENADOR: (codigo: number) => `/senador/${codigo}`,
  SENADOR_VOTACOES: (codigo: number) => `/senador/${codigo}/votacoes`,
  SENADOR_MANDATOS: (codigo: number) => `/senador/${codigo}/mandatos`,
  SENADOR_CARGOS: (codigo: number) => `/senador/${codigo}/cargos`,
  SENADOR_COMISSOES: (codigo: number) => `/senador/${codigo}/comissoes`,

  // Matérias
  MATERIAS_PESQUISA: '/materia/pesquisa/lista',
  MATERIA: (codigo: number) => `/materia/${codigo}`,
  MATERIA_TEXTOS: (codigo: number) => `/materia/${codigo}/textos`,
  MATERIA_VOTACOES: (codigo: number) => `/materia/${codigo}/votacoes`,
  MATERIAS_TRAMITANDO: '/materia/tramitando',

  // Votações
  VOTACOES_ANO: (ano: number) => `/plenario/lista/votacao/${ano}`,
  VOTACAO: (codigo: number) => `/plenario/votacao/${codigo}`,
  VOTACAO_VOTOS: (codigo: number) => `/plenario/votacao/${codigo}/votos`,

  // Comissões
  COMISSOES_LISTA: '/comissao/lista',
  COMISSAO: (sigla: string) => `/comissao/${sigla}`,
  COMISSAO_COMPOSICAO: (sigla: string) => `/comissao/${sigla}/composicao`,

  // Agenda
  AGENDA: (data: string) => `/agenda/${data}`,
  SESSOES_ANO: (ano: number) => `/plenario/lista/sessoes/${ano}`,

  // Auxiliares
  LEGISLATURA_ATUAL: '/legislatura/atual',
  MATERIA_SIGLAS: '/materia/siglas',
  PARTIDOS_LISTA: '/partido/lista',
} as const;
