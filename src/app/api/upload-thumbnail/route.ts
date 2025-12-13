// API Route: Upload Template Thumbnail
// POST /api/upload-thumbnail
// Uploads template thumbnail image to Tebi S3
// SECURITY: Uses authenticated session to verify user ownership

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { uploadToS3, getThumbnailKey, isTebiConfigured } from '@/lib/s3';

interface UploadThumbnailRequest {
    templateId: string;
    imageData: string; // Base64 encoded image data
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

export async function POST(request: NextRequest) {
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
        const body: UploadThumbnailRequest = await request.json();
        const { templateId, imageData } = body;

        // Validate required fields
        if (!templateId || !imageData) {
            return NextResponse.json(
                { error: 'Missing required fields: templateId, imageData' },
                { status: 400 }
            );
        }

        // Decode base64 image data
        // Expected format: "data:image/png;base64,..." or just the base64 string
        let base64Data = imageData;
        let contentType = 'image/png';

        if (imageData.startsWith('data:')) {
            const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
            if (matches) {
                contentType = matches[1];
                base64Data = matches[2];
            }
        }

        // Convert base64 to Buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024;
        if (buffer.length > maxSize) {
            return NextResponse.json(
                { error: 'Image too large. Maximum size is 5MB.' },
                { status: 400 }
            );
        }

        // Generate S3 key using authenticated userId
        const key = getThumbnailKey(userId, templateId);

        // Upload to S3
        const url = await uploadToS3(key, buffer, contentType);

        if (!url) {
            return NextResponse.json(
                { error: 'Failed to upload image' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            url,
            key,
        });
    } catch (error) {
        console.error('Error in upload-thumbnail:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
