/**
 * MCP Tool: download_figma_images
 * Downloads images from Figma designs and returns them as Base64-encoded resources
 */

import { z } from 'zod';
import { FigmaApiService } from '../services/figma-api.js';
import { ImageProcessorService } from '../services/image-processor.js';

/**
 * Input schema for download_figma_images tool
 */
export const DownloadImageSchema = z.object({
  figmaAccessToken: z.string().describe(
    'Figma personal access token (get from https://www.figma.com/settings)'
  ),
  figmaUrl: z.string().describe(
    'Figma file URL (supports /file/ and /design/ paths)'
  ),
  nodeIds: z.array(z.string()).optional().describe(
    'Specific node IDs to export. If omitted and URL has node-id, uses that node'
  ),
  format: z.enum(['png', 'jpg', 'svg', 'pdf']).default('png').describe(
    'Image export format'
  ),
  scale: z.number().min(0.01).max(4).default(1).describe(
    'Scale factor for raster images (0.01 to 4)'
  ),
});

export type DownloadImageInput = z.infer<typeof DownloadImageSchema>;

/**
 * Execute the download_figma_images tool
 */
export async function downloadFigmaImages(input: DownloadImageInput) {
  const { figmaAccessToken, figmaUrl, nodeIds, format, scale } = input;

  try {
    // Initialize services
    const figmaApi = new FigmaApiService(figmaAccessToken);
    const imageProcessor = new ImageProcessorService();

    // Parse Figma URL
    const parsed = figmaApi.parseFigmaUrl(figmaUrl);

    // Determine which nodes to export
    let targetNodeIds: string[];
    if (nodeIds && nodeIds.length > 0) {
      // Use provided node IDs
      targetNodeIds = nodeIds;
    } else if (parsed.nodeId) {
      // Use node ID from URL
      targetNodeIds = [parsed.nodeId];
    } else {
      return {
        content: [
          {
            type: 'text',
            text: 'Error: No node IDs specified. Either provide nodeIds parameter or include node-id in the Figma URL.',
          },
        ],
        isError: true,
      };
    }

    // Get image URLs from Figma API
    const imageUrls = await figmaApi.getImageUrls({
      fileId: parsed.fileId,
      nodeIds: targetNodeIds,
      format,
      scale,
    });

    // Check if we got any images
    const urlCount = Object.keys(imageUrls).length;
    if (urlCount === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No images returned from Figma API. The specified nodes may not be exportable.',
          },
        ],
        isError: true,
      };
    }

    // Download and encode images
    const images = await imageProcessor.downloadBatch(imageUrls);

    // Build response content
    const content: any[] = [
      {
        type: 'text',
        text: `Downloaded ${images.size} image${images.size !== 1 ? 's' : ''} from Figma file${parsed.fileName ? `: ${parsed.fileName}` : ''}`,
      },
    ];

    // Add each image as a resource
    for (const [nodeId, imageData] of images.entries()) {
      content.push({
        type: 'resource',
        resource: {
          uri: `data:${imageData.mimeType};base64,${imageData.base64Data}`,
          mimeType: imageData.mimeType,
          text: `Node ${nodeId} (${(imageData.size / 1024).toFixed(2)} KB)`,
        },
      });
    }

    return { content };
  } catch (error) {
    // Handle errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
