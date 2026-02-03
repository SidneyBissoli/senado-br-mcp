import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, createSuccessResponse, createErrorResponse } from '../api/client.js';
import { ENDPOINTS } from '../api/endpoints.js';
import { logger } from '../utils/logger.js';
import {
  ListarVotacoesInput,
  ObterVotacaoInput,
  VotacoesRecentesInput,
  type VotacaoResumoType,
  type VotacaoDetalheType,
  type VotoNominalType
} from '../schemas/votacao.js';

// Helper functions to parse API responses
function parseVotacaoResumo(votacao: any): VotacaoResumoType {
  const sessao = votacao.SessaoPlenaria || votacao;
  const materia = votacao.IdentificacaoMateria || {};

  return {
    codigo: parseInt(votacao.CodigoSessaoVotacao || votacao.CodigoVotacao || sessao.CodigoSessao || '0'),
    data: sessao.DataSessao || votacao.DataSessao || votacao.Data || '',
    hora: sessao.HoraInicioSessao || votacao.Hora || null,
    materia: materia.DescricaoIdentificacaoMateria ||
             `${materia.SiglaSubtipoMateria || ''} ${materia.NumeroMateria || ''}/${materia.AnoMateria || ''}`.trim() || null,
    descricao: votacao.DescricaoVotacao || sessao.DescricaoTipoSessao || null,
    resultado: votacao.DescricaoResultado || votacao.Resultado || null,
    totalSim: votacao.TotalVotosSim ? parseInt(votacao.TotalVotosSim) : null,
    totalNao: votacao.TotalVotosNao ? parseInt(votacao.TotalVotosNao) : null,
    totalAbstencao: votacao.TotalVotosAbstencao ? parseInt(votacao.TotalVotosAbstencao) : null
  };
}

function parseVotoNominal(voto: any): VotoNominalType {
  const identificacao = voto.IdentificacaoParlamentar || voto;

  return {
    codigoSenador: parseInt(identificacao.CodigoParlamentar || voto.CodigoParlamentar || '0'),
    nomeSenador: identificacao.NomeParlamentar || voto.NomeParlamentar || '',
    partido: identificacao.SiglaPartidoParlamentar || voto.SiglaPartido || null,
    uf: identificacao.UfParlamentar || voto.SiglaUf || null,
    voto: voto.SiglaDescricaoVoto || voto.DescricaoVoto || voto.Voto || ''
  };
}

function parseVotacaoDetalhe(dados: any): VotacaoDetalheType {
  const votacao = dados.Votacao || dados;
  const sessao = votacao.SessaoPlenaria || votacao;
  const materiaData = votacao.IdentificacaoMateria || votacao.Materia || {};

  let votos: VotoNominalType[] | undefined;
  if (votacao.Votos?.VotoParlamentar) {
    let votosArray = votacao.Votos.VotoParlamentar;
    if (!Array.isArray(votosArray)) {
      votosArray = [votosArray];
    }
    votos = votosArray.map(parseVotoNominal);
  }

  return {
    codigo: parseInt(votacao.CodigoSessaoVotacao || votacao.CodigoVotacao || sessao.CodigoSessao || '0'),
    data: sessao.DataSessao || votacao.DataSessao || votacao.Data || '',
    hora: sessao.HoraInicioSessao || votacao.Hora || null,
    materia: materiaData.CodigoMateria ? {
      codigo: parseInt(materiaData.CodigoMateria) || null,
      sigla: materiaData.SiglaSubtipoMateria || materiaData.SiglaMateria || null,
      numero: materiaData.NumeroMateria ? parseInt(materiaData.NumeroMateria) : null,
      ano: materiaData.AnoMateria ? parseInt(materiaData.AnoMateria) : null,
      ementa: materiaData.EmentaMateria || materiaData.Ementa || null
    } : null,
    descricao: votacao.DescricaoVotacao || sessao.DescricaoTipoSessao || null,
    resultado: votacao.DescricaoResultado || votacao.Resultado || null,
    totalSim: votacao.TotalVotosSim ? parseInt(votacao.TotalVotosSim) : null,
    totalNao: votacao.TotalVotosNao ? parseInt(votacao.TotalVotosNao) : null,
    totalAbstencao: votacao.TotalVotosAbstencao ? parseInt(votacao.TotalVotosAbstencao) : null,
    totalPresente: votacao.TotalVotosPresente ? parseInt(votacao.TotalVotosPresente) : null,
    votos
  };
}

export function registerVotacoesTools(server: McpServer) {
  // senado_listar_votacoes
  server.tool(
    'senado_listar_votacoes',
    'Lista votações do plenário do Senado por ano, podendo filtrar por mês ou período específico.',
    {
      ano: z.number().int().min(1900).max(2100).describe('Ano das votações (obrigatório)'),
      mes: z.number().int().min(1).max(12).optional().describe('Mês (1-12)'),
      dataInicio: z.string().regex(/^\d{8}$/).optional().describe('Data início (YYYYMMDD)'),
      dataFim: z.string().regex(/^\d{8}$/).optional().describe('Data fim (YYYYMMDD)')
    },
    async (params) => {
      try {
        const input = ListarVotacoesInput.parse(params);
        logger.info({ input }, 'Listing votacoes');

        let endpoint = ENDPOINTS.VOTACOES_ANO(input.ano);

        // Add query params if provided
        const queryParams: string[] = [];
        if (input.mes) queryParams.push(`mes=${input.mes}`);
        if (input.dataInicio) queryParams.push(`dataInicio=${input.dataInicio}`);
        if (input.dataFim) queryParams.push(`dataFim=${input.dataFim}`);

        if (queryParams.length > 0) {
          endpoint += '?' + queryParams.join('&');
        }

        const response = await apiRequest<any>(endpoint);

        let votacoes: any[] = [];
        if (response.ListaVotacoes?.Votacoes?.Votacao) {
          votacoes = response.ListaVotacoes.Votacoes.Votacao;
        } else if (response.VotacoesPlenario?.Votacoes?.Votacao) {
          votacoes = response.VotacoesPlenario.Votacoes.Votacao;
        }

        if (!Array.isArray(votacoes)) {
          votacoes = votacoes ? [votacoes] : [];
        }

        const votacoesFormatadas = votacoes.map(parseVotacaoResumo);

        const result = createSuccessResponse(
          {
            ano: input.ano,
            count: votacoesFormatadas.length,
            votacoes: votacoesFormatadas
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error listing votacoes');
        const errorResult = createErrorResponse(
          'ERRO_LISTAR_VOTACOES',
          error instanceof Error ? error.message : 'Erro ao listar votações',
          'Verifique se o ano está correto'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_obter_votacao
  server.tool(
    'senado_obter_votacao',
    'Obtém detalhes de uma votação específica, incluindo votos nominais de cada senador.',
    {
      codigoVotacao: z.number().int().positive().describe('Código único da votação')
    },
    async (params) => {
      try {
        const input = ObterVotacaoInput.parse(params);
        logger.info({ input }, 'Getting votacao details');

        const endpoint = ENDPOINTS.VOTACAO(input.codigoVotacao);
        const response = await apiRequest<any>(endpoint);

        const dados = response.VotacaoPlenario || response;
        const votacao = parseVotacaoDetalhe(dados);

        const result = createSuccessResponse(votacao, endpoint);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting votacao details');
        const errorResult = createErrorResponse(
          'VOTACAO_NAO_ENCONTRADA',
          error instanceof Error ? error.message : 'Votação não encontrada',
          'Use senado_listar_votacoes para encontrar o código correto'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_votacoes_recentes
  server.tool(
    'senado_votacoes_recentes',
    'Obtém as votações mais recentes do plenário (últimos N dias). Útil para acompanhar atividade legislativa recente.',
    {
      dias: z.number().int().min(1).max(365).optional().default(7).describe('Quantidade de dias (padrão: 7)')
    },
    async (params) => {
      try {
        const input = VotacoesRecentesInput.parse(params);
        logger.info({ input }, 'Getting recent votacoes');

        // Calculate date range
        const hoje = new Date();
        const dataInicio = new Date(hoje);
        dataInicio.setDate(dataInicio.getDate() - (input.dias || 7));

        const formatDate = (d: Date) => {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}${month}${day}`;
        };

        const endpoint = `${ENDPOINTS.VOTACOES_ANO(hoje.getFullYear())}?dataInicio=${formatDate(dataInicio)}&dataFim=${formatDate(hoje)}`;

        const response = await apiRequest<any>(endpoint);

        let votacoes: any[] = [];
        if (response.ListaVotacoes?.Votacoes?.Votacao) {
          votacoes = response.ListaVotacoes.Votacoes.Votacao;
        } else if (response.VotacoesPlenario?.Votacoes?.Votacao) {
          votacoes = response.VotacoesPlenario.Votacoes.Votacao;
        }

        if (!Array.isArray(votacoes)) {
          votacoes = votacoes ? [votacoes] : [];
        }

        // Sort by date (most recent first)
        const votacoesFormatadas = votacoes
          .map(parseVotacaoResumo)
          .sort((a, b) => {
            const dateA = new Date(a.data.split('/').reverse().join('-') || a.data);
            const dateB = new Date(b.data.split('/').reverse().join('-') || b.data);
            return dateB.getTime() - dateA.getTime();
          });

        const result = createSuccessResponse(
          {
            periodo: {
              dias: input.dias || 7,
              dataInicio: formatDate(dataInicio),
              dataFim: formatDate(hoje)
            },
            count: votacoesFormatadas.length,
            votacoes: votacoesFormatadas
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting recent votacoes');
        const errorResult = createErrorResponse(
          'ERRO_VOTACOES_RECENTES',
          error instanceof Error ? error.message : 'Erro ao obter votações recentes',
          'Pode não haver votações no período especificado'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );
}
