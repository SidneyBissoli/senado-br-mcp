import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, createSuccessResponse, createErrorResponse } from '../api/client.js';
import { ENDPOINTS } from '../api/endpoints.js';
import { logger } from '../utils/logger.js';
import {
  BuscarMateriasInput,
  ObterMateriaInput,
  TramitacaoMateriaInput,
  TextosMateriaInput,
  VotosMateriaInput,
  type MateriaResumoType,
  type MateriaDetalheType,
  type TramitacaoType,
  type TextoMateriaType,
  type VotacaoMateriaType
} from '../schemas/materia.js';

// Helper functions to parse API responses
function parseMateriaResumo(materia: any): MateriaResumoType {
  const identificacao = materia.IdentificacaoMateria || materia;

  return {
    codigo: parseInt(identificacao.CodigoMateria || materia.CodigoMateria || '0'),
    sigla: identificacao.SiglaSubtipoMateria || materia.SiglaMateria || '',
    numero: parseInt(identificacao.NumeroMateria || materia.NumeroMateria || '0'),
    ano: parseInt(identificacao.AnoMateria || materia.AnoMateria || '0'),
    ementa: materia.EmentaMateria || materia.Ementa || null,
    autor: materia.AutorPrincipal?.NomeAutor || materia.Autor || null,
    situacao: materia.SituacaoAtual?.DescricaoSituacao || materia.Situacao || null,
    dataApresentacao: materia.DataApresentacao || null,
    url: materia.UrlDetalheMateria || null
  };
}

function parseMateriaDetalhe(dados: any): MateriaDetalheType {
  const materia = dados.Materia || dados;
  const identificacao = materia.IdentificacaoMateria || {};
  const dadosBasicos = materia.DadosBasicosMateria || {};
  const situacao = materia.SituacaoAtual || {};
  const autoria = materia.Autoria || {};

  let relator = null;
  if (materia.Relator || situacao.Relator) {
    const rel = materia.Relator || situacao.Relator;
    relator = {
      nome: rel.NomeRelator || rel.NomeParlamentar || '',
      partido: rel.SiglaPartido || null,
      uf: rel.UfRelator || null
    };
  }

  return {
    codigo: parseInt(identificacao.CodigoMateria || '0'),
    sigla: identificacao.SiglaSubtipoMateria || '',
    numero: parseInt(identificacao.NumeroMateria || '0'),
    ano: parseInt(identificacao.AnoMateria || '0'),
    ementa: dadosBasicos.EmentaMateria || null,
    ementaDetalhada: dadosBasicos.ExplicacaoEmentaMateria || null,
    autor: autoria.Autor?.[0]?.NomeAutor || autoria.AutorPrincipal?.NomeAutor || null,
    tipoAutor: autoria.Autor?.[0]?.TipoAutor || null,
    situacao: situacao.DescricaoSituacao || null,
    localAtual: situacao.Local?.NomeLocal || situacao.NomeLocal || null,
    dataApresentacao: dadosBasicos.DataApresentacao || null,
    dataUltimaAtualizacao: materia.DataUltimaAtualizacao || null,
    indexacao: dadosBasicos.IndexacaoMateria || null,
    url: identificacao.UrlDetalheMateria || null,
    relator
  };
}

function parseTramitacao(tram: any): TramitacaoType {
  return {
    data: tram.DataTramitacao || tram.Data || '',
    local: tram.Local?.NomeLocal || tram.DescricaoLocal || null,
    situacao: tram.Situacao?.DescricaoSituacao || tram.DescricaoSituacao || null,
    descricao: tram.TextoTramitacao || tram.Descricao || null
  };
}

function parseTextoMateria(texto: any): TextoMateriaType {
  return {
    tipo: texto.TipoTexto?.DescricaoTipoTexto || texto.DescricaoTipoTexto || 'Texto',
    data: texto.DataTexto || null,
    url: texto.UrlTexto || '',
    formato: texto.FormatoTexto || texto.TipoDocumento || null
  };
}

function parseVotacaoMateria(votacao: any): VotacaoMateriaType {
  return {
    codigoVotacao: parseInt(votacao.CodigoSessaoVotacao || votacao.CodigoVotacao || '0'),
    data: votacao.DataSessao || votacao.Data || '',
    descricao: votacao.DescricaoVotacao || votacao.Descricao || null,
    resultado: votacao.DescricaoResultado || votacao.Resultado || null,
    totalSim: votacao.TotalVotosSim ? parseInt(votacao.TotalVotosSim) : null,
    totalNao: votacao.TotalVotosNao ? parseInt(votacao.TotalVotosNao) : null,
    totalAbstencao: votacao.TotalVotosAbstencao ? parseInt(votacao.TotalVotosAbstencao) : null
  };
}

export function registerMateriasTools(server: McpServer) {
  // senado_buscar_materias
  server.tool(
    'senado_buscar_materias',
    'Busca matérias legislativas por diversos critérios: tipo (PEC, PL, PLP, MPV), número, ano, palavras-chave, autor ou relator.',
    {
      sigla: z.string().optional().describe('Tipo: PEC, PL, PLP, MPV, PDL, PRS, etc.'),
      numero: z.number().int().positive().optional().describe('Número da matéria'),
      ano: z.number().int().min(1900).max(2100).optional().describe('Ano da matéria'),
      tramitando: z.boolean().optional().describe('Apenas em tramitação'),
      palavraChave: z.string().optional().describe('Busca na ementa'),
      autorNome: z.string().optional().describe('Nome do autor'),
      relatorNome: z.string().optional().describe('Nome do relator')
    },
    async (params) => {
      try {
        const input = BuscarMateriasInput.parse(params);
        logger.info({ input }, 'Searching materias');

        // Build query params
        const queryParams: string[] = [];
        if (input.sigla) queryParams.push(`sigla=${input.sigla.toUpperCase()}`);
        if (input.numero) queryParams.push(`numero=${input.numero}`);
        if (input.ano) queryParams.push(`ano=${input.ano}`);
        if (input.tramitando !== undefined) queryParams.push(`tramitando=${input.tramitando ? 'S' : 'N'}`);
        if (input.palavraChave) queryParams.push(`palavraChave=${encodeURIComponent(input.palavraChave)}`);
        if (input.autorNome) queryParams.push(`nomeAutor=${encodeURIComponent(input.autorNome)}`);
        if (input.relatorNome) queryParams.push(`nomeRelator=${encodeURIComponent(input.relatorNome)}`);

        const endpoint = ENDPOINTS.MATERIAS_PESQUISA + (queryParams.length > 0 ? '?' + queryParams.join('&') : '');
        const response = await apiRequest<any>(endpoint);

        let materias: any[] = [];
        if (response.PesquisaBasicaMateria?.Materias?.Materia) {
          materias = response.PesquisaBasicaMateria.Materias.Materia;
        } else if (response.ListaMaterias?.Materias?.Materia) {
          materias = response.ListaMaterias.Materias.Materia;
        }

        if (!Array.isArray(materias)) {
          materias = materias ? [materias] : [];
        }

        const materiasFormatadas = materias.map(parseMateriaResumo);

        const result = createSuccessResponse(
          { count: materiasFormatadas.length, materias: materiasFormatadas },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error searching materias');
        const errorResult = createErrorResponse(
          'ERRO_BUSCAR_MATERIAS',
          error instanceof Error ? error.message : 'Erro na busca',
          'Verifique os parâmetros e tente novamente. Use senado_tipos_materia para ver tipos válidos.'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_obter_materia
  server.tool(
    'senado_obter_materia',
    'Obtém detalhes completos de uma matéria legislativa, incluindo ementa, autoria, situação atual e relator.',
    {
      codigoMateria: z.number().int().positive().describe('Código único da matéria')
    },
    async (params) => {
      try {
        const input = ObterMateriaInput.parse(params);
        logger.info({ input }, 'Getting materia details');

        const endpoint = ENDPOINTS.MATERIA(input.codigoMateria);
        const response = await apiRequest<any>(endpoint);

        const dados = response.DetalheMateria || response;
        const materia = parseMateriaDetalhe(dados);

        const result = createSuccessResponse(materia, endpoint);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting materia details');
        const errorResult = createErrorResponse(
          'MATERIA_NAO_ENCONTRADA',
          error instanceof Error ? error.message : 'Matéria não encontrada',
          'Use senado_buscar_materias para encontrar o código correto'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_tramitacao_materia
  server.tool(
    'senado_tramitacao_materia',
    'Obtém histórico de tramitação de uma matéria, mostrando todas as movimentações em ordem cronológica.',
    {
      codigoMateria: z.number().int().positive().describe('Código único da matéria')
    },
    async (params) => {
      try {
        const input = TramitacaoMateriaInput.parse(params);
        logger.info({ input }, 'Getting materia tramitacao');

        const endpoint = ENDPOINTS.MATERIA(input.codigoMateria);
        const response = await apiRequest<any>(endpoint);

        const dados = response.DetalheMateria?.Materia || response.Materia || response;
        let tramitacoes: any[] = [];

        if (dados.Tramitacoes?.Tramitacao) {
          tramitacoes = dados.Tramitacoes.Tramitacao;
        } else if (dados.HistoricoTramitacao?.Tramitacao) {
          tramitacoes = dados.HistoricoTramitacao.Tramitacao;
        }

        if (!Array.isArray(tramitacoes)) {
          tramitacoes = tramitacoes ? [tramitacoes] : [];
        }

        const tramitacoesFormatadas = tramitacoes.map(parseTramitacao);

        const result = createSuccessResponse(
          {
            codigoMateria: input.codigoMateria,
            count: tramitacoesFormatadas.length,
            tramitacoes: tramitacoesFormatadas
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting tramitacao');
        const errorResult = createErrorResponse(
          'ERRO_TRAMITACAO',
          error instanceof Error ? error.message : 'Erro ao obter tramitação',
          'Verifique se o código da matéria está correto'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_textos_materia
  server.tool(
    'senado_textos_materia',
    'Obtém textos disponíveis de uma matéria (inicial, substitutivo, final) com URLs para download.',
    {
      codigoMateria: z.number().int().positive().describe('Código único da matéria')
    },
    async (params) => {
      try {
        const input = TextosMateriaInput.parse(params);
        logger.info({ input }, 'Getting materia texts');

        const endpoint = ENDPOINTS.MATERIA_TEXTOS(input.codigoMateria);
        const response = await apiRequest<any>(endpoint);

        let textos: any[] = [];
        if (response.TextoMateria?.Materia?.Textos?.Texto) {
          textos = response.TextoMateria.Materia.Textos.Texto;
        } else if (response.Textos?.Texto) {
          textos = response.Textos.Texto;
        }

        if (!Array.isArray(textos)) {
          textos = textos ? [textos] : [];
        }

        const textosFormatados = textos.map(parseTextoMateria);

        const result = createSuccessResponse(
          {
            codigoMateria: input.codigoMateria,
            count: textosFormatados.length,
            textos: textosFormatados
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting materia texts');
        const errorResult = createErrorResponse(
          'ERRO_TEXTOS_MATERIA',
          error instanceof Error ? error.message : 'Erro ao obter textos',
          'Nem todas as matérias possuem textos disponíveis'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_votos_materia
  server.tool(
    'senado_votos_materia',
    'Obtém resultado de votações de uma matéria, incluindo placar e votos nominais quando disponíveis.',
    {
      codigoMateria: z.number().int().positive().describe('Código único da matéria')
    },
    async (params) => {
      try {
        const input = VotosMateriaInput.parse(params);
        logger.info({ input }, 'Getting materia votes');

        const endpoint = ENDPOINTS.MATERIA_VOTACOES(input.codigoMateria);
        const response = await apiRequest<any>(endpoint);

        let votacoes: any[] = [];
        if (response.VotacaoMateria?.Materia?.Votacoes?.Votacao) {
          votacoes = response.VotacaoMateria.Materia.Votacoes.Votacao;
        } else if (response.Votacoes?.Votacao) {
          votacoes = response.Votacoes.Votacao;
        }

        if (!Array.isArray(votacoes)) {
          votacoes = votacoes ? [votacoes] : [];
        }

        const votacoesFormatadas = votacoes.map(parseVotacaoMateria);

        const result = createSuccessResponse(
          {
            codigoMateria: input.codigoMateria,
            count: votacoesFormatadas.length,
            votacoes: votacoesFormatadas
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting materia votes');
        const errorResult = createErrorResponse(
          'ERRO_VOTOS_MATERIA',
          error instanceof Error ? error.message : 'Erro ao obter votações',
          'Nem todas as matérias possuem votações registradas'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );
}
