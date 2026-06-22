# Senado Brasil MCP Server

[![npm version](https://img.shields.io/npm/v/senado-br-mcp.svg)](https://www.npmjs.com/package/senado-br-mcp)
[![npm downloads](https://img.shields.io/npm/dm/senado-br-mcp.svg)](https://www.npmjs.com/package/senado-br-mcp)
[![node](https://img.shields.io/node/v/senado-br-mcp)](https://www.npmjs.com/package/senado-br-mcp)
[![MCP Registry](https://img.shields.io/badge/MCP-Registry-blue)](https://registry.modelcontextprotocol.io)
[![GitHub stars](https://img.shields.io/github/stars/SidneyBissoli/senado-br-mcp?style=flat&logo=github)](https://github.com/SidneyBissoli/senado-br-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

🇺🇸 [Read in English](README.md)

Servidor MCP (Model Context Protocol) que permite acesso estruturado aos dados abertos do Senado Federal do Brasil, democratizando o acesso a informações legislativas através de conversas com IA.

## Veja na prática

Pergunte ao seu assistente, em português:

- *"Liste os senadores de SP em exercício."* → `senado_listar_senadores`
- *"Mostre a tramitação da PEC 45/2019."* → `senado_buscar_materias` + `senado_obter_materia`
- *"Quais ideias legislativas mais apoiadas estão abertas no e-Cidadania?"* → `senado_ecidadania_listar_ideias`

As respostas vêm ao vivo das APIs oficiais de dados abertos do Senado — dados reais com procedência, não números chutados a partir do treino.

## Funcionalidades

- **33 ferramentas** para acessar dados do Senado
- Dados em tempo real da API oficial
- **Integração com e-Cidadania**: dados de participação cidadã via web scraping
- Respostas em JSON estruturado
- Tratamento de erros com sugestões acionáveis
- TypeScript com tipagem completa
- **Dois modos de acesso:** stdio (npm) e HTTP remoto

## Duas formas de usar

| Modo | Instalação | Melhor para |
|------|--------------|----------|
| **stdio/npm** | `npx senado-br-mcp` | Usuários técnicos, uso local |
| **HTTP remoto** | Nenhuma | Usuários não técnicos, acesso na nuvem |

Ambos os modos dão acesso às mesmas 33 ferramentas.

---

## Opção 1: stdio/npm (Local)

### Instalação

**Usando npx (recomendado):**
```bash
npx senado-br-mcp
```

**Instalação global:**
```bash
npm install -g senado-br-mcp
senado-br-mcp
```

**A partir do código-fonte:**
```bash
git clone https://github.com/SidneyBissoli/senado-br-mcp.git
cd senado-br-mcp
npm install
npm run build
npm start
```

### Configuração no Claude Desktop

Adicione ao seu `claude_desktop_config.json`:

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

---

## Opção 2: HTTP remoto (nuvem)

Sem instalação. Conecte direto via URL.

### Configuração no Claude Desktop

Nas configurações do Claude Desktop, vá em **"Add Custom Connector"** e informe:

- **Name:** senado-br-mcp
- **URL:** `https://senado-br-mcp.up.railway.app/mcp`

### Endpoints

| Endpoint | Descrição |
|----------|-------------|
| `GET /` | Informações e documentação do servidor |
| `GET /health` | Health check |
| `GET /stats` | Estatísticas de uso |
| `POST /mcp` | Endpoint do protocolo MCP |

### Limite de requisições

O servidor HTTP tem um limite mensal de requisições para se manter dentro do tier gratuito:
- Alertas são enviados a 50%, 80% e 100% de uso
- Ao atingir o limite, use a versão npm no lugar
- O limite é reiniciado no dia 1º de cada mês

## Ferramentas disponíveis

### Senadores

| Ferramenta | Descrição |
|------|-------------|
| `senado_listar_senadores` | Lista senadores em exercício ou por legislatura. Filtros: UF, partido |
| `senado_obter_senador` | Detalhes de um senador (biografia, mandatos, comissões) |
| `senado_buscar_senador_por_nome` | Busca senadores por nome |
| `senado_votacoes_senador` | Lista como um senador votou. Filtros: ano, período |

### Matérias legislativas

| Ferramenta | Descrição |
|------|-------------|
| `senado_buscar_materias` | Busca matérias por tipo (PEC, PL, PLP, MPV), número, ano, palavra-chave, autor |
| `senado_obter_materia` | Detalhes de uma matéria (ementa, autor, situação, relator) |
| `senado_tramitacao_materia` | Histórico de tramitação da matéria |
| `senado_textos_materia` | Textos da matéria (original, substitutivo, final) com URLs de download |
| `senado_votos_materia` | Resultados de votação de uma matéria |

### Votações

| Ferramenta | Descrição |
|------|-------------|
| `senado_listar_votacoes` | Lista votações do plenário por ano. Filtros: mês, período |
| `senado_obter_votacao` | Detalhes de uma votação com votos nominais por senador |
| `senado_votacoes_recentes` | Votações recentes (últimos N dias) |

### Comissões

| Ferramenta | Descrição |
|------|-------------|
| `senado_listar_comissoes` | Lista comissões. Filtros: tipo (permanente, temporária, CPI), ativa |
| `senado_obter_comissao` | Detalhes de uma comissão (presidente, vice-presidente, finalidade) |
| `senado_membros_comissao` | Lista membros da comissão com seus cargos |
| `senado_reunioes_comissao` | Lista reuniões da comissão com pauta |

### Agenda

| Ferramenta | Descrição |
|------|-------------|
| `senado_agenda_plenario` | Agenda das sessões do plenário com pauta de votação |
| `senado_agenda_comissoes` | Agenda de reuniões das comissões |

### Auxiliares

| Ferramenta | Descrição |
|------|-------------|
| `senado_legislatura_atual` | Informações da legislatura atual (número, período, datas) |
| `senado_tipos_materia` | Lista os tipos válidos de matéria (PEC, PL, PLP, MPV, etc.) |
| `senado_partidos` | Lista partidos com a contagem de senadores |
| `senado_ufs` | Lista UFs com a contagem de senadores |

### e-Cidadania (participação cidadã)

Ferramentas para acessar os dados do e-Cidadania — a plataforma de participação cidadã do Senado.

#### Consultas públicas

| Ferramenta | Descrição |
|------|-------------|
| `senado_ecidadania_listar_consultas` | Lista consultas públicas com votação cidadã sobre matérias em tramitação |
| `senado_ecidadania_obter_consulta` | Detalhes de uma consulta, incluindo votos, autor e comentários |
| `senado_ecidadania_consultas_polarizadas` | Consultas polarizadas (votos ~50/50) - úteis para identificar temas divisivos |
| `senado_ecidadania_consultas_consensuais` | Consultas consensuais (>85% em uma direção) - identificam amplo acordo |

#### Ideias legislativas

| Ferramenta | Descrição |
|------|-------------|
| `senado_ecidadania_listar_ideias` | Lista ideias legislativas propostas por cidadãos |
| `senado_ecidadania_obter_ideia` | Detalhes de uma ideia, incluindo descrição completa e conversão em projeto |
| `senado_ecidadania_ideias_populares` | Ideias legislativas mais apoiadas |

#### Eventos interativos

| Ferramenta | Descrição |
|------|-------------|
| `senado_ecidadania_listar_eventos` | Lista eventos interativos (audiências, sabatinas, lives) |
| `senado_ecidadania_obter_evento` | Detalhes de um evento, incluindo pauta, convidados e link de vídeo |
| `senado_ecidadania_eventos_populares` | Eventos com mais comentários e perguntas de cidadãos |

#### Ferramentas de análise

| Ferramenta | Descrição |
|------|-------------|
| `senado_ecidadania_sugerir_tema_enquete` | Análise assistida por IA para sugerir temas de enquetes mensais a partir de métricas de participação |

> **Nota:** as ferramentas do e-Cidadania usam web scraping com rate limiting e cache. Se o site do e-Cidadania estiver temporariamente indisponível, as ferramentas de API (senadores, matérias, votações) continuam funcionando.

## Exemplos de uso

### Listar senadores de São Paulo

```
Use senado_listar_senadores com uf: "SP"
```

### Buscar Propostas de Emenda à Constituição de 2024

```
Use senado_buscar_materias com sigla: "PEC", ano: 2024
```

### Votações recentes

```
Use senado_votacoes_recentes com dias: 7
```

### Encontrar um senador pelo nome

```
Use senado_buscar_senador_por_nome com nome: "Randolfe"
```

### Membros da comissão CCJ

```
Use senado_membros_comissao com sigla: "CCJ"
```

### Consultas públicas polarizadas

```
Use senado_ecidadania_consultas_polarizadas com minimoVotos: 5000
```

### Ideias de cidadãos mais apoiadas

```
Use senado_ecidadania_ideias_populares com limite: 5
```

### Próximos eventos interativos

```
Use senado_ecidadania_listar_eventos com status: "agendado"
```

## Formato das respostas

Todas as ferramentas retornam respostas em JSON estruturado:

### Resposta de sucesso

```json
{
  "success": true,
  "data": { ... },
  "metadata": {
    "fonte": "Senado Federal - Dados Abertos",
    "dataConsulta": "2024-01-15T10:30:00Z",
    "endpoint": "/senador/lista/atual"
  }
}
```

### Resposta de erro

```json
{
  "success": false,
  "error": {
    "code": "SENADOR_NAO_ENCONTRADO",
    "message": "Senator with code 99999 was not found",
    "suggestion": "Use senado_buscar_senador_por_nome to find the correct code"
  }
}
```

## Desenvolvimento

### Pré-requisitos

- Node.js 18+
- npm

### Configuração

```bash
npm install
```

### Build

```bash
# Build da versão stdio (pacote npm)
npm run build

# Build da versão servidor HTTP
npm run build:server

# Build de ambos
npm run build:all
```

### Modo de desenvolvimento

```bash
# modo stdio
npm run dev

# modo servidor HTTP
npm run dev:server
```

### Type check

```bash
npm run typecheck
```

### Testar com o MCP Inspector

```bash
npm run inspect
```

---

## Auto-hospedando o servidor HTTP

Você pode hospedar a sua própria instância do servidor HTTP.

### Local

```bash
npm run build:server
npm run start:server
# O servidor roda em http://localhost:3000
```

### Railway

1. Faça um fork deste repositório
2. Conecte o Railway ao seu GitHub
3. Faça o deploy (detecta a configuração automaticamente do `railway.json`)
4. Defina as variáveis de ambiente:
   - `MONTHLY_REQUEST_LIMIT` (padrão: 10000)
   - `ALERT_WEBHOOK_URL` (opcional, para notificações)

### Variáveis de ambiente

| Variável | Descrição | Padrão |
|----------|-------------|---------|
| `PORT` | Porta do servidor | 3000 |
| `MONTHLY_REQUEST_LIMIT` | Limite mensal de requisições | 10000 |
| `ALERT_WEBHOOK_URL` | Webhook para alertas | - |
| `LOG_LEVEL` | Nível de log | info |

## Fontes de dados

### API oficial
- **API**: [Senado Federal - Dados Abertos](https://legis.senado.leg.br/dadosabertos)
- **Documentação**: https://legis.senado.leg.br/dadosabertos/docs/
- **Formato**: JSON
- **Autenticação**: Nenhuma (dados públicos)

### e-Cidadania (web scraping)
- **Site**: [e-Cidadania](https://www12.senado.leg.br/ecidadania)
- **Conteúdo**: Consultas públicas, ideias legislativas, eventos interativos
- **Método**: Scraping de HTML com rate limiting (1 req/s) e cache (15min-24h)
- **Fallback**: Se o e-Cidadania estiver indisponível, as ferramentas de API continuam funcionando

## Tipos de matéria

| Código | Nome | Descrição |
|------|------|-------------|
| PEC | Proposta de Emenda à Constituição | Emenda constitucional |
| PL | Projeto de Lei | Projeto de lei ordinária |
| PLP | Projeto de Lei Complementar | Projeto de lei complementar |
| MPV | Medida Provisória | Medida provisória |
| PDL | Projeto de Decreto Legislativo | Projeto de decreto legislativo |
| PRS | Projeto de Resolução do Senado | Projeto de resolução do Senado |
| PLC | Projeto de Lei da Câmara | Projeto de lei vindo da Câmara |

## Licença

MIT

## Autor

Sidney da Silva Pereira Bissoli

## Repositório

https://github.com/SidneyBissoli/senado-br-mcp

## Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para enviar um Pull Request.

## Changelog

### 1.1.0

- Adicionada a integração com o e-Cidadania (11 novas ferramentas)
- Infraestrutura de web scraping com rate limiting e cache
- Análise de consultas públicas (polarizadas/consensuais)
- Acompanhamento de ideias legislativas
- Monitoramento de eventos interativos
- Ferramenta de sugestão de temas para enquetes

### 1.0.0

- Lançamento inicial
- 22 ferramentas para acesso a dados do Senado
- Senadores, matérias, votações, comissões, agenda e ferramentas auxiliares
