# Publishing Guide

Instructions to publish senado-br-mcp to all platforms.

## Pre-requisites

1. Ensure build is successful:
```bash
npm run build
npm run typecheck
```

2. Test locally:
```bash
npm run inspect
```

---

## 1. GitHub Repository

### Create Repository

1. Go to https://github.com/new
2. Repository name: `senado-br-mcp`
3. Description: `MCP server for Brazilian Federal Senate open data (legislators, bills, votes, committees)`
4. Public repository
5. Don't initialize with README (we already have one)

### Push Code

```bash
cd senado-br-mcp

# Initialize git
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial release v1.0.0

- 22 tools for accessing Brazilian Senate data
- Senators, bills, votes, committees, agenda
- Full TypeScript support
- Comprehensive documentation"

# Add remote
git remote add origin https://github.com/SidneyBissoli/senado-br-mcp.git

# Push
git branch -M main
git push -u origin main
```

### Create Release

1. Go to https://github.com/SidneyBissoli/senado-br-mcp/releases/new
2. Tag: `v1.0.0`
3. Title: `v1.0.0 - Initial Release`
4. Description:
```markdown
## Features

- 22 tools for accessing Brazilian Federal Senate open data
- Real-time data from official API
- TypeScript with full type safety

### Tools

**Senators (4):** listar, obter, buscar por nome, votações
**Bills (5):** buscar, obter, tramitação, textos, votos
**Votes (3):** listar, obter, recentes
**Committees (4):** listar, obter, membros, reuniões
**Agenda (2):** plenário, comissões
**Lookup (4):** legislatura atual, tipos matéria, partidos, UFs

## Installation

```bash
npx senado-br-mcp
```
```

---

## 2. npm Registry

### Login to npm

```bash
npm login
# Enter your npm username, password, and email
```

### Publish

```bash
# Dry run first (check what will be published)
npm publish --dry-run

# Publish
npm publish --access public
```

### Verify

After publishing, verify at:
- https://www.npmjs.com/package/senado-br-mcp

---

## 3. MCP Registry (Official Anthropic)

The official MCP registry is at: https://github.com/modelcontextprotocol/servers

### Steps

1. Fork the repository: https://github.com/modelcontextprotocol/servers/fork

2. Clone your fork:
```bash
git clone https://github.com/SidneyBissoli/servers.git
cd servers
```

3. Add entry to the registry (check current format in the repo)

4. Create Pull Request:
   - Title: `Add senado-br-mcp - Brazilian Federal Senate data`
   - Description:
```markdown
## New Server: senado-br-mcp

**Description:** MCP server for Brazilian Federal Senate open data (legislators, bills, votes, committees)

**Repository:** https://github.com/SidneyBissoli/senado-br-mcp

**npm:** https://www.npmjs.com/package/senado-br-mcp

### Features
- 22 tools for accessing Senate data
- Real-time data from official API
- TypeScript with full type safety

### Categories
- Government
- Open Data
- Brazil
```

---

## 4. Glama.ai

URL: https://glama.ai

### Steps

1. Go to https://glama.ai
2. Sign in with your account (Sidney is already "Author verified")
3. Click "Submit MCP" or similar
4. Fill the form:
   - **Name:** senado-br-mcp
   - **Description:** MCP server for Brazilian Federal Senate open data (legislators, bills, votes, committees)
   - **Repository:** https://github.com/SidneyBissoli/senado-br-mcp
   - **npm:** senado-br-mcp
   - **Categories:** Government, Open Data, Brazil, Legislative

---

## 5. mcpservers.org

URL: https://mcpservers.org

### Steps

1. Go to https://mcpservers.org
2. Look for "Submit" or "Add Server" option
3. Fill the form with:
   - **Name:** senado-br-mcp
   - **Description:** MCP server for Brazilian Federal Senate open data
   - **GitHub:** https://github.com/SidneyBissoli/senado-br-mcp
   - **npm:** senado-br-mcp
   - **Author:** Sidney da Silva Pereira Bissoli

Or submit via their GitHub repository if they accept PRs.

---

## Checklist

- [ ] GitHub repository created
- [ ] Initial commit pushed
- [ ] GitHub release v1.0.0 created
- [ ] Published to npm
- [ ] Submitted to MCP Registry (PR)
- [ ] Submitted to Glama.ai
- [ ] Submitted to mcpservers.org

---

## After Publishing

### Test npm installation

```bash
# In a different directory
npx senado-br-mcp
```

### Update Claude Desktop config

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

### Monitor

- npm downloads: https://www.npmjs.com/package/senado-br-mcp
- GitHub stars/issues: https://github.com/SidneyBissoli/senado-br-mcp
