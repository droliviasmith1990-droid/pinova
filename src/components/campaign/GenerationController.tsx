'use client';

// Debug logging - only in development
const DEBUG = process.env.NODE_ENV === 'development';
const log = (...args: unknown[]) => DEBUG && console.log(...args);

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Pause, RotateCcw, AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { throttle } from 'lodash';
import { useCampaignGeneration } from '@/stores/generationStore';
import {
    GenerationSettings,
    GenerationProgress,
    generatePinsBatch,
    clearImageCache,
    DEFAULT_GENERATION_SETTINGS
} from '@/lib/rendering/clientPinGenerator';
import { Element, CanvasSize } from '@/types/editor';
import { PinCardData } from './PinCard';

interface GenerationControllerProps {
    campaignId: string;
    userId: string;
    campaignName: string;
    templateElements: Element[];
    canvasSize: CanvasSize;
    backgroundColor: string;
    csvData: Record<string, string>[];
    fieldMapping: Record<string, string>;
    initialSettings?: GenerationSettings;
    initialProgress?: number;
    initialStatus?: 'pending' | 'processing' | 'paused' | 'completed' | 'failed';
    generatedCount: number; // Actual count from database
    onPinGenerated: (pin: PinCardData) => void;
    onProgressUpdate: (progress: GenerationProgress) => void;
    onStatusChange: (status: string) => void;
}

export function GenerationController({
    campaignId,
    userId,
    campaignName,
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
        // Use the actual generated count from database for accurate display
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

    // Generation resume store integration
    const { state: savedState, canResume, save: saveProgress, clear: clearProgress, isStale } = useCampaignGeneration(campaignId);

    // Debug: Log resume state on mount and changes
    useEffect(() => {
        log('[GenerationController] Resume state:', {
            campaignId,
            savedState,
            canResume,
            isStale,
            status,
            initialStatus
        });
    }, [campaignId, savedState, canResume, isStale, status, initialStatus]);

    // Sync status based on actual progress and saved state on mount
    useEffect(() => {
        const actualCount = generatedCount || progress.current;
        const total = csvData.length;
        const isComplete = actualCount >= total;

        log('[GenerationController] Status sync check:', {
            actualCount,
            total,
            isComplete,
            currentStatus: status,
            canResume,
            savedStateIndex: savedState?.lastCompletedIndex
        });

        // Case 1: All pins are generated - mark as completed and clear resume state
        if (isComplete && status !== 'completed') {
            log('[GenerationController] All pins generated - marking as completed');
            setStatus('completed');
            onStatusChange('completed');
            clearProgress(); // Clear localStorage resume state
            return;
        }

        // Case 2: Resume state exists but is stale/outdated (savedState shows less progress than actual)
        if (savedState && actualCount > savedState.lastCompletedIndex + 1) {
            log('[GenerationController] Saved state is outdated - clearing');
            clearProgress();
            return;
        }

        // Case 3: Resume state exists and we're showing as processing but no generator is active
        if (canResume && status === 'processing' && !generatorRef.current) {
            log('[GenerationController] Syncing status to paused for resume');
            setStatus('paused');
            onStatusChange('paused');
        }
    }, [canResume, status, generatedCount, progress.current, csvData.length, onStatusChange, savedState, clearProgress]);

    const generatorRef = useRef<AsyncGenerator<any, void, boolean | undefined> | null>(null);
    const shouldPauseRef = useRef(false);
    // RACE-001: Track if component is mounted to prevent state updates after unmount
    const isMountedRef = useRef(true);
    // Producer-consumer: track active upload promises
    const activeUploadsRef = useRef<Set<Promise<void>>>(new Set());

    // Throttled progress saver (max once every 2 seconds) - prevents localStorage thrashing
    const throttledSaveProgressRef = useRef(
        throttle((data: Parameters<typeof saveProgress>[0]) => {
            saveProgress(data);
        }, 2000, { leading: true, trailing: true })
    );

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false;
            throttledSaveProgressRef.current.cancel();
        };
    }, []);

    // Start generation
    const startGeneration = useCallback(async (startIndex: number = 0) => {
        if (status === 'processing') return;

        // Guard: check if still mounted
        if (!isMountedRef.current) return;

        setStatus('processing');
        onStatusChange('processing');
        shouldPauseRef.current = false;

        // Clear image cache before starting to prevent duplicate images
        clearImageCache();

        // PERF-001: Helper to upload a single pin (for parallel execution)
        const uploadSinglePin = async (pin: { blob: Blob; fileName: string; rowIndex: number }) => {
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
        };

        try {
            // Create generator
            generatorRef.current = generatePinsBatch(
                templateElements,
                canvasSize,
                backgroundColor,
                csvData,
                fieldMapping,
                settings,
                startIndex,
                (prog) => {
                    if (isMountedRef.current) {
                        setProgress(prog);
                        onProgressUpdate(prog);
                    }
                }
            );

            // Producer-Consumer Pattern with Promise.race for non-blocking concurrency
            const CONCURRENCY_LIMIT = 5;

            // Process pins
            let result = await generatorRef.current.next();

            while (!result.done && !shouldPauseRef.current) {
                // Guard: check if still mounted
                if (!isMountedRef.current) return;

                const pin = result.value;

                // Create upload promise that removes itself from active set when done
                const uploadPromise = uploadSinglePin(pin).then((uploadResult) => {
                    activeUploadsRef.current.delete(uploadPromise);

                    if (!isMountedRef.current) return;

                    if (uploadResult.pin) {
                        onPinGenerated(uploadResult.pin);

                        // Throttled save (max every 2 seconds)
                        throttledSaveProgressRef.current({
                            campaignId,
                            lastCompletedIndex: uploadResult.pin.rowIndex,
                            totalPins: csvData.length,
                            status: 'processing'
                        });
                    }
                });

                activeUploadsRef.current.add(uploadPromise);

                // Concurrency control: wait if too many active uploads
                if (activeUploadsRef.current.size >= CONCURRENCY_LIMIT) {
                    await Promise.race(activeUploadsRef.current);
                }

                // Continue rendering immediately (don't wait for upload to finish)
                result = await generatorRef.current.next(true);
            }

            // Wait for all remaining uploads to complete
            await Promise.all(activeUploadsRef.current);

            // Guard: check if still mounted before final state updates
            if (!isMountedRef.current) return;

            // Check final status
            if (shouldPauseRef.current) {
                setStatus('paused');
                onStatusChange('paused');
                // Force flush throttled save on pause
                throttledSaveProgressRef.current.flush();
                toast.info(`Paused at ${progress.current}/${progress.total} pins`);
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
            }
            clearImageCache();
        }
    }, [
        status, templateElements, canvasSize, backgroundColor, csvData,
        fieldMapping, settings, campaignId, userId, onPinGenerated, onProgressUpdate,
        onStatusChange, progress.current, progress.total, saveProgress, clearProgress
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

        // Delete existing pins
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
                        <p className="text-sm text-gray-500">
                            {generatedCount} of {csvData.length} pins
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Status Icon */}
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
                    {/* Resume from Saved State - only show if there's actually work remaining */}
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
