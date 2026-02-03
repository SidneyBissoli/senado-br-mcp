import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, createSuccessResponse, createErrorResponse } from '../api/client.js';
import { ENDPOINTS } from '../api/endpoints.js';
import { logger } from '../utils/logger.js';
import {
  ListarSenadoresInput,
  ObterSenadorInput,
  BuscarSenadorPorNomeInput,
  VotacoesSenadorInput,
  type SenadorResumoType,
  type SenadorDetalheType,
  type VotoSenadorType
} from '../schemas/senador.js';

// Helper functions to parse API responses
function parseSenadorResumo(parlamentar: any): SenadorResumoType {
  const identificacao = parlamentar.IdentificacaoParlamentar || parlamentar;
  const mandato = parlamentar.Mandato || {};

  return {
    codigo: parseInt(identificacao.CodigoParlamentar || '0'),
    nome: identificacao.NomeParlamentar || '',
    nomeCompleto: identificacao.NomeCompletoParlamentar || identificacao.NomeParlamentar || '',
    partido: mandato.Partido?.SiglaPartido || identificacao.SiglaPartidoParlamentar || null,
    uf: mandato.UfParlamentar || identificacao.UfParlamentar || '',
    foto: identificacao.UrlFotoParlamentar || null,
    emExercicio: parlamentar.DescricaoParticipacao !== 'Suplente' && !parlamentar.DataFim
  };
}

function parseSenadorDetalhe(dados: any): SenadorDetalheType {
  const parlamentar = dados.Parlamentar || dados;
  const identificacao = parlamentar.IdentificacaoParlamentar || {};
  const dadosBasicos = parlamentar.DadosBasicosParlamentar || {};

  return {
    codigo: parseInt(identificacao.CodigoParlamentar || '0'),
    nome: identificacao.NomeParlamentar || '',
    nomeCompleto: identificacao.NomeCompletoParlamentar || '',
    nomeCivil: dadosBasicos.NomeCivilParlamentar || null,
    sexo: identificacao.SexoParlamentar || null,
    dataNascimento: dadosBasicos.DataNascimento || null,
    naturalidade: dadosBasicos.Naturalidade || null,
    ufNaturalidade: dadosBasicos.UfNaturalidade || null,
    partido: identificacao.SiglaPartidoParlamentar || null,
    uf: identificacao.UfParlamentar || '',
    foto: identificacao.UrlFotoParlamentar || null,
    email: identificacao.EmailParlamentar || null,
    telefone: null,
    emExercicio: true,
    mandatos: parlamentar.Mandatos?.Mandato
      ? (Array.isArray(parlamentar.Mandatos.Mandato)
          ? parlamentar.Mandatos.Mandato
          : [parlamentar.Mandatos.Mandato]
        ).map((m: any) => ({
          legislatura: parseInt(m.PrimeiraLegislaturaDoMandato?.NumeroLegislatura || '0'),
          uf: m.UfParlamentar || '',
          participacao: m.DescricaoParticipacao || '',
          dataInicio: m.DataInicio || null,
          dataFim: m.DataFim || null
        }))
      : undefined,
    comissoes: undefined
  };
}

function parseVotoSenador(votacao: any): VotoSenadorType {
  return {
    codigoVotacao: parseInt(votacao.CodigoSessaoVotacao || votacao.CodigoVotacao || '0'),
    data: votacao.DataSessao || votacao.Data || '',
    materia: votacao.IdentificacaoMateria?.DescricaoIdentificacaoMateria ||
             `${votacao.SiglaMateria || ''} ${votacao.NumeroMateria || ''}/${votacao.AnoMateria || ''}`.trim(),
    descricao: votacao.DescricaoVotacao || null,
    voto: votacao.DescricaoVoto || votacao.SiglaDescricaoVoto || '',
    resultado: votacao.Resultado || null
  };
}

export function registerSenadoresTools(server: McpServer) {
  // senado_listar_senadores
  server.tool(
    'senado_listar_senadores',
    'Lista senadores em exercício ou de uma legislatura específica. Pode filtrar por UF e partido.',
    {
      legislatura: z.number().int().min(1).optional().describe('Número da legislatura (ex: 57 para 2023-2027)'),
      uf: z.string().length(2).optional().describe('Sigla do estado (ex: SP, RJ, MG)'),
      partido: z.string().optional().describe('Sigla do partido (ex: PT, PL, MDB)'),
      emExercicio: z.boolean().optional().default(true).describe('Filtrar apenas senadores em exercício')
    },
    async (params) => {
      try {
        const input = ListarSenadoresInput.parse(params);
        logger.info({ input }, 'Listing senators');

        let endpoint: string;
        if (input.legislatura) {
          endpoint = ENDPOINTS.SENADORES_LEGISLATURA(input.legislatura);
        } else {
          endpoint = ENDPOINTS.SENADORES_ATUAIS;
        }

        const response = await apiRequest<any>(endpoint);

        // Parse response - structure varies based on endpoint
        let parlamentares: any[] = [];
        if (response.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar) {
          parlamentares = response.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
        } else if (response.ListaParlamentarLegislatura?.Parlamentares?.Parlamentar) {
          parlamentares = response.ListaParlamentarLegislatura.Parlamentares.Parlamentar;
        }

        if (!Array.isArray(parlamentares)) {
          parlamentares = parlamentares ? [parlamentares] : [];
        }

        let senadores = parlamentares.map(parseSenadorResumo);

        // Apply filters
        if (input.uf) {
          const ufUpper = input.uf.toUpperCase();
          senadores = senadores.filter(s => s.uf.toUpperCase() === ufUpper);
        }

        if (input.partido) {
          const partidoUpper = input.partido.toUpperCase();
          senadores = senadores.filter(s => s.partido?.toUpperCase() === partidoUpper);
        }

        const result = createSuccessResponse(
          { count: senadores.length, senadores },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error listing senators');
        const errorResult = createErrorResponse(
          'ERRO_LISTAR_SENADORES',
          error instanceof Error ? error.message : 'Erro desconhecido',
          'Verifique os parâmetros e tente novamente'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_obter_senador
  server.tool(
    'senado_obter_senador',
    'Obtém informações detalhadas de um senador específico, incluindo dados biográficos, mandatos e comissões.',
    {
      codigoSenador: z.number().int().positive().describe('Código único do senador no sistema do Senado')
    },
    async (params) => {
      try {
        const input = ObterSenadorInput.parse(params);
        logger.info({ input }, 'Getting senator details');

        const endpoint = ENDPOINTS.SENADOR(input.codigoSenador);
        const response = await apiRequest<any>(endpoint);

        const dados = response.DetalheParlamentar || response;
        const senador = parseSenadorDetalhe(dados);

        const result = createSuccessResponse(senador, endpoint);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting senator details');
        const errorResult = createErrorResponse(
          'SENADOR_NAO_ENCONTRADO',
          error instanceof Error ? error.message : 'Senador não encontrado',
          'Use senado_buscar_senador_por_nome para encontrar o código correto'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_buscar_senador_por_nome
  server.tool(
    'senado_buscar_senador_por_nome',
    'Busca senadores por nome (útil quando não se tem o código). Retorna lista de senadores correspondentes.',
    {
      nome: z.string().min(2).describe('Nome ou parte do nome do senador')
    },
    async (params) => {
      try {
        const input = BuscarSenadorPorNomeInput.parse(params);
        logger.info({ input }, 'Searching senator by name');

        // Search in current senators
        const endpoint = ENDPOINTS.SENADORES_ATUAIS;
        const response = await apiRequest<any>(endpoint);

        let parlamentares: any[] = [];
        if (response.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar) {
          parlamentares = response.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
        }

        if (!Array.isArray(parlamentares)) {
          parlamentares = parlamentares ? [parlamentares] : [];
        }

        const nomeNormalizado = input.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const senadores = parlamentares
          .map(parseSenadorResumo)
          .filter(s => {
            const nomeCompleto = s.nomeCompleto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            const nomeParlamentar = s.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return nomeCompleto.includes(nomeNormalizado) || nomeParlamentar.includes(nomeNormalizado);
          });

        const result = createSuccessResponse(
          { count: senadores.length, senadores },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error searching senator by name');
        const errorResult = createErrorResponse(
          'ERRO_BUSCAR_SENADOR',
          error instanceof Error ? error.message : 'Erro na busca',
          'Tente com um nome diferente ou mais completo'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_votacoes_senador
  server.tool(
    'senado_votacoes_senador',
    'Lista votações de um senador específico, mostrando como o senador votou em cada matéria.',
    {
      codigoSenador: z.number().int().positive().describe('Código único do senador'),
      ano: z.number().int().min(1900).max(2100).optional().describe('Ano das votações'),
      dataInicio: z.string().regex(/^\d{8}$/).optional().describe('Data início (YYYYMMDD)'),
      dataFim: z.string().regex(/^\d{8}$/).optional().describe('Data fim (YYYYMMDD)')
    },
    async (params) => {
      try {
        const input = VotacoesSenadorInput.parse(params);
        logger.info({ input }, 'Getting senator votes');

        let endpoint = ENDPOINTS.SENADOR_VOTACOES(input.codigoSenador);

        // Add query params if provided
        const queryParams: string[] = [];
        if (input.ano) queryParams.push(`ano=${input.ano}`);
        if (input.dataInicio) queryParams.push(`dataInicio=${input.dataInicio}`);
        if (input.dataFim) queryParams.push(`dataFim=${input.dataFim}`);

        if (queryParams.length > 0) {
          endpoint += '?' + queryParams.join('&');
        }

        const response = await apiRequest<any>(endpoint);

        let votacoes: any[] = [];
        if (response.VotacaoParlamentar?.Parlamentar?.Votacoes?.Votacao) {
          votacoes = response.VotacaoParlamentar.Parlamentar.Votacoes.Votacao;
        } else if (response.VotacoesParlamentar?.Votacoes?.Votacao) {
          votacoes = response.VotacoesParlamentar.Votacoes.Votacao;
        }

        if (!Array.isArray(votacoes)) {
          votacoes = votacoes ? [votacoes] : [];
        }

        const votos = votacoes.map(parseVotoSenador);

        const result = createSuccessResponse(
          { count: votos.length, votos },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting senator votes');
        const errorResult = createErrorResponse(
          'ERRO_VOTACOES_SENADOR',
          error instanceof Error ? error.message : 'Erro ao obter votações',
          'Verifique se o código do senador está correto'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );
}
