import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createSuccessResponse, createErrorResponse } from '../../api/client.js';
import { logger } from '../../utils/logger.js';
import { listarConsultas } from '../../scraper/pages/consultas.js';
import { listarIdeias } from '../../scraper/pages/ideias.js';
import type { ScrapingError } from '../../scraper/client.js';

interface SugestaoTema {
  tipo: 'ideia' | 'consulta';
  id: number;
  titulo: string;
  motivo: string;
  metricas: {
    participacao: number;
    polarizacao?: number;
  };
  materiaRelacionada?: string;
  url: string;
}

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
            nota: 'As demais funcionalidades do senado-br-mcp continuam operacionais.'
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
        error instanceof Error ? error.message : 'Erro desconhecido',
        'Acesse diretamente: https://www12.senado.leg.br/ecidadania'
      ), null, 2)
    }]
  };
}

export function registerSugestaoTools(server: McpServer) {
  // senado_ecidadania_sugerir_tema_enquete
  server.tool(
    'senado_ecidadania_sugerir_tema_enquete',
    'Analisa e sugere temas para enquete mensal baseado em critérios configuráveis. Evita temas muito polarizados ou com consenso total.',
    {
      criterios: z.object({
        evitarPolarizacao: z.boolean().optional().default(true).describe('Evita temas com ~50/50'),
        evitarConsenso: z.boolean().optional().default(true).describe('Evita temas com >85%'),
        minimoParticipacao: z.number().int().min(0).optional().default(500).describe('Mínimo de votos/apoios'),
        apenasEmTramitacao: z.boolean().optional().default(true).describe('Apenas matérias em tramitação')
      }).optional()
    },
    async (params) => {
      try {
        const criterios = params.criterios || {
          evitarPolarizacao: true,
          evitarConsenso: true,
          minimoParticipacao: 500,
          apenasEmTramitacao: true
        };

        logger.info({ criterios }, 'Suggesting themes for survey');

        // Fetch consultas and ideias
        const [consultas, ideias] = await Promise.all([
          listarConsultas({ limite: 50 }),
          listarIdeias({ status: 'aberta', limite: 50, ordenarPor: 'apoios', ordem: 'desc' })
        ]);

        const sugestoes: SugestaoTema[] = [];

        // Analyze consultas
        for (const consulta of consultas) {
          if (consulta.totalVotos < criterios.minimoParticipacao) continue;

          const polarizacao = Math.abs(consulta.percentualSim - consulta.percentualNao);

          // Skip if too polarized (close to 50/50)
          if (criterios.evitarPolarizacao && polarizacao < 20) {
            continue;
          }

          // Skip if too consensual (one side > 85%)
          const maiorPercentual = Math.max(consulta.percentualSim, consulta.percentualNao);
          if (criterios.evitarConsenso && maiorPercentual > 85) {
            continue;
          }

          // Good candidate - between 20% and 70% difference
          let motivo = '';
          if (polarizacao >= 20 && polarizacao <= 40) {
            motivo = 'Tema com divisão moderada de opiniões, ideal para debate';
          } else if (polarizacao > 40 && polarizacao <= 70) {
            motivo = 'Tema com tendência clara mas ainda com debate significativo';
          } else {
            motivo = 'Tema com boa participação cidadã';
          }

          sugestoes.push({
            tipo: 'consulta',
            id: consulta.id,
            titulo: consulta.ementa.substring(0, 200),
            motivo,
            metricas: {
              participacao: consulta.totalVotos,
              polarizacao: 100 - polarizacao // Higher = more polarized (closer to 50/50)
            },
            materiaRelacionada: consulta.materia || undefined,
            url: consulta.url
          });
        }

        // Analyze ideias
        for (const ideia of ideias) {
          if (ideia.apoios < criterios.minimoParticipacao) continue;

          sugestoes.push({
            tipo: 'ideia',
            id: ideia.id,
            titulo: ideia.titulo.substring(0, 200),
            motivo: `Ideia popular com ${ideia.apoios.toLocaleString()} apoios`,
            metricas: {
              participacao: ideia.apoios
            },
            url: ideia.url
          });
        }

        // Sort by participation
        sugestoes.sort((a, b) => b.metricas.participacao - a.metricas.participacao);

        const result = createSuccessResponse(
          {
            criteriosAplicados: criterios,
            totalAnalisados: consultas.length + ideias.length,
            count: sugestoes.length,
            sugestoes: sugestoes.slice(0, 10)
          },
          '/ecidadania'
        );

        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        return handleScrapingError(error, 'sugerir_tema_enquete');
      }
    }
  );
}
