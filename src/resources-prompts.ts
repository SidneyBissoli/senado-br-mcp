import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// Static reference catalogs exposed as MCP resources. These are stable
// (they describe the legislative process / federation), so they are served
// from memory with no upstream call and cannot fail.

const TIPOS_MATERIA = [
  { sigla: 'PEC', nome: 'Proposta de Emenda à Constituição' },
  { sigla: 'PLP', nome: 'Projeto de Lei Complementar' },
  { sigla: 'PL', nome: 'Projeto de Lei' },
  { sigla: 'PLN', nome: 'Projeto de Lei do Congresso Nacional (orçamentário)' },
  { sigla: 'MPV', nome: 'Medida Provisória' },
  { sigla: 'PDL', nome: 'Projeto de Decreto Legislativo' },
  { sigla: 'PRS', nome: 'Projeto de Resolução do Senado' },
  { sigla: 'RQS', nome: 'Requerimento' },
  { sigla: 'SUG', nome: 'Sugestão (inclui ideias legislativas do e-Cidadania)' },
];

const UFS = [
  { sigla: 'AC', nome: 'Acre', regiao: 'Norte' },
  { sigla: 'AL', nome: 'Alagoas', regiao: 'Nordeste' },
  { sigla: 'AP', nome: 'Amapá', regiao: 'Norte' },
  { sigla: 'AM', nome: 'Amazonas', regiao: 'Norte' },
  { sigla: 'BA', nome: 'Bahia', regiao: 'Nordeste' },
  { sigla: 'CE', nome: 'Ceará', regiao: 'Nordeste' },
  { sigla: 'DF', nome: 'Distrito Federal', regiao: 'Centro-Oeste' },
  { sigla: 'ES', nome: 'Espírito Santo', regiao: 'Sudeste' },
  { sigla: 'GO', nome: 'Goiás', regiao: 'Centro-Oeste' },
  { sigla: 'MA', nome: 'Maranhão', regiao: 'Nordeste' },
  { sigla: 'MT', nome: 'Mato Grosso', regiao: 'Centro-Oeste' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul', regiao: 'Centro-Oeste' },
  { sigla: 'MG', nome: 'Minas Gerais', regiao: 'Sudeste' },
  { sigla: 'PA', nome: 'Pará', regiao: 'Norte' },
  { sigla: 'PB', nome: 'Paraíba', regiao: 'Nordeste' },
  { sigla: 'PR', nome: 'Paraná', regiao: 'Sul' },
  { sigla: 'PE', nome: 'Pernambuco', regiao: 'Nordeste' },
  { sigla: 'PI', nome: 'Piauí', regiao: 'Nordeste' },
  { sigla: 'RJ', nome: 'Rio de Janeiro', regiao: 'Sudeste' },
  { sigla: 'RN', nome: 'Rio Grande do Norte', regiao: 'Nordeste' },
  { sigla: 'RS', nome: 'Rio Grande do Sul', regiao: 'Sul' },
  { sigla: 'RO', nome: 'Rondônia', regiao: 'Norte' },
  { sigla: 'RR', nome: 'Roraima', regiao: 'Norte' },
  { sigla: 'SC', nome: 'Santa Catarina', regiao: 'Sul' },
  { sigla: 'SP', nome: 'São Paulo', regiao: 'Sudeste' },
  { sigla: 'SE', nome: 'Sergipe', regiao: 'Nordeste' },
  { sigla: 'TO', nome: 'Tocantins', regiao: 'Norte' },
];

export function registerResourcesAndPrompts(server: McpServer): void {
  // ---- Resources ----
  server.resource(
    'tipos-materia',
    'senado://tipos-materia',
    {
      description: 'Catálogo dos tipos de matéria legislativa do Senado (sigla e nome completo). Útil para montar buscas em senado_buscar_materias.',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'senado://tipos-materia',
          mimeType: 'application/json',
          text: JSON.stringify(TIPOS_MATERIA, null, 2),
        },
      ],
    })
  );

  server.resource(
    'ufs',
    'senado://ufs',
    {
      description: 'As 27 unidades da federação representadas no Senado (3 senadores cada), com sigla, nome e região.',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: 'senado://ufs',
          mimeType: 'application/json',
          text: JSON.stringify(UFS, null, 2),
        },
      ],
    })
  );

  // ---- Prompts ----
  server.prompt(
    'panorama_senador',
    'Monta um panorama de um senador: identificação, mandato, comissões e votações recentes.',
    { nome: z.string().describe('Nome (ou parte) do senador, ex.: "Renan", "Simone Tebet"') },
    async ({ nome }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Monte um panorama do senador "${nome}". Use senado_buscar_senador_por_nome para localizar o código, depois senado_obter_senador para os dados (partido, UF, mandato, comissões) e senado_votacoes_senador para as votações recentes. Apresente um resumo organizado.`,
          },
        },
      ],
    })
  );

  server.prompt(
    'acompanhar_materia',
    'Acompanha uma matéria legislativa: situação atual, tramitação e textos.',
    { identificacao: z.string().describe('Identificação da matéria, ex.: "PEC 45/2019", "PL 1234/2023"') },
    async ({ identificacao }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: `Acompanhe a matéria "${identificacao}" no Senado. Use senado_buscar_materias para localizá-la, senado_obter_materia para a ementa e a situação atual, e senado_tramitacao_materia para o histórico de movimentações. Resuma o estágio atual e os próximos passos.`,
          },
        },
      ],
    })
  );
}
