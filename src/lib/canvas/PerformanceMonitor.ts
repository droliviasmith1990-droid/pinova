/**
 * PerformanceMonitor
 * 
 * Tracks FPS and performance metrics for the canvas.
 * Extracted from CanvasManager for single responsibility.
 */

import * as fabric from 'fabric';
import { PerformanceMetrics } from './types';

export class PerformanceMonitor {
    private metrics: PerformanceMetrics = {
        fps: 60,
        frames: 0,
        lastTime: performance.now(),
        snapCalcTime: 0,
        lastSnapDuration: 0
    };

    private metricsInterval: number | null = null;
    private canvas: fabric.Canvas | null = null;
    private measureFPSBound: () => void;

    constructor() {
        this.measureFPSBound = this.measureFPS.bind(this);
    }

    /**
     * Start monitoring performance on the given canvas
     */
    start(canvas: fabric.Canvas, elementCount: () => number): void {
        this.canvas = canvas;
        console.log('[PerformanceMonitor] Starting...');

        // Monitor during canvas renders
        canvas.on('after:render', this.measureFPSBound);

        // Log metrics every 5 seconds
        this.metricsInterval = window.setInterval(() => {
            console.log('[PerformanceMonitor] Metrics:', {
                fps: this.metrics.fps,
                lastSnapDuration: this.metrics.lastSnapDuration.toFixed(2) + 'ms',
                elementCount: elementCount(),
            });
        }, 5000);
    }

    /**
     * Stop monitoring
     */
    stop(): void {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
            this.metricsInterval = null;
        }

        if (this.canvas) {
            this.canvas.off('after:render', this.measureFPSBound);
            this.canvas = null;
        }
    }

    /**
     * Get current metrics
     */
    getMetrics(): PerformanceMetrics {
        return { ...this.metrics };
    }

    /**
     * Record snap calculation time
     */
    recordSnapDuration(duration: number): void {
        this.metrics.lastSnapDuration = duration;
    }

    /**
     * Measure FPS (called on each render)
     */
    private measureFPS(): void {
        this.metrics.frames++;
        const now = performance.now();
        const delta = now - this.metrics.lastTime;

        if (delta >= 1000) {
            this.metrics.fps = Math.round((this.metrics.frames * 1000) / delta);
            this.metrics.frames = 0;
            this.metrics.lastTime = now;

            // Warn if FPS drops below threshold
            if (this.metrics.fps < 55) {
                console.warn(`[PerformanceMonitor] Low FPS: ${this.metrics.fps}`);
            }
        }
    }
}
