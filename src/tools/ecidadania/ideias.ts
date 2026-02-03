import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse } from '../../api/client.js';
import { logger } from '../../utils/logger.js';
import {
  listarIdeias,
  obterIdeia,
  ideiasPopulares
} from '../../scraper/pages/ideias.js';
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
        'Acesse diretamente: https://www12.senado.leg.br/ecidadania/principalideia'
      ), null, 2)
    }]
  };
}

export function registerIdeiasTools(server: McpServer) {
  // senado_ecidadania_listar_ideias
  server.tool(
    'senado_ecidadania_listar_ideias',
    'Lista ideias legislativas propostas por cidadãos no e-Cidadania.',
    {
      status: z.enum(['aberta', 'encerrada', 'convertida', 'todas']).optional().describe('Filtrar por status'),
      ordenarPor: z.enum(['apoios', 'data', 'comentarios']).optional().describe('Campo para ordenação'),
      ordem: z.enum(['asc', 'desc']).optional().describe('Ordem de ordenação'),
      limite: z.number().int().min(1).max(100).optional().default(20).describe('Número máximo de resultados'),
      pagina: z.number().int().min(1).optional().default(1).describe('Página de resultados')
    },
    async (params) => {
      try {
        const ideias = await listarIdeias(params);
        const result = createSuccessResponse(
          { count: ideias.length, ideias },
          '/ecidadania/pesquisaideia'
        );
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'listar_ideias');
      }
    }
  );

  // senado_ecidadania_obter_ideia
  server.tool(
    'senado_ecidadania_obter_ideia',
    'Obtém detalhes de uma ideia legislativa, incluindo descrição completa, apoios e se foi convertida em PL.',
    {
      id: z.number().int().positive().describe('ID da ideia legislativa')
    },
    async (params) => {
      try {
        const ideia = await obterIdeia(params.id);
        const result = createSuccessResponse(ideia, `/ecidadania/visualizacaoideia?id=${params.id}`);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'obter_ideia');
      }
    }
  );

  // senado_ecidadania_ideias_populares
  server.tool(
    'senado_ecidadania_ideias_populares',
    'Retorna as ideias legislativas mais apoiadas pelos cidadãos.',
    {
      limite: z.number().int().min(1).max(50).optional().default(10).describe('Número máximo de resultados'),
      apenasAbertas: z.boolean().optional().default(true).describe('Apenas ideias com apoiamento aberto')
    },
    async (params) => {
      try {
        const ideias = await ideiasPopulares(params.limite, params.apenasAbertas);
        const result = createSuccessResponse(
          {
            criterio: params.apenasAbertas ? 'Ideias abertas mais apoiadas' : 'Todas as ideias mais apoiadas',
            count: ideias.length,
            ideias
          },
          '/ecidadania/principalideia'
        );
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'ideias_populares');
      }
    }
  );
}
