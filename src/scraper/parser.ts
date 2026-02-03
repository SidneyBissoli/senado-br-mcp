import * as cheerio from 'cheerio';
import { logger } from '../utils/logger.js';
import { createScrapingError, type ScrapingError } from './client.js';

export type CheerioAPI = cheerio.CheerioAPI;

export function parseHtml(html: string): CheerioAPI {
  return cheerio.load(html);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractText($el: cheerio.Cheerio<any>): string {
  return $el.text().trim();
}

export function extractNumber(text: string): number {
  // Handle Brazilian number format (1.234,56 -> 1234.56)
  const cleaned = text.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function extractId(url: string): number | null {
  const match = url.match(/[?&]id=(\d+)/);
  return match ? parseInt(match[1]) : null;
}

export function extractDate(text: string): string | null {
  // Try DD/MM/YYYY or DD/MM/YY format
  const match = text.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (match) {
    const [, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return `${fullYear}-${month}-${day}`;
  }
  return null;
}

export function extractTime(text: string): string | null {
  const match = text.match(/(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
}

export function safeExtract<T>(
  fn: () => T,
  defaultValue: T,
  context: string
): T {
  try {
    const result = fn();
    return result ?? defaultValue;
  } catch (error) {
    logger.warn({ error, context }, 'Safe extract failed, using default');
    return defaultValue;
  }
}

export function validateStructure(
  $: CheerioAPI,
  selectors: string[],
  url: string
): void {
  const missing = selectors.filter(sel => $(sel).length === 0);

  if (missing.length > 0) {
    logger.warn({ url, missing }, 'Expected selectors not found');
    throw createScrapingError(
      'ESTRUTURA_ALTERADA',
      url,
      `Estrutura da página alterada. Seletores não encontrados: ${missing.join(', ')}`
    );
  }
}
