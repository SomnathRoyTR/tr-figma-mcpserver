#!/usr/bin/env node
/**
 * Express Server Entry Point
 * Sets up HTTP server with health check and MCP stdio transport
 */

import express from 'express';
import cors from 'cors';
import { createMCPServer } from './server.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint (Azure uses this to verify app is running)
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'tr-figma-mcpserver',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'tr-figma-mcpserver',
    version: '1.0.0',
    description: 'MCP server for downloading Figma images',
    endpoints: {
      health: '/health',
      mcp: '/mcp (SSE endpoint for MCP clients)',
      info: '/',
    },
    usage: 'Configure your MCP client to use: https://tr-figma-mcpserver-gsakbybcgegzdkc4.centralus-01.azurewebsites.net/mcp',
    documentation: 'https://github.com/your-org/tr-figma-mcpserver',
  });
});

// MCP SSE endpoint for remote access
app.get('/mcp', async (req, res) => {
  console.log('MCP client connected via SSE');

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Keep connection alive
  const keepAlive = setInterval(() => {
    res.write(':keepalive\n\n');
  }, 30000);

  // Handle client disconnect
  req.on('close', () => {
    console.log('MCP client disconnected');
    clearInterval(keepAlive);
  });

  try {
    const mcpServer = createMCPServer();
    const { SSEServerTransport } = await import('@modelcontextprotocol/sdk/server/sse.js');
    const transport = new SSEServerTransport('/message', res);

    await mcpServer.connect(transport);
    console.log('MCP server connected via SSE transport');
  } catch (error) {
    console.error('Failed to initialize MCP over SSE:', error);
    clearInterval(keepAlive);
    res.end();
  }
});

// Handle MCP messages via POST
app.post('/message', express.json(), async (req, res) => {
  console.log('Received MCP message:', req.body);
  res.json({ status: 'received' });
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`tr-figma-mcpserver listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// For local stdio-based MCP communication (used in development)
// When run via MCP client, this will handle stdio transport
if (process.env.MCP_STDIO === 'true' || !process.env.PORT) {
  console.log('Starting MCP server with stdio transport...');
  const mcpServer = createMCPServer();
  const transport = new StdioServerTransport();

  mcpServer.connect(transport).then(() => {
    console.log('MCP server connected via stdio');
  }).catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
