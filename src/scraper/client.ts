import { logger } from '../utils/logger.js';

const BASE_URL = 'https://www12.senado.leg.br/ecidadania';
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests
let lastRequestTime = 0;

export interface ScraperOptions {
  timeout?: number;
  retries?: number;
}

export interface ScrapingError {
  tipo: 'PAGINA_NAO_ENCONTRADA' | 'ESTRUTURA_ALTERADA' | 'TIMEOUT' | 'BLOQUEADO' | 'ERRO_REDE';
  url: string;
  mensagem: string;
  sugestao: string;
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

export async function fetchPage(
  path: string,
  options: ScraperOptions = {}
): Promise<string> {
  const { timeout = 30000, retries = 3 } = options;
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await waitForRateLimit();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      logger.debug({ url, attempt }, 'Fetching page');

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; senado-br-mcp/1.0; +https://github.com/SidneyBissoli/senado-br-mcp)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw createScrapingError('PAGINA_NAO_ENCONTRADA', url, `Página não encontrada: ${url}`);
        }
        if (response.status === 429) {
          throw createScrapingError('BLOQUEADO', url, 'Muitas requisições. Tente novamente mais tarde.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      logger.debug({ url, htmlLength: html.length }, 'Page fetched successfully');
      return html;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      if ((error as ScrapingError).tipo) {
        throw error; // Re-throw scraping errors
      }

      logger.warn({ url, attempt, error: errorMessage }, 'Fetch failed');

      if (attempt === retries) {
        if (errorMessage.includes('abort')) {
          throw createScrapingError('TIMEOUT', url, 'Tempo limite excedido ao acessar a página');
        }
        throw createScrapingError('ERRO_REDE', url, `Erro de rede: ${errorMessage}`);
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw createScrapingError('ERRO_REDE', url, 'Falha após múltiplas tentativas');
}

export function createScrapingError(
  tipo: ScrapingError['tipo'],
  url: string,
  mensagem: string
): ScrapingError {
  const sugestoes: Record<ScrapingError['tipo'], string> = {
    PAGINA_NAO_ENCONTRADA: 'Verifique se o ID está correto',
    ESTRUTURA_ALTERADA: 'O site pode ter sido atualizado. Reporte o problema.',
    TIMEOUT: 'O site pode estar lento. Tente novamente.',
    BLOQUEADO: 'Aguarde alguns minutos antes de tentar novamente.',
    ERRO_REDE: 'Verifique sua conexão ou tente novamente.'
  };

  return {
    tipo,
    url,
    mensagem,
    sugestao: sugestoes[tipo]
  };
}

export function getBaseUrl(): string {
  return BASE_URL;
}
