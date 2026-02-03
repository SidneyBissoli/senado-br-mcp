import { fetchPage, getBaseUrl } from '../client.js';
import { getCached, setCache } from '../cache.js';
import { parseHtml, extractText, extractNumber, extractId, safeExtract } from '../parser.js';
import { logger } from '../../utils/logger.js';

export interface ConsultaResumo {
  id: number;
  materia: string;
  ementa: string;
  votosSim: number;
  votosNao: number;
  totalVotos: number;
  percentualSim: number;
  percentualNao: number;
  status: string;
  url: string;
}

export interface ConsultaDetalhe extends ConsultaResumo {
  autor: string | null;
  relator: string | null;
  comissao: string | null;
  dataAbertura: string | null;
  dataEncerramento: string | null;
  comentarios: number;
  linkMateria: string | null;
}

export interface ListarConsultasParams {
  status?: 'aberta' | 'encerrada' | 'todas';
  pagina?: number;
  limite?: number;
}

/**
 * Parse Brazilian number format: 1.234.567 -> 1234567
 */
function parseBrazilianNumber(str: string): number {
  // Remove dots (thousands separator) and convert
  const cleaned = str.replace(/\./g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export async function listarConsultas(params: ListarConsultasParams = {}): Promise<ConsultaResumo[]> {
  const { pagina = 1, limite = 20 } = params;
  const cacheKey = `consultas:lista:${JSON.stringify(params)}`;

  const cached = getCached<ConsultaResumo[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `/pesquisamateria?p=${pagina}`;
    const html = await fetchPage(url);
    const $ = parseHtml(html);

    const consultas: ConsultaResumo[] = [];
    const seenIds = new Set<number>();

    // Parse each consultation item
    $('a[href*="visualizacaomateria?id="]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const id = extractId(href);

      if (!id || seenIds.has(id)) return;
      seenIds.add(id);

      // Get the broader container for vote data
      const $container = $el.closest('div').parent();
      const fullText = extractText($container);

      // Extract materia reference (PL 1234/2024, PEC 45/2024, etc.)
      const materiaMatch = fullText.match(/(PL|PEC|PLP|PDL|MPV|SUG)\s*n?º?\s*(\d+)\s*(?:de\s*)?(\d{4})/i);
      const materia = materiaMatch ? `${materiaMatch[1].toUpperCase()} ${materiaMatch[2]}/${materiaMatch[3]}` : '';

      // Extract title/ementa - get the link text
      const ementa = safeExtract(() => extractText($el), '', 'ementa');

      // Extract vote counts - formats:
      // List view: "713.428 1.002.970 SIM NÃO"
      // Detail view: "713.428 1.002.970 Votos apurados"
      let votosSim = 0;
      let votosNao = 0;

      // Try list format first: "number number SIM NÃO"
      const listVotesMatch = fullText.match(/(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)\s*SIM\s*N[ÃA]O/i);
      if (listVotesMatch) {
        votosSim = parseBrazilianNumber(listVotesMatch[1]!);
        votosNao = parseBrazilianNumber(listVotesMatch[2]!);
      } else {
        // Try detail format: "number number Votos apurados"
        const detailVotesMatch = fullText.match(/(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)\s*Votos?\s*apurados?/i);
        if (detailVotesMatch) {
          votosSim = parseBrazilianNumber(detailVotesMatch[1]!);
          votosNao = parseBrazilianNumber(detailVotesMatch[2]!);
        }
      }

      const totalVotos = votosSim + votosNao;
      const percentualSim = totalVotos > 0 ? Math.round((votosSim / totalVotos) * 100) : 0;
      const percentualNao = totalVotos > 0 ? Math.round((votosNao / totalVotos) * 100) : 0;

      // Determine status
      let status = 'aberta';
      if (fullText.toLowerCase().includes('encerrad')) {
        status = 'encerrada';
      }

      consultas.push({
        id,
        materia,
        ementa: ementa.substring(0, 500),
        votosSim,
        votosNao,
        totalVotos,
        percentualSim,
        percentualNao,
        status,
        url: `${getBaseUrl()}${href}`
      });
    });

    const result = consultas.slice(0, limite);
    setCache(cacheKey, result, 'LISTAGEM');
    return result;

  } catch (error) {
    logger.error({ error, params }, 'Error listing consultas');
    throw error;
  }
}

export async function obterConsulta(id: number): Promise<ConsultaDetalhe> {
  const cacheKey = `consultas:detalhe:${id}`;

  const cached = getCached<ConsultaDetalhe>(cacheKey);
  if (cached) return cached;

  try {
    const url = `/visualizacaomateria?id=${id}`;
    const html = await fetchPage(url);
    const $ = parseHtml(html);

    const fullText = $('body').text();

    // Extract materia reference - format: "PROJETO DE LEI nº 5064 de 2023"
    const materiaMatch = fullText.match(/(PROJETO DE LEI|PEC|PLP|PDL|MPV|SUGEST[ÃA]O)\s*n?º?\s*(\d+)\s*(?:de\s*)?(\d{4})/i);
    let materia = '';
    if (materiaMatch) {
      const tipo = materiaMatch[1].toUpperCase().includes('PROJETO DE LEI') ? 'PL' :
                   materiaMatch[1].toUpperCase().includes('SUGEST') ? 'SUG' :
                   materiaMatch[1].toUpperCase();
      materia = `${tipo} ${materiaMatch[2]}/${materiaMatch[3]}`;
    }

    // Extract ementa - look for description after the title
    const ementa = safeExtract(
      () => {
        // Try to get text that looks like a description
        const ementaMatch = fullText.match(/(?:Concede|Altera|Dispõe|Institui|Estabelece|Autoriza|Revoga|Acrescenta)[^.]+\./i);
        return ementaMatch ? ementaMatch[0] : extractText($('h1, h2').first());
      },
      '',
      'ementa'
    );

    // Extract vote counts - format: "713.428 1.002.970 Votos apurados"
    // First number is SIM (favor), second is NÃO (contra)
    const votesMatch = fullText.match(/(\d{1,3}(?:\.\d{3})*)\s+(\d{1,3}(?:\.\d{3})*)\s*Votos?\s*apurados?/i);

    let votosSim = 0;
    let votosNao = 0;

    if (votesMatch) {
      votosSim = parseBrazilianNumber(votesMatch[1]!);
      votosNao = parseBrazilianNumber(votesMatch[2]!);
    }

    const totalVotos = votosSim + votosNao;
    const percentualSim = totalVotos > 0 ? Math.round((votosSim / totalVotos) * 100) : 0;
    const percentualNao = totalVotos > 0 ? Math.round((votosNao / totalVotos) * 100) : 0;

    // Extract author - format: "Autoria: Senador Hamilton Mourão (REPUBLICANOS/RS)"
    const autor = safeExtract(
      () => {
        const autorMatch = fullText.match(/Autoria:\s*([^(]+(?:\([^)]+\))?)/i);
        return autorMatch ? autorMatch[1].trim() : null;
      },
      null,
      'autor'
    );

    // Extract relator
    const relator = safeExtract(
      () => {
        const relatorMatch = fullText.match(/Relator(?:a)?:\s*([^(]+(?:\([^)]+\))?)/i);
        return relatorMatch ? relatorMatch[1].trim() : null;
      },
      null,
      'relator'
    );

    // Extract comments count
    const comentarios = safeExtract(
      () => {
        const comentarioMatch = fullText.match(/(\d+)\s*coment[aá]rio/i);
        return comentarioMatch ? parseInt(comentarioMatch[1]) : 0;
      },
      0,
      'comentarios'
    );

    // Determine status
    let status = 'aberta';
    if (fullText.toLowerCase().includes('encerrad')) {
      status = 'encerrada';
    }

    const result: ConsultaDetalhe = {
      id,
      materia,
      ementa,
      votosSim,
      votosNao,
      totalVotos,
      percentualSim,
      percentualNao,
      status,
      url: `${getBaseUrl()}${url}`,
      autor,
      relator,
      comissao: null,
      dataAbertura: null,
      dataEncerramento: null,
      comentarios,
      linkMateria: materia ? `https://legis.senado.leg.br/dadosabertos/materia/pesquisa/lista?sigla=${materia.split(' ')[0]}&numero=${materia.match(/\d+/)?.[0]}&ano=${materia.match(/\/(\d{4})/)?.[1]}` : null
    };

    setCache(cacheKey, result, 'DETALHE');
    return result;

  } catch (error) {
    logger.error({ error, id }, 'Error getting consulta details');
    throw error;
  }
}

export async function consultasPolarizadas(
  margemPolarizacao: number = 15,
  minimoVotos: number = 1000,
  limite: number = 10
): Promise<ConsultaResumo[]> {
  const consultas = await listarConsultas({ limite: 100 });

  return consultas
    .filter(c => {
      const diferenca = Math.abs(c.percentualSim - c.percentualNao);
      return c.totalVotos >= minimoVotos && diferenca <= margemPolarizacao;
    })
    .sort((a, b) => {
      const difA = Math.abs(a.percentualSim - a.percentualNao);
      const difB = Math.abs(b.percentualSim - b.percentualNao);
      return difA - difB; // Most polarized first (smallest difference)
    })
    .slice(0, limite);
}

export async function consultasConsensuais(
  percentualMinimo: number = 85,
  minimoVotos: number = 1000,
  limite: number = 10
): Promise<ConsultaResumo[]> {
  const consultas = await listarConsultas({ limite: 100 });

  return consultas
    .filter(c => {
      const maiorPercentual = Math.max(c.percentualSim, c.percentualNao);
      return c.totalVotos >= minimoVotos && maiorPercentual >= percentualMinimo;
    })
    .sort((a, b) => {
      const maxA = Math.max(a.percentualSim, a.percentualNao);
      const maxB = Math.max(b.percentualSim, b.percentualNao);
      return maxB - maxA; // Most consensual first
    })
    .slice(0, limite);
}
