# senado-br-mcp

MCP server for Brazilian Federal Senate open data (legislators, bills, votes, committees).

Servidor MCP (Model Context Protocol) que permite acesso estruturado aos dados abertos do Senado Federal do Brasil, democratizando o acesso a informações legislativas através de conversas com IA.

## Features

- **33 tools** for accessing Senate data
- Real-time data from official API
- **e-Cidadania integration**: citizen participation data via web scraping
- Structured JSON responses
- Error handling with actionable suggestions
- TypeScript with full type safety
- **Two access modes:** stdio (npm) and HTTP remote

## Two Ways to Use

| Mode | Installation | Best For |
|------|--------------|----------|
| **stdio/npm** | `npx senado-br-mcp` | Technical users, local usage |
| **HTTP remote** | None required | Non-technical users, cloud access |

Both modes provide access to the same 33 tools.

---

## Option 1: stdio/npm (Local)

### Installation

**Using npx (Recommended):**
```bash
npx senado-br-mcp
```

**Global Installation:**
```bash
npm install -g senado-br-mcp
senado-br-mcp
```

**From Source:**
```bash
git clone https://github.com/SidneyBissoli/senado-br-mcp.git
cd senado-br-mcp
npm install
npm run build
npm start
```

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

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

## Option 2: HTTP Remote (Cloud)

No installation required. Connect directly via URL.

### Claude Desktop Configuration

In Claude Desktop settings, go to **"Add Custom Connector"** and enter:

- **Name:** senado-br-mcp
- **URL:** `https://senado-br-mcp.up.railway.app/mcp`

### Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /` | Server info and documentation |
| `GET /health` | Health check |
| `GET /stats` | Usage statistics |
| `POST /mcp` | MCP protocol endpoint |

### Rate Limiting

The HTTP server has a monthly request limit to stay within free tier:
- Alerts are sent at 50%, 80%, and 100% usage
- When limit is reached, use the npm version instead
- Limit resets on the 1st of each month

## Available Tools

### Senators (Senadores)

| Tool | Description |
|------|-------------|
| `senado_listar_senadores` | List senators in office or by legislature. Filters: state (UF), party |
| `senado_obter_senador` | Get detailed info about a senator (biography, mandates, committees) |
| `senado_buscar_senador_por_nome` | Search senators by name |
| `senado_votacoes_senador` | List how a senator voted. Filters: year, date range |

### Legislative Matters (Matérias)

| Tool | Description |
|------|-------------|
| `senado_buscar_materias` | Search bills by type (PEC, PL, PLP, MPV), number, year, keyword, author |
| `senado_obter_materia` | Get bill details (summary, author, status, rapporteur) |
| `senado_tramitacao_materia` | Get bill's procedural history |
| `senado_textos_materia` | Get bill texts (original, substitute, final) with download URLs |
| `senado_votos_materia` | Get voting results for a bill |

### Votes (Votações)

| Tool | Description |
|------|-------------|
| `senado_listar_votacoes` | List plenary votes by year. Filters: month, date range |
| `senado_obter_votacao` | Get vote details with nominal votes by senator |
| `senado_votacoes_recentes` | Get recent votes (last N days) |

### Committees (Comissões)

| Tool | Description |
|------|-------------|
| `senado_listar_comissoes` | List committees. Filters: type (permanent, temporary, CPI), active |
| `senado_obter_comissao` | Get committee details (president, vice-president, purpose) |
| `senado_membros_comissao` | List committee members with roles |
| `senado_reunioes_comissao` | List committee meetings with agenda |

### Agenda

| Tool | Description |
|------|-------------|
| `senado_agenda_plenario` | Get plenary session schedule with voting agenda |
| `senado_agenda_comissoes` | Get committee meeting schedule |

### Lookup/Auxiliary (Auxiliares)

| Tool | Description |
|------|-------------|
| `senado_legislatura_atual` | Get current legislature info (number, period, dates) |
| `senado_tipos_materia` | List valid bill types (PEC, PL, PLP, MPV, etc.) |
| `senado_partidos` | List parties with senator count |
| `senado_ufs` | List states with senator count |

### e-Cidadania (Citizen Participation)

Tools for accessing e-Cidadania data - the Senate's citizen participation platform.

#### Public Consultations (Consultas Públicas)

| Tool | Description |
|------|-------------|
| `senado_ecidadania_listar_consultas` | List public consultations with citizen voting on pending bills |
| `senado_ecidadania_obter_consulta` | Get consultation details including votes, author, and comments |
| `senado_ecidadania_consultas_polarizadas` | Get polarized consultations (~50/50 votes) - useful for identifying divisive issues |
| `senado_ecidadania_consultas_consensuais` | Get consensual consultations (>85% one way) - identifies broad agreement |

#### Legislative Ideas (Ideias Legislativas)

| Tool | Description |
|------|-------------|
| `senado_ecidadania_listar_ideias` | List citizen-proposed legislative ideas |
| `senado_ecidadania_obter_ideia` | Get idea details including full description and conversion to bill |
| `senado_ecidadania_ideias_populares` | Get most supported legislative ideas |

#### Interactive Events (Eventos Interativos)

| Tool | Description |
|------|-------------|
| `senado_ecidadania_listar_eventos` | List interactive events (hearings, confirmations, livestreams) |
| `senado_ecidadania_obter_evento` | Get event details including agenda, guests, and video link |
| `senado_ecidadania_eventos_populares` | Get events with most citizen comments and questions |

#### Analysis Tools

| Tool | Description |
|------|-------------|
| `senado_ecidadania_sugerir_tema_enquete` | AI-assisted analysis to suggest topics for monthly surveys based on participation metrics |

> **Note:** e-Cidadania tools use web scraping with rate limiting and caching. If the e-Cidadania website is temporarily unavailable, API tools (senators, bills, votes) remain operational.

## Usage Examples

### List senators from São Paulo

```
Use senado_listar_senadores with uf: "SP"
```

### Search for Constitutional Amendments in 2024

```
Use senado_buscar_materias with sigla: "PEC", ano: 2024
```

### Get recent votes

```
Use senado_votacoes_recentes with dias: 7
```

### Find a senator by name

```
Use senado_buscar_senador_por_nome with nome: "Randolfe"
```

### Get CCJ committee members

```
Use senado_membros_comissao with sigla: "CCJ"
```

### Get polarized public consultations

```
Use senado_ecidadania_consultas_polarizadas with minimoVotos: 5000
```

### Get most supported citizen ideas

```
Use senado_ecidadania_ideias_populares with limite: 5
```

### Find upcoming interactive events

```
Use senado_ecidadania_listar_eventos with status: "agendado"
```

## Response Format

All tools return structured JSON responses:

### Success Response

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

### Error Response

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

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build

```bash
# Build stdio version (npm package)
npm run build

# Build HTTP server version
npm run build:server

# Build both
npm run build:all
```

### Development Mode

```bash
# stdio mode
npm run dev

# HTTP server mode
npm run dev:server
```

### Type Check

```bash
npm run typecheck
```

### Test with MCP Inspector

```bash
npm run inspect
```

---

## Self-Hosting HTTP Server

You can host your own HTTP server instance.

### Local

```bash
npm run build:server
npm run start:server
# Server runs on http://localhost:3000
```

### Railway

1. Fork this repository
2. Connect Railway to your GitHub
3. Deploy (auto-detects configuration from `railway.json`)
4. Set environment variables:
   - `MONTHLY_REQUEST_LIMIT` (default: 10000)
   - `ALERT_WEBHOOK_URL` (optional, for notifications)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `MONTHLY_REQUEST_LIMIT` | Monthly request limit | 10000 |
| `ALERT_WEBHOOK_URL` | Webhook for alerts | - |
| `LOG_LEVEL` | Logging level | info |

## Data Sources

### Official API
- **API**: [Senado Federal - Dados Abertos](https://legis.senado.leg.br/dadosabertos)
- **Documentation**: https://legis.senado.leg.br/dadosabertos/docs/
- **Format**: JSON
- **Authentication**: None (public data)

### e-Cidadania (Web Scraping)
- **Website**: [e-Cidadania](https://www12.senado.leg.br/ecidadania)
- **Content**: Public consultations, legislative ideas, interactive events
- **Method**: HTML scraping with rate limiting (1 req/sec) and caching (15min-24h)
- **Fallback**: If e-Cidadania is unavailable, API tools continue working

## Bill Types (Tipos de Matéria)

| Code | Name | Description |
|------|------|-------------|
| PEC | Proposta de Emenda à Constituição | Constitutional Amendment |
| PL | Projeto de Lei | Ordinary Law Bill |
| PLP | Projeto de Lei Complementar | Complementary Law Bill |
| MPV | Medida Provisória | Provisional Measure |
| PDL | Projeto de Decreto Legislativo | Legislative Decree Bill |
| PRS | Projeto de Resolução do Senado | Senate Resolution Bill |
| PLC | Projeto de Lei da Câmara | Chamber of Deputies Bill |

## License

MIT

## Author

Sidney da Silva Pereira Bissoli

## Repository

https://github.com/SidneyBissoli/senado-br-mcp

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

### 1.1.0

- Added e-Cidadania integration (11 new tools)
- Web scraping infrastructure with rate limiting and caching
- Public consultations analysis (polarized/consensual)
- Legislative ideas tracking
- Interactive events monitoring
- Survey topic suggestion tool

### 1.0.0

- Initial release
- 22 tools for Senate data access
- Senators, bills, votes, committees, agenda, and lookup tools
