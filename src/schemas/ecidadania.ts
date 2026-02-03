import { z } from 'zod';

// Consultas Públicas
export const ListarConsultasInput = z.object({
  status: z.enum(['aberta', 'encerrada', 'todas'])
    .optional()
    .describe('Filtrar por status'),
  ordenarPor: z.enum(['votos', 'data', 'polarizacao'])
    .optional()
    .describe('Campo para ordenação'),
  ordem: z.enum(['asc', 'desc'])
    .optional()
    .describe('Ordem de ordenação'),
  limite: z.number().int().min(1).max(100).optional().default(20)
    .describe('Número máximo de resultados'),
  pagina: z.number().int().min(1).optional().default(1)
    .describe('Página de resultados')
});

export const ObterConsultaInput = z.object({
  id: z.number().int().positive()
    .describe('ID da consulta pública')
});

export const ConsultasPolarizadasInput = z.object({
  margemPolarizacao: z.number().int().min(0).max(50).optional().default(15)
    .describe('Considera polarizado se diferença < este percentual'),
  minimoVotos: z.number().int().min(0).optional().default(1000)
    .describe('Mínimo de votos para considerar'),
  limite: z.number().int().min(1).max(50).optional().default(10)
    .describe('Número máximo de resultados')
});

export const ConsultasConsensuaisInput = z.object({
  percentualMinimo: z.number().int().min(50).max(100).optional().default(85)
    .describe('Percentual mínimo em uma direção para considerar consensual'),
  minimoVotos: z.number().int().min(0).optional().default(1000)
    .describe('Mínimo de votos para considerar'),
  limite: z.number().int().min(1).max(50).optional().default(10)
    .describe('Número máximo de resultados')
});

// Ideias Legislativas
export const ListarIdeiasInput = z.object({
  status: z.enum(['aberta', 'encerrada', 'convertida', 'todas'])
    .optional()
    .describe('Filtrar por status'),
  ordenarPor: z.enum(['apoios', 'data', 'comentarios'])
    .optional()
    .describe('Campo para ordenação'),
  ordem: z.enum(['asc', 'desc'])
    .optional()
    .describe('Ordem de ordenação'),
  limite: z.number().int().min(1).max(100).optional().default(20)
    .describe('Número máximo de resultados'),
  pagina: z.number().int().min(1).optional().default(1)
    .describe('Página de resultados')
});

export const ObterIdeiaInput = z.object({
  id: z.number().int().positive()
    .describe('ID da ideia legislativa')
});

export const IdeiasPopularesInput = z.object({
  limite: z.number().int().min(1).max(50).optional().default(10)
    .describe('Número máximo de resultados'),
  apenasAbertas: z.boolean().optional().default(true)
    .describe('Apenas ideias com apoiamento aberto')
});

// Eventos Interativos
export const ListarEventosInput = z.object({
  status: z.enum(['agendado', 'encerrado', 'todos'])
    .optional()
    .describe('Filtrar por status'),
  comissao: z.string().optional()
    .describe('Sigla da comissão'),
  dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    .describe('Data início (YYYY-MM-DD)'),
  dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
    .describe('Data fim (YYYY-MM-DD)'),
  limite: z.number().int().min(1).max(100).optional().default(20)
    .describe('Número máximo de resultados')
});

export const ObterEventoInput = z.object({
  id: z.number().int().positive()
    .describe('ID do evento')
});

export const EventosPopularesInput = z.object({
  limite: z.number().int().min(1).max(50).optional().default(10)
    .describe('Número máximo de resultados'),
  apenasAgendados: z.boolean().optional().default(false)
    .describe('Apenas eventos ainda não realizados')
});

// Sugestão de Tema
export const SugerirTemaInput = z.object({
  criterios: z.object({
    evitarPolarizacao: z.boolean().optional().default(true)
      .describe('Evita temas com ~50/50'),
    evitarConsenso: z.boolean().optional().default(true)
      .describe('Evita temas com >85%'),
    minimoParticipacao: z.number().int().min(0).optional().default(500)
      .describe('Mínimo de votos/apoios'),
    apenasEmTramitacao: z.boolean().optional().default(true)
      .describe('Apenas matérias em tramitação')
  }).optional()
});

// Types
export type ListarConsultasInputType = z.infer<typeof ListarConsultasInput>;
export type ObterConsultaInputType = z.infer<typeof ObterConsultaInput>;
export type ConsultasPolarizadasInputType = z.infer<typeof ConsultasPolarizadasInput>;
export type ConsultasConsensuaisInputType = z.infer<typeof ConsultasConsensuaisInput>;
export type ListarIdeiasInputType = z.infer<typeof ListarIdeiasInput>;
export type ObterIdeiaInputType = z.infer<typeof ObterIdeiaInput>;
export type IdeiasPopularesInputType = z.infer<typeof IdeiasPopularesInput>;
export type ListarEventosInputType = z.infer<typeof ListarEventosInput>;
export type ObterEventoInputType = z.infer<typeof ObterEventoInput>;
export type EventosPopularesInputType = z.infer<typeof EventosPopularesInput>;
export type SugerirTemaInputType = z.infer<typeof SugerirTemaInput>;
