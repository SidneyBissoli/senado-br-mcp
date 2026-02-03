import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerConsultasTools } from './consultas.js';
import { registerIdeiasTools } from './ideias.js';
import { registerEventosTools } from './eventos.js';
import { registerSugestaoTools } from './sugestao.js';

export function registerEcidadaniaTools(server: McpServer) {
  registerConsultasTools(server);
  registerIdeiasTools(server);
  registerEventosTools(server);
  registerSugestaoTools(server);
}
