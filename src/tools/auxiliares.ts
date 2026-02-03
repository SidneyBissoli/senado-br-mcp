import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiRequest, createSuccessResponse, createErrorResponse } from '../api/client.js';
import { ENDPOINTS } from '../api/endpoints.js';
import { logger } from '../utils/logger.js';

// Static data for tipos de matéria (from specification)
const TIPOS_MATERIA = [
  { sigla: 'PEC', nome: 'Proposta de Emenda à Constituição', descricao: 'Altera a Constituição Federal' },
  { sigla: 'PL', nome: 'Projeto de Lei', descricao: 'Projeto de lei ordinária' },
  { sigla: 'PLP', nome: 'Projeto de Lei Complementar', descricao: 'Regulamenta dispositivos constitucionais' },
  { sigla: 'MPV', nome: 'Medida Provisória', descricao: 'Medida com força de lei editada pelo Executivo' },
  { sigla: 'PDL', nome: 'Projeto de Decreto Legislativo', descricao: 'Matéria de competência exclusiva do Congresso' },
  { sigla: 'PRS', nome: 'Projeto de Resolução do Senado', descricao: 'Matéria de competência privativa do Senado' },
  { sigla: 'PLC', nome: 'Projeto de Lei da Câmara', descricao: 'Projeto de lei originário da Câmara dos Deputados' },
  { sigla: 'PLS', nome: 'Projeto de Lei do Senado', descricao: 'Projeto de lei originário do Senado (nomenclatura antiga)' },
  { sigla: 'REQ', nome: 'Requerimento', descricao: 'Solicitação de providência ou informação' },
  { sigla: 'RQS', nome: 'Requerimento do Senado', descricao: 'Requerimento de competência do Senado' },
  { sigla: 'INC', nome: 'Indicação', descricao: 'Sugestão a outro Poder ou órgão' },
  { sigla: 'SUG', nome: 'Sugestão Legislativa', descricao: 'Sugestão da sociedade civil' }
];

// Static data for UFs
const UFS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

export function registerAuxiliaresTools(server: McpServer) {
  // senado_legislatura_atual
  server.tool(
    'senado_legislatura_atual',
    'Retorna informações sobre a legislatura vigente, incluindo número, período e datas de início/fim.',
    {},
    async () => {
      try {
        logger.info('Getting current legislature');

        // Try to get from API first
        try {
          const endpoint = ENDPOINTS.SENADORES_ATUAIS;
          const response = await apiRequest<any>(endpoint);

          // Extract legislature from response
          let legislatura = null;
          if (response.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar) {
            const parlamentares = response.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
            const primeiro = Array.isArray(parlamentares) ? parlamentares[0] : parlamentares;
            if (primeiro?.Mandato?.PrimeiraLegislaturaDoMandato?.NumeroLegislatura) {
              legislatura = parseInt(primeiro.Mandato.PrimeiraLegislaturaDoMandato.NumeroLegislatura);
            }
          }

          if (legislatura) {
            // Calculate period based on legislature number
            // 57th legislature: 2023-2027
            const anoInicio = 2023 - (57 - legislatura) * 4;
            const anoFim = anoInicio + 4;

            const result = createSuccessResponse(
              {
                numero: legislatura,
                periodo: `${anoInicio}-${anoFim}`,
                dataInicio: `${anoInicio}-02-01`,
                dataFim: `${anoFim}-01-31`
              },
              endpoint
            );

            return {
              content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
            };
          }
        } catch {
          // Fall through to default
        }

        // Default: 57th legislature (2023-2027)
        const result = createSuccessResponse(
          {
            numero: 57,
            periodo: '2023-2027',
            dataInicio: '2023-02-01',
            dataFim: '2027-01-31'
          },
          '/legislatura/atual'
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting current legislature');
        const errorResult = createErrorResponse(
          'ERRO_LEGISLATURA',
          error instanceof Error ? error.message : 'Erro ao obter legislatura',
          'Tente novamente mais tarde'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_tipos_materia
  server.tool(
    'senado_tipos_materia',
    'Lista os tipos de matérias legislativas válidos com sigla, nome completo e descrição. Útil para usar em buscas.',
    {},
    async () => {
      try {
        logger.info('Getting tipos materia');

        const result = createSuccessResponse(
          {
            count: TIPOS_MATERIA.length,
            tipos: TIPOS_MATERIA
          },
          '/materia/siglas'
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting tipos materia');
        const errorResult = createErrorResponse(
          'ERRO_TIPOS_MATERIA',
          error instanceof Error ? error.message : 'Erro ao obter tipos de matéria',
          'Tente novamente mais tarde'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_partidos
  server.tool(
    'senado_partidos',
    'Lista partidos com representação atual no Senado, incluindo sigla, nome completo e número de senadores.',
    {},
    async () => {
      try {
        logger.info('Getting partidos');

        const endpoint = ENDPOINTS.SENADORES_ATUAIS;
        const response = await apiRequest<any>(endpoint);

        let parlamentares: any[] = [];
        if (response.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar) {
          parlamentares = response.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
        }

        if (!Array.isArray(parlamentares)) {
          parlamentares = parlamentares ? [parlamentares] : [];
        }

        // Count senators by party
        const partidoCount: Record<string, { sigla: string; nome: string; senadores: number }> = {};

        for (const p of parlamentares) {
          const mandato = p.Mandato || {};
          const sigla = mandato.Partido?.SiglaPartido ||
                       p.IdentificacaoParlamentar?.SiglaPartidoParlamentar || 'S/Partido';
          const nome = mandato.Partido?.NomePartido || sigla;

          if (!partidoCount[sigla]) {
            partidoCount[sigla] = { sigla, nome, senadores: 0 };
          }
          partidoCount[sigla].senadores++;
        }

        // Sort by number of senators (descending)
        const partidos = Object.values(partidoCount).sort((a, b) => b.senadores - a.senadores);

        const result = createSuccessResponse(
          {
            count: partidos.length,
            totalSenadores: parlamentares.length,
            partidos
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting partidos');
        const errorResult = createErrorResponse(
          'ERRO_PARTIDOS',
          error instanceof Error ? error.message : 'Erro ao obter partidos',
          'Tente novamente mais tarde'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );

  // senado_ufs
  server.tool(
    'senado_ufs',
    'Lista unidades federativas com número de senadores atualmente em exercício por estado.',
    {},
    async () => {
      try {
        logger.info('Getting UFs');

        const endpoint = ENDPOINTS.SENADORES_ATUAIS;
        const response = await apiRequest<any>(endpoint);

        let parlamentares: any[] = [];
        if (response.ListaParlamentarEmExercicio?.Parlamentares?.Parlamentar) {
          parlamentares = response.ListaParlamentarEmExercicio.Parlamentares.Parlamentar;
        }

        if (!Array.isArray(parlamentares)) {
          parlamentares = parlamentares ? [parlamentares] : [];
        }

        // Count senators by UF
        const ufCount: Record<string, number> = {};

        for (const p of parlamentares) {
          const mandato = p.Mandato || {};
          const uf = mandato.UfParlamentar ||
                    p.IdentificacaoParlamentar?.UfParlamentar || '';

          if (uf) {
            ufCount[uf] = (ufCount[uf] || 0) + 1;
          }
        }

        // Merge with static UF data
        const ufs = UFS.map(uf => ({
          ...uf,
          senadores: ufCount[uf.sigla] || 0
        })).sort((a, b) => a.sigla.localeCompare(b.sigla));

        const result = createSuccessResponse(
          {
            count: ufs.length,
            totalSenadores: parlamentares.length,
            ufs
          },
          endpoint
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error({ error }, 'Error getting UFs');
        const errorResult = createErrorResponse(
          'ERRO_UFS',
          error instanceof Error ? error.message : 'Erro ao obter UFs',
          'Tente novamente mais tarde'
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(errorResult, null, 2) }]
        };
      }
    }
  );
}
