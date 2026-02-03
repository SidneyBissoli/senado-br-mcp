import { fetchPage, getBaseUrl } from '../client.js';
import { getCached, setCache } from '../cache.js';
import { parseHtml, extractText, extractId, safeExtract } from '../parser.js';
import { logger } from '../../utils/logger.js';

export interface EventoResumo {
  id: number;
  titulo: string;
  data: string | null;
  hora: string | null;
  comissao: string | null;
  comentarios: number;
  status: string;
  url: string;
}

export interface EventoDetalhe extends EventoResumo {
  descricao: string;
  pauta: string[];
  convidados: string[];
  videoUrl: string | null;
  documentos: string[];
}

export interface ListarEventosParams {
  status?: 'agendado' | 'encerrado' | 'todos';
  comissao?: string;
  dataInicio?: string;
  dataFim?: string;
  limite?: number;
  pagina?: number;
}

/**
 * Extract date in DD/MM/YY or DD/MM/YYYY format and convert to YYYY-MM-DD
 */
function extractEventDate(text: string): string | null {
  // Format: 03/02/26 or 03/02/2026
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (match) {
    const [, day, month, year] = match;
    const fullYear = year!.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month}-${day}`;
  }
  return null;
}

/**
 * Extract time in HH:MM format
 */
function extractEventTime(text: string): string | null {
  const match = text.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
}

export async function listarEventos(params: ListarEventosParams = {}): Promise<EventoResumo[]> {
  const { limite = 20, pagina = 1 } = params;
  const cacheKey = `eventos:lista:${JSON.stringify(params)}`;

  const cached = getCached<EventoResumo[]>(cacheKey);
  if (cached) return cached;

  try {
    let url = '/principalaudiencia';
    if (pagina > 1) {
      url += `?p=${pagina}`;
    }

    const html = await fetchPage(url);
    const $ = parseHtml(html);

    const eventos: EventoResumo[] = [];
    const seenIds = new Set<number>();

    // Parse each event item
    $('a[href*="visualizacaoaudiencia?id="]').each((_, el) => {
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

      // Extract date and time - format: "03/02/26 | 09:00"
      const data = safeExtract(() => extractEventDate(fullText), null, 'data');
      const hora = safeExtract(() => extractEventTime(fullText), null, 'hora');

      // Extract comissao - format: "09:00 | CPICRIME" or "14:00 | CE"
      // Comissao appears after time and pipe
      const comissao = safeExtract(
        () => {
          // Match committee abbreviation after time
          const comissaoMatch = fullText.match(/\d{2}:\d{2}\s*\|?\s*([A-Z]{2,15})/);
          if (comissaoMatch) return comissaoMatch[1];

          // Or match known committee patterns anywhere
          const knownMatch = fullText.match(/(CPICRIME|CPI[A-Z]*|CCJ|CAE|CRE|CAS|CDH|CI|CE|CMA|CRA)/);
          return knownMatch ? knownMatch[1] : null;
        },
        null,
        'comissao'
      );

      // Extract comments/participation count - usually a number at the end
      const comentarios = safeExtract(
        () => {
          // Look for number that could be comment count (not date/time related)
          const nums = fullText.match(/\b(\d{1,4})\b(?!\s*[/:.])/g);
          if (nums && nums.length > 0) {
            // Filter out date/time numbers
            const lastNum = nums.filter(n => {
              const num = parseInt(n);
              return num < 1000 && num !== 26 && num !== 25 && num !== 24; // Exclude years
            }).pop();
            return lastNum ? parseInt(lastNum) : 0;
          }
          return 0;
        },
        0,
        'comentarios'
      );

      // Determine status based on date
      let status = 'agendado';
      if (fullText.toLowerCase().includes('encerrad')) {
        status = 'encerrado';
      } else if (fullText.toLowerCase().includes('andamento')) {
        status = 'em_andamento';
      } else if (data) {
        // Check if date is in the past
        const eventDate = new Date(data);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (eventDate < today) {
          status = 'encerrado';
        }
      }

      eventos.push({
        id,
        titulo: titulo.substring(0, 500),
        data,
        hora,
        comissao,
        comentarios,
        status,
        url: `${getBaseUrl()}${href}`
      });
    });

    // Apply filters
    let result = eventos;

    if (params.status && params.status !== 'todos') {
      result = result.filter(e => e.status === params.status);
    }

    if (params.comissao) {
      const comissaoUpper = params.comissao.toUpperCase();
      result = result.filter(e => e.comissao?.toUpperCase().includes(comissaoUpper));
    }

    result = result.slice(0, limite);
    setCache(cacheKey, result, 'LISTAGEM');
    return result;

  } catch (error) {
    logger.error({ error, params }, 'Error listing eventos');
    throw error;
  }
}

export async function obterEvento(id: number): Promise<EventoDetalhe> {
  const cacheKey = `eventos:detalhe:${id}`;

  const cached = getCached<EventoDetalhe>(cacheKey);
  if (cached) return cached;

  try {
    const url = `/visualizacaoaudiencia?id=${id}`;
    const html = await fetchPage(url);
    const $ = parseHtml(html);

    const fullText = $('body').text();

    // Extract title - look for meaningful title text
    const titulo = safeExtract(
      () => {
        // Try h1/h2 first
        const h1Text = extractText($('h1').first());
        if (h1Text && h1Text.length > 10 && !h1Text.toLowerCase().includes('e-cidadania')) {
          return h1Text;
        }
        // Look for strong tags with event description
        const strongText = extractText($('strong').filter((_, el) => {
          const text = $(el).text();
          return text.length > 20 && text.length < 300;
        }).first());
        return strongText || h1Text;
      },
      '',
      'titulo'
    );

    // Extract description
    const descricao = safeExtract(
      () => {
        const descEl = $('p').filter((_, el) => {
          const text = $(el).text();
          return text.length > 50 && text.length < 2000;
        }).first();
        return extractText(descEl) || '';
      },
      '',
      'descricao'
    );

    // Extract date and time
    const data = safeExtract(() => extractEventDate(fullText), null, 'data');
    const hora = safeExtract(() => extractEventTime(fullText), null, 'hora');

    // Extract comissao - look for committee name
    const comissao = safeExtract(
      () => {
        // Try to find committee name pattern
        const comissaoMatch = fullText.match(/Comiss[ãa]o\s+(?:de\s+)?([^,\n]+?)(?:\s*[-–]|\s*$)/i);
        if (comissaoMatch) return comissaoMatch[1].trim();

        // Or look for abbreviation
        const abbrMatch = fullText.match(/(CPICRIME|CPI[A-Z]*|CCJ|CAE|CRE|CAS|CDH|CI|CE|CMA|CRA)/);
        return abbrMatch ? abbrMatch[1] : null;
      },
      null,
      'comissao'
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

    // Extract video URL
    const videoUrl = safeExtract(
      () => {
        const youtubeLink = $('a[href*="youtube"], a[href*="youtu.be"]').attr('href');
        if (youtubeLink) return youtubeLink;

        const iframeSrc = $('iframe[src*="youtube"]').attr('src');
        return iframeSrc || null;
      },
      null,
      'videoUrl'
    );

    // Extract pauta/agenda items
    const pauta: string[] = [];
    $('li').each((_, el) => {
      const text = extractText($(el));
      if (text.length > 15 && text.length < 500 && !text.includes('http')) {
        pauta.push(text);
      }
    });

    // Extract convidados (guests)
    const convidados: string[] = [];
    const guestMatch = fullText.match(/convidado[s]?[:\s]+([^.]+)/gi);
    if (guestMatch) {
      guestMatch.forEach(m => {
        const names = m.replace(/convidado[s]?[:\s]+/i, '').split(/[,;]/);
        names.forEach(name => {
          const trimmed = name.trim();
          if (trimmed.length > 3 && trimmed.length < 100) {
            convidados.push(trimmed);
          }
        });
      });
    }

    // Determine status
    let status = 'agendado';
    if (fullText.toLowerCase().includes('encerrad')) {
      status = 'encerrado';
    } else if (data) {
      const eventDate = new Date(data);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate < today) {
        status = 'encerrado';
      }
    }

    const result: EventoDetalhe = {
      id,
      titulo,
      data,
      hora,
      comissao,
      comentarios,
      status,
      url: `${getBaseUrl()}${url}`,
      descricao,
      pauta: pauta.slice(0, 15),
      convidados: convidados.slice(0, 10),
      videoUrl,
      documentos: []
    };

    setCache(cacheKey, result, 'DETALHE');
    return result;

  } catch (error) {
    logger.error({ error, id }, 'Error getting evento details');
    throw error;
  }
}

export async function eventosPopulares(
  limite: number = 10,
  apenasAgendados: boolean = false
): Promise<EventoResumo[]> {
  const eventos = await listarEventos({
    status: apenasAgendados ? 'agendado' : 'todos',
    limite: limite * 2
  });

  return eventos
    .sort((a, b) => b.comentarios - a.comentarios)
    .slice(0, limite);
}
