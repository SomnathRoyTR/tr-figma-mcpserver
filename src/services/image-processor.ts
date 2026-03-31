/**
 * Image Processor Service
 * Downloads images from URLs and converts to Base64 encoding
 */

import type { ImageData } from '../types/figma.js';

export class ImageProcessorService {
  private readonly timeout: number;

  constructor(timeoutMs: number = 30000) {
    this.timeout = timeoutMs;
  }

  /**
   * Download image from URL and return Base64 encoded data
   * @param imageUrl - URL of the image to download
   * @param nodeId - Figma node ID for reference
   */
  async downloadAndEncode(imageUrl: string, nodeId: string): Promise<ImageData> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(imageUrl, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to download image: HTTP ${response.status}`);
      }

      // Get image data as buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Convert to Base64
      const base64Data = buffer.toString('base64');

      // Determine MIME type from URL or response headers
      const mimeType = this.getMimeType(imageUrl, response.headers.get('content-type'));

      return {
        nodeId,
        base64Data,
        mimeType,
        size: buffer.length,
        url: imageUrl,
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Image download timed out after ${this.timeout}ms`);
        }
        throw new Error(`Failed to download image: ${error.message}`);
      }
      throw new Error('Failed to download image');
    }
  }

  /**
   * Download multiple images in parallel
   * @param imageUrls - Map of node IDs to image URLs
   */
  async downloadBatch(imageUrls: Record<string, string>): Promise<Map<string, ImageData>> {
    const entries = Object.entries(imageUrls);
    const results = new Map<string, ImageData>();

    // Download all images in parallel
    const promises = entries.map(async ([nodeId, url]) => {
      try {
        const imageData = await this.downloadAndEncode(url, nodeId);
        results.set(nodeId, imageData);
      } catch (error) {
        // Log error but continue with other downloads
        console.error(`Failed to download image for node ${nodeId}:`, error);
        throw error; // Re-throw to be caught by Promise.allSettled
      }
    });

    const settled = await Promise.allSettled(promises);

    // Check if any downloads failed
    const failures = settled.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      const failedNodes = entries
        .filter((_, index) => settled[index].status === 'rejected')
        .map(([nodeId]) => nodeId);

      throw new Error(`Failed to download images for nodes: ${failedNodes.join(', ')}`);
    }

    return results;
  }

  /**
   * Determine MIME type from URL or Content-Type header
   */
  private getMimeType(url: string, contentType: string | null): string {
    // Try content type header first
    if (contentType) {
      return contentType.split(';')[0].trim();
    }

    // Fallback to URL extension
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.png')) return 'image/png';
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'image/jpeg';
    if (urlLower.includes('.svg')) return 'image/svg+xml';
    if (urlLower.includes('.pdf')) return 'application/pdf';

    // Default to PNG
    return 'image/png';
  }
}
