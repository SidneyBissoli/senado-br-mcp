import { z } from 'zod';

// Input Schemas
export const ListarVotacoesInput = z.object({
  ano: z.number()
    .int()
    .min(1900)
    .max(2100)
    .describe('Ano das votações (obrigatório)'),

  mes: z.number()
    .int()
    .min(1)
    .max(12)
    .optional()
    .describe('Mês (1-12)'),

  dataInicio: z.string()
    .regex(/^\d{8}$/, 'Formato deve ser YYYYMMDD')
    .optional()
    .describe('Data início (YYYYMMDD)'),

  dataFim: z.string()
    .regex(/^\d{8}$/, 'Formato deve ser YYYYMMDD')
    .optional()
    .describe('Data fim (YYYYMMDD)')
});

export const ObterVotacaoInput = z.object({
  codigoVotacao: z.number()
    .int()
    .positive()
    .describe('Código único da votação')
});

export const VotacoesRecentesInput = z.object({
  dias: z.number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .default(7)
    .describe('Quantidade de dias (padrão: 7)')
});

// Output Schemas
export const VotacaoResumo = z.object({
  codigo: z.number(),
  data: z.string(),
  hora: z.string().nullable(),
  materia: z.string().nullable(),
  descricao: z.string().nullable(),
  resultado: z.string().nullable(),
  totalSim: z.number().nullable(),
  totalNao: z.number().nullable(),
  totalAbstencao: z.number().nullable()
});

export const VotoNominal = z.object({
  codigoSenador: z.number(),
  nomeSenador: z.string(),
  partido: z.string().nullable(),
  uf: z.string().nullable(),
  voto: z.string()
});

export const VotacaoDetalhe = z.object({
  codigo: z.number(),
  data: z.string(),
  hora: z.string().nullable(),
  materia: z.object({
    codigo: z.number().nullable(),
    sigla: z.string().nullable(),
    numero: z.number().nullable(),
    ano: z.number().nullable(),
    ementa: z.string().nullable()
  }).nullable(),
  descricao: z.string().nullable(),
  resultado: z.string().nullable(),
  totalSim: z.number().nullable(),
  totalNao: z.number().nullable(),
  totalAbstencao: z.number().nullable(),
  totalPresente: z.number().nullable(),
  votos: z.array(VotoNominal).optional()
});

// Types
export type ListarVotacoesInputType = z.infer<typeof ListarVotacoesInput>;
export type ObterVotacaoInputType = z.infer<typeof ObterVotacaoInput>;
export type VotacoesRecentesInputType = z.infer<typeof VotacoesRecentesInput>;
export type VotacaoResumoType = z.infer<typeof VotacaoResumo>;
export type VotoNominalType = z.infer<typeof VotoNominal>;
export type VotacaoDetalheType = z.infer<typeof VotacaoDetalhe>;
