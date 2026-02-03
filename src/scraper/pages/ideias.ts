import { fetchPage, getBaseUrl } from '../client.js';
import { getCached, setCache } from '../cache.js';
import { parseHtml, extractText, extractId, extractDate, safeExtract } from '../parser.js';
import { logger } from '../../utils/logger.js';

export interface IdeiaResumo {
  id: number;
  titulo: string;
  apoios: number;
  dataPublicacao: string | null;
  status: string;
  autor: string | null;
  url: string;
}

export interface IdeiaDetalhe extends IdeiaResumo {
  descricao: string;
  problema: string | null;
  solucao: string | null;
  comentarios: number;
  dataEncerramento: string | null;
  plConvertido: string | null;
}

export interface ListarIdeiasParams {
  status?: 'aberta' | 'encerrada' | 'convertida' | 'todas';
  ordenarPor?: 'apoios' | 'data' | 'comentarios';
  ordem?: 'asc' | 'desc';
  limite?: number;
  pagina?: number;
}

/**
 * Parse Brazilian number format: 1.234.567 -> 1234567
 */
function parseBrazilianNumber(str: string): number {
  const cleaned = str.replace(/\./g, '');
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

function mapStatusToSituacao(status?: string): string {
  const map: Record<string, string> = {
    'aberta': '5',
    'encerrada': '6',
    'convertida': '10'
  };
  return status && map[status] ? map[status] : '';
}

export async function listarIdeias(params: ListarIdeiasParams = {}): Promise<IdeiaResumo[]> {
  const { status, limite = 20, pagina = 1 } = params;
  const cacheKey = `ideias:lista:${JSON.stringify(params)}`;

  const cached = getCached<IdeiaResumo[]>(cacheKey);
  if (cached) return cached;

  try {
    // Use principalideia for better data - it shows popular ideas with apoios
    let url = '/principalideia';
    if (status && status !== 'todas') {
      url = '/pesquisaideia';
      const queryParams: string[] = [`situacao=${mapStatusToSituacao(status)}`];
      if (pagina > 1) {
        queryParams.push(`p=${pagina}`);
      }
      url += '?' + queryParams.join('&');
    }

    const html = await fetchPage(url);
    const $ = parseHtml(html);

    const ideias: IdeiaResumo[] = [];
    const seenIds = new Set<number>();

    // Parse each idea item - look for links to idea pages
    $('a[href*="visualizacaoideia?id="]').each((_, el) => {
      const $el = $(el);
      const href = $el.attr('href') || '';
      const id = extractId(href);

      if (!id || seenIds.has(id)) return;
      seenIds.add(id);

      // Get broader container for context
      const $container = $el.closest('div').parent().parent();
      const fullText = extractText($container);

      // Extract title from the link
      const titulo = safeExtract(() => extractText($el), '', 'titulo');

      // Extract apoios count - format: "253.804 apoios" or "19.324 apoios"
      const apoios = safeExtract(
        () => {
          const apoiosMatch = fullText.match(/(\d{1,3}(?:\.\d{3})*)\s*apoios?/i);
          return apoiosMatch ? parseBrazilianNumber(apoiosMatch[1]!) : 0;
        },
        0,
        'apoios'
      );

      // Extract date if available
      const dataPublicacao = safeExtract(() => extractDate(fullText), null, 'dataPublicacao');

      // Determine status from context
      let ideiaStatus = 'aberta';
      if (fullText.toLowerCase().includes('encerrad')) {
        ideiaStatus = 'encerrada';
      } else if (fullText.toLowerCase().includes('transformad') || fullText.toLowerCase().includes('convertid')) {
        ideiaStatus = 'convertida';
      }

      // Extract author if present - format: "NOME (UF)"
      const autor = safeExtract(
        () => {
          const autorMatch = fullText.match(/([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s.]+)\s*\(([A-Z]{2})\)/);
          return autorMatch ? `${autorMatch[1].trim()} (${autorMatch[2]})` : null;
        },
        null,
        'autor'
      );

      ideias.push({
        id,
        titulo: titulo.substring(0, 500),
        apoios,
        dataPublicacao,
        status: ideiaStatus,
        autor,
        url: `${getBaseUrl()}${href}`
      });
    });

    // Sort if requested
    if (params.ordenarPor === 'apoios') {
      ideias.sort((a, b) => params.ordem === 'asc' ? a.apoios - b.apoios : b.apoios - a.apoios);
    }

    const result = ideias.slice(0, limite);
    setCache(cacheKey, result, 'LISTAGEM');
    return result;

  } catch (error) {
    logger.error({ error, params }, 'Error listing ideias');
    throw error;
  }
}

export async function obterIdeia(id: number): Promise<IdeiaDetalhe> {
  const cacheKey = `ideias:detalhe:${id}`;

  const cached = getCached<IdeiaDetalhe>(cacheKey);
  if (cached) return cached;

  try {
    const url = `/visualizacaoideia?id=${id}`;
    const html = await fetchPage(url);
    const $ = parseHtml(html);

    const fullText = $('body').text();

    // Extract title - usually in strong tag or h1/h2
    const titulo = safeExtract(
      () => {
        const strongText = extractText($('strong').first());
        if (strongText && strongText.length > 10) return strongText;
        return extractText($('h1, h2').first());
      },
      '',
      'titulo'
    );

    // Extract description - look for longer text blocks
    const descricao = safeExtract(
      () => {
        const descEl = $('p').filter((_, el) => {
          const text = $(el).text();
          return text.length > 100;
        }).first();
        return extractText(descEl) || '';
      },
      '',
      'descricao'
    );

    // Extract apoios - format: "253.804 apoios"
    const apoios = safeExtract(
      () => {
        const apoiosMatch = fullText.match(/(\d{1,3}(?:\.\d{3})*)\s*apoios?/i);
        return apoiosMatch ? parseBrazilianNumber(apoiosMatch[1]!) : 0;
      },
      0,
      'apoios'
    );

    // Extract author - format: "NOME (UF)"
    const autor = safeExtract(
      () => {
        const autorMatch = fullText.match(/([A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ][A-ZÁÉÍÓÚÂÊÎÔÛÃÕÇ\s.]+)\s*\(([A-Z]{2})\)/);
        return autorMatch ? `${autorMatch[1].trim()} (${autorMatch[2]})` : null;
      },
      null,
      'autor'
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

    // Extract converted proposition - format: "SUGESTÃO nº 30 de 2017" or "PEC nº 222 de 2019"
    const plConvertido = safeExtract(
      () => {
        const plMatch = fullText.match(/(SUGEST[ÃA]O|PEC|PL|PLP)\s*n?º?\s*(\d+)\s*(?:de\s*)?(\d{4})/i);
        if (plMatch) {
          const tipo = plMatch[1].toUpperCase().includes('SUGEST') ? 'SUG' : plMatch[1].toUpperCase();
          return `${tipo} ${plMatch[2]}/${plMatch[3]}`;
        }
        return null;
      },
      null,
      'plConvertido'
    );

    // Determine status
    let status = 'aberta';
    if (fullText.toLowerCase().includes('convertida em proposi')) {
      status = 'convertida';
    } else if (fullText.toLowerCase().includes('encerrad')) {
      status = 'encerrada';
    }

    const result: IdeiaDetalhe = {
      id,
      titulo,
      apoios,
      dataPublicacao: extractDate(fullText),
      status,
      autor,
      url: `${getBaseUrl()}${url}`,
      descricao,
      problema: null,
      solucao: null,
      comentarios,
      dataEncerramento: null,
      plConvertido
    };

    setCache(cacheKey, result, 'DETALHE');
    return result;

  } catch (error) {
    logger.error({ error, id }, 'Error getting ideia details');
    throw error;
  }
}

export async function ideiasPopulares(
  limite: number = 10,
  apenasAbertas: boolean = true
): Promise<IdeiaResumo[]> {
  const ideias = await listarIdeias({
    status: apenasAbertas ? 'aberta' : 'todas',
    ordenarPor: 'apoios',
    ordem: 'desc',
    limite: limite * 2 // Get more to filter
  });

  return ideias.slice(0, limite);
}
