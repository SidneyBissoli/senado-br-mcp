import { logger } from '../utils/logger.js';
import { BASE_URL } from './endpoints.js';

export interface ApiClientOptions {
  timeout?: number;
  retries?: number;
  format?: 'json' | 'xml';
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  metadata: {
    fonte: string;
    dataConsulta: string;
    endpoint: string;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    suggestion?: string;
  };
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

export async function apiRequest<T>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { timeout = 30000, retries = 3, format = 'json' } = options;

  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Accept': format === 'json' ? 'application/json' : 'application/xml',
    'User-Agent': 'senado-br-mcp/1.0.0'
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      logger.debug({ endpoint, attempt }, 'Making API request');

      const response = await fetch(url, {
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug({ endpoint, attempt }, 'API request successful');
      return data as T;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn({ endpoint, attempt, error: errorMessage }, 'API request failed');

      if (attempt === retries) {
        throw new Error(
          `Failed to fetch ${endpoint} after ${retries} attempts: ${errorMessage}`
        );
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      logger.debug({ delay }, 'Waiting before retry');
      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error('Unreachable');
}

export function createSuccessResponse<T>(data: T, endpoint: string): ApiResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      fonte: 'Senado Federal - Dados Abertos',
      dataConsulta: new Date().toISOString(),
      endpoint
    }
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  suggestion?: string
): ApiError {
  return {
    success: false,
    error: {
      code,
      message,
      ...(suggestion && { suggestion })
    }
  };
}
