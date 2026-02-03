import { z } from 'zod';

// Input Schemas
export const ListarSenadoresInput = z.object({
  legislatura: z.number()
    .int()
    .min(1)
    .optional()
    .describe('Número da legislatura (ex: 57 para 2023-2027)'),

  uf: z.string()
    .length(2)
    .toUpperCase()
    .optional()
    .describe('Sigla do estado (ex: SP, RJ, MG)'),

  partido: z.string()
    .toUpperCase()
    .optional()
    .describe('Sigla do partido (ex: PT, PL, MDB)'),

  emExercicio: z.boolean()
    .optional()
    .default(true)
    .describe('Filtrar apenas senadores em exercício')
});

export const ObterSenadorInput = z.object({
  codigoSenador: z.number()
    .int()
    .positive()
    .describe('Código único do senador no sistema do Senado')
});

export const BuscarSenadorPorNomeInput = z.object({
  nome: z.string()
    .min(2)
    .describe('Nome ou parte do nome do senador')
});

export const VotacoesSenadorInput = z.object({
  codigoSenador: z.number()
    .int()
    .positive()
    .describe('Código único do senador'),

  ano: z.number()
    .int()
    .min(1900)
    .max(2100)
    .optional()
    .describe('Ano das votações'),

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
export const SenadorResumo = z.object({
  codigo: z.number(),
  nome: z.string(),
  nomeCompleto: z.string(),
  partido: z.string().nullable(),
  uf: z.string(),
  foto: z.string().nullable(),
  emExercicio: z.boolean()
});

export const SenadorDetalhe = z.object({
  codigo: z.number(),
  nome: z.string(),
  nomeCompleto: z.string(),
  nomeCivil: z.string().nullable(),
  sexo: z.string().nullable(),
  dataNascimento: z.string().nullable(),
  naturalidade: z.string().nullable(),
  ufNaturalidade: z.string().nullable(),
  partido: z.string().nullable(),
  uf: z.string(),
  foto: z.string().nullable(),
  email: z.string().nullable(),
  telefone: z.string().nullable(),
  emExercicio: z.boolean(),
  mandatos: z.array(z.object({
    legislatura: z.number(),
    uf: z.string(),
    participacao: z.string(),
    dataInicio: z.string().nullable(),
    dataFim: z.string().nullable()
  })).optional(),
  comissoes: z.array(z.object({
    sigla: z.string(),
    nome: z.string(),
    cargo: z.string().nullable()
  })).optional()
});

export const VotoSenador = z.object({
  codigoVotacao: z.number(),
  data: z.string(),
  materia: z.string(),
  descricao: z.string().nullable(),
  voto: z.string(),
  resultado: z.string().nullable()
});

// Types
export type ListarSenadoresInputType = z.infer<typeof ListarSenadoresInput>;
export type ObterSenadorInputType = z.infer<typeof ObterSenadorInput>;
export type BuscarSenadorPorNomeInputType = z.infer<typeof BuscarSenadorPorNomeInput>;
export type VotacoesSenadorInputType = z.infer<typeof VotacoesSenadorInput>;
export type SenadorResumoType = z.infer<typeof SenadorResumo>;
export type SenadorDetalheType = z.infer<typeof SenadorDetalhe>;
export type VotoSenadorType = z.infer<typeof VotoSenador>;
