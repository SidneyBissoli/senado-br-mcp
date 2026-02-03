import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiRequest, createSuccessResponse, createErrorResponse } from '../api/client.js';
import { ENDPOINTS } from '../api/endpoints.js';
import { logger } from '../utils/logger.js';
import {
  AgendaPlenarioInput,
  AgendaComissoesInput,
  type SessaoPlenarioType,
  type ReuniaoAgendadaType
} from '../schemas/agenda.js';

// Helper to format date as YYYYMMDD
function formatDateYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// Helper functions to parse API responses
function parseSessaoPlenario(sessao: any): SessaoPlenarioType {
  let pauta: SessaoPlenarioType['pauta'] = undefined;

  if (sessao.Materias?.Materia) {
    let materias = sessao.Materias.Materia;
    if (!Array.isArray(materias)) {
      materias = [materias];
    }
    pauta = materias.map((m: any) => ({
      materia: m.IdentificacaoMateria?.DescricaoIdentificacaoMateria ||
               `${m.SiglaSubtipoMateria || ''} ${m.NumeroMateria || ''}/${m.AnoMateria || ''}`.trim() || null,
      ementa: m.EmentaMateria || m.Ementa || null,
      relator: m.Relator?.NomeRelator || null
    }));
  }

  return {
    codigo: parseInt(sessao.CodigoSessao || sessao.Codigo || '0'),
    data: sessao.DataSessao || sessao.Data || '',
    hora: sessao.HoraInicioSessao || sessao.Hora || null,
    tipo: sessao.TipoSessao?.DescricaoTipoSessao || sessao.DescricaoTipoSessao || sessao.Tipo || null,
    situacao: sessao.SituacaoSessao?.DescricaoSituacaoSessao || sessao.Situacao || null,
    pauta
  };
}

function parseReuniaoAgendada(reuniao: any): ReuniaoAgendadaType {
  const comissaoData = reuniao.Comissao || reuniao.IdentificacaoComissao || {};

  return {
    codigo: parseInt(reuniao.CodigoReuniao || reuniao.Codigo || '0'),
    comissao: {
      sigla: comissaoData.SiglaComissao || comissaoData.Sigla || '',
      nome: comissaoData.NomeComissao || comissaoData.Nome || ''
    },
    data: reuniao.DataReuniao || reuniao.Data || '',
    hora: reuniao.HoraReuniao || reuniao.Hora || null,
    local: reuniao.LocalReuniao || reuniao.Local || null,
    tipo: reuniao.TipoReuniao?.DescricaoTipoReuniao || reuniao.Tipo || null,
    situacao: reuniao.SituacaoReuniao?.DescricaoSituacaoReuniao || reuniao.Situacao || null
  };
}

export function registerAgendaTools(server: McpServer) {
  // senado_agenda_plenario
  server.tool(
    'senado_agenda_plenario',
    'Obtém agenda de sessões do plenário do Senado, incluindo pauta com matérias a serem votadas.',
    {
      data: z.string().regex(/^\d{8}$/).optional().describe('Data específica (YYYYMMDD)'),
      dataInicio: z.string().regex(/^\d{8}$/).optional().describe('Data início (YYYYMMDD)'),
      dataFim: z.string().regex(/^\d{8}$/).optional().describe('Data fim (YYYYMMDD)')
    },
    async (params) => {
      try {
        const input = AgendaPlenarioInput.parse(params);
        logger.info({ input }, 'Getting agenda plenario');

        // Use provided date or today
        const data = input.data || formatDateYYYYMMDD(new Date());
        const endpoint = ENDPOINTS.AGENDA(data);

        const response = await apiRequest<any>(endpoint);

        let sessoes: any[] = [];
        if (response.Agenda?.Sessoes?.Sessao) {
          sessoes = response.Agenda.Sessoes.Sessao;
        } else if (response.AgendaPlenario?.Sessoes?.Sessao) {
          sessoes = response.AgendaPlenario.Sessoes.Sessao;
        } else if (response.Sessoes?.Sessao) {
          sessoes = response.Sessoes.Sessao;
        }

        if (!Array.isArray(sessoes)) {
          sessoes = sessoes ? [sessoes] : [];
        }

        const sessoesFormatadas = sessoes.map(parseSessaoPlenario);

        const result = createSuccessResponse(
          {
            data,
            count: sessoesFormatadas.length,
            sessoes: sessoesFormatadas
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting agenda plenario');
        const errorResult = createErrorResponse(
          'ERRO_AGENDA_PLENARIO',
          error instanceof Error ? error.message : 'Erro ao obter agenda do plenário',
          'Verifique se a data está no formato correto (YYYYMMDD)'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_agenda_comissoes
  server.tool(
    'senado_agenda_comissoes',
    'Obtém agenda de reuniões das comissões do Senado. Pode filtrar por data e comissão específica.',
    {
      data: z.string().regex(/^\d{8}$/).optional().describe('Data específica (YYYYMMDD)'),
      siglaComissao: z.string().min(2).optional().describe('Filtrar por comissão específica')
    },
    async (params) => {
      try {
        const input = AgendaComissoesInput.parse(params);
        logger.info({ input }, 'Getting agenda comissoes');

        // Use provided date or today
        const data = input.data || formatDateYYYYMMDD(new Date());
        const endpoint = ENDPOINTS.AGENDA(data);

        const response = await apiRequest<any>(endpoint);

        let reunioes: any[] = [];
        if (response.Agenda?.Reunioes?.Reuniao) {
          reunioes = response.Agenda.Reunioes.Reuniao;
        } else if (response.AgendaComissoes?.Reunioes?.Reuniao) {
          reunioes = response.AgendaComissoes.Reunioes.Reuniao;
        } else if (response.Reunioes?.Reuniao) {
          reunioes = response.Reunioes.Reuniao;
        }

        if (!Array.isArray(reunioes)) {
          reunioes = reunioes ? [reunioes] : [];
        }

        let reunioesFormatadas = reunioes.map(parseReuniaoAgendada);

        // Filter by comissao if specified
        if (input.siglaComissao) {
          const siglaUpper = input.siglaComissao.toUpperCase();
          reunioesFormatadas = reunioesFormatadas.filter(r =>
            r.comissao.sigla.toUpperCase() === siglaUpper
          );
        }

        const result = createSuccessResponse(
          {
            data,
            siglaComissao: input.siglaComissao || null,
            count: reunioesFormatadas.length,
            reunioes: reunioesFormatadas
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting agenda comissoes');
        const errorResult = createErrorResponse(
          'ERRO_AGENDA_COMISSOES',
          error instanceof Error ? error.message : 'Erro ao obter agenda das comissões',
          'Verifique se a data está no formato correto (YYYYMMDD)'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );
}
