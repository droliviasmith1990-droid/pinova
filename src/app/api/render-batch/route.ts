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
        const { renderTemplate, setServerImageCache, clearServerImageCache } = await import('@/lib/fabric/engine');
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
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // 🚀 OPTIMIZATION: Pre-load unique images ONCE for entire batch
            // Images are shared across pins - fetch each URL only once
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            const imageCache = new Map<string, string>(); // URL -> base64 data URL
            
            // Extract unique image URLs from elements and CSV data
            const imageElements = elements.filter(el => el.type === 'image' && el.visible);
            const uniqueUrls = new Set<string>();
            
            for (const el of imageElements) {
                const imgEl = el as { imageUrl?: string; isDynamic?: boolean; dynamicSource?: string };
                if (imgEl.isDynamic && imgEl.dynamicSource) {
                    // Dynamic images - collect from all rows
                    for (const row of csvRows) {
                        const mappedField = fieldMapping[imgEl.dynamicSource] || imgEl.dynamicSource;
                        const url = row[mappedField];
                        if (url) uniqueUrls.add(url);
                    }
                } else if (imgEl.imageUrl) {
                    uniqueUrls.add(imgEl.imageUrl);
                }
            }
            
            if (uniqueUrls.size > 0 && DEBUG_RENDER) {
                console.log(`[Server Render] Pre-loading ${uniqueUrls.size} unique images...`);
            }
            
            // Pre-fetch all unique images in parallel
            const preFetchStart = Date.now();
            await Promise.all(Array.from(uniqueUrls).map(async (url) => {
                try {
                    let fetchUrl = url;
                    if (url.startsWith('/api/proxy-image')) {
                        const urlParams = new URLSearchParams(url.split('?')[1] || '');
                        const originalUrl = urlParams.get('url');
                        if (originalUrl) fetchUrl = decodeURIComponent(originalUrl);
                    }
                    
                    const response = await fetch(fetchUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                            'Accept': 'image/*',
                        },
                    });
                    
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        const base64 = Buffer.from(arrayBuffer).toString('base64');
                        const contentType = response.headers.get('content-type') || 'image/png';
                        imageCache.set(url, `data:${contentType};base64,${base64}`);
                    }
                } catch {
                    if (DEBUG_RENDER) console.warn(`[Server Render] Image prefetch failed: ${url.substring(0, 60)}`);
                }
            }));
            
            // 🚀 Set the cache so engine.ts loadImageToCanvas can use it
            setServerImageCache(imageCache);
            
            if (DEBUG_RENDER) {
                console.log(`[Server Render] Pre-loaded ${imageCache.size} images in ${Date.now() - preFetchStart}ms`);
            }

            // Render function using pool + image cache
            async function renderSinglePin(
                rowData: Record<string, string>
            ): Promise<Buffer> {
                const canvas = canvasPool.acquire();
                
                try {
                    const config = {
                        width: canvasSize.width,
                        height: canvasSize.height,
                        backgroundColor,
                        interactive: false,
                    };

                    // Pass image cache to renderTemplate
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
                    canvasPool.release(canvas);
                }
            }

            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // 🚀 OPTIMIZATION: Process ALL pins in parallel (up to PARALLEL_LIMIT)
            // Render + Upload happen concurrently for maximum throughput
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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
            // 🚨 CRITICAL: Cleanup pool and cache even if batch fails
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            canvasPool.cleanup();
            clearServerImageCache();
        }

    } catch (error: unknown) {
        console.error('[Server Render] Batch error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
    }
}
