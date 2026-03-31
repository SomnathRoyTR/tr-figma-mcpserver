/**
 * MCP Server Factory
 * Creates and configures the MCP server with tools
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { DownloadImageSchema, downloadFigmaImages } from './tools/download-image.js';

/**
 * Create and configure MCP server instance
 */
export function createMCPServer(): Server {
  const server = new Server(
    {
      name: 'tr-figma-mcpserver',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register ListTools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'download_figma_images',
        description: 'Download images from Figma designs using access token and file URL. Supports both /file/ and /design/ URL formats with node-id parameters.',
        inputSchema: {
          type: 'object',
          properties: {
            figmaAccessToken: {
              type: 'string',
              description: 'Figma personal access token (optional if FIGMA_ACCESS_TOKEN env var is set). Get from https://www.figma.com/settings',
            },
            figmaUrl: {
              type: 'string',
              description: 'Figma file URL (supports /file/ and /design/ paths)',
            },
            nodeIds: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific node IDs to export. If omitted and URL has node-id, uses that node',
            },
            format: {
              type: 'string',
              enum: ['png', 'jpg', 'svg', 'pdf'],
              default: 'png',
              description: 'Image export format',
            },
            scale: {
              type: 'number',
              minimum: 0.01,
              maximum: 4,
              default: 1,
              description: 'Scale factor for raster images (0.01 to 4)',
            },
          },
          required: ['figmaAccessToken', 'figmaUrl'],
        },
      },
    ],
  }));

  // Register CallTool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'download_figma_images') {
      // Validate input with Zod
      const parseResult = DownloadImageSchema.safeParse(request.params.arguments);

      if (!parseResult.success) {
        return {
          content: [
            {
              type: 'text',
              text: `Invalid parameters: ${parseResult.error.message}`,
            },
          ],
          isError: true,
        };
      }

      // Execute tool
      return await downloadFigmaImages(parseResult.data);
    }

    // Unknown tool
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${request.params.name}`,
        },
      ],
      isError: true,
    };
  });

  return server;
}
