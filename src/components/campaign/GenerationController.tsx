'use client';

// Debug logging - only in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => DEBUG && console.log('[HybridController]', ...args);

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, AlertCircle, CheckCircle, Loader2, RefreshCw, Server, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { throttle } from 'lodash';
import * as fabric from 'fabric';
import { useCampaignGeneration } from '@/stores/generationStore';
import { renderTemplate, exportToBlob, FieldMapping } from '@/lib/fabric/engine';
import { Element, CanvasSize } from '@/types/editor';
import { PinCardData } from './PinCard';

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
        };
    });
    const [isPausing, setIsPausing] = useState(false);
    const [activeMode, setActiveMode] = useState<'client' | 'server' | null>(null);

    // Generation resume store integration
    const { state: savedState, canResume, save: saveProgress, clear: clearProgress, isStale } = useCampaignGeneration(campaignId);

    // Refs
    const shouldPauseRef = useRef(false);
    const isMountedRef = useRef(true);
    const activeUploadsRef = useRef<Set<Promise<void>>>(new Set());
    const fabricCanvasRef = useRef<fabric.StaticCanvas | null>(null);

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
        return () => {
            isMountedRef.current = false;
            throttledSaveProgressRef.current.cancel();
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, []);

    // ============================================
    // Render Single Pin with Fabric (Client-side)
    // ============================================
    const renderPinClient = useCallback(async (
        rowData: Record<string, string>,
        rowIndex: number
    ): Promise<{ blob: Blob; fileName: string; rowIndex: number }> => {
        // Create or reuse canvas
        if (!fabricCanvasRef.current) {
            fabricCanvasRef.current = new fabric.StaticCanvas(undefined, {
                width: canvasSize.width,
                height: canvasSize.height,
            });
        }

        const canvas = fabricCanvasRef.current;

        // Render using shared engine
        await renderTemplate(
            canvas,
            templateElements,
            { width: canvasSize.width, height: canvasSize.height, backgroundColor },
            rowData,
            fieldMapping as FieldMapping
        );

        // Export to blob
        const multiplier = QUALITY_MAP[settings.quality];
        const blob = await exportToBlob(canvas, { multiplier });

        return {
            blob,
            fileName: `pin-${rowIndex + 1}.png`,
            rowIndex,
        };
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
    // Upload Single Pin
    // ============================================
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
                // Save to database
                await fetch('/api/generated-pins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        campaign_id: campaignId,
                        user_id: userId,
                        image_url: uploadResult.url,
                        data_row: csvData[pin.rowIndex],
                        status: 'completed',
                    }),
                });

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
    // Start Generation (Hybrid Logic)
    // ============================================
    const startGeneration = useCallback(async (startIndex: number = 0) => {
        if (status === 'processing') return;
        if (!isMountedRef.current) return;

        setStatus('processing');
        onStatusChange('processing');
        shouldPauseRef.current = false;

        // Determine render mode
        // CHANGED: Default to 'client' even in auto mode for reliability
        // Server mode was causing 500 errors on large batches
        const mode = settings.renderMode === 'server' ? 'server' : 'client';

        setActiveMode(mode);
        log(`Starting generation in ${mode} mode from index ${startIndex}`);

        const errors: Array<{ rowIndex: number; error: string }> = [];
        let current = startIndex;

        try {
            // REDUCED: Concurrency from 5 to 3 to prevent memory pressure and slowdown
            const CONCURRENCY_LIMIT = 3;
            const DELAY_BETWEEN_RENDERS_MS = 100; // Add delay to prevent overwhelming the browser

            while (current < csvData.length && !shouldPauseRef.current) {
                if (!isMountedRef.current) return;

                const rowData = csvData[current];
                const rowIndex = current;

                try {
                    let pin: { blob: Blob; fileName: string; rowIndex: number };

                    if (mode === 'server') {
                        try {
                            // Try server-side rendering first
                            pin = await renderPinServer(rowData, rowIndex);
                        } catch (serverError) {
                            // SMART FALLBACK: If server fails, use client-side rendering
                            log(`Server failed for row ${rowIndex}, falling back to client:`, serverError);
                            pin = await renderPinClient(rowData, rowIndex);
                        }
                    } else {
                        // Client-side rendering using Fabric
                        pin = await renderPinClient(rowData, rowIndex);
                    }

                    // Create upload promise
                    const uploadPromise = uploadSinglePin(pin).then((uploadResult) => {
                        activeUploadsRef.current.delete(uploadPromise);

                        if (!isMountedRef.current) return;

                        if (uploadResult.pin) {
                            onPinGenerated(uploadResult.pin);

                            // Throttled save
                            throttledSaveProgressRef.current({
                                campaignId,
                                lastCompletedIndex: uploadResult.pin.rowIndex,
                                totalPins: csvData.length,
                                status: 'processing'
                            });
                        }
                    });

                    activeUploadsRef.current.add(uploadPromise);

                    // Concurrency control
                    if (activeUploadsRef.current.size >= CONCURRENCY_LIMIT) {
                        await Promise.race(activeUploadsRef.current);
                    }

                    // Add small delay between renders to prevent memory pressure
                    if (DELAY_BETWEEN_RENDERS_MS > 0) {
                        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_RENDERS_MS));
                    }

                } catch (error) {
                    // FAIL-SAFE: Log error, mark pin as failed, and CONTINUE to next pin
                    console.error(`[Generation] Failed to render pin ${rowIndex}:`, error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    errors.push({ rowIndex, error: errorMessage });

                    // CRITICAL: Persist failed pin to DATABASE (not just UI state)
                    // This ensures the failure record survives page refresh/pause
                    try {
                        await fetch('/api/generated-pins', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                campaign_id: campaignId,
                                user_id: userId,
                                image_url: '', // Empty for failed pins
                                data_row: csvData[rowIndex],
                                status: 'failed',
                                error_message: errorMessage,
                            }),
                        });
                        console.log(`[Generation] Persisted failed pin ${rowIndex} to database`);
                    } catch (persistError) {
                        console.error(`[Generation] Failed to persist error state for pin ${rowIndex}:`, persistError);
                    }

                    // Report failed pin to UI immediately so it appears in the list
                    onPinGenerated({
                        id: `${campaignId}-${rowIndex}`,
                        rowIndex,
                        imageUrl: '',
                        status: 'failed',
                        errorMessage,
                        csvData: csvData[rowIndex],
                    });

                    // Save progress even for failures
                    throttledSaveProgressRef.current({
                        campaignId,
                        lastCompletedIndex: rowIndex,
                        totalPins: csvData.length,
                        status: 'processing'
                    });

                    // Loop continues to next pin - no crash
                }

                current++;

                // Update progress
                const newProgress: GenerationProgress = {
                    current,
                    total: csvData.length,
                    percentage: Math.round((current / csvData.length) * 100),
                    status: 'generating',
                    errors,
                };
                setProgress(newProgress);
                onProgressUpdate(newProgress);
            }

            // Wait for remaining uploads
            await Promise.all(activeUploadsRef.current);

            if (!isMountedRef.current) return;

            // Final status
            if (shouldPauseRef.current) {
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
            // Cleanup canvas
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        }
    }, [
        status, templateElements, canvasSize, backgroundColor, csvData,
        fieldMapping, settings, campaignId, onPinGenerated, onProgressUpdate,
        onStatusChange, clearProgress, renderPinClient, renderPinServer, uploadSinglePin
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
        });

        startGeneration(0);
    }, [campaignId, csvData.length, progress.current, startGeneration]);

    // ============================================
    // Render
    // ============================================
    return (
        <div className="space-y-4">
            {/* Progress Bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-semibold text-gray-900">
                            {status === 'completed' ? 'Generation Complete' :
                                status === 'paused' ? 'Generation Paused' :
                                    status === 'processing' ? 'Generating Pins...' :
                                        'Ready to Generate'}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{generatedCount} of {csvData.length} pins</span>
                            {activeMode && (
                                <span className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded">
                                    {activeMode === 'server' ? <Server className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                                    {activeMode === 'server' ? 'Server' : 'Client'}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {status === 'completed' && (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                        )}
                        {status === 'processing' && (
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        )}
                        {status === 'failed' && (
                            <AlertCircle className="w-6 h-6 text-red-500" />
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-4">
                    <div
                        className={cn(
                            "h-full transition-all duration-300",
                            status === 'completed' ? "bg-green-500" :
                                status === 'failed' ? "bg-red-500" :
                                    "bg-blue-500"
                        )}
                        style={{ width: `${progress.percentage}%` }}
                    />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
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

                    <div className="flex items-center gap-3">
                        {/* Start / Resume Button */}
                        {(status === 'pending' || status === 'paused' || status === 'failed') && (
                            <button
                                onClick={() => status === 'paused' ? resumeGeneration() : startGeneration(0)}
                                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                <Play className="w-5 h-5" />
                                {status === 'paused' ? 'Continue Generation' : 'Start Generation'}
                            </button>
                        )}

                        {/* Pause Button */}
                        {status === 'processing' && settings.pauseEnabled && (
                            <button
                                onClick={pauseGeneration}
                                disabled={isPausing}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-lg font-medium transition-colors",
                                    isPausing ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-600"
                                )}
                            >
                                <Pause className="w-5 h-5" />
                                {isPausing ? 'Pausing...' : 'Pause'}
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

                    {/* Error Summary */}
                    {progress.errors.length > 0 && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-700 font-medium">
                                {progress.errors.length} pin(s) failed to generate
                            </p>
                            <button className="text-red-600 text-sm underline mt-1">
                                Retry Failed Pins
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
