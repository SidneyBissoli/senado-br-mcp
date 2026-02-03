import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, createSuccessResponse, createErrorResponse } from '../api/client.js';
import { ENDPOINTS } from '../api/endpoints.js';
import { logger } from '../utils/logger.js';
import {
  ListarComissoesInput,
  ObterComissaoInput,
  MembrosComissaoInput,
  ReunioesComissaoInput,
  type ComissaoResumoType,
  type ComissaoDetalheType,
  type MembroComissaoType,
  type ReuniaoComissaoType
} from '../schemas/comissao.js';

// Helper functions to parse API responses
function parseComissaoResumo(comissao: any): ComissaoResumoType {
  const identificacao = comissao.IdentificacaoComissao || comissao;

  return {
    codigo: parseInt(identificacao.CodigoComissao || comissao.Codigo || '0'),
    sigla: identificacao.SiglaComissao || comissao.Sigla || '',
    nome: identificacao.NomeComissao || comissao.Nome || '',
    tipo: comissao.TipoComissao?.DescricaoTipoComissao || comissao.Tipo || null,
    casa: identificacao.SiglaCasaComissao || comissao.Casa || null,
    ativa: comissao.DataFim === null || comissao.DataFim === undefined
  };
}

function parseComissaoDetalhe(dados: any): ComissaoDetalheType {
  const comissao = dados.Comissao || dados;
  const identificacao = comissao.IdentificacaoComissao || {};

  let presidente = null;
  let vicePresidente = null;

  if (comissao.Presidente || comissao.MembroPresidente) {
    const pres = comissao.Presidente || comissao.MembroPresidente;
    const identPres = pres.IdentificacaoParlamentar || pres;
    presidente = {
      codigo: parseInt(identPres.CodigoParlamentar || '0'),
      nome: identPres.NomeParlamentar || pres.NomeParlamentar || '',
      partido: identPres.SiglaPartidoParlamentar || pres.SiglaPartido || null,
      uf: identPres.UfParlamentar || pres.UfParlamentar || null
    };
  }

  if (comissao.VicePresidente || comissao.MembroVicePresidente) {
    const vice = comissao.VicePresidente || comissao.MembroVicePresidente;
    const identVice = vice.IdentificacaoParlamentar || vice;
    vicePresidente = {
      codigo: parseInt(identVice.CodigoParlamentar || '0'),
      nome: identVice.NomeParlamentar || vice.NomeParlamentar || '',
      partido: identVice.SiglaPartidoParlamentar || vice.SiglaPartido || null,
      uf: identVice.UfParlamentar || vice.UfParlamentar || null
    };
  }

  return {
    codigo: parseInt(identificacao.CodigoComissao || comissao.Codigo || '0'),
    sigla: identificacao.SiglaComissao || comissao.Sigla || '',
    nome: identificacao.NomeComissao || comissao.Nome || '',
    tipo: comissao.TipoComissao?.DescricaoTipoComissao || comissao.Tipo || null,
    casa: identificacao.SiglaCasaComissao || comissao.Casa || null,
    ativa: comissao.DataFim === null || comissao.DataFim === undefined,
    dataInicio: comissao.DataInicio || null,
    dataFim: comissao.DataFim || null,
    finalidade: comissao.Finalidade || null,
    presidente,
    vicePresidente
  };
}

function parseMembroComissao(membro: any): MembroComissaoType {
  const identificacao = membro.IdentificacaoParlamentar || membro;

  return {
    codigo: parseInt(identificacao.CodigoParlamentar || membro.CodigoParlamentar || '0'),
    nome: identificacao.NomeParlamentar || membro.NomeParlamentar || '',
    partido: identificacao.SiglaPartidoParlamentar || membro.SiglaPartido || null,
    uf: identificacao.UfParlamentar || membro.UfParlamentar || null,
    cargo: membro.DescricaoCargo || membro.Cargo || null,
    titular: membro.DescricaoParticipacao !== 'Suplente'
  };
}

function parseReuniaoComissao(reuniao: any): ReuniaoComissaoType {
  return {
    codigo: parseInt(reuniao.CodigoReuniao || reuniao.Codigo || '0'),
    data: reuniao.DataReuniao || reuniao.Data || '',
    hora: reuniao.HoraReuniao || reuniao.Hora || null,
    local: reuniao.LocalReuniao || reuniao.Local || null,
    tipo: reuniao.TipoReuniao?.DescricaoTipoReuniao || reuniao.Tipo || null,
    situacao: reuniao.SituacaoReuniao?.DescricaoSituacaoReuniao || reuniao.Situacao || null,
    pauta: reuniao.Pauta || reuniao.DescricaoPauta || null
  };
}

export function registerComissoesTools(server: McpServer) {
  // senado_listar_comissoes
  server.tool(
    'senado_listar_comissoes',
    'Lista comissões do Senado. Pode filtrar por tipo (permanente, temporária, CPI, mista) e status (ativa/inativa).',
    {
      tipo: z.enum(['permanente', 'temporaria', 'cpi', 'mista']).optional().describe('Tipo: permanente, temporaria, cpi, mista'),
      ativa: z.boolean().optional().describe('Apenas comissões ativas')
    },
    async (params) => {
      try {
        const input = ListarComissoesInput.parse(params);
        logger.info({ input }, 'Listing comissoes');

        const endpoint = ENDPOINTS.COMISSOES_LISTA;
        const response = await apiRequest<any>(endpoint);

        let comissoes: any[] = [];
        if (response.ListaComissoes?.Comissoes?.Comissao) {
          comissoes = response.ListaComissoes.Comissoes.Comissao;
        } else if (response.Comissoes?.Comissao) {
          comissoes = response.Comissoes.Comissao;
        }

        if (!Array.isArray(comissoes)) {
          comissoes = comissoes ? [comissoes] : [];
        }

        let comissoesFormatadas = comissoes.map(parseComissaoResumo);

        // Apply filters
        if (input.tipo) {
          const tipoMap: Record<string, string[]> = {
            'permanente': ['Permanente', 'PERMANENTE'],
            'temporaria': ['Temporária', 'TEMPORARIA', 'Temporaria'],
            'cpi': ['CPI', 'Comissão Parlamentar de Inquérito'],
            'mista': ['Mista', 'MISTA']
          };
          const tiposValidos = tipoMap[input.tipo] || [];
          comissoesFormatadas = comissoesFormatadas.filter(c =>
            c.tipo && tiposValidos.some(t => c.tipo!.toLowerCase().includes(t.toLowerCase()))
          );
        }

        if (input.ativa !== undefined) {
          comissoesFormatadas = comissoesFormatadas.filter(c => c.ativa === input.ativa);
        }

        const result = createSuccessResponse(
          { count: comissoesFormatadas.length, comissoes: comissoesFormatadas },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error listing comissoes');
        const errorResult = createErrorResponse(
          'ERRO_LISTAR_COMISSOES',
          error instanceof Error ? error.message : 'Erro ao listar comissões',
          'Verifique os parâmetros e tente novamente'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_obter_comissao
  server.tool(
    'senado_obter_comissao',
    'Obtém detalhes de uma comissão, incluindo presidente, vice-presidente e finalidade.',
    {
      sigla: z.string().min(2).describe('Sigla da comissão (ex: CCJ, CAE)')
    },
    async (params) => {
      try {
        const input = ObterComissaoInput.parse(params);
        const sigla = input.sigla.toUpperCase();
        logger.info({ sigla }, 'Getting comissao details');

        const endpoint = ENDPOINTS.COMISSAO(sigla);
        const response = await apiRequest<any>(endpoint);

        const dados = response.DetalheComissao || response;
        const comissao = parseComissaoDetalhe(dados);

        const result = createSuccessResponse(comissao, endpoint);

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting comissao details');
        const errorResult = createErrorResponse(
          'COMISSAO_NAO_ENCONTRADA',
          error instanceof Error ? error.message : 'Comissão não encontrada',
          'Use senado_listar_comissoes para ver as siglas válidas'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_membros_comissao
  server.tool(
    'senado_membros_comissao',
    'Lista membros atuais de uma comissão, incluindo cargo (presidente, vice, titular, suplente).',
    {
      sigla: z.string().min(2).describe('Sigla da comissão')
    },
    async (params) => {
      try {
        const input = MembrosComissaoInput.parse(params);
        const sigla = input.sigla.toUpperCase();
        logger.info({ sigla }, 'Getting comissao members');

        const endpoint = ENDPOINTS.COMISSAO_COMPOSICAO(sigla);
        const response = await apiRequest<any>(endpoint);

        let membros: any[] = [];
        if (response.ComposicaoComissao?.Comissao?.Membros?.Membro) {
          membros = response.ComposicaoComissao.Comissao.Membros.Membro;
        } else if (response.Membros?.Membro) {
          membros = response.Membros.Membro;
        }

        if (!Array.isArray(membros)) {
          membros = membros ? [membros] : [];
        }

        const membrosFormatados = membros.map(parseMembroComissao);

        const result = createSuccessResponse(
          {
            sigla,
            count: membrosFormatados.length,
            membros: membrosFormatados
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting comissao members');
        const errorResult = createErrorResponse(
          'ERRO_MEMBROS_COMISSAO',
          error instanceof Error ? error.message : 'Erro ao obter membros',
          'Verifique se a sigla da comissão está correta'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_reunioes_comissao
  server.tool(
    'senado_reunioes_comissao',
    'Lista reuniões agendadas ou realizadas de uma comissão, com data, hora, local e pauta.',
    {
      sigla: z.string().min(2).describe('Sigla da comissão'),
      dataInicio: z.string().regex(/^\d{8}$/).optional().describe('Data início (YYYYMMDD)'),
      dataFim: z.string().regex(/^\d{8}$/).optional().describe('Data fim (YYYYMMDD)')
    },
    async (params) => {
      try {
        const input = ReunioesComissaoInput.parse(params);
        const sigla = input.sigla.toUpperCase();
        logger.info({ input }, 'Getting comissao reunioes');

        // Build endpoint with query params
        let endpoint = ENDPOINTS.COMISSAO(sigla);
        const queryParams: string[] = [];
        if (input.dataInicio) queryParams.push(`dataInicio=${input.dataInicio}`);
        if (input.dataFim) queryParams.push(`dataFim=${input.dataFim}`);

        if (queryParams.length > 0) {
          endpoint += '?' + queryParams.join('&');
        }

        const response = await apiRequest<any>(endpoint);

        let reunioes: any[] = [];
        if (response.DetalheComissao?.Comissao?.Reunioes?.Reuniao) {
          reunioes = response.DetalheComissao.Comissao.Reunioes.Reuniao;
        } else if (response.Reunioes?.Reuniao) {
          reunioes = response.Reunioes.Reuniao;
        }

        if (!Array.isArray(reunioes)) {
          reunioes = reunioes ? [reunioes] : [];
        }

        const reunioesFormatadas = reunioes.map(parseReuniaoComissao);

        const result = createSuccessResponse(
          {
            sigla,
            count: reunioesFormatadas.length,
            reunioes: reunioesFormatadas
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting comissao reunioes');
        const errorResult = createErrorResponse(
          'ERRO_REUNIOES_COMISSAO',
          error instanceof Error ? error.message : 'Erro ao obter reuniões',
          'Verifique se a sigla da comissão está correta'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );
}
