#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { logger } from './utils/logger.js';
import { registerSenadoresTools } from './tools/senadores.js';
import { registerMateriasTools } from './tools/materias.js';
import { registerVotacoesTools } from './tools/votacoes.js';
import { registerComissoesTools } from './tools/comissoes.js';
import { registerAgendaTools } from './tools/agenda.js';
import { registerAuxiliaresTools } from './tools/auxiliares.js';
import { registerEcidadaniaTools } from './tools/ecidadania/index.js';

const server = new McpServer({
  name: 'senado-br-mcp',
  version: '1.0.0',
});

// Register all tools
registerSenadoresTools(server);
registerMateriasTools(server);
registerVotacoesTools(server);
registerComissoesTools(server);
registerAgendaTools(server);
registerAuxiliaresTools(server);
registerEcidadaniaTools(server);

async function main() {
  logger.info('Starting senado-br-mcp server...');

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('senado-br-mcp server connected via stdio');
}

main().catch((error) => {
  logger.error({ error }, 'Fatal error starting server');
  process.exit(1);
});
