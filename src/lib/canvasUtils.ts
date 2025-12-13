// Canvas Utilities for Thumbnail Generation and Export
// Works with Konva Stage to generate thumbnails and export images

import Konva from 'konva';

export interface ThumbnailOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number; // 0-1 for JPEG
    format?: 'png' | 'jpeg';
}

const DEFAULT_THUMBNAIL_OPTIONS: ThumbnailOptions = {
    maxWidth: 300,
    maxHeight: 450,
    quality: 0.9,
    format: 'png',
};

/**
 * Generate a thumbnail from a Konva Stage
 * @param stage Konva Stage reference
 * @param options Thumbnail generation options
 * @returns Base64 data URL of the thumbnail
 */
export function generateThumbnail(
    stage: Konva.Stage,
    options: ThumbnailOptions = {}
): string | null {
    try {
        const opts = { ...DEFAULT_THUMBNAIL_OPTIONS, ...options };

        // Get original dimensions
        const originalWidth = stage.width();
        const originalHeight = stage.height();

        // Calculate scale to fit thumbnail dimensions
        const scaleX = (opts.maxWidth || 300) / originalWidth;
        const scaleY = (opts.maxHeight || 450) / originalHeight;
        const scale = Math.min(scaleX, scaleY);

        // Calculate pixel ratio for quality (use lower for thumbnails)
        const pixelRatio = Math.min(scale * 2, 1); // Cap at 1 for thumbnails

        // Generate data URL
        const mimeType = opts.format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const dataUrl = stage.toDataURL({
            mimeType,
            quality: opts.quality,
            pixelRatio,
        });

        return dataUrl;
    } catch (error) {
        console.error('Error generating thumbnail:', error);
        return null;
    }
}

/**
 * Generate a full-size export from a Konva Stage
 * @param stage Konva Stage reference
 * @param pixelRatio Pixel ratio for export quality (default: 2 for retina)
 * @returns Base64 data URL of the export
 */
export function generateExport(
    stage: Konva.Stage,
    pixelRatio: number = 2
): string | null {
    try {
        const dataUrl = stage.toDataURL({
            mimeType: 'image/png',
            pixelRatio,
        });

        return dataUrl;
    } catch (error) {
        console.error('Error generating export:', error);
        return null;
    }
}

/**
 * Convert a data URL to a Blob
 * @param dataUrl Base64 data URL
 * @returns Blob or null on error
 */
export function dataUrlToBlob(dataUrl: string): Blob | null {
    try {
        const parts = dataUrl.split(',');
        if (parts.length !== 2) {
            return null;
        }

        const mimeMatch = parts[0].match(/:(.*?);/);
        if (!mimeMatch) {
            return null;
        }

        const mime = mimeMatch[1];
        const binaryString = atob(parts[1]);
        const bytes = new Uint8Array(binaryString.length);

        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        return new Blob([bytes], { type: mime });
    } catch (error) {
        console.error('Error converting data URL to blob:', error);
        return null;
    }
}

/**
 * Extract base64 data from a data URL (removes the prefix)
 * @param dataUrl Full data URL
 * @returns Base64 string or null on error
 */
export function extractBase64(dataUrl: string): string | null {
    try {
        const parts = dataUrl.split(',');
        return parts.length === 2 ? parts[1] : null;
    } catch (error) {
        console.error('Error extracting base64:', error);
        return null;
    }
}

/**
 * Upload thumbnail to server via API
 * @param templateId Template ID
 * @param userId User ID
 * @param dataUrl Base64 data URL of the thumbnail
 * @returns URL of uploaded thumbnail or null on error
 */
export async function uploadThumbnail(
    templateId: string,
    userId: string,
    dataUrl: string
): Promise<string | null> {
    try {
        const response = await fetch('/api/upload-thumbnail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                templateId,
                userId,
                imageData: dataUrl,
            }),
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Upload failed:', error);
            return null;
        }

        const result = await response.json();
        return result.url;
    } catch (error) {
        console.error('Error uploading thumbnail:', error);
        return null;
    }
}

/**
 * Delete template assets from server
 * @param templateId Template ID
 * @param userId User ID
 * @returns true on success, false on error
 */
export async function deleteTemplateAssets(
    templateId: string,
    userId: string
): Promise<boolean> {
    try {
        const response = await fetch('/api/delete-assets', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'thumbnail',
                userId,
                templateId,
            }),
        });

        return response.ok;
    } catch (error) {
        console.error('Error deleting template assets:', error);
        return false;
    }
}
