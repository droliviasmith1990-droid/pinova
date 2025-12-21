'use client';

// Debug logging - only in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => DEBUG && console.log('[HybridController]', ...args);

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, RotateCcw, RefreshCw, Server, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { throttle } from 'lodash';
// fabric is used within the pool, not directly here
import { useCampaignGeneration } from '@/stores/generationStore';
import { renderTemplate, exportToBlob, FieldMapping } from '@/lib/fabric/engine';
import { Element, CanvasSize } from '@/types/editor';
import { PinCardData } from './PinCard';
import { getCanvasPool } from '@/lib/canvas/CanvasPool';
import { getImageCache, extractImageUrls } from '@/lib/canvas/ImagePreloadCache';
import { EnhancedProgressTracker } from './EnhancedProgressTracker';
import { calculateProgressMetrics, formatDuration } from '@/hooks/useProgressMetrics';

// ============================================
// Types
// ============================================
export interface GenerationSettings {
    batchSize: number;
    quality: 'draft' | 'normal' | 'high' | 'ultra';
    pauseEnabled: boolean;
    renderMode: 'auto' | 'client' | 'server';
}

export interface GenerationProgress {
    current: number;
    total: number;
    percentage: number;
    status: 'idle' | 'generating' | 'paused' | 'completed' | 'error';
    errors: Array<{ rowIndex: number; error: string }>;
    
    // Timing metrics for ETA calculation
    startTime: number | null;
    elapsedTime: number;
    pausedDuration: number;
    
    // Speed and ETA
    currentSpeed: number;
    estimatedTimeRemaining: number;
    
    // Current operation
    currentPinTitle: string;
    currentPinIndex: number;
}

// Quality to multiplier mapping
const QUALITY_MAP: Record<GenerationSettings['quality'], number> = {
    draft: 1,
    normal: 2,
    high: 3,
    ultra: 4,
};

// Default settings
export const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
    batchSize: 10,
    quality: 'normal',
    pauseEnabled: true,
    renderMode: 'auto',
};

// ============================================
// Props Interface
// ============================================
interface GenerationControllerProps {
    campaignId: string;
    userId: string;

    templateElements: Element[];
    canvasSize: CanvasSize;
    backgroundColor: string;
    csvData: Record<string, string>[];
    fieldMapping: Record<string, string>;
    initialSettings?: GenerationSettings;
    initialProgress?: number;
    initialStatus?: 'pending' | 'processing' | 'paused' | 'completed' | 'failed';
    generatedCount: number;
    onPinGenerated: (pin: PinCardData) => void;
    onProgressUpdate: (progress: GenerationProgress) => void;
    onStatusChange: (status: string) => void;
}

// ============================================
// Component
// ============================================
export function GenerationController({
    campaignId,
    userId,

    templateElements,
    canvasSize,
    backgroundColor,
    csvData,
    fieldMapping,
    initialSettings = DEFAULT_GENERATION_SETTINGS,
    initialProgress = 0,
    initialStatus = 'pending',
    generatedCount,
    onPinGenerated,
    onProgressUpdate,
    onStatusChange,
}: GenerationControllerProps) {
    const [settings] = useState<GenerationSettings>(initialSettings);
    const [status, setStatus] = useState(initialStatus);
    const [progress, setProgress] = useState<GenerationProgress>(() => {
        const actualProgress = generatedCount > 0 ? generatedCount : initialProgress;
        return {
            current: actualProgress,
            total: csvData.length,
            percentage: Math.round((actualProgress / csvData.length) * 100),
            status: 'idle',
            errors: [],
            // Timing fields
            startTime: null,
            elapsedTime: 0,
            pausedDuration: 0,
            currentSpeed: 0,
            estimatedTimeRemaining: 0,
            currentPinTitle: '',
            currentPinIndex: 0,
        };
    });
    const [isPausing, setIsPausing] = useState(false);
    const [activeMode, setActiveMode] = useState<'client' | 'server' | null>(null);
    
    // Render mode selection with localStorage persistence
    // Server mode uses Vercel functions with DOM polyfills for Fabric.js
    // Default to 'server' for optimal bulk generation performance
    const [renderMode, setRenderModeState] = useState<'client' | 'server'>('server');
    
    // Load renderMode from localStorage on mount
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('pinGeneratorRenderMode');
            if (saved === 'client' || saved === 'server') {
                setRenderModeState(saved);
            }
        }
    }, []);
    
    // Save renderMode to localStorage when changed
    const setRenderMode = (mode: 'client' | 'server') => {
        setRenderModeState(mode);
        if (typeof window !== 'undefined') {
            localStorage.setItem('pinGeneratorRenderMode', mode);
        }
    };

    // Generation resume store integration
    const { state: savedState, canResume, save: saveProgress, clear: clearProgress, isStale } = useCampaignGeneration(campaignId);

    // Refs
    const shouldPauseRef = useRef(false);
    const isMountedRef = useRef(true);
    
    // Canvas pool for reuse (Phase 2.3 optimization)
    // Increased to 12 to support batch rendering of 10 pins + buffer
    const canvasPoolRef = useRef(getCanvasPool({ maxSize: 12 }));
    
    // Timing refs for ETA calculation
    const startTimeRef = useRef<number | null>(null);
    const pausedAtRef = useRef<number | null>(null);
    const totalPausedDurationRef = useRef<number>(0);

    // Throttled progress saver
    const throttledSaveProgressRef = useRef(
        throttle((data: Parameters<typeof saveProgress>[0]) => {
            saveProgress(data);
        }, 2000, { leading: true, trailing: true })
    );

    // Debug: Log resume state on mount
    useEffect(() => {
        log('Resume state:', { campaignId, savedState, canResume, isStale, status });
    }, [campaignId, savedState, canResume, isStale, status]);

    // Sync status based on actual progress
    useEffect(() => {
        const actualCount = generatedCount || progress.current;
        const total = csvData.length;
        const isComplete = actualCount >= total;

        if (isComplete && status !== 'completed') {
            setStatus('completed');
            onStatusChange('completed');
            clearProgress();
        }

        if (savedState && actualCount > savedState.lastCompletedIndex + 1) {
            clearProgress();
        }
    }, [canResume, status, generatedCount, progress.current, csvData.length, onStatusChange, savedState, clearProgress]);

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            throttledSaveProgressRef.current.cancel();
            // Note: Pool canvases are NOT disposed on unmount
            // They stay in the global pool for reuse across sessions
        };
    }, []);

    // ============================================
    // Render Single Pin with Fabric (Client-side)
    // ============================================
    const renderPinClient = useCallback(async (
        rowData: Record<string, string>,
        rowIndex: number
    ): Promise<{ blob: Blob; fileName: string; rowIndex: number }> => {
        // Acquire canvas from pool (Phase 2.3 optimization)
        const canvas = canvasPoolRef.current.acquire(canvasSize.width, canvasSize.height);

        try {
            // Render using shared engine
            await renderTemplate(
                canvas,
                templateElements,
                { width: canvasSize.width, height: canvasSize.height, backgroundColor },
                rowData,
                fieldMapping as FieldMapping
            );

            // Export to blob - OPTIMIZED: Use JPEG directly (faster, smaller)
            // JPEG 0.9 is visually equivalent to PNG but 5-10x smaller
            const multiplier = QUALITY_MAP[settings.quality];
            const blob = await exportToBlob(canvas, { 
                multiplier, 
                format: 'jpeg', 
                quality: 0.9 
            });

            return {
                blob,
                fileName: `pin-${rowIndex + 1}.jpg`,
                rowIndex,
            };
        } finally {
            // Always release canvas back to pool
            canvasPoolRef.current.release(canvas);
        }
    }, [canvasSize, templateElements, backgroundColor, fieldMapping, settings.quality]);

    // ============================================
    // Render Single Pin via Server API
    // ============================================
    const renderPinServer = useCallback(async (
        rowData: Record<string, string>,
        rowIndex: number
    ): Promise<{ blob: Blob; fileName: string; rowIndex: number }> => {
        const response = await fetch('/api/render-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                elements: templateElements,
                canvasSize,
                backgroundColor,
                rowData,
                fieldMapping,
                multiplier: QUALITY_MAP[settings.quality],
            }),
        });

        if (!response.ok) {
            throw new Error(`Server render failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Server render failed');
        }

        // Convert data URL to blob
        const dataUrlResponse = await fetch(result.url);
        const blob = await dataUrlResponse.blob();

        return {
            blob,
            fileName: `pin-${rowIndex + 1}.png`,
            rowIndex,
        };
    }, [templateElements, canvasSize, backgroundColor, fieldMapping, settings.quality]);

    // ============================================
    // Upload Single Pin (LEGACY - kept for fallback, not used in batch mode)
    // ============================================
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const uploadSinglePin = useCallback(async (pin: { blob: Blob; fileName: string; rowIndex: number }) => {
        const formData = new FormData();
        formData.append('file', pin.blob, pin.fileName);
        formData.append('campaign_id', campaignId);
        formData.append('row_index', pin.rowIndex.toString());

        try {
            const uploadResponse = await fetch('/api/upload-pin', {
                method: 'POST',
                body: formData,
            });

            const uploadResult = await uploadResponse.json();

            if (uploadResult.url) {
                // Save to database - CRITICAL: include credentials for auth
                const dbResponse = await fetch('/api/generated-pins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', // Required for cookie-based auth
                    body: JSON.stringify({
                        campaign_id: campaignId,
                        user_id: userId,
                        image_url: uploadResult.url,
                        data_row: csvData[pin.rowIndex],
                        status: 'completed',
                    }),
                });

                if (!dbResponse.ok) {
                    const error = await dbResponse.json();
                    throw new Error(`Failed to save record to database: ${error.error || dbResponse.statusText}`);
                }

                return {
                    success: true,
                    pin: {
                        id: `${campaignId}-${pin.rowIndex}`,
                        rowIndex: pin.rowIndex,
                        imageUrl: uploadResult.url,
                        status: 'completed' as const,
                        csvData: csvData[pin.rowIndex],
                    }
                };
            }
            return { success: false, rowIndex: pin.rowIndex };
        } catch (error) {
            console.error('Upload error:', error);
            return {
                success: false,
                pin: {
                    id: `${campaignId}-${pin.rowIndex}`,
                    rowIndex: pin.rowIndex,
                    imageUrl: '',
                    status: 'failed' as const,
                    errorMessage: 'Upload failed',
                    csvData: csvData[pin.rowIndex],
                }
            };
        }
    }, [campaignId, userId, csvData]);

    // ============================================
    // Start Generation (BATCH Processing - 10x Faster)
    // ============================================
    const startGeneration = useCallback(async (startIndex: number = 0) => {
        if (status === 'processing') return;
        if (!isMountedRef.current) return;

        setStatus('processing');
        onStatusChange('processing');
        shouldPauseRef.current = false;

        // Initialize or adjust timing for ETA calculation
        if (startIndex === 0) {
            // Fresh start - reset all timing
            startTimeRef.current = Date.now();
            totalPausedDurationRef.current = 0;
        } else if (pausedAtRef.current) {
            // Resuming from pause - add paused duration
            totalPausedDurationRef.current += Date.now() - pausedAtRef.current;
            pausedAtRef.current = null;
        }

        // Determine render mode from user selection (not settings)
        setActiveMode(renderMode);
        log(`Starting BATCH generation in ${renderMode} mode from index ${startIndex}`);

        // BATCH_SIZE: Number of pins to render and upload together
        const BATCH_SIZE = 10;

        // Pre-warm canvas pool for batch processing
        canvasPoolRef.current.prewarm(Math.min(BATCH_SIZE, 10), canvasSize.width, canvasSize.height);

        // ============================================
        // FIX #4: Preload ALL unique images before rendering
        // This eliminates repeated CDN fetches during batch processing
        // IMPORTANT: Run on EVERY start, not just startIndex === 0 (handles resume)
        // NOTE: Skip preloading in SERVER mode - server fetches images directly without CORS
        // ============================================
        if (renderMode === 'client') {
            const imageCache = getImageCache();
            
            // Only preload if cache is empty (first run or after clear)
            if (imageCache.getStats().cached === 0) {
                console.log('[ImageCache] Starting image preload...');
                const preloadStartTime = Date.now();
                
                // Extract all unique image URLs from template and CSV data
                const imageUrls = extractImageUrls(
                    templateElements,
                    csvData,
                    fieldMapping
                );
                
                if (imageUrls.length > 0) {
                    console.log(`[ImageCache] Found ${imageUrls.length} unique images to preload`);
                    await imageCache.preloadAll(imageUrls);
                    const stats = imageCache.getStats();
                    console.log(`[ImageCache] Preload completed in ${Date.now() - preloadStartTime}ms`, stats);
                } else {
                    console.warn('[ImageCache] No image URLs found to preload!');
                }
            } else {
                console.log('[ImageCache] Using existing cache with', imageCache.getStats().cached, 'images');
            }
        } else {
            console.log('[Server Mode] Skipping client-side image preload - server handles images directly');
        }

        const errors: Array<{ rowIndex: number; error: string }> = [];
        let current = startIndex;

        try {
            // Process pins in batches
            while (current < csvData.length && !shouldPauseRef.current) {
                if (!isMountedRef.current) return;

                const batchStart = current;
                const batchEnd = Math.min(current + BATCH_SIZE, csvData.length);
                const batchSize = batchEnd - batchStart;
                const batchStartTime = Date.now();

                log(`[Batch] Rendering pins ${batchStart}-${batchEnd - 1} (${batchSize} pins)`);

                // ============================================
                // Step 1: Render pins - SERVER or CLIENT mode
                // ============================================
                let renderResults: Array<{
                    success: boolean;
                    pinNumber: number;
                    blob?: Blob;
                    fileName?: string;
                    url?: string;
                    error?: string;
                    rowData: Record<string, string>;
                }> = [];

                if (renderMode === 'server') {
                    // SERVER MODE: Send entire batch to /api/render-batch
                    try {
                        console.log(`[Server Mode] Sending batch ${batchStart}-${batchEnd - 1} to server...`);
                        
                        const response = await fetch('/api/render-batch', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                campaignId,
                                elements: templateElements,
                                canvasSize,
                                backgroundColor,
                                fieldMapping,
                                csvRows: csvData.slice(batchStart, batchEnd),
                                startIndex: batchStart,
                            }),
                        });

                        if (!response.ok) {
                            throw new Error(`Server returned ${response.status}`);
                        }

                        const result = await response.json();
                        
                        if (!result.success) {
                            throw new Error(result.error || 'Server rendering failed');
                        }

                        console.log(`[Server Mode] Batch completed:`, result.stats);

                        // Convert server results to renderResults format
                        renderResults = result.results.map((r: { index: number; success: boolean; url?: string; error?: string }) => ({
                            success: r.success,
                            pinNumber: r.index,
                            url: r.url,
                            error: r.error,
                            rowData: csvData[r.index],
                        }));
                    } catch (serverError) {
                        console.error(`[Server Mode] Batch failed, falling back to client:`, serverError);
                        toast.error('Server rendering failed, falling back to client...');
                        
                        // Fall back to client rendering for this batch
                        const clientResults = await Promise.all(
                            csvData.slice(batchStart, batchEnd).map(async (rowData, i) => {
                                const rowIndex = batchStart + i;
                                try {
                                    const pin = await renderPinClient(rowData, rowIndex);
                                    return { success: true, pinNumber: rowIndex, blob: pin.blob, fileName: pin.fileName, rowData };
                                } catch (error) {
                                    return { success: false, pinNumber: rowIndex, error: String(error), rowData };
                                }
                            })
                        );
                        renderResults = clientResults;
                    }
                } else {
                    // CLIENT MODE: Render all pins in parallel
                    const renderPromises = csvData.slice(batchStart, batchEnd).map(async (rowData, i) => {
                        const rowIndex = batchStart + i;
                        try {
                            const pin = await renderPinClient(rowData, rowIndex);
                            return {
                                success: true,
                                pinNumber: rowIndex,
                                blob: pin.blob,
                                fileName: pin.fileName,
                                rowData,
                            };
                        } catch (error) {
                            console.error(`[Batch] Failed to render pin ${rowIndex}:`, error);
                            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                            errors.push({ rowIndex, error: errorMessage });
                            return {
                                success: false,
                                pinNumber: rowIndex,
                                error: errorMessage,
                                rowData,
                            };
                        }
                    });
                    renderResults = await Promise.all(renderPromises);
                }

                if (!isMountedRef.current) return;
                if (shouldPauseRef.current) break;

                // ============================================
                // Step 2: Handle results based on mode
                // - Server mode: Results already have URLs (skip upload, just save to DB)  
                // - Client mode: Results have blobs (need upload, then save to DB)
                // ============================================
                
                // Separate server results (already have URLs) from client results (need upload)
                const serverResults = renderResults.filter(r => r.success && r.url);
                const clientRenders = renderResults.filter(r => r.success && r.blob);
                
                // Handle server results - already uploaded, just save to DB
                if (serverResults.length > 0) {
                    const dbPromises = serverResults.map(async (result) => {
                        try {
                            await fetch('/api/generated-pins', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({
                                    campaign_id: campaignId,
                                    user_id: userId,
                                    image_url: result.url,
                                    data_row: result.rowData,
                                    status: 'completed',
                                }),
                            });
                            onPinGenerated({
                                id: `${campaignId}-${result.pinNumber}`,
                                rowIndex: result.pinNumber,
                                imageUrl: result.url!,
                                status: 'completed',
                                csvData: result.rowData,
                            });
                        } catch (dbError) {
                            console.error(`[Server Mode] DB save failed for pin ${result.pinNumber}:`, dbError);
                        }
                    });
                    await Promise.all(dbPromises);
                }

                // Handle client results - need to upload first
                const successfulRenders = clientRenders;

                if (successfulRenders.length > 0) {
                    // Upload all pins in parallel using FormData (avoids slow base64 conversion)
                    const uploadPromises = successfulRenders.map(async (render) => {
                        const formData = new FormData();
                        formData.append('file', render.blob!, render.fileName);
                        formData.append('campaign_id', campaignId);
                        formData.append('row_index', render.pinNumber.toString());

                        try {
                            const uploadResponse = await fetch('/api/upload-pin', {
                                method: 'POST',
                                body: formData,
                            });
                            const uploadResult = await uploadResponse.json();
                            return {
                                pinNumber: render.pinNumber,
                                success: !!uploadResult.url,
                                url: uploadResult.url,
                                error: uploadResult.error,
                            };
                        } catch (error) {
                            return {
                                pinNumber: render.pinNumber,
                                success: false,
                                error: error instanceof Error ? error.message : 'Upload failed',
                            };
                        }
                    });

                    const uploadResults = await Promise.all(uploadPromises);

                    // Process each upload result - save to DB in parallel
                    const dbSavePromises = uploadResults.map(async (uploadResult) => {
                        if (uploadResult.success && uploadResult.url) {
                            // Save to database
                            try {
                                await fetch('/api/generated-pins', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({
                                        campaign_id: campaignId,
                                        user_id: userId,
                                        image_url: uploadResult.url,
                                        data_row: csvData[uploadResult.pinNumber],
                                        status: 'completed',
                                    }),
                                });

                                // Report successful pin to UI
                                onPinGenerated({
                                    id: `${campaignId}-${uploadResult.pinNumber}`,
                                    rowIndex: uploadResult.pinNumber,
                                    imageUrl: uploadResult.url,
                                    status: 'completed',
                                    csvData: csvData[uploadResult.pinNumber],
                                });
                            } catch (dbError) {
                                console.error(`[Batch] Failed to save pin ${uploadResult.pinNumber} to DB:`, dbError);
                            }
                        } else {
                            // Upload failed for this pin
                            errors.push({ rowIndex: uploadResult.pinNumber, error: uploadResult.error || 'Upload failed' });
                            onPinGenerated({
                                id: `${campaignId}-${uploadResult.pinNumber}`,
                                rowIndex: uploadResult.pinNumber,
                                imageUrl: '',
                                status: 'failed',
                                errorMessage: uploadResult.error || 'Upload failed',
                                csvData: csvData[uploadResult.pinNumber],
                            });
                        }
                    });

                    await Promise.all(dbSavePromises);
                }

                // ============================================
                // Step 3: Handle failed renders
                // ============================================
                const failedRenders = renderResults.filter(r => !r.success);
                for (const failed of failedRenders) {
                    // Persist failed pin to database
                    try {
                        await fetch('/api/generated-pins', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include',
                            body: JSON.stringify({
                                campaign_id: campaignId,
                                user_id: userId,
                                image_url: '',
                                data_row: csvData[failed.pinNumber],
                                status: 'failed',
                                error_message: failed.error,
                            }),
                        });
                    } catch (persistError) {
                        console.error(`[Batch] Failed to persist error for pin ${failed.pinNumber}:`, persistError);
                    }

                    // Report failed pin to UI
                    onPinGenerated({
                        id: `${campaignId}-${failed.pinNumber}`,
                        rowIndex: failed.pinNumber,
                        imageUrl: '',
                        status: 'failed',
                        errorMessage: failed.error,
                        csvData: csvData[failed.pinNumber],
                    });
                }

                // ============================================
                // Step 4: Update progress after batch
                // ============================================
                current = batchEnd;
                const batchDuration = Date.now() - batchStartTime;
                log(`[Batch] Completed ${batchSize} pins in ${batchDuration}ms (${(batchSize / batchDuration * 1000).toFixed(1)} pins/sec)`);
                
                // FIX #7: Memory logging for monitoring (Chrome only)
                if (typeof performance !== 'undefined' && 'memory' in performance) {
                    const memory = (performance as { memory: { usedJSHeapSize: number } }).memory;
                    log(`[Batch ${Math.floor(batchEnd / BATCH_SIZE)}] Memory: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`);
                }

                // Save progress
                throttledSaveProgressRef.current({
                    campaignId,
                    lastCompletedIndex: batchEnd - 1,
                    totalPins: csvData.length,
                    status: 'processing'
                });

                // Calculate timing metrics for ETA
                const lastRowData = csvData[batchEnd - 1] || {};
                const currentPinTitle = lastRowData.title || lastRowData.name || lastRowData.product_name || `Row ${batchEnd}`;
                const metrics = calculateProgressMetrics({
                    completed: current,
                    total: csvData.length,
                    startTime: startTimeRef.current,
                    pausedDuration: totalPausedDurationRef.current,
                    isPaused: false,
                    currentTime: Date.now(),
                });

                // Update progress with timing metrics
                const newProgress: GenerationProgress = {
                    current,
                    total: csvData.length,
                    percentage: Math.round((current / csvData.length) * 100),
                    status: 'generating',
                    errors,
                    startTime: startTimeRef.current,
                    elapsedTime: metrics.elapsedTimeMs,
                    pausedDuration: totalPausedDurationRef.current,
                    currentSpeed: metrics.pinsPerSecond,
                    estimatedTimeRemaining: metrics.etaSeconds * 1000,
                    currentPinTitle,
                    currentPinIndex: current,
                };
                setProgress(newProgress);
                onProgressUpdate(newProgress);

                // Memory monitoring - log every batch (only in development)
                if (DEBUG) {
                    const memoryInfo = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
                    if (memoryInfo) {
                        const memoryMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
                        log(`[Batch ${Math.floor(batchStart / BATCH_SIZE)}] Memory: ${memoryMB.toFixed(0)}MB`);
                    }
                }
            }

            if (!isMountedRef.current) return;

            // Final status
            if (shouldPauseRef.current) {
                pausedAtRef.current = Date.now();
                setStatus('paused');
                onStatusChange('paused');
                throttledSaveProgressRef.current.flush();
                toast.info(`Paused at ${current}/${csvData.length} pins`);
            } else {
                setStatus('completed');
                onStatusChange('completed');
                clearProgress();
                toast.success('Generation completed!');
            }

        } catch (error) {
            console.error('Generation error:', error);
            if (isMountedRef.current) {
                setStatus('failed');
                onStatusChange('failed');
                toast.error('Generation failed');
            }
        } finally {
            if (isMountedRef.current) {
                setIsPausing(false);
                setActiveMode(null);
            }
            // Log pool stats for performance monitoring
            log('Canvas pool stats:', canvasPoolRef.current.getStats());
        }
    }, [
        status, templateElements, canvasSize, backgroundColor, csvData,
        fieldMapping, campaignId, userId, onPinGenerated, onProgressUpdate,
        onStatusChange, clearProgress, renderPinClient, renderMode
    ]);

    // Pause generation
    const pauseGeneration = useCallback(() => {
        if (settings.pauseEnabled && status === 'processing') {
            setIsPausing(true);
            shouldPauseRef.current = true;
        }
    }, [settings.pauseEnabled, status]);

    // Resume generation
    const resumeGeneration = useCallback(() => {
        if (status === 'paused') {
            startGeneration(progress.current);
        }
    }, [status, progress.current, startGeneration]);

    // Regenerate all
    const regenerateAll = useCallback(async () => {
        const confirmed = window.confirm(
            `This will delete ${progress.current} existing pins and start fresh. Continue?`
        );
        if (!confirmed) return;

        await fetch(`/api/generated-pins?campaign_id=${campaignId}`, {
            method: 'DELETE',
        });

        setProgress({
            current: 0,
            total: csvData.length,
            percentage: 0,
            status: 'idle',
            errors: [],
            startTime: null,
            elapsedTime: 0,
            pausedDuration: 0,
            currentSpeed: 0,
            estimatedTimeRemaining: 0,
            currentPinTitle: '',
            currentPinIndex: 0,
        });

        startGeneration(0);
    }, [campaignId, csvData.length, progress.current, startGeneration]);

    // Map status for tracker component
    const trackerStatus = status === 'processing' ? 'generating' 
        : status === 'failed' ? 'error' 
        : status === 'completed' ? 'completed'
        : status === 'paused' ? 'paused'
        : 'idle';

    return (
        <div className="space-y-4">
            {/* Enhanced Progress Tracker */}
            <EnhancedProgressTracker
                completed={generatedCount || progress.current}
                total={csvData.length}
                status={trackerStatus}
                pinsPerSecond={progress.currentSpeed}
                elapsedTimeMs={progress.elapsedTime}
                etaFormatted={progress.estimatedTimeRemaining > 0 
                    ? formatDuration(progress.estimatedTimeRemaining) 
                    : '--'}
                isEtaReliable={(generatedCount || progress.current) >= 5}
                currentPinTitle={progress.currentPinTitle}
                currentPinIndex={progress.currentPinIndex}
                pauseEnabled={settings.pauseEnabled}
                isPausing={isPausing}
                onPause={pauseGeneration}
                onResume={resumeGeneration}
                errorCount={progress.errors.length}
            />

            {/* Render Mode Indicator */}
            {activeMode && (
                <div className="flex items-center gap-2 text-sm text-gray-500 px-2">
                    <span className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {activeMode === 'server' ? <Server className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                        {activeMode === 'server' ? 'Server Rendering' : 'Client Rendering'}
                    </span>
                </div>
            )}

            {/* Resume from Saved State */}
            {canResume && !isStale && status !== 'processing' && status !== 'completed' && savedState &&
                savedState.lastCompletedIndex < savedState.totalPins - 1 &&
                (generatedCount || progress.current) < csvData.length && (() => {
                    const pinsRemaining = Math.max(0, csvData.length - savedState.lastCompletedIndex - 1);
                    return pinsRemaining > 0;
                })() && (
                    <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex-1">
                            <p className="text-sm font-medium text-green-900">
                                Resume Available
                            </p>
                            <p className="text-xs text-green-700">
                                {Math.max(0, csvData.length - savedState!.lastCompletedIndex - 1)} of {csvData.length} pins remaining
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                startGeneration(savedState!.lastCompletedIndex + 1);
                                toast.info(`Resuming from pin ${savedState!.lastCompletedIndex + 2}`);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Resume
                        </button>
                        <button
                            onClick={() => {
                                clearProgress();
                                toast.success('Cleared saved progress');
                            }}
                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                )}

            {/* Render Mode Selector - Only show when not processing */}
            {(status === 'pending' || status === 'failed' || status === 'completed' || status === 'paused') && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="text-sm font-medium mb-3 text-gray-700">Render Mode</div>
                    <div className="space-y-2">
                        {/* Client Mode Option */}
                        <label 
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                                ${renderMode === 'client' 
                                    ? 'border-blue-300 bg-blue-50' 
                                    : 'border-gray-200 hover:bg-gray-100'}`}
                        >
                            <input 
                                type="radio" 
                                name="renderMode"
                                checked={renderMode === 'client'} 
                                onChange={() => setRenderMode('client')}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                    <Monitor className="w-4 h-4" />
                                    Client-Side
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    Fast preview for 1-10 pins. Runs in your browser.
                                </div>
                            </div>
                        </label>
                        
                        {/* Server Mode Option - Recommended for bulk */}
                        <label 
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                                ${renderMode === 'server' 
                                    ? 'border-green-300 bg-green-50' 
                                    : 'border-gray-200 hover:bg-gray-100'}`}
                        >
                            <input 
                                type="radio" 
                                name="renderMode"
                                checked={renderMode === 'server'} 
                                onChange={() => setRenderMode('server')}
                                className="mt-1"
                            />
                            <div className="flex-1">
                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                    <Server className="w-4 h-4" />
                                    Server-Side
                                    <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded font-normal">
                                        Recommended
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                    Faster for bulk generation (100+ pins). Requires Vercel deployment.
                                </div>
                            </div>
                        </label>
                    </div>
                </div>
            )}

            {/* Action Buttons - Added relative/z-index to fix overlapping issues */}
            <div className="flex items-center gap-3 relative z-10">
                {/* Start Button - only when idle */}
                {(status === 'pending' || status === 'failed') && (
                    <button
                        onClick={() => {
                            startGeneration(0);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm active:scale-95"
                    >
                        <Play className="w-5 h-5" />
                        Start Generation
                    </button>
                )}

                {/* Regenerate All Button */}
                {(status === 'paused' || status === 'completed') && progress.current > 0 && (
                    <button
                        onClick={regenerateAll}
                        className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                        <RotateCcw className="w-5 h-5" />
                        Regenerate All
                    </button>
                )}
            </div>
        </div>
    );
}
