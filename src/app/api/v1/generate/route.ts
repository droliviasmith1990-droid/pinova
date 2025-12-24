import { NextRequest, NextResponse } from 'next/server';
import { StaticCanvas } from 'fabric/node';
import { v4 as uuidv4 } from 'uuid';
import { Element } from '@/types/editor';
import { renderTemplateServer, RenderConfig, FieldMapping } from '@/lib/fabric/serverEngine';
import { createServiceRoleClient } from '@/lib/supabaseServer';
import { validateApiKey } from '@/lib/db/apiKeys';
import { getTemplateByShortId } from '@/lib/db/templates';

// Vercel Serverless Config
export const maxDuration = 60; // Allow up to 60s for batch processing
export const dynamic = 'force-dynamic';

// Constants
const MAX_ROWS_PER_REQUEST = 50;
const DEFAULT_MULTIPLIER = 2; // 2x resolution for high quality

// Error codes
type ErrorCode = 'INVALID_API_KEY' | 'TEMPLATE_NOT_FOUND' | 'VALIDATION_ERROR' | 'RATE_LIMIT' | 'SERVER_ERROR';

// Request/Response interfaces
interface GenerateRequest {
    template_id: string;
    rows: Record<string, string>[];
    field_mapping?: Record<string, string>;
    multiplier?: number;
}

interface GeneratedResult {
    row_index: number;
    url: string;
    status: 'success';
}

interface FailedResult {
    row_index: number;
    error: string;
    status: 'error';
}

interface GenerateResponse {
    success: true;
    generated: GeneratedResult[];
    failed: FailedResult[];
    meta: {
        template_id: string;
        total_requested: number;
        successful: number;
        failed: number;
        processing_time_ms: number;
    };
}

interface ErrorResponse {
    success: false;
    error: string;
    code: ErrorCode;
}

/**
 * Extract API key from request headers
 * Supports: Authorization: Bearer pingen_xxx OR X-API-Key: pingen_xxx
 */
function extractApiKey(request: NextRequest): string | null {
    // Try Authorization header first (Bearer token)
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Try X-API-Key header
    const apiKeyHeader = request.headers.get('X-API-Key');
    if (apiKeyHeader) {
        return apiKeyHeader;
    }

    return null;
}

/**
 * Create error response helper
 */
function errorResponse(error: string, code: ErrorCode, status: number): NextResponse<ErrorResponse> {
    return NextResponse.json({ success: false, error, code }, { status });
}

/**
 * Render a single pin and upload to storage
 */
async function renderAndUploadPin(
    elements: Element[],
    canvasSize: { width: number; height: number },
    backgroundColor: string,
    rowData: Record<string, string>,
    fieldMapping: FieldMapping,
    userId: string,
    multiplier: number
): Promise<{ url: string }> {
    const supabase = createServiceRoleClient();

    // Initialize Headless Canvas using fabric/node for server-side rendering
    const canvas = new StaticCanvas(undefined, {
        width: canvasSize.width,
        height: canvasSize.height,
    });

    try {
        // Render using shared engine
        const config: RenderConfig = {
            width: canvasSize.width,
            height: canvasSize.height,
            backgroundColor,
        };

        await renderTemplateServer(canvas, elements, config, rowData, fieldMapping);

        // Export to data URL
        const dataUrl = canvas.toDataURL({
            format: 'png',
            multiplier,
        });

        // Prepare buffer for upload
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Upload to Supabase Storage with user-specific path
        const timestamp = Date.now();
        const fileName = `${userId}/${timestamp}_${uuidv4()}.png`;
        const bucketName = 'generated_pins';

        const { error: uploadError } = await supabase.storage
            .from(bucketName)
            .upload(fileName, buffer, {
                contentType: 'image/png',
                upsert: false,
            });

        if (uploadError) {
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(bucketName)
            .getPublicUrl(fileName);

        return { url: publicUrl };
    } finally {
        // Always cleanup canvas
        canvas.dispose();
    }
}

/**
 * POST /api/v1/generate
 * Generate Pinterest pins from a template with dynamic data
 */
export async function POST(request: NextRequest): Promise<NextResponse<GenerateResponse | ErrorResponse>> {
    const startTime = Date.now();

    try {
        // 1. Extract and validate API key
        const apiKey = extractApiKey(request);
        if (!apiKey) {
            return errorResponse(
                'Missing API key. Provide via Authorization: Bearer <key> or X-API-Key header.',
                'INVALID_API_KEY',
                401
            );
        }

        // 2. Validate API key and get user ID
        const supabase = createServiceRoleClient();
        const { valid, userId, error: authError } = await validateApiKey(supabase, apiKey);

        if (!valid || !userId) {
            return errorResponse(
                authError || 'Invalid API key',
                'INVALID_API_KEY',
                401
            );
        }

        // 3. Parse and validate request body
        let body: GenerateRequest;
        try {
            body = await request.json();
        } catch {
            return errorResponse('Invalid JSON body', 'VALIDATION_ERROR', 400);
        }

        const { template_id, rows, field_mapping = {}, multiplier = DEFAULT_MULTIPLIER } = body;

        // Validate required fields
        if (!template_id) {
            return errorResponse('template_id is required', 'VALIDATION_ERROR', 400);
        }

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return errorResponse('rows must be a non-empty array', 'VALIDATION_ERROR', 400);
        }

        if (rows.length > MAX_ROWS_PER_REQUEST) {
            return errorResponse(
                `Maximum ${MAX_ROWS_PER_REQUEST} rows per request. You sent ${rows.length}.`,
                'VALIDATION_ERROR',
                400
            );
        }

        // 4. Fetch template by short_id
        const template = await getTemplateByShortId(template_id, supabase);
        if (!template) {
            return errorResponse(
                `Template not found: ${template_id}`,
                'TEMPLATE_NOT_FOUND',
                404
            );
        }

        // 5. Process each row
        const generated: GeneratedResult[] = [];
        const failed: FailedResult[] = [];

        for (let i = 0; i < rows.length; i++) {
            const rowData = rows[i];

            try {
                const { url } = await renderAndUploadPin(
                    template.elements,
                    template.canvas_size,
                    template.background_color,
                    rowData,
                    field_mapping,
                    userId,
                    multiplier
                );

                generated.push({
                    row_index: i,
                    url,
                    status: 'success',
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                failed.push({
                    row_index: i,
                    error: errorMessage,
                    status: 'error',
                });
            }
        }

        // 6. Return aggregated response
        const processingTime = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            generated,
            failed,
            meta: {
                template_id,
                total_requested: rows.length,
                successful: generated.length,
                failed: failed.length,
                processing_time_ms: processingTime,
            },
        });
    } catch (error) {
        console.error('[api/v1/generate] Unexpected error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal server error';
        return errorResponse(errorMessage, 'SERVER_ERROR', 500);
    }
}

/**
 * GET /api/v1/generate - Return API documentation
 */
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({
        endpoint: '/api/v1/generate',
        method: 'POST',
        description: 'Generate Pinterest pins from a template with dynamic data',
        authentication: 'Bearer token or X-API-Key header',
        request_body: {
            template_id: 'string (required) - Template short ID (e.g., TMPL-abc123xy)',
            rows: 'array (required) - Array of data objects, max 50 per request',
            field_mapping: 'object (optional) - Maps template fields to row columns',
            multiplier: 'number (optional) - Image resolution multiplier, default 2',
        },
        example_request: {
            template_id: 'TMPL-abc123xy',
            rows: [
                { title: 'Product 1', price: '$9.99' },
                { title: 'Product 2', price: '$19.99' },
            ],
            field_mapping: {
                productName: 'title',
                productPrice: 'price',
            },
        },
        response: {
            success: true,
            generated: [{ row_index: 0, url: 'https://...', status: 'success' }],
            failed: [],
            meta: {
                template_id: 'TMPL-abc123xy',
                total_requested: 2,
                successful: 2,
                failed: 0,
                processing_time_ms: 1234,
            },
        },
    });
}
