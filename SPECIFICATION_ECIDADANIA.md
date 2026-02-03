# Especificação: Scraping do e-Cidadania

## Visão Geral

### Objetivo
Extrair dados do portal e-Cidadania do Senado Federal via web scraping, permitindo acesso programático a ideias legislativas, consultas públicas e eventos interativos.

### Integração
Esta funcionalidade será integrada ao **senado-br-mcp** como um módulo adicional, expandindo as capacidades do conector.

### Aviso Importante
Web scraping é inerentemente frágil — mudanças no HTML do site podem quebrar o extrator. O Claude Code deve implementar tratamento de erros robusto e logging detalhado para facilitar manutenção.

---

## URLs Alvo

### Base
```
https://www12.senado.leg.br/ecidadania
```

### Páginas Principais

| Tipo | URL | Descrição |
|------|-----|-----------|
| Ideias Legislativas | `/principalideia` | Propostas de cidadãos para novas leis |
| Consultas Públicas | `/principalmateria` | Votação cidadã sobre matérias em tramitação |
| Eventos Interativos | `/principalaudiencia` | Audiências públicas e eventos |
| Relatórios | `/documentos/home/resultados` | Resultados de pesquisas anteriores |

### Páginas de Detalhe (padrão provável)

| Tipo | URL Padrão |
|------|------------|
| Ideia específica | `/visualizacaoideia?id={id}` |
| Consulta específica | `/visualizacaomateria?id={id}` |
| Evento específico | `/visualizacaoaudiencia?id={id}` |

**Nota:** Claude Code deve verificar os padrões reais de URL navegando pelo site.

---

## Dados a Extrair

### 1. Ideias Legislativas

**Listagem (`/principalideia`):**

```typescript
interface IdeiaLegislativaResumo {
  id: number;                    // ID único
  titulo: string;                // Título da ideia
  apoios: number;                // Quantidade de apoios
  dataPublicacao: string;        // Data de publicação (ISO)
  status: string;                // Ex: "Aberta", "Encerrada", "Convertida em PL"
  autor: string;                 // Nome do autor cidadão
  url: string;                   // Link para página de detalhe
}
```

**Detalhe (`/visualizacaoideia?id={id}`):**

```typescript
interface IdeiaLegislativaDetalhe extends IdeiaLegislativaResumo {
  descricao: string;             // Texto completo da ideia
  problema: string;              // Problema que a ideia resolve
  solucao: string;               // Solução proposta
  comentarios: number;           // Quantidade de comentários
  dataEncerramento?: string;     // Data limite para apoios
  plConvertido?: string;         // Número do PL se convertida (ex: "PL 1234/2024")
}
```

### 2. Consultas Públicas

**Listagem (`/principalmateria`):**

```typescript
interface ConsultaPublicaResumo {
  id: number;                    // ID único
  materia: string;               // Identificação da matéria (ex: "PL 1234/2024")
  ementa: string;                // Ementa resumida
  votosSim: number;              // Votos a favor
  votosNao: number;              // Votos contra
  totalVotos: number;            // Total de votos
  percentualSim: number;         // Percentual de "sim" (calculado)
  percentualNao: number;         // Percentual de "não" (calculado)
  status: string;                // Ex: "Aberta", "Encerrada"
  url: string;                   // Link para página de detalhe
}
```

**Detalhe (`/visualizacaomateria?id={id}`):**

```typescript
interface ConsultaPublicaDetalhe extends ConsultaPublicaResumo {
  autor: string;                 // Autor da matéria
  relator?: string;              // Relator (se houver)
  comissao?: string;             // Comissão atual
  dataAbertura: string;          // Início da consulta
  dataEncerramento?: string;     // Fim da consulta
  comentarios: number;           // Quantidade de comentários
  linkMateria: string;           // Link para a matéria na API de Dados Abertos
}
```

### 3. Eventos Interativos (Audiências)

**Listagem (`/principalaudiencia`):**

```typescript
interface EventoInterativoResumo {
  id: number;                    // ID único
  titulo: string;                // Título do evento
  data: string;                  // Data do evento (ISO)
  hora: string;                  // Horário
  comissao: string;              // Comissão responsável
  comentarios: number;           // Quantidade de comentários/perguntas
  status: string;                // Ex: "Agendado", "Em andamento", "Encerrado"
  url: string;                   // Link para página de detalhe
}
```

**Detalhe (`/visualizacaoaudiencia?id={id}`):**

```typescript
interface EventoInterativoDetalhe extends EventoInterativoResumo {
  descricao: string;             // Descrição completa
  pauta: string[];               // Itens da pauta
  convidados: string[];          // Lista de convidados
  videoUrl?: string;             // Link para vídeo (se disponível)
  documentos: string[];          // Links para documentos relacionados
}
```

### 4. Relatórios de Pesquisas

**Listagem (`/documentos/home/resultados`):**

```typescript
interface RelatorioResumo {
  id: number;                    // ID único
  titulo: string;                // Título da pesquisa
  dataPublicacao: string;        // Data de publicação
  tipo: string;                  // Ex: "Enquete", "Pesquisa de Opinião"
  url: string;                   // Link para o documento
  downloadUrl: string;           // Link direto para PDF (se disponível)
}
```

---

## Tools MCP Propostas

### Ideias Legislativas

#### `senado_ecidadania_listar_ideias`
Lista ideias legislativas com filtros.

```typescript
// Input
{
  status?: "aberta" | "encerrada" | "convertida" | "todas";
  ordenarPor?: "apoios" | "data" | "comentarios";
  ordem?: "asc" | "desc";
  limite?: number;              // Padrão: 20
  pagina?: number;              // Paginação
}

// Output: IdeiaLegislativaResumo[]
```

#### `senado_ecidadania_obter_ideia`
Obtém detalhes de uma ideia específica.

```typescript
// Input
{
  id: number;                   // ID da ideia
}

// Output: IdeiaLegislativaDetalhe
```

#### `senado_ecidadania_ideias_populares`
Retorna as ideias mais apoiadas (útil para seleção de temas).

```typescript
// Input
{
  limite?: number;              // Padrão: 10
  apenasAbertas?: boolean;      // Padrão: true
}

// Output: IdeiaLegislativaResumo[]
```

---

### Consultas Públicas

#### `senado_ecidadania_listar_consultas`
Lista consultas públicas com filtros.

```typescript
// Input
{
  status?: "aberta" | "encerrada" | "todas";
  ordenarPor?: "votos" | "data" | "polarizacao";
  ordem?: "asc" | "desc";
  limite?: number;
  pagina?: number;
}

// Output: ConsultaPublicaResumo[]
```

#### `senado_ecidadania_obter_consulta`
Obtém detalhes de uma consulta específica.

```typescript
// Input
{
  id: number;
}

// Output: ConsultaPublicaDetalhe
```

#### `senado_ecidadania_consultas_polarizadas`
Retorna consultas com votação equilibrada (útil para identificar temas polarizados).

```typescript
// Input
{
  margemPolarizacao?: number;   // Padrão: 15 (considera polarizado se diferença < 15%)
  minimoVotos?: number;         // Padrão: 1000
  limite?: number;
}

// Output: ConsultaPublicaResumo[]
```

#### `senado_ecidadania_consultas_consensuais`
Retorna consultas com alta concordância (> 85% em uma direção).

```typescript
// Input
{
  percentualMinimo?: number;    // Padrão: 85
  minimoVotos?: number;
  limite?: number;
}

// Output: ConsultaPublicaResumo[]
```

---

### Eventos Interativos

#### `senado_ecidadania_listar_eventos`
Lista eventos interativos.

```typescript
// Input
{
  status?: "agendado" | "encerrado" | "todos";
  comissao?: string;            // Sigla da comissão
  dataInicio?: string;          // Filtro de data
  dataFim?: string;
  limite?: number;
}

// Output: EventoInterativoResumo[]
```

#### `senado_ecidadania_obter_evento`
Obtém detalhes de um evento.

```typescript
// Input
{
  id: number;
}

// Output: EventoInterativoDetalhe
```

#### `senado_ecidadania_eventos_populares`
Retorna eventos com mais comentários/perguntas.

```typescript
// Input
{
  limite?: number;
  apenasAgendados?: boolean;
}

// Output: EventoInterativoResumo[]
```

---

### Relatórios

#### `senado_ecidadania_listar_relatorios`
Lista relatórios de pesquisas publicados.

```typescript
// Input
{
  ano?: number;
  tipo?: string;
  limite?: number;
}

// Output: RelatorioResumo[]
```

---

### Tool Especial para Seleção de Tema (seu workflow)

#### `senado_ecidadania_sugerir_tema_enquete`
Analisa e sugere temas para enquete mensal baseado nos critérios do DataSenado.

```typescript
// Input
{
  criterios?: {
    evitarPolarizacao?: boolean;      // Padrão: true (evita ~50/50)
    evitarConsenso?: boolean;         // Padrão: true (evita >85%)
    minimoParticipacao?: number;      // Mínimo de votos/apoios
    apenasEmTramitacao?: boolean;     // Padrão: true
  }
}

// Output
{
  sugestoes: Array<{
    tipo: "ideia" | "consulta" | "evento";
    id: number;
    titulo: string;
    motivo: string;                   // Por que é um bom tema
    metricas: {
      participacao: number;
      polarizacao?: number;           // 0-100, onde 50 = muito polarizado
    };
    materiaRelacionada?: string;      // PL associado, se houver
  }>;
}
```

---

## Implementação Técnica

### Stack Recomendada

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| HTTP Client | `fetch` ou `axios` | Páginas estáticas |
| Parser HTML | `cheerio` | Leve, sem headless browser |
| Fallback | `playwright` | Se houver conteúdo JavaScript |

### Estratégia de Scraping

1. **Tentar primeiro com `cheerio`** (HTML estático)
2. **Se falhar**, usar `playwright` (renderização JavaScript)
3. **Cache agressivo** — dados do e-Cidadania não mudam a cada segundo

### Tratamento de Erros

```typescript
interface ScrapingError {
  tipo: "PAGINA_NAO_ENCONTRADA" | "ESTRUTURA_ALTERADA" | "TIMEOUT" | "BLOQUEADO";
  url: string;
  mensagem: string;
  sugestao: string;
}
```

### Rate Limiting

- Máximo 1 requisição por segundo ao e-Cidadania
- Respeitar `robots.txt` se existir
- Implementar backoff exponencial em caso de erro 429

### Cache

- Cache de listagens: 15 minutos
- Cache de detalhes: 1 hora
- Cache de relatórios: 24 horas

---

## Estrutura de Arquivos (extensão do senado-br-mcp)

```
src/
├── tools/
│   ├── senadores.ts
│   ├── materias.ts
│   ├── votacoes.ts
│   ├── comissoes.ts
│   ├── agenda.ts
│   ├── auxiliares.ts
│   └── ecidadania/              # NOVO
│       ├── index.ts             # Exporta todas as tools
│       ├── ideias.ts            # Tools de ideias legislativas
│       ├── consultas.ts         # Tools de consultas públicas
│       ├── eventos.ts           # Tools de eventos
│       ├── relatorios.ts        # Tools de relatórios
│       └── sugestao-tema.ts     # Tool especial para workflow
├── scraper/                      # NOVO
│   ├── client.ts                # HTTP client com rate limiting
│   ├── parser.ts                # Funções de parsing HTML
│   ├── cache.ts                 # Sistema de cache
│   └── pages/
│       ├── ideias.ts            # Scraper de ideias
│       ├── consultas.ts         # Scraper de consultas
│       ├── eventos.ts           # Scraper de eventos
│       └── relatorios.ts        # Scraper de relatórios
└── ...
```

---

## Validação pelo Claude Code

### Etapa 1: Reconhecimento
Antes de implementar, Claude Code deve:

1. Acessar cada URL e salvar o HTML
2. Identificar a estrutura real das páginas
3. Verificar se há JavaScript necessário para renderização
4. Mapear seletores CSS para cada dado
5. Documentar padrões de paginação

### Etapa 2: Protótipo
Implementar scraper mínimo para **uma** página (sugestão: listagem de consultas públicas) e validar que extrai dados corretamente.

### Etapa 3: Expansão
Após protótipo funcionar, expandir para demais páginas.

---

## Riscos e Mitigações

| Risco | Probabilidade | Mitigação |
|-------|---------------|-----------|
| Site muda estrutura HTML | Alta (longo prazo) | Logging detalhado, testes automatizados |
| Bloqueio por rate limiting | Média | Respeitar limites, usar cache |
| Conteúdo requer JavaScript | Média | Fallback para Playwright |
| Site fora do ar | Baixa | Retry com backoff, mensagem clara ao usuário |

---

## Cronograma (adicional ao senado-br-mcp)

### Fase 7: Scraping e-Cidadania (2-3 sessões)

1. **Reconhecimento** — Mapear estrutura real das páginas
2. **Implementar scrapers** — Um por tipo de conteúdo
3. **Implementar tools MCP** — Integrar ao servidor existente
4. **Testar** — Validar extração de dados
5. **Documentar** — Atualizar README com novas tools

---

## Caso de Uso: Seu Workflow de Enquetes

Com as tools implementadas, seu prompt poderia usar:

```
1. senado_ecidadania_sugerir_tema_enquete() 
   → Recebe sugestões filtradas pelos critérios do DataSenado

2. senado_ecidadania_obter_consulta(id) 
   → Detalhes da consulta selecionada

3. senado_buscar_materias(sigla, numero, ano) 
   → Busca o PL relacionado na API oficial

4. senado_tramitacao_materia(codigoMateria) 
   → Verifica se está em tramitação no Senado

5. Gerar assertivas e documento .docx
```

Isso automatizaria boa parte do processo de seleção de tema descrito no seu prompt.
