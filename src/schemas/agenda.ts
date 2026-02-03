import { z } from 'zod';

// Input Schemas
export const AgendaPlenarioInput = z.object({
  data: z.string()
    .regex(/^\d{8}$/, 'Formato deve ser YYYYMMDD')
    .optional()
    .describe('Data específica (YYYYMMDD)'),

  dataInicio: z.string()
    .regex(/^\d{8}$/, 'Formato deve ser YYYYMMDD')
    .optional()
    .describe('Data início (YYYYMMDD)'),

  dataFim: z.string()
    .regex(/^\d{8}$/, 'Formato deve ser YYYYMMDD')
    .optional()
    .describe('Data fim (YYYYMMDD)')
});

export const AgendaComissoesInput = z.object({
  data: z.string()
    .regex(/^\d{8}$/, 'Formato deve ser YYYYMMDD')
    .optional()
    .describe('Data específica (YYYYMMDD)'),

  siglaComissao: z.string()
    .min(2)
    .toUpperCase()
    .optional()
    .describe('Filtrar por comissão específica')
});

// Output Schemas
export const SessaoPlenario = z.object({
  codigo: z.number(),
  data: z.string(),
  hora: z.string().nullable(),
  tipo: z.string().nullable(),
  situacao: z.string().nullable(),
  pauta: z.array(z.object({
    materia: z.string().nullable(),
    ementa: z.string().nullable(),
    relator: z.string().nullable()
  })).optional()
});

export const ReuniaoAgendada = z.object({
  codigo: z.number(),
  comissao: z.object({
    sigla: z.string(),
    nome: z.string()
  }),
  data: z.string(),
  hora: z.string().nullable(),
  local: z.string().nullable(),
  tipo: z.string().nullable(),
  situacao: z.string().nullable()
});

// Types
export type AgendaPlenarioInputType = z.infer<typeof AgendaPlenarioInput>;
export type AgendaComissoesInputType = z.infer<typeof AgendaComissoesInput>;
export type SessaoPlenarioType = z.infer<typeof SessaoPlenario>;
export type ReuniaoAgendadaType = z.infer<typeof ReuniaoAgendada>;
