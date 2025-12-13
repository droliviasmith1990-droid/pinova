// S3 Client for Tebi Storage
// Server-side only - uses environment variables for credentials

import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand
} from '@aws-sdk/client-s3';
import { debugLog, debugError, debugWarn } from '@/lib/utils/debug';

// Environment variables (server-side only)
const TEBI_ACCESS_KEY = process.env.TEBI_ACCESS_KEY;
const TEBI_SECRET_KEY = process.env.TEBI_SECRET_KEY;
const TEBI_ENDPOINT = process.env.TEBI_ENDPOINT || 'https://s3.tebi.io';
const TEBI_BUCKET = process.env.TEBI_BUCKET || 'pinterest-templates';

// Check if Tebi is configured
export const isTebiConfigured = (): boolean => {
    return Boolean(TEBI_ACCESS_KEY && TEBI_SECRET_KEY);
};

// Create S3 client for Tebi
export const createS3Client = (): S3Client | null => {
    if (!isTebiConfigured()) {
        debugWarn('S3', 'Tebi S3 credentials not configured');
        return null;
    }

    let endpoint = TEBI_ENDPOINT;
    if (!endpoint.startsWith('http')) {
        endpoint = `https://${endpoint}`;
    }

    return new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
            accessKeyId: TEBI_ACCESS_KEY!,
            secretAccessKey: TEBI_SECRET_KEY!,
        },
        forcePathStyle: true, // Required for Tebi S3 compatibility
    });
};

// Get bucket name
export const getBucket = (): string => TEBI_BUCKET;

// Get public URL for an object
export const getPublicUrl = (key: string): string => {
    // Tebi public URL format
    return `${TEBI_ENDPOINT}/${TEBI_BUCKET}/${key}`;
};

// ============================================
// S3 Operations
// ============================================

/**
 * Upload a file to S3
 * @param key Object key (path in bucket)
 * @param body File content as Buffer
 * @param contentType MIME type
 * @returns Public URL of uploaded file or null on error
 */
export async function uploadToS3(
    key: string,
    body: Buffer,
    contentType: string
): Promise<string | null> {
    debugLog('S3', 'uploadToS3 called with key:', key);

    const s3Client = createS3Client();
    if (!s3Client) {
        debugError('S3', 'Failed to create S3 client');
        return null;
    }

    try {
        debugLog('S3', 'Uploading to bucket:', getBucket());
        const command = new PutObjectCommand({
            Bucket: getBucket(),
            Key: key,
            Body: body,
            ContentType: contentType,
            ACL: 'public-read', // Make the file publicly accessible
        });

        await s3Client.send(command);
        const url = getPublicUrl(key);
        debugLog('S3', 'Upload successful, URL:', url);
        return url;
    } catch (error) {
        debugError('S3', 'Error uploading to S3:', error);
        debugError('S3', 'Error details:', error instanceof Error ? error.message : 'Unknown error');
        return null;
    }
}

/**
 * Delete a file from S3
 * @param key Object key to delete
 * @returns true on success, false on error
 */
export async function deleteFromS3(key: string): Promise<boolean> {
    const s3Client = createS3Client();
    if (!s3Client) {
        return false;
    }

    try {
        const command = new DeleteObjectCommand({
            Bucket: getBucket(),
            Key: key,
        });

        await s3Client.send(command);
        return true;
    } catch (error) {
        debugError('S3', 'Error deleting from S3:', error);
        return false;
    }
}

/**
 * Check if a file exists in S3
 * @param key Object key to check
 * @returns true if exists, false otherwise
 */
export async function existsInS3(key: string): Promise<boolean> {
    const s3Client = createS3Client();
    if (!s3Client) {
        return false;
    }

    try {
        const command = new HeadObjectCommand({
            Bucket: getBucket(),
            Key: key,
        });

        await s3Client.send(command);
        return true;
    } catch {
        return false;
    }
}

// ============================================
// Path Helpers
// ============================================

/**
 * Generate S3 key for template thumbnail
 */
export function getThumbnailKey(userId: string, templateId: string): string {
    return `thumbnails/${userId}/${templateId}.png`;
}

/**
 * Generate S3 key for generated pin
 */
export function getPinKey(userId: string, campaignId: string, pinNumber: number): string {
    return `pins/${userId}/${campaignId}/${pinNumber}.png`;
}

/**
 * Generate S3 key prefix for campaign pins folder
 */
export function getCampaignPinsPrefix(userId: string, campaignId: string): string {
    return `pins/${userId}/${campaignId}/`;
}
