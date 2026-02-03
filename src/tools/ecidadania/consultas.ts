import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse } from '../../api/client.js';
import { logger } from '../../utils/logger.js';
import {
  listarConsultas,
  obterConsulta,
  consultasPolarizadas,
  consultasConsensuais
} from '../../scraper/pages/consultas.js';
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
        'Acesse diretamente: https://www12.senado.leg.br/ecidadania/principalmateria'
      ), null, 2)
    }]
  };
}

export function registerConsultasTools(server: McpServer) {
  // senado_ecidadania_listar_consultas
  server.tool(
    'senado_ecidadania_listar_consultas',
    'Lista consultas públicas do e-Cidadania com votação cidadã sobre matérias em tramitação.',
    {
      status: z.enum(['aberta', 'encerrada', 'todas']).optional().describe('Filtrar por status'),
      limite: z.number().int().min(1).max(100).optional().default(20).describe('Número máximo de resultados'),
      pagina: z.number().int().min(1).optional().default(1).describe('Página de resultados')
    },
    async (params) => {
      try {
        const consultas = await listarConsultas(params);
        const result = createSuccessResponse(
          { count: consultas.length, consultas },
          '/ecidadania/pesquisamateria'
        );
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'listar_consultas');
      }
    }
  );

  // senado_ecidadania_obter_consulta
  server.tool(
    'senado_ecidadania_obter_consulta',
    'Obtém detalhes de uma consulta pública específica, incluindo votos, autor e comentários.',
    {
      id: z.number().int().positive().describe('ID da consulta pública')
    },
    async (params) => {
      try {
        const consulta = await obterConsulta(params.id);
        const result = createSuccessResponse(consulta, `/ecidadania/visualizacaomateria?id=${params.id}`);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'obter_consulta');
      }
    }
  );

  // senado_ecidadania_consultas_polarizadas
  server.tool(
    'senado_ecidadania_consultas_polarizadas',
    'Retorna consultas com votação equilibrada (~50/50), útil para identificar temas polarizados na sociedade.',
    {
      margemPolarizacao: z.number().int().min(0).max(50).optional().default(15).describe('Considera polarizado se diferença < este percentual'),
      minimoVotos: z.number().int().min(0).optional().default(1000).describe('Mínimo de votos para considerar'),
      limite: z.number().int().min(1).max(50).optional().default(10).describe('Número máximo de resultados')
    },
    async (params) => {
      try {
        const consultas = await consultasPolarizadas(
          params.margemPolarizacao,
          params.minimoVotos,
          params.limite
        );
        const result = createSuccessResponse(
          {
            criterio: `Diferença entre sim/não < ${params.margemPolarizacao}%, mínimo ${params.minimoVotos} votos`,
            count: consultas.length,
            consultas
          },
          '/ecidadania/pesquisamateria'
        );
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'consultas_polarizadas');
      }
    }
  );

  // senado_ecidadania_consultas_consensuais
  server.tool(
    'senado_ecidadania_consultas_consensuais',
    'Retorna consultas com alta concordância (>85% em uma direção), útil para identificar temas de consenso.',
    {
      percentualMinimo: z.number().int().min(50).max(100).optional().default(85).describe('Percentual mínimo em uma direção'),
      minimoVotos: z.number().int().min(0).optional().default(1000).describe('Mínimo de votos para considerar'),
      limite: z.number().int().min(1).max(50).optional().default(10).describe('Número máximo de resultados')
    },
    async (params) => {
      try {
        const consultas = await consultasConsensuais(
          params.percentualMinimo,
          params.minimoVotos,
          params.limite
        );
        const result = createSuccessResponse(
          {
            criterio: `>${params.percentualMinimo}% em uma direção, mínimo ${params.minimoVotos} votos`,
            count: consultas.length,
            consultas
          },
          '/ecidadania/pesquisamateria'
        );
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'consultas_consensuais');
      }
    }
  );
}
