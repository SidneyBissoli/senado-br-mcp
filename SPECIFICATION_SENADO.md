# Especificação Técnica: senado-br-mcp

## Visão Geral do Projeto

### Objetivo
Criar um servidor MCP (Model Context Protocol) que permita acesso estruturado aos dados abertos do Senado Federal do Brasil, democratizando o acesso a informações legislativas através de conversas com IA.

### Valor Único
Os dados legislativos são altamente dinâmicos: proposições tramitam constantemente, votações ocorrem diariamente, e a composição de comissões muda frequentemente. Claude não tem acesso nativo a esses dados em tempo real, tornando este conector genuinamente valioso.

### Duas Fontes de Dados

| Fonte | Robustez | Conteúdo | Fases |
|-------|----------|----------|-------|
| **API de Dados Abertos** | Alta (API oficial documentada) | Senadores, matérias, votações, comissões, agenda | 1-6 |
| **e-Cidadania (scraping)** | Média (pode quebrar se HTML mudar) | Ideias legislativas, consultas públicas, eventos | 7 |

**Arquitetura de isolamento:** Os dois módulos são independentes. Se o scraping do e-Cidadania falhar, as funcionalidades da API oficial continuam operacionais.

### Informações do Pacote
- **Nome**: `senado-br-mcp`
- **Descrição**: MCP server for Brazilian Federal Senate open data (legislators, bills, votes, committees)
- **Autor**: Sidney da Silva Pereira Bissoli
- **Licença**: MIT
- **Repositório**: https://github.com/SidneyBissoli/senado-br-mcp

---

## Fonte de Dados

### API de Dados Abertos do Senado Federal
- **Base URL**: `https://legis.senado.leg.br/dadosabertos`
- **Documentação**: https://legis.senado.leg.br/dadosabertos/docs/
- **Formato**: XML (padrão) e JSON (via header Accept)
- **Autenticação**: Nenhuma (dados públicos)
- **Rate Limiting**: Não documentado oficialmente, implementar throttling conservador

### Endpoints Principais

| Categoria | Endpoint Base | Descrição | Fonte |
|-----------|---------------|-----------|-------|
| Senadores | `/senador` | Dados biográficos, mandatos, cargos | API oficial |
| Matérias | `/materia` | Proposições legislativas e tramitação | API oficial |
| Votações | `/plenario/votacao` | Votações nominais e resultados | API oficial |
| Comissões | `/comissao` | Composição e atividades | API oficial |
| Agenda | `/agenda` | Sessões e reuniões agendadas | API oficial |
| Auxiliares | diversos | Lookups de legislaturas, tipos de matéria, partidos | API oficial |
| e-Cidadania | `www12.senado.leg.br/ecidadania` | Ideias, consultas, eventos, relatórios | Scraping (Fase 7) |

---

## Arquitetura Técnica

### Stack Tecnológico
```
Runtime: Node.js 18+
Linguagem: TypeScript 5.x
MCP SDK: @modelcontextprotocol/sdk (última versão)
Build: esbuild
Validação: Zod
HTTP Client: fetch nativo (Node 18+)
Logging: pino
Cache: node-cache (opcional, para reduzir requisições)
```

### Estrutura de Diretórios
```
senado-br-mcp/
├── src/
│   ├── index.ts              # Entry point stdio (npm)
│   ├── server.ts             # Entry point HTTP (Railway)
│   ├── api/
│   │   ├── client.ts         # Cliente HTTP com retry e error handling
│   │   └── endpoints.ts      # Constantes de endpoints
│   ├── tools/
│   │   ├── senadores.ts      # Tools relacionadas a senadores
│   │   ├── materias.ts       # Tools relacionadas a matérias/proposições
│   │   ├── votacoes.ts       # Tools relacionadas a votações
│   │   ├── comissoes.ts      # Tools relacionadas a comissões
│   │   ├── agenda.ts         # Tools relacionadas à agenda
│   │   ├── auxiliares.ts     # Tools de lookup
│   │   └── ecidadania/       # Módulo e-Cidadania (Fase 7, isolado)
│   │       ├── index.ts      # Exporta todas as tools do e-Cidadania
│   │       ├── ideias.ts     # Tools de ideias legislativas
│   │       ├── consultas.ts  # Tools de consultas públicas
│   │       ├── eventos.ts    # Tools de eventos interativos
│   │       ├── relatorios.ts # Tools de relatórios
│   │       └── sugestao.ts   # Tool de sugestão de tema
│   ├── scraper/              # Implementação do scraping (Fase 7)
│   │   ├── client.ts         # HTTP client com rate limiting
│   │   ├── parser.ts         # Funções de parsing HTML
│   │   ├── cache.ts          # Sistema de cache
│   │   └── pages/
│   │       ├── ideias.ts
│   │       ├── consultas.ts
│   │       ├── eventos.ts
│   │       └── relatorios.ts
│   ├── middleware/
│   │   └── rateLimiter.ts    # Rate limiting mensal (HTTP)
│   ├── schemas/
│   │   ├── senador.ts        # Schemas Zod para senadores
│   │   ├── materia.ts        # Schemas Zod para matérias
│   │   └── ...
│   └── utils/
│       ├── formatters.ts     # Formatação de respostas
│       ├── parsers.ts        # Parsing de XML/JSON
│       └── logger.ts         # Configuração do pino
├── dist/                     # Build output
├── package.json
├── tsconfig.json
├── esbuild.config.js
└── README.md
```

---

## Especificação das Tools

### 1. Senadores

#### `senado_listar_senadores`
Lista senadores em exercício ou de uma legislatura específica.

```typescript
// Input Schema
{
  legislatura?: number,        // Número da legislatura (ex: 57 para 2023-2027)
  uf?: string,                 // Sigla do estado (ex: "SP", "RJ")
  partido?: string,            // Sigla do partido (ex: "PT", "PL")
  emExercicio?: boolean        // Filtrar apenas senadores em exercício
}

// Output: Lista de senadores com nome, partido, UF, foto, código
```

**Annotations**: `readOnlyHint: true`, `openWorldHint: true`

#### `senado_obter_senador`
Obtém informações detalhadas de um senador específico.

```typescript
// Input Schema
{
  codigoSenador: number        // Código único do senador (obrigatório)
}

// Output: Dados biográficos completos, mandatos, cargos, comissões
```

**Annotations**: `readOnlyHint: true`, `idempotentHint: true`

#### `senado_buscar_senador_por_nome`
Busca senadores por nome (útil quando não se tem o código).

```typescript
// Input Schema
{
  nome: string                 // Nome ou parte do nome do senador
}

// Output: Lista de senadores correspondentes
```

#### `senado_votacoes_senador`
Lista votações de um senador específico.

```typescript
// Input Schema
{
  codigoSenador: number,
  ano?: number,                // Ano das votações
  dataInicio?: string,         // Data início (YYYYMMDD)
  dataFim?: string             // Data fim (YYYYMMDD)
}

// Output: Lista de votações com posição do senador (Sim/Não/Abstenção)
```

---

### 2. Matérias Legislativas

#### `senado_buscar_materias`
Busca matérias legislativas por diversos critérios.

```typescript
// Input Schema
{
  sigla?: string,              // Tipo: PEC, PL, PLP, MPV, PDL, PRS, etc.
  numero?: number,             // Número da matéria
  ano?: number,                // Ano da matéria
  tramitando?: boolean,        // Apenas em tramitação
  palavraChave?: string,       // Busca na ementa
  autorNome?: string,          // Nome do autor
  relatorNome?: string         // Nome do relator
}

// Output: Lista de matérias com ementa, situação, autoria
```

#### `senado_obter_materia`
Obtém detalhes completos de uma matéria legislativa.

```typescript
// Input Schema
{
  codigoMateria: number        // Código único da matéria
}

// Output: Dados completos incluindo textos, pareceres, tramitação
```

#### `senado_tramitacao_materia`
Obtém histórico de tramitação de uma matéria.

```typescript
// Input Schema
{
  codigoMateria: number
}

// Output: Lista cronológica de movimentações
```

#### `senado_textos_materia`
Obtém textos (inicial, substitutivo, final) de uma matéria.

```typescript
// Input Schema
{
  codigoMateria: number
}

// Output: URLs dos textos disponíveis em PDF
```

#### `senado_votos_materia`
Obtém resultado de votações de uma matéria.

```typescript
// Input Schema
{
  codigoMateria: number
}

// Output: Votações realizadas com placar e votos nominais
```

---

### 3. Votações

#### `senado_listar_votacoes`
Lista votações do plenário por período.

```typescript
// Input Schema
{
  ano: number,                 // Ano das votações (obrigatório)
  mes?: number,                // Mês (1-12)
  dataInicio?: string,         // Data início (YYYYMMDD)
  dataFim?: string             // Data fim (YYYYMMDD)
}

// Output: Lista de votações com matéria, resultado, data
```

#### `senado_obter_votacao`
Obtém detalhes de uma votação específica.

```typescript
// Input Schema
{
  codigoVotacao: number        // Código único da votação
}

// Output: Detalhes completos incluindo votos nominais de cada senador
```

#### `senado_votacoes_recentes`
Obtém votações mais recentes (últimos N dias).

```typescript
// Input Schema
{
  dias?: number                // Quantidade de dias (padrão: 7)
}

// Output: Votações ordenadas por data (mais recentes primeiro)
```

---

### 4. Comissões

#### `senado_listar_comissoes`
Lista comissões do Senado.

```typescript
// Input Schema
{
  tipo?: string,               // Tipo: "permanente", "temporaria", "cpi", "mista"
  ativa?: boolean              // Apenas comissões ativas
}

// Output: Lista de comissões com sigla, nome, tipo
```

#### `senado_obter_comissao`
Obtém detalhes de uma comissão.

```typescript
// Input Schema
{
  sigla: string                // Sigla da comissão (ex: "CCJ", "CAE")
}

// Output: Composição atual, presidente, membros
```

#### `senado_membros_comissao`
Lista membros atuais de uma comissão.

```typescript
// Input Schema
{
  sigla: string
}

// Output: Lista de senadores com cargo na comissão
```

#### `senado_reunioes_comissao`
Lista reuniões de uma comissão.

```typescript
// Input Schema
{
  sigla: string,
  dataInicio?: string,
  dataFim?: string
}

// Output: Reuniões agendadas/realizadas com pauta
```

---

### 5. Agenda Legislativa

#### `senado_agenda_plenario`
Obtém agenda de sessões do plenário.

```typescript
// Input Schema
{
  data?: string,               // Data específica (YYYYMMDD)
  dataInicio?: string,
  dataFim?: string
}

// Output: Sessões agendadas com pauta
```

#### `senado_agenda_comissoes`
Obtém agenda de reuniões das comissões.

```typescript
// Input Schema
{
  data?: string,
  siglaComissao?: string       // Filtrar por comissão específica
}

// Output: Reuniões agendadas
```

---

### 6. Tools Auxiliares (Lookup)

Tools de apoio que retornam valores válidos para parâmetros de outras tools, facilitando a descoberta de dados.

#### `senado_legislatura_atual`
Retorna informações sobre a legislatura vigente.

```typescript
// Input Schema
{} // Sem parâmetros

// Output: Número, período, data início/fim da legislatura atual
```

**Annotations**: `readOnlyHint: true`, `idempotentHint: true`

**Exemplo de resposta:**
```json
{
  "numero": 57,
  "periodo": "2023-2027",
  "dataInicio": "2023-02-01",
  "dataFim": "2027-01-31"
}
```

#### `senado_tipos_materia`
Lista os tipos de matérias legislativas válidos com descrições.

```typescript
// Input Schema
{} // Sem parâmetros

// Output: Lista de siglas com nome completo e descrição
```

**Annotations**: `readOnlyHint: true`, `idempotentHint: true`

**Exemplo de resposta:**
```json
{
  "tipos": [
    { "sigla": "PEC", "nome": "Proposta de Emenda à Constituição", "descricao": "Altera a Constituição Federal" },
    { "sigla": "PL", "nome": "Projeto de Lei", "descricao": "Projeto de lei ordinária" },
    { "sigla": "PLP", "nome": "Projeto de Lei Complementar", "descricao": "Regulamenta dispositivos constitucionais" },
    { "sigla": "MPV", "nome": "Medida Provisória", "descricao": "Medida com força de lei editada pelo Executivo" },
    { "sigla": "PDL", "nome": "Projeto de Decreto Legislativo", "descricao": "Matéria de competência exclusiva do Congresso" },
    { "sigla": "PRS", "nome": "Projeto de Resolução do Senado", "descricao": "Matéria de competência privativa do Senado" }
  ]
}
```

#### `senado_partidos`
Lista partidos com representação atual no Senado.

```typescript
// Input Schema
{} // Sem parâmetros

// Output: Lista de partidos com sigla, nome e número de senadores
```

**Annotations**: `readOnlyHint: true`, `idempotentHint: true`

**Exemplo de resposta:**
```json
{
  "partidos": [
    { "sigla": "PL", "nome": "Partido Liberal", "senadores": 13 },
    { "sigla": "PT", "nome": "Partido dos Trabalhadores", "senadores": 9 },
    { "sigla": "MDB", "nome": "Movimento Democrático Brasileiro", "senadores": 10 }
  ]
}
```

#### `senado_ufs`
Lista unidades federativas com número de senadores (útil para validação de parâmetro uf).

```typescript
// Input Schema
{} // Sem parâmetros

// Output: Lista de UFs com nome e quantidade de senadores
```

**Annotations**: `readOnlyHint: true`, `idempotentHint: true`

### Configuração Base
```typescript
// src/api/client.ts
import pino from 'pino';

const logger = pino({ name: 'senado-br-mcp' });

const BASE_URL = 'https://legis.senado.leg.br/dadosabertos';

interface ApiClientOptions {
  timeout?: number;
  retries?: number;
  format?: 'json' | 'xml';
}

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
      logger.warn({ endpoint, attempt, error }, 'API request failed');
      
      if (attempt === retries) {
        throw new Error(
          `Failed to fetch ${endpoint} after ${retries} attempts: ${error}`
        );
      }
      
      // Exponential backoff
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  throw new Error('Unreachable');
}
```

### Tratamento de Respostas
A API do Senado retorna estruturas aninhadas. Exemplo de resposta para senadores:

```json
{
  "ListaParlamentarEmExercicio": {
    "Parlamentares": {
      "Parlamentar": [
        {
          "IdentificacaoParlamentar": {
            "CodigoParlamentar": "5322",
            "NomeParlamentar": "Senador Fulano",
            "NomeCompletoParlamentar": "Fulano de Tal",
            "SexoParlamentar": "Masculino",
            "FormaTratamento": "Senador",
            "UrlFotoParlamentar": "https://...",
            "UrlPaginaParlamentar": "https://..."
          },
          "Mandato": {
            "UfParlamentar": "SP",
            "PrimeiraLegislaturaDoMandato": { "NumeroLegislatura": "57" },
            "SegundaLegislaturaDoMandato": { "NumeroLegislatura": "58" },
            "DescricaoParticipacao": "Titular"
          }
        }
      ]
    }
  }
}
```

Criar funções de parsing que extraiam os dados relevantes e normalizem a estrutura.

---

## Padrões de Resposta

### Formato JSON Estruturado
Retornar dados em formato que facilite processamento pela IA:

```typescript
// Resposta para listagem de senadores
{
  success: true,
  count: 81,
  data: [
    {
      codigo: 5322,
      nome: "Senador Fulano",
      nomeCompleto: "Fulano de Tal",
      partido: "PT",
      uf: "SP",
      foto: "https://...",
      emExercicio: true
    }
  ],
  metadata: {
    fonte: "Senado Federal - Dados Abertos",
    dataConsulta: "2024-01-15T10:30:00Z",
    endpoint: "/senador/lista/atual"
  }
}
```

### Mensagens de Erro Acionáveis
```typescript
{
  success: false,
  error: {
    code: "SENADOR_NAO_ENCONTRADO",
    message: "Senador com código 99999 não foi encontrado",
    suggestion: "Use senado_buscar_senador_por_nome para encontrar o código correto"
  }
}
```

---

## Validação com Zod

### Schema de Entrada
```typescript
// src/schemas/senador.ts
import { z } from 'zod';

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
```

### Schema de Saída
```typescript
export const SenadorOutput = z.object({
  codigo: z.number(),
  nome: z.string(),
  nomeCompleto: z.string(),
  partido: z.string().nullable(),
  uf: z.string(),
  foto: z.string().url().nullable(),
  email: z.string().email().nullable(),
  emExercicio: z.boolean()
});
```

---

## Configuração do Build

### package.json
```json
{
  "name": "senado-br-mcp",
  "version": "1.0.0",
  "description": "MCP server for Brazilian Federal Senate open data",
  "type": "module",
  "main": "dist/index.js",
  "bin": {
    "senado-br-mcp": "dist/index.js"
  },
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node18 --outfile=dist/index.js --format=esm --external:pino --external:pino-pretty",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "inspect": "npx @modelcontextprotocol/inspector dist/index.js",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "keywords": [
    "mcp",
    "senado",
    "brasil",
    "legislativo",
    "dados-abertos",
    "claude",
    "anthropic"
  ],
  "author": "Sidney",
  "license": "MIT",
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.23.0",
    "pino": "^9.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "esbuild": "^0.21.0",
    "typescript": "^5.4.0",
    "tsx": "^4.0.0",
    "eslint": "^8.57.0",
    "pino-pretty": "^11.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

## Testes e Validação

### Checklist de Qualidade
- [ ] Todas as tools têm descrições claras e concisas
- [ ] Schemas de entrada validam todos os parâmetros
- [ ] Erros retornam mensagens acionáveis
- [ ] Logging estruturado com pino
- [ ] Build compila sem erros
- [ ] Inspector mostra todas as tools corretamente
- [ ] Cada tool funciona independentemente
- [ ] Paginação implementada onde aplicável

### Testes no MCP Inspector
```bash
# Iniciar o Inspector
npx @modelcontextprotocol/inspector dist/index.js

# Testar cada tool manualmente
# 1. senado_listar_senadores (sem parâmetros)
# 2. senado_listar_senadores (com uf: "SP")
# 3. senado_buscar_senador_por_nome (nome: "Randolfe")
# 4. senado_buscar_materias (sigla: "PEC", ano: 2024)
```

### Casos de Teste Específicos
1. **Senadores**: Listar todos, filtrar por UF, filtrar por partido
2. **Matérias**: Buscar PEC 2024, buscar por palavra-chave
3. **Votações**: Listar votações recentes, obter votos nominais
4. **Comissões**: Listar CCJ, obter membros
5. **Erros**: Código inválido, endpoint inexistente

---

## Publicação

### 1. npm Registry
Distribuição técnica do pacote. Permite instalação via `npx`.
```bash
npm login
npm publish --access public
```

### 2. MCP Registry (Oficial)
Repositório oficial da Anthropic/MCP. Aparece nas integrações nativas do Claude Desktop.
- URL: https://github.com/modelcontextprotocol/servers
- Submeter PR seguindo o schema do registry
- Maior impacto para visibilidade no ecossistema Claude

### 3. Glama.ai
Maior catálogo independente de MCPs. Sidney já possui status "Author verified".
- URL: https://glama.ai
- Submeter via interface do site
- Boa visibilidade na comunidade

### 4. mcpservers.org
Agregador comunitário de servidores MCP.
- URL: https://mcpservers.org
- Submeter via formulário ou PR no repositório

### 5. GitHub Repository
Repositório público com documentação completa.
- URL: https://github.com/SidneyBissoli/senado-br-mcp
- README detalhado com exemplos de uso
- Issues abertos para feedback da comunidade

### Configuração no Claude Desktop
Para MCPs baseados em stdio (como este), configurar via arquivo JSON:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "senado-br-mcp": {
      "command": "npx",
      "args": ["-y", "senado-br-mcp"]
    }
  }
}
```

> **Nota:** A opção "Adicionar conector personalizado" na interface do Claude Desktop é apenas para MCPs remotos (HTTP transport), não para MCPs locais baseados em npm/stdio.

---

## Deploy como Servidor HTTP Remoto

Além da distribuição via npm (stdio), o MCP será hospedado como servidor HTTP remoto. Isso permite que usuários configurem o conector diretamente na interface do Claude Desktop, sem necessidade de instalar Node.js ou npm.

### Duas Formas de Acesso (Escolha do Usuário)

| Modo | Instalação | Configuração | Custo para usuário | Custo para Sidney |
|------|------------|--------------|-------------------|-------------------|
| **stdio/npm** | `npm install -g senado-br-mcp` | Arquivo JSON | Zero | Zero |
| **HTTP remoto** | Nenhuma | Interface gráfica (URL) | Zero | Servidor compartilhado |

Ambos os modos acessam as mesmas tools. A escolha é do usuário conforme sua preferência e perfil técnico.

### Plataforma Escolhida: Railway

**Justificativa:**
- Simplicidade máxima — deploy direto do GitHub, zero configuração
- Node.js nativo, Express funciona out-of-the-box
- Servidor persistente, sem timeout
- $5 de crédito gratuito mensal (suficiente para uso moderado)

**Validação necessária:** Claude Code deve confirmar que o MCP SDK funciona corretamente no ambiente Railway antes de prosseguir.

**Fallback:** Fly.io (requer Dockerfile, mas tem região São Paulo)

### Rate Limiting Mensal (Custo Zero)

Para garantir que o servidor HTTP permaneça gratuito para Sidney, implementar rate limiting baseado no tier gratuito do Railway.

**Configuração:**
- **Limite mensal:** ~80% do crédito gratuito (margem de segurança)
- **Contador:** Persistente (Redis gratuito, SQLite, ou arquivo)
- **Reset:** Automático no dia 1 de cada mês

**Notificações para Sidney:**
- Email/webhook quando atingir 50%, 80% e 100% do limite
- Dashboard simples para consulta manual do uso atual

**Resposta quando limite atingido:**
```json
{
  "error": "MONTHLY_LIMIT_REACHED",
  "message": "O servidor atingiu o limite mensal de requisições gratuitas. Voltará a funcionar em [data]. Para uso imediato, instale localmente via npm.",
  "alternatives": {
    "npm": "npx senado-br-mcp",
    "docs": "https://github.com/SidneyBissoli/senado-br-mcp#instalação",
    "sponsor": "https://github.com/sponsors/SidneyBissoli"
  }
}
```

**Estratégia:** Se houver adoção significativa e o limite for atingido frequentemente, buscar patrocínio/doações para expandir capacidade.

### Arquitetura Dual (stdio + HTTP)

O código das tools permanece idêntico. A diferença está apenas no entry point:

```
src/
├── index.ts              # Entry point stdio (npm)
├── server.ts             # Entry point HTTP (Railway)
├── middleware/
│   └── rateLimiter.ts    # Rate limiting mensal
├── tools/                # Tools compartilhadas
└── ...
```

**Entry point stdio (index.ts):**
```typescript
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Entry point HTTP (server.ts):**
```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { checkMonthlyLimit, incrementCounter } from './middleware/rateLimiter.js';

const app = express();

app.post('/mcp', async (req, res) => {
  // Verificar rate limit antes de processar
  const limitStatus = await checkMonthlyLimit();
  if (limitStatus.exceeded) {
    return res.status(429).json({
      error: "MONTHLY_LIMIT_REACHED",
      message: limitStatus.message,
      alternatives: limitStatus.alternatives
    });
  }
  
  // Processar requisição MCP
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });
  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
  
  // Incrementar contador
  await incrementCounter();
});
```

### Configuração pelo Usuário

**Opção 1 — stdio/npm (usuários técnicos):**

Arquivo `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "senado-br-mcp": {
      "command": "npx",
      "args": ["-y", "senado-br-mcp"]
    }
  }
}
```

**Opção 2 — HTTP remoto (usuários não-técnicos):**

Na interface do Claude Desktop → "Adicionar conector personalizado":
- **Nome**: senado-br-mcp
- **URL do servidor MCP remoto**: `https://senado-br-mcp.up.railway.app/mcp`

---

## Integração com e-Cidadania (Fase 7)

### Contexto

O portal e-Cidadania (`www12.senado.leg.br/ecidadania`) oferece dados de participação cidadã que **não estão disponíveis** na API de Dados Abertos:

| Conteúdo | Descrição |
|----------|-----------|
| Ideias Legislativas | Propostas de cidadãos com apoios |
| Consultas Públicas | Votação popular sim/não sobre matérias |
| Eventos Interativos | Audiências públicas com comentários |
| Relatórios | Resultados de pesquisas anteriores |

### Solução: Web Scraping

Como não há API oficial do e-Cidadania, a Fase 7 implementará **scraping** para extrair esses dados.

**Especificação completa:** Documento separado `ecidadania-scraping-specification.md`

### Arquitetura de Isolamento

O scraping é inerentemente frágil — mudanças no HTML do site podem quebrar o extrator. Para garantir que isso **não afete** as demais funcionalidades do MCP, a arquitetura deve isolar completamente os dois módulos:

```
senado-br-mcp
├── Módulo API Oficial (robusto)
│   ├── tools/senadores.ts
│   ├── tools/materias.ts
│   ├── tools/votacoes.ts
│   ├── tools/comissoes.ts
│   ├── tools/agenda.ts
│   └── tools/auxiliares.ts
│
└── Módulo e-Cidadania (isolado)
    ├── tools/ecidadania/ideias.ts
    ├── tools/ecidadania/consultas.ts
    ├── tools/ecidadania/eventos.ts
    ├── tools/ecidadania/relatorios.ts
    └── scraper/... (implementação do scraping)
```

### Comportamento em Caso de Falha

| Situação | Módulo API Oficial | Módulo e-Cidadania |
|----------|-------------------|-------------------|
| API do Senado funciona | ✅ Funciona | — |
| API do Senado fora | ❌ Falha | — |
| Scraping funciona | — | ✅ Funciona |
| Scraping quebra (HTML mudou) | — | ❌ Falha |
| **Scraping quebra** | **✅ Continua funcionando** | ❌ Falha |

### Implementação do Isolamento

Cada tool do e-Cidadania deve ter tratamento de erro independente:

```typescript
// tools/ecidadania/consultas.ts
export async function listarConsultas(params: ListarConsultasInput) {
  try {
    const dados = await scraperConsultas.listar(params);
    return {
      success: true,
      data: dados
    };
  } catch (error) {
    // Falha isolada - não afeta outras tools
    return {
      success: false,
      error: {
        code: "ECIDADANIA_SCRAPING_FALHOU",
        message: "Não foi possível acessar o e-Cidadania. O site pode ter alterado sua estrutura.",
        suggestion: "Acesse diretamente: https://www12.senado.leg.br/ecidadania/principalmateria",
        nota: "As demais funcionalidades do senado-br-mcp (senadores, matérias, votações) continuam operacionais."
      }
    };
  }
}
```

### Tools do e-Cidadania (resumo)

| Tool | Descrição |
|------|-----------|
| `senado_ecidadania_listar_ideias` | Lista ideias legislativas |
| `senado_ecidadania_obter_ideia` | Detalhes de uma ideia |
| `senado_ecidadania_ideias_populares` | Ideias mais apoiadas |
| `senado_ecidadania_listar_consultas` | Lista consultas públicas |
| `senado_ecidadania_obter_consulta` | Detalhes de uma consulta |
| `senado_ecidadania_consultas_polarizadas` | Consultas com ~50/50 |
| `senado_ecidadania_consultas_consensuais` | Consultas com >85% |
| `senado_ecidadania_listar_eventos` | Lista audiências/eventos |
| `senado_ecidadania_obter_evento` | Detalhes de um evento |
| `senado_ecidadania_eventos_populares` | Eventos mais comentados |
| `senado_ecidadania_listar_relatorios` | Lista relatórios publicados |
| `senado_ecidadania_sugerir_tema_enquete` | Sugere temas para enquetes |

### Caso de Uso: Workflow de Enquetes (DataSenado)

Com as tools do e-Cidadania, Claude pode auxiliar na seleção de temas para enquetes mensais:

```
1. senado_ecidadania_sugerir_tema_enquete()
   → Sugere temas filtrados pelos critérios (evitar polarização, evitar consenso)

2. senado_ecidadania_obter_consulta(id)
   → Detalhes da consulta selecionada

3. senado_buscar_materias(sigla, numero, ano)
   → Busca o PL relacionado na API oficial

4. senado_tramitacao_materia(codigoMateria)
   → Confirma que está em tramitação no Senado

5. Claude gera assertivas e documento .docx
```

---

## Referência de Endpoints da API

### Senadores
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/senador/lista/atual` | Senadores em exercício |
| GET | `/senador/lista/legislatura/{leg}` | Senadores por legislatura |
| GET | `/senador/{codigo}` | Dados de um senador |
| GET | `/senador/{codigo}/votacoes` | Votações do senador |
| GET | `/senador/{codigo}/mandatos` | Mandatos do senador |
| GET | `/senador/{codigo}/cargos` | Cargos ocupados |
| GET | `/senador/{codigo}/comissoes` | Comissões participadas |

### Matérias
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/materia/pesquisa/lista` | Pesquisa matérias |
| GET | `/materia/{codigo}` | Detalhes da matéria |
| GET | `/materia/{codigo}/textos` | Textos da matéria |
| GET | `/materia/{codigo}/votacoes` | Votações da matéria |
| GET | `/materia/tramitando` | Matérias em tramitação |

### Votações
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/plenario/lista/votacao/{ano}` | Votações por ano |
| GET | `/plenario/votacao/{codigo}` | Detalhes da votação |
| GET | `/plenario/votacao/{codigo}/votos` | Votos nominais |

### Comissões
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/comissao/lista` | Lista comissões |
| GET | `/comissao/{sigla}` | Dados da comissão |
| GET | `/comissao/{sigla}/composicao` | Membros atuais |

### Agenda
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/agenda/{data}` | Agenda do dia |
| GET | `/plenario/lista/sessoes/{ano}` | Sessões do ano |

### Auxiliares (Lookup)
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/senador/lista/atual` | Deriva legislatura atual |
| GET | `/legislatura/atual` | Legislatura vigente (se disponível) |
| GET | `/materia/siglas` | Tipos de matérias válidos |
| GET | `/partido/lista` | Partidos com representação |
| — | Derivado de `/senador/lista/atual` | UFs e contagem de senadores |

---

## Notas de Implementação

### Considerações Importantes
1. **Formato de Data**: API usa `YYYYMMDD` para datas
2. **Encoding**: Respostas em UTF-8
3. **Legislaturas**: 57ª (2023-2027), 56ª (2019-2023), etc.
4. **Tipos de Matéria**: PEC, PL, PLP, MPV, PDL, PRS, PLC, PLS
5. **Cache**: Considerar cache de 5-15 minutos para dados pouco voláteis

### Limitações Conhecidas
- Algumas respostas XML têm estrutura inconsistente
- Nem todas as matérias têm textos disponíveis
- Fotos de senadores podem estar desatualizadas
- API pode ter indisponibilidade ocasional

---

## Cronograma Sugerido

### Fase 1: Setup (1 sessão)
- Criar estrutura do projeto
- Configurar TypeScript, esbuild, pino
- Implementar cliente API base

### Fase 2: Tools Core (2-3 sessões)
- Implementar tools de senadores
- Implementar tools de matérias
- Implementar tools de votações

### Fase 3: Tools Complementares (1-2 sessões)
- Implementar tools de comissões
- Implementar tools de agenda
- Implementar tools auxiliares (lookup):
  - `senado_legislatura_atual`
  - `senado_tipos_materia`
  - `senado_partidos`
  - `senado_ufs`

### Fase 4: Validação (1 sessão)
- Testes completos no Inspector
- Ajustes e correções
- Documentação README

### Fase 5: Publicação npm/stdio (1 sessão)
- Publicar no npm
- Submeter ao MCP Registry
- Submeter ao Glama.ai
- Submeter ao mcpservers.org
- Configurar repositório GitHub

### Fase 6: Deploy HTTP Remoto (1-2 sessões)
- Validar compatibilidade do MCP SDK com Railway
- Criar entry point HTTP (server.ts)
- Implementar rate limiting mensal com notificações
- Configurar deploy automatizado (GitHub → Railway)
- Testar integração via "Adicionar conector personalizado" no Claude Desktop
- Documentar ambas as formas de acesso (stdio e HTTP)

### Fase 7: Scraping e-Cidadania (2-3 sessões)
- Reconhecimento: mapear estrutura HTML real das páginas do e-Cidadania
- Implementar scrapers isolados para cada tipo de conteúdo
- Implementar tools MCP do e-Cidadania
- Testar extração de dados
- Documentar novas tools no README

**Nota:** A Fase 7 está especificada em documento separado (`ecidadania-scraping-specification.md`).
