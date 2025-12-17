'use client';

import { useMemo } from 'react';

// ============================================
// Types
// ============================================
export interface ProgressMetrics {
    /** Elapsed time in milliseconds (excluding paused time) */
    elapsedTimeMs: number;
    /** Current generation speed in pins per second */
    pinsPerSecond: number;
    /** Estimated time remaining in seconds */
    etaSeconds: number;
    /** Human-readable ETA (e.g., "5 min 23 sec") */
    etaFormatted: string;
    /** Human-readable elapsed time (e.g., "2 min 15 sec") */
    elapsedFormatted: string;
    /** Whether ETA is reliable (enough data points) */
    isEtaReliable: boolean;
}

// ============================================
// Formatting Helpers
// ============================================

/**
 * Format milliseconds to human-readable duration
 * @param ms - Duration in milliseconds
 * @returns Formatted string like "5 min 23 sec" or "< 10 sec"
 */
export function formatDuration(ms: number): string {
    if (ms < 0 || !isFinite(ms)) return '--';
    
    const totalSeconds = Math.floor(ms / 1000);
    
    if (totalSeconds < 10) {
        return '< 10 sec';
    }
    
    if (totalSeconds < 60) {
        return `${totalSeconds} sec`;
    }
    
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (minutes < 60) {
        return seconds > 0 
            ? `${minutes} min ${seconds} sec`
            : `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes > 0) {
        return `${hours} hr ${remainingMinutes} min`;
    }
    return `${hours} hr`;
}

/**
 * Format speed to human-readable format
 * @param pinsPerSecond - Speed in pins per second
 * @returns Formatted string like "1.95 pins/sec"
 */
export function formatSpeed(pinsPerSecond: number): string {
    if (!isFinite(pinsPerSecond) || pinsPerSecond < 0) {
        return '-- pins/sec';
    }
    
    if (pinsPerSecond < 0.01) {
        return '< 0.01 pins/sec';
    }
    
    if (pinsPerSecond < 1) {
        // Show 2 decimal places for slow speeds
        return `${pinsPerSecond.toFixed(2)} pins/sec`;
    }
    
    if (pinsPerSecond < 10) {
        // Show 1 decimal place for medium speeds
        return `${pinsPerSecond.toFixed(1)} pins/sec`;
    }
    
    // Round for fast speeds
    return `${Math.round(pinsPerSecond)} pins/sec`;
}

// ============================================
// Constants
// ============================================

/** Minimum pins completed before showing ETA (for accuracy) */
const MIN_PINS_FOR_ETA = 5;

/** Minimum elapsed time (ms) before calculating speed */
const MIN_ELAPSED_FOR_SPEED = 1000;

// ============================================
// Hook
// ============================================

interface UseProgressMetricsParams {
    /** Number of pins completed */
    completed: number;
    /** Total pins to generate */
    total: number;
    /** Timestamp when generation started (Date.now()) */
    startTime: number | null;
    /** Total time spent paused in milliseconds */
    pausedDuration: number;
    /** Whether generation is currently paused */
    isPaused: boolean;
    /** Current timestamp - REQUIRED to avoid impure Date.now() during render */
    currentTime: number;
}

/**
 * Hook to calculate progress metrics including speed and ETA
 * 
 * @example
 * const metrics = useProgressMetrics({
 *     completed: 15,
 *     total: 2339,
 *     startTime: startTimeRef.current,
 *     pausedDuration: totalPausedDurationRef.current,
 *     isPaused: status === 'paused'
 * });
 * 
 * // metrics.pinsPerSecond = 1.95
 * // metrics.etaFormatted = "19 min 52 sec"
 */
export function useProgressMetrics({
    completed,
    total,
    startTime,
    pausedDuration,
    currentTime,
}: UseProgressMetricsParams): ProgressMetrics {
    return useMemo(() => {
        // Default values for when we can't calculate
        const defaultMetrics: ProgressMetrics = {
            elapsedTimeMs: 0,
            pinsPerSecond: 0,
            etaSeconds: 0,
            etaFormatted: '--',
            elapsedFormatted: '--',
            isEtaReliable: false,
        };
        
        // Can't calculate without start time
        if (!startTime) {
            return defaultMetrics;
        }
        
        // Calculate elapsed time (excluding paused duration)
        const totalElapsed = currentTime - startTime;
        const activeElapsed = Math.max(0, totalElapsed - pausedDuration);
        
        // Need minimum elapsed time to calculate speed
        if (activeElapsed < MIN_ELAPSED_FOR_SPEED) {
            return {
                ...defaultMetrics,
                elapsedTimeMs: activeElapsed,
                elapsedFormatted: formatDuration(activeElapsed),
            };
        }
        
        // Calculate speed (pins per second)
        const elapsedSeconds = activeElapsed / 1000;
        const pinsPerSecond = completed > 0 ? completed / elapsedSeconds : 0;
        
        // Calculate ETA
        const remainingPins = Math.max(0, total - completed);
        const etaSeconds = pinsPerSecond > 0 ? remainingPins / pinsPerSecond : 0;
        const etaMs = etaSeconds * 1000;
        
        // ETA is reliable only after enough pins completed
        const isEtaReliable = completed >= MIN_PINS_FOR_ETA && pinsPerSecond > 0;
        
        return {
            elapsedTimeMs: activeElapsed,
            pinsPerSecond,
            etaSeconds,
            etaFormatted: isEtaReliable ? formatDuration(etaMs) : '--',
            elapsedFormatted: formatDuration(activeElapsed),
            isEtaReliable,
        };
    }, [completed, total, startTime, pausedDuration, currentTime]);
}

/**
 * Calculate progress metrics outside of React (for use in callbacks)
 * Same logic as useProgressMetrics but returns a plain object
 */
export function calculateProgressMetrics(params: UseProgressMetricsParams): ProgressMetrics {
    const {
        completed,
        total,
        startTime,
        pausedDuration,
        currentTime = Date.now(),
    } = params;
    
    const defaultMetrics: ProgressMetrics = {
        elapsedTimeMs: 0,
        pinsPerSecond: 0,
        etaSeconds: 0,
        etaFormatted: '--',
        elapsedFormatted: '--',
        isEtaReliable: false,
    };
    
    if (!startTime) {
        return defaultMetrics;
    }
    
    const totalElapsed = currentTime - startTime;
    const activeElapsed = Math.max(0, totalElapsed - pausedDuration);
    
    if (activeElapsed < MIN_ELAPSED_FOR_SPEED) {
        return {
            ...defaultMetrics,
            elapsedTimeMs: activeElapsed,
            elapsedFormatted: formatDuration(activeElapsed),
        };
    }
    
    const elapsedSeconds = activeElapsed / 1000;
    const pinsPerSecond = completed > 0 ? completed / elapsedSeconds : 0;
    const remainingPins = Math.max(0, total - completed);
    const etaSeconds = pinsPerSecond > 0 ? remainingPins / pinsPerSecond : 0;
    const etaMs = etaSeconds * 1000;
    const isEtaReliable = completed >= MIN_PINS_FOR_ETA && pinsPerSecond > 0;
    
    return {
        elapsedTimeMs: activeElapsed,
        pinsPerSecond,
        etaSeconds,
        etaFormatted: isEtaReliable ? formatDuration(etaMs) : '--',
        elapsedFormatted: formatDuration(activeElapsed),
        isEtaReliable,
    };
}
