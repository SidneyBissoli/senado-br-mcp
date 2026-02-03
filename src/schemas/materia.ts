import { z } from 'zod';

// Input Schemas
export const BuscarMateriasInput = z.object({
  sigla: z.string()
    .toUpperCase()
    .optional()
    .describe('Tipo: PEC, PL, PLP, MPV, PDL, PRS, etc.'),

  numero: z.number()
    .int()
    .positive()
    .optional()
    .describe('Número da matéria'),

  ano: z.number()
    .int()
    .min(1900)
    .max(2100)
    .optional()
    .describe('Ano da matéria'),

  tramitando: z.boolean()
    .optional()
    .describe('Apenas em tramitação'),

  palavraChave: z.string()
    .optional()
    .describe('Busca na ementa'),

  autorNome: z.string()
    .optional()
    .describe('Nome do autor'),

  relatorNome: z.string()
    .optional()
    .describe('Nome do relator')
});

export const ObterMateriaInput = z.object({
  codigoMateria: z.number()
    .int()
    .positive()
    .describe('Código único da matéria')
});

export const TramitacaoMateriaInput = z.object({
  codigoMateria: z.number()
    .int()
    .positive()
    .describe('Código único da matéria')
});

export const TextosMateriaInput = z.object({
  codigoMateria: z.number()
    .int()
    .positive()
    .describe('Código único da matéria')
});

export const VotosMateriaInput = z.object({
  codigoMateria: z.number()
    .int()
    .positive()
    .describe('Código único da matéria')
});

// Output Schemas
export const MateriaResumo = z.object({
  codigo: z.number(),
  sigla: z.string(),
  numero: z.number(),
  ano: z.number(),
  ementa: z.string().nullable(),
  autor: z.string().nullable(),
  situacao: z.string().nullable(),
  dataApresentacao: z.string().nullable(),
  url: z.string().nullable()
});

export const MateriaDetalhe = z.object({
  codigo: z.number(),
  sigla: z.string(),
  numero: z.number(),
  ano: z.number(),
  ementa: z.string().nullable(),
  ementaDetalhada: z.string().nullable(),
  autor: z.string().nullable(),
  tipoAutor: z.string().nullable(),
  situacao: z.string().nullable(),
  localAtual: z.string().nullable(),
  dataApresentacao: z.string().nullable(),
  dataUltimaAtualizacao: z.string().nullable(),
  indexacao: z.string().nullable(),
  url: z.string().nullable(),
  relator: z.object({
    nome: z.string(),
    partido: z.string().nullable(),
    uf: z.string().nullable()
  }).nullable()
});

export const Tramitacao = z.object({
  data: z.string(),
  local: z.string().nullable(),
  situacao: z.string().nullable(),
  descricao: z.string().nullable()
});

export const TextoMateria = z.object({
  tipo: z.string(),
  data: z.string().nullable(),
  url: z.string(),
  formato: z.string().nullable()
});

export const VotacaoMateria = z.object({
  codigoVotacao: z.number(),
  data: z.string(),
  descricao: z.string().nullable(),
  resultado: z.string().nullable(),
  totalSim: z.number().nullable(),
  totalNao: z.number().nullable(),
  totalAbstencao: z.number().nullable()
});

// Types
export type BuscarMateriasInputType = z.infer<typeof BuscarMateriasInput>;
export type ObterMateriaInputType = z.infer<typeof ObterMateriaInput>;
export type TramitacaoMateriaInputType = z.infer<typeof TramitacaoMateriaInput>;
export type TextosMateriaInputType = z.infer<typeof TextosMateriaInput>;
export type VotosMateriaInputType = z.infer<typeof VotosMateriaInput>;
export type MateriaResumoType = z.infer<typeof MateriaResumo>;
export type MateriaDetalheType = z.infer<typeof MateriaDetalhe>;
export type TramitacaoType = z.infer<typeof Tramitacao>;
export type TextoMateriaType = z.infer<typeof TextoMateria>;
export type VotacaoMateriaType = z.infer<typeof VotacaoMateria>;
