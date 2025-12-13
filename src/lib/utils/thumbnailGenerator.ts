/**
 * Template Thumbnail Generator
 * Generates thumbnail images from Konva stage for template previews
 */

import Konva from 'konva';
import type { RefObject } from 'react';

export interface ThumbnailOptions {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'png' | 'jpeg';
}

const DEFAULT_OPTIONS: Required<ThumbnailOptions> = {
    width: 200,
    height: 300,
    quality: 0.8,
    format: 'jpeg'
};

/**
 * Generate a thumbnail from a Konva stage
 */
export async function generateTemplateThumbnail(
    stageRef: RefObject<Konva.Stage>,
    options: ThumbnailOptions = {}
): Promise<Blob | null> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (!stageRef.current) {
        console.error('Stage ref is null');
        return null;
    }

    try {
        const stage = stageRef.current;

        // Get the original stage size
        const originalWidth = stage.width();
        const originalHeight = stage.height();

        // Calculate scale to fit thumbnail size while maintaining aspect ratio
        const scale = Math.min(
            opts.width / originalWidth,
            opts.height / originalHeight
        );

        // Generate data URL with scaled dimensions
        const dataURL = stage.toDataURL({
            pixelRatio: scale,
            mimeType: `image/${opts.format}`,
            quality: opts.quality
        });

        // Convert data URL to blob
        const blob = await dataURLToBlob(dataURL);
        return blob;

    } catch (error) {
        console.error('Error generating thumbnail:', error);
        return null;
    }
}

/**
 * Convert data URL to Blob
 */
async function dataURLToBlob(dataURL: string): Promise<Blob> {
    const response = await fetch(dataURL);
    return response.blob();
}

/**
 * Upload thumbnail to S3
 */
export async function uploadThumbnail(
    blob: Blob,
    templateId: string
): Promise<string | null> {
    try {
        const formData = new FormData();
        formData.append('file', blob, `thumbnail-${templateId}.jpg`);
        formData.append('template_id', templateId);

        const response = await fetch('/api/templates/thumbnail', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const data = await response.json();
        return data.url;

    } catch (error) {
        console.error('Error uploading thumbnail:', error);
        return null;
    }
}

/**
 * Generate and upload thumbnail in one call
 */
export async function generateAndUploadThumbnail(
    stageRef: RefObject<Konva.Stage>,
    templateId: string,
    options: ThumbnailOptions = {}
): Promise<string | null> {
    const blob = await generateTemplateThumbnail(stageRef, options);

    if (!blob) {
        return null;
    }

    return uploadThumbnail(blob, templateId);
}
