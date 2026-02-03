import { z } from 'zod';

// Input Schemas
export const ListarComissoesInput = z.object({
  tipo: z.enum(['permanente', 'temporaria', 'cpi', 'mista'])
    .optional()
    .describe('Tipo: permanente, temporaria, cpi, mista'),

  ativa: z.boolean()
    .optional()
    .describe('Apenas comissões ativas')
});

export const ObterComissaoInput = z.object({
  sigla: z.string()
    .min(2)
    .toUpperCase()
    .describe('Sigla da comissão (ex: CCJ, CAE)')
});

export const MembrosComissaoInput = z.object({
  sigla: z.string()
    .min(2)
    .toUpperCase()
    .describe('Sigla da comissão')
});

export const ReunioesComissaoInput = z.object({
  sigla: z.string()
    .min(2)
    .toUpperCase()
    .describe('Sigla da comissão'),

  dataInicio: z.string()
    .regex(/^\d{8}$/, 'Formato deve ser YYYYMMDD')
    .optional()
    .describe('Data início (YYYYMMDD)'),

  dataFim: z.string()
    .regex(/^\d{8}$/, 'Formato deve ser YYYYMMDD')
    .optional()
    .describe('Data fim (YYYYMMDD)')
});

// Output Schemas
export const ComissaoResumo = z.object({
  codigo: z.number(),
  sigla: z.string(),
  nome: z.string(),
  tipo: z.string().nullable(),
  casa: z.string().nullable(),
  ativa: z.boolean()
});

export const ComissaoDetalhe = z.object({
  codigo: z.number(),
  sigla: z.string(),
  nome: z.string(),
  tipo: z.string().nullable(),
  casa: z.string().nullable(),
  ativa: z.boolean(),
  dataInicio: z.string().nullable(),
  dataFim: z.string().nullable(),
  finalidade: z.string().nullable(),
  presidente: z.object({
    codigo: z.number(),
    nome: z.string(),
    partido: z.string().nullable(),
    uf: z.string().nullable()
  }).nullable(),
  vicePresidente: z.object({
    codigo: z.number(),
    nome: z.string(),
    partido: z.string().nullable(),
    uf: z.string().nullable()
  }).nullable()
});

export const MembroComissao = z.object({
  codigo: z.number(),
  nome: z.string(),
  partido: z.string().nullable(),
  uf: z.string().nullable(),
  cargo: z.string().nullable(),
  titular: z.boolean()
});

export const ReuniaoComissao = z.object({
  codigo: z.number(),
  data: z.string(),
  hora: z.string().nullable(),
  local: z.string().nullable(),
  tipo: z.string().nullable(),
  situacao: z.string().nullable(),
  pauta: z.string().nullable()
});

// Types
export type ListarComissoesInputType = z.infer<typeof ListarComissoesInput>;
export type ObterComissaoInputType = z.infer<typeof ObterComissaoInput>;
export type MembrosComissaoInputType = z.infer<typeof MembrosComissaoInput>;
export type ReunioesComissaoInputType = z.infer<typeof ReunioesComissaoInput>;
export type ComissaoResumoType = z.infer<typeof ComissaoResumo>;
export type ComissaoDetalheType = z.infer<typeof ComissaoDetalhe>;
export type MembroComissaoType = z.infer<typeof MembroComissao>;
export type ReuniaoComissaoType = z.infer<typeof ReuniaoComissao>;
