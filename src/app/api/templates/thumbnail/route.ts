import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '@/lib/s3';

/**
 * POST /api/templates/thumbnail
 * Upload template thumbnail to S3 storage
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const templateId = formData.get('template_id') as string | null;

        if (!file || !templateId) {
            return NextResponse.json(
                { error: 'File and template_id are required' },
                { status: 400 }
            );
        }

        // Generate unique filename
        const timestamp = Date.now();
        const filename = `templates/${templateId}/thumbnail-${timestamp}.jpg`;

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to S3 using existing utility
        const url = await uploadToS3(filename, buffer, file.type);

        if (!url) {
            throw new Error('S3 upload failed');
        }

        return NextResponse.json({
            url,
            filename: filename
        });

    } catch (error) {
        console.error('Thumbnail upload error:', error);
        return NextResponse.json(
            { error: 'Failed to upload thumbnail' },
            { status: 500 }
        );
    }
}
