import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse } from '../../api/client.js';
import { logger } from '../../utils/logger.js';
import {
  listarEventos,
  obterEvento,
  eventosPopulares
} from '../../scraper/pages/eventos.js';
import type { ScrapingError } from '../../scraper/client.js';

function handleScrapingError(error: unknown, toolName: string) {
  logger.error({ error, toolName }, 'e-Cidadania scraping error');

  if ((error as ScrapingError).tipo) {
    const scrapingError = error as ScrapingError;
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: false,
          error: {
            code: `ECIDADANIA_${scrapingError.tipo}`,
            message: scrapingError.mensagem,
            suggestion: scrapingError.sugestao,
            nota: 'As demais funcionalidades do senado-br-mcp (senadores, matérias, votações) continuam operacionais.'
          }
        }, null, 2)
      }]
    };
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(createErrorResponse(
        'ECIDADANIA_SCRAPING_FALHOU',
        error instanceof Error ? error.message : 'Erro desconhecido ao acessar e-Cidadania',
        'Acesse diretamente: https://www12.senado.leg.br/ecidadania/principalaudiencia'
      ), null, 2)
    }]
  };
}

export function registerEventosTools(server: McpServer) {
  // senado_ecidadania_listar_eventos
  server.tool(
    'senado_ecidadania_listar_eventos',
    'Lista eventos interativos (audiências públicas, sabatinas, lives) do e-Cidadania.',
    {
      status: z.enum(['agendado', 'encerrado', 'todos']).optional().describe('Filtrar por status'),
      comissao: z.string().optional().describe('Sigla da comissão'),
      limite: z.number().int().min(1).max(100).optional().default(20).describe('Número máximo de resultados')
    },
    async (params) => {
      try {
        const eventos = await listarEventos(params);
        const result = createSuccessResponse(
          { count: eventos.length, eventos },
          '/ecidadania/principalaudiencia'
        );
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'listar_eventos');
      }
    }
  );

  // senado_ecidadania_obter_evento
  server.tool(
    'senado_ecidadania_obter_evento',
    'Obtém detalhes de um evento interativo, incluindo pauta, convidados e link para vídeo.',
    {
      id: z.number().int().positive().describe('ID do evento')
    },
    async (params) => {
      try {
        const evento = await obterEvento(params.id);
        const result = createSuccessResponse(evento, `/ecidadania/visualizacaoaudiencia?id=${params.id}`);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'obter_evento');
      }
    }
  );

  // senado_ecidadania_eventos_populares
  server.tool(
    'senado_ecidadania_eventos_populares',
    'Retorna eventos com mais comentários e perguntas dos cidadãos.',
    {
      limite: z.number().int().min(1).max(50).optional().default(10).describe('Número máximo de resultados'),
      apenasAgendados: z.boolean().optional().default(false).describe('Apenas eventos ainda não realizados')
    },
    async (params) => {
      try {
        const eventos = await eventosPopulares(params.limite, params.apenasAgendados);
        const result = createSuccessResponse(
          {
            criterio: params.apenasAgendados ? 'Eventos agendados mais comentados' : 'Eventos mais comentados',
            count: eventos.length,
            eventos
          },
          '/ecidadania/principalaudiencia'
        );
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'eventos_populares');
      }
    }
  );
}
