/**
 * Figma API Service
 * Handles authentication, URL parsing, and API calls to Figma
 */

import type { ParsedFigmaUrl, FigmaImagesResponse, FigmaError } from '../types/figma.js';

export class FigmaApiService {
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(accessToken: string, baseUrl: string = 'https://api.figma.com/v1') {
    this.accessToken = accessToken;
    this.baseUrl = baseUrl;
  }

  /**
   * Parse Figma URL to extract file ID and node ID
   * Supports both /file/ and /design/ URL formats
   * Example: https://www.figma.com/design/WJNNpEsralNcSMptsFbFH9/...?node-id=29302-167474
   */
  parseFigmaUrl(url: string): ParsedFigmaUrl {
    try {
      const urlObj = new URL(url);

      // Match /file/ or /design/ paths
      const pathMatch = urlObj.pathname.match(/\/(file|design)\/([a-zA-Z0-9]+)(?:\/([^/]+))?/);

      if (!pathMatch) {
        throw new Error('Invalid Figma URL format. Expected: https://www.figma.com/file/{fileId} or https://www.figma.com/design/{fileId}');
      }

      const fileId = pathMatch[2];
      const fileName = pathMatch[3];

      // Extract node-id from query parameters
      const nodeIdParam = urlObj.searchParams.get('node-id');
      let nodeId: string | undefined;

      if (nodeIdParam) {
        // Convert hyphen format to colon format for Figma API
        // Example: 29302-167474 -> 29302:167474
        nodeId = nodeIdParam.replace(/-/g, ':');
      }

      return {
        fileId,
        nodeId,
        fileName: fileName ? decodeURIComponent(fileName) : undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse Figma URL: ${error.message}`);
      }
      throw new Error('Failed to parse Figma URL');
    }
  }

  /**
   * Get image export URLs from Figma API
   * @param fileId - Figma file ID
   * @param nodeIds - Array of node IDs (using colon format: "123:456")
   * @param format - Export format (png, jpg, svg, pdf)
   * @param scale - Scale factor for raster images (0.01 to 4)
   */
  async getImageUrls(params: {
    fileId: string;
    nodeIds: string[];
    format?: 'png' | 'jpg' | 'svg' | 'pdf';
    scale?: number;
  }): Promise<Record<string, string>> {
    const { fileId, nodeIds, format = 'png', scale = 1 } = params;

    if (nodeIds.length === 0) {
      throw new Error('At least one node ID is required');
    }

    // Build query parameters
    const queryParams = new URLSearchParams({
      ids: nodeIds.join(','),
      format,
      scale: scale.toString(),
    });

    const url = `${this.baseUrl}/images/${fileId}?${queryParams}`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': this.accessToken,
        },
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data: FigmaImagesResponse = await response.json();

      if (data.err) {
        throw new Error(`Figma API error: ${data.err}`);
      }

      return data.images;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to fetch image URLs from Figma API');
    }
  }

  /**
   * Validate access token by calling /me endpoint
   */
  async validateToken(): Promise<boolean> {
    const url = `${this.baseUrl}/me`;

    try {
      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': this.accessToken,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Handle error responses from Figma API
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;
    let errorMessage = 'Figma API request failed';

    try {
      const data = await response.json();
      if (data.err) {
        errorMessage = data.err;
      }
    } catch {
      errorMessage = await response.text() || errorMessage;
    }

    const error: FigmaError = { status, err: errorMessage };

    switch (status) {
      case 401:
        throw new Error(`Unauthorized: Invalid or expired Figma access token. Get your token at https://www.figma.com/settings`);
      case 403:
        throw new Error(`Forbidden: You don't have access to this Figma file`);
      case 404:
        throw new Error(`Not Found: Figma file or node doesn't exist`);
      case 429:
        throw new Error(`Rate Limited: Too many requests to Figma API. Please try again later`);
      default:
        throw new Error(`Figma API error (${status}): ${errorMessage}`);
    }
  }
}
