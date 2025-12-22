import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { Element } from '@/types/editor';
import { setupFabricServerPolyfills } from '@/lib/fabric/server-polyfill';
// NOTE: CanvasPool imports fabric at module level, so it must be dynamically imported AFTER polyfills

// Vercel Serverless Config - 60 seconds for batch processing
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Debug flag for verbose logging - disabled in production for performance
const DEBUG_RENDER = process.env.NODE_ENV === 'development' || process.env.DEBUG_RENDER === 'true';

// Request body interface
interface RenderBatchRequest {
    campaignId: string;
    elements: Element[];
    canvasSize: { width: number; height: number };
    backgroundColor: string;
    fieldMapping?: Record<string, string>;
    csvRows: Record<string, string>[];
    startIndex?: number;
}

interface BatchResult {
    index: number;
    success: boolean;
    url?: string;
    error?: string;
    fileName?: string;
}

// Initialize S3 Client for Tebi
const getS3Client = () => {
    // Handle TEBI_ENDPOINT with or without https:// prefix
    const rawEndpoint = process.env.TEBI_ENDPOINT || '';
    const endpoint = rawEndpoint.startsWith('https://') || rawEndpoint.startsWith('http://')
        ? rawEndpoint
        : `https://${rawEndpoint}`;
    
    if (DEBUG_RENDER) {
        console.log('[S3] Initializing with endpoint:', endpoint);
    }
    
    return new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
            accessKeyId: process.env.TEBI_ACCESS_KEY!,
            secretAccessKey: process.env.TEBI_SECRET_KEY!,
        },
        forcePathStyle: true,
    });
};

// Upload to S3
async function uploadToS3(
    s3Client: S3Client,
    buffer: Buffer,
    campaignId: string,
    pinIndex: number
): Promise<string> {
    const bucket = process.env.TEBI_BUCKET!;
    const key = `campaigns/${campaignId}/pin-${pinIndex}-${uuidv4().substring(0, 8)}.jpg`;

    await s3Client.send(
        new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: 'image/jpeg',
            ACL: 'public-read',
        })
    );

    // Generate public URL - handle TEBI_ENDPOINT with or without https://
    const rawEndpoint = process.env.TEBI_ENDPOINT || '';
    const baseUrl = rawEndpoint.startsWith('https://') || rawEndpoint.startsWith('http://')
        ? rawEndpoint
        : `https://${rawEndpoint}`;
    return `${baseUrl}/${bucket}/${key}`;
}

export async function POST(req: NextRequest) {
    const startTime = Date.now();

    try {
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // STEP 1: Setup polyfills BEFORE importing fabric
        // This must happen inside the handler, not at module level
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        setupFabricServerPolyfills();

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // STEP 2: Dynamic import of fabric-dependent modules AFTER polyfills
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const { renderTemplate } = await import('@/lib/fabric/engine');
        const { CanvasPool } = await import('@/lib/fabric/CanvasPool');

        const body: RenderBatchRequest = await req.json();
        const {
            campaignId,
            elements,
            canvasSize,
            backgroundColor,
            fieldMapping = {},
            csvRows,
            startIndex = 0,
        } = body;

        // Validation
        if (!campaignId || !elements || !canvasSize || !csvRows || csvRows.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        console.log(`[Server Render] Processing batch of ${csvRows.length} pins for campaign ${campaignId}`);

        const s3Client = getS3Client();
        const results: BatchResult[] = [];

        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 🚀 PHASE 1: Create canvas pool for reuse
        // Calculate dynamic limit based on available memory
        // Vercel Serverless: 1024MB default, each canvas ~50MB
        // Safe limit: 14 concurrent (700MB usage, 300MB headroom)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const PARALLEL_LIMIT = parseInt(process.env.PARALLEL_LIMIT || '14', 10);
        
        if (DEBUG_RENDER) {
            console.log(`[Server Render] Using PARALLEL_LIMIT: ${PARALLEL_LIMIT}`);
        }
        
        const canvasPool = new CanvasPool(PARALLEL_LIMIT, canvasSize.width, canvasSize.height);

        try {
            // Render function using pool
            async function renderSinglePin(
                rowData: Record<string, string>
            ): Promise<Buffer> {
                const canvas = canvasPool.acquire(); // ← Get from pool (~1ms)
                
                try {
                    const config = {
                        width: canvasSize.width,
                        height: canvasSize.height,
                        backgroundColor,
                        interactive: false,
                    };

                    await renderTemplate(canvas, elements, config, rowData, fieldMapping);

                    // Export to JPEG
                    const dataUrl = canvas.toDataURL({
                        format: 'jpeg',
                        quality: 0.9,
                        multiplier: 1,
                    });

                    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
                    return Buffer.from(base64Data, 'base64');
                } finally {
                    canvasPool.release(canvas); // ← Return to pool (don't dispose!)
                }
            }

            // Process pins in parallel
            for (let i = 0; i < csvRows.length; i += PARALLEL_LIMIT) {
                const chunk = csvRows.slice(i, i + PARALLEL_LIMIT);
                const chunkPromises = chunk.map(async (rowData, chunkIndex) => {
                    const pinIndex = startIndex + i + chunkIndex;
                    
                    try {
                        const buffer = await renderSinglePin(rowData);
                        const url = await uploadToS3(s3Client, buffer, campaignId, pinIndex);
                        
                        return {
                            index: pinIndex,
                            success: true,
                            url,
                            fileName: `pin-${pinIndex}.jpg`,
                        };
                    } catch (error) {
                        console.error(`[Server Render] Pin ${pinIndex} failed:`, error);
                        return {
                            index: pinIndex,
                            success: false,
                            error: error instanceof Error ? error.message : 'Unknown error',
                        };
                    }
                });

                const chunkResults = await Promise.all(chunkPromises);
                results.push(...chunkResults);
            }

            const successCount = results.filter((r) => r.success).length;
            const duration = Date.now() - startTime;
            const pinsPerSecond = (successCount / (duration / 1000)).toFixed(2);

            console.log(
                `[Server Render] Completed: ${successCount}/${csvRows.length} pins in ${duration}ms (${pinsPerSecond} pins/sec)`
            );

            return NextResponse.json({
                success: true,
                results,
                stats: {
                    total: csvRows.length,
                    success: successCount,
                    failed: csvRows.length - successCount,
                    durationMs: duration,
                    pinsPerSecond: parseFloat(pinsPerSecond),
                },
            });

        } finally {
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // 🚨 CRITICAL: Cleanup pool even if batch fails
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            canvasPool.cleanup();
        }

    } catch (error: unknown) {
        console.error('[Server Render] Batch error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
