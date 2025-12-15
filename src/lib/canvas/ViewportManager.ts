/**
 * ViewportManager
 * 
 * Manages canvas viewport: zoom, size, and background color.
 * Extracted from CanvasManager for single responsibility.
 */

import * as fabric from 'fabric';
import { CanvasConfig } from './types';
import { AlignmentGuides } from '../fabric/AlignmentGuides';

export class ViewportManager {
    private canvas: fabric.Canvas | null = null;
    private config: CanvasConfig | null = null;
    private guides: AlignmentGuides | null = null;

    /**
     * Initialize with canvas and config
     */
    initialize(canvas: fabric.Canvas, config: CanvasConfig, guides: AlignmentGuides | null): void {
        this.canvas = canvas;
        this.config = config;
        this.guides = guides;
    }

    /**
     * Update guides reference (for snapping)
     */
    setGuides(guides: AlignmentGuides | null): void {
        this.guides = guides;
    }

    /**
     * Set zoom level
     */
    setZoom(zoom: number): void {
        if (!this.canvas || !this.config) {
            console.error('[ViewportManager] Cannot set zoom: not initialized');
            return;
        }

        console.log('[ViewportManager] Setting zoom:', zoom);

        // Update zoom
        this.canvas.setZoom(zoom);

        // CRITICAL: Also update canvas dimensions to match new zoom
        // Without this, elements disappear at different zoom levels
        this.canvas.setDimensions({
            width: this.config.width * zoom,
            height: this.config.height * zoom
        });

        this.canvas.renderAll();

        // Re-initialize guides for new zoom
        if (this.guides) {
            this.guides.init();
        }
    }

    /**
     * Set canvas size
     */
    setCanvasSize(width: number, height: number): void {
        if (!this.canvas) {
            console.error('[ViewportManager] Cannot set size: not initialized');
            return;
        }

        // Update config
        if (this.config) {
            this.config.width = width;
            this.config.height = height;
        }

        const currentZoom = this.canvas.getZoom() || 1;

        // Update canvas dimensions
        this.canvas.setDimensions({
            width: width * currentZoom,
            height: height * currentZoom
        });

        this.canvas.renderAll();

        // Re-initialize guides for new size
        if (this.guides) {
            this.guides.init();
        }
    }

    /**
     * Set background color
     */
    setBackgroundColor(color: string): void {
        if (!this.canvas) {
            console.error('[ViewportManager] Cannot set background: not initialized');
            return;
        }

        this.canvas.backgroundColor = color;
        this.canvas.requestRenderAll();
    }

    /**
     * Get current config
     */
    getConfig(): CanvasConfig | null {
        return this.config;
    }

    /**
     * Cleanup
     */
    destroy(): void {
        this.canvas = null;
        this.config = null;
        this.guides = null;
    }
}
