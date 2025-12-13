// API Route: Delete Assets
// DELETE /api/delete-assets
// Deletes assets from Tebi S3 (thumbnails, campaign pins)
// SECURITY: Uses authenticated session to verify user ownership

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deleteFromS3, getThumbnailKey, getCampaignPinsPrefix, isTebiConfigured } from '@/lib/s3';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

interface DeleteAssetsRequest {
    type: 'thumbnail' | 'campaign';
    templateId?: string;  // Required for thumbnail
    campaignId?: string;  // Required for campaign
}

// SECURITY: Get authenticated Supabase client using request auth header
function getAuthenticatedSupabase(request: NextRequest) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const authHeader = request.headers.get('Authorization');

    if (!supabaseUrl || !supabaseAnonKey) {
        return null;
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: authHeader || '',
            },
        },
    });
}

// Helper to create S3 client for batch operations
const createS3Client = (): S3Client | null => {
    const accessKey = process.env.TEBI_ACCESS_KEY;
    const secretKey = process.env.TEBI_SECRET_KEY;
    const endpoint = process.env.TEBI_ENDPOINT || 'https://s3.tebi.io';

    if (!accessKey || !secretKey) {
        return null;
    }

    return new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
            accessKeyId: accessKey,
            secretAccessKey: secretKey,
        },
        forcePathStyle: true,
    });
};

// Delete all objects with a given prefix (for campaign folders)
async function deleteObjectsWithPrefix(prefix: string): Promise<boolean> {
    const s3Client = createS3Client();
    if (!s3Client) {
        return false;
    }

    const bucket = process.env.TEBI_BUCKET || 'pinterest-templates';

    try {
        // List all objects with the prefix
        const listCommand = new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: prefix,
        });

        const listResult = await s3Client.send(listCommand);

        if (!listResult.Contents || listResult.Contents.length === 0) {
            return true; // Nothing to delete
        }

        // Delete all objects
        const deleteCommand = new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: {
                Objects: listResult.Contents.map(obj => ({ Key: obj.Key! })),
                Quiet: true,
            },
        });

        await s3Client.send(deleteCommand);
        return true;
    } catch (error) {
        console.error('Error deleting objects with prefix:', error);
        return false;
    }
}

export async function DELETE(request: NextRequest) {
    try {
        // Check if Tebi is configured
        if (!isTebiConfigured()) {
            return NextResponse.json(
                { error: 'Storage not configured' },
                { status: 503 }
            );
        }

        // SECURITY: Verify user session
        const supabase = getAuthenticatedSupabase(request);
        if (!supabase) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 503 }
            );
        }

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // SECURITY: Use authenticated user ID, not client-provided value
        const userId = user.id;

        // Parse request body
        const body: DeleteAssetsRequest = await request.json();
        const { type, templateId, campaignId } = body;

        // Validate required fields
        if (!type) {
            return NextResponse.json(
                { error: 'Missing required field: type' },
                { status: 400 }
            );
        }

        let success = false;

        switch (type) {
            case 'thumbnail':
                if (!templateId) {
                    return NextResponse.json(
                        { error: 'templateId is required for thumbnail deletion' },
                        { status: 400 }
                    );
                }
                const thumbnailKey = getThumbnailKey(userId, templateId);
                success = await deleteFromS3(thumbnailKey);
                break;

            case 'campaign':
                if (!campaignId) {
                    return NextResponse.json(
                        { error: 'campaignId is required for campaign deletion' },
                        { status: 400 }
                    );
                }
                const pinsPrefix = getCampaignPinsPrefix(userId, campaignId);
                success = await deleteObjectsWithPrefix(pinsPrefix);
                break;

            default:
                return NextResponse.json(
                    { error: 'Invalid type. Must be "thumbnail" or "campaign"' },
                    { status: 400 }
                );
        }

        if (!success) {
            return NextResponse.json(
                { error: 'Failed to delete assets' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            type,
        });
    } catch (error) {
        console.error('Error in delete-assets:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
