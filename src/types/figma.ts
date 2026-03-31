/**
 * TypeScript type definitions for Figma API interactions
 */

/**
 * Figma API response for /images endpoint
 */
export interface FigmaImagesResponse {
  err: string | null;
  images: Record<string, string>; // nodeId -> imageUrl mapping
  status?: number;
}

/**
 * Parsed components from a Figma URL
 */
export interface ParsedFigmaUrl {
  fileId: string;
  nodeId?: string;
  fileName?: string;
}

/**
 * Input parameters for download_figma_images tool
 */
export interface DownloadImageParams {
  figmaAccessToken: string;
  figmaUrl: string;
  nodeIds?: string[];
  format?: 'png' | 'jpg' | 'svg' | 'pdf';
  scale?: number;
}

/**
 * Processed image data with Base64 encoding
 */
export interface ImageData {
  nodeId: string;
  base64Data: string;
  mimeType: string;
  size: number;
  url: string;
}

/**
 * Figma API error response
 */
export interface FigmaError {
  status: number;
  err: string;
}
