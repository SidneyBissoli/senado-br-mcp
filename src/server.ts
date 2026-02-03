#!/usr/bin/env node

import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { logger } from './utils/logger.js';
import { registerSenadoresTools } from './tools/senadores.js';
import { registerMateriasTools } from './tools/materias.js';
import { registerVotacoesTools } from './tools/votacoes.js';
import { registerComissoesTools } from './tools/comissoes.js';
import { registerAgendaTools } from './tools/agenda.js';
import { registerAuxiliaresTools } from './tools/auxiliares.js';
import { registerEcidadaniaTools } from './tools/ecidadania/index.js';
import { checkMonthlyLimit, incrementCounter, getUsageStats } from './middleware/rateLimiter.js';

const PORT = parseInt(process.env.PORT || '3000');

// Create MCP server
function createMcpServer(): McpServer {
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

  return server;
}

// Create Express app
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Usage stats endpoint
app.get('/stats', (_req: Request, res: Response) => {
  const stats = getUsageStats();
  res.json(stats);
});

// MCP endpoint
app.post('/mcp', async (req: Request, res: Response) => {
  try {
    // Check rate limit
    const limitStatus = await checkMonthlyLimit();
    if (limitStatus.exceeded) {
      res.status(429).json({
        error: 'MONTHLY_LIMIT_REACHED',
        message: limitStatus.message,
        alternatives: limitStatus.alternatives,
        resetDate: limitStatus.resetDate
      });
      return;
    }

    // Create new server instance for each request
    const server = createMcpServer();

    // Create transport
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    // Handle close
    res.on('close', () => {
      transport.close();
    });

    // Connect and handle request
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);

    // Increment counter after successful request
    await incrementCounter();

  } catch (error) {
    logger.error({ error }, 'Error handling MCP request');
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    });
  }
});

// Handle MCP GET requests (for SSE)
app.get('/mcp', async (req: Request, res: Response) => {
  try {
    const limitStatus = await checkMonthlyLimit();
    if (limitStatus.exceeded) {
      res.status(429).json({
        error: 'MONTHLY_LIMIT_REACHED',
        message: limitStatus.message,
        alternatives: limitStatus.alternatives,
        resetDate: limitStatus.resetDate
      });
      return;
    }

    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      transport.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res);

  } catch (error) {
    logger.error({ error }, 'Error handling MCP SSE request');
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    });
  }
});

// Handle DELETE for session cleanup
app.delete('/mcp', async (_req: Request, res: Response) => {
  res.status(200).json({ message: 'Session closed' });
});

// Root endpoint with info
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'senado-br-mcp',
    description: 'MCP server for Brazilian Federal Senate open data',
    version: '1.0.0',
    endpoints: {
      mcp: '/mcp',
      health: '/health',
      stats: '/stats'
    },
    documentation: 'https://github.com/SidneyBissoli/senado-br-mcp',
    usage: {
      claude_desktop: {
        url: `https://senado-br-mcp.up.railway.app/mcp`,
        instructions: 'Add as custom connector in Claude Desktop settings'
      },
      npm: {
        command: 'npx senado-br-mcp',
        instructions: 'Add to claude_desktop_config.json'
      }
    }
  });
});

// Start server
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'senado-br-mcp HTTP server started');
  console.log(`🚀 senado-br-mcp server running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   MCP:    http://localhost:${PORT}/mcp`);
  console.log(`   Stats:  http://localhost:${PORT}/stats`);
});
