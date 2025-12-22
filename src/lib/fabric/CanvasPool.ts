/**
 * Canvas Pool Pattern for Server-Side Rendering
 * 
 * Purpose: Reuse canvas instances instead of creating/destroying
 * Benefit: Eliminates 15.4s overhead per 220 pins
 * 
 * Architecture:
 * - Pool maintains N pre-created canvases
 * - acquire() returns available canvas (or throws if exhausted)
 * - release() clears and returns canvas to pool
 * - cleanup() disposes all canvases on shutdown
 */

import * as fabric from 'fabric';

export class CanvasPool {
  private canvases: fabric.StaticCanvas[];
  private available: fabric.StaticCanvas[];
  private inUse: Set<fabric.StaticCanvas>;
  private size: { width: number; height: number };
  private poolSize: number;

  constructor(poolSize: number, width: number, height: number) {
    this.poolSize = poolSize;
    this.size = { width, height };
    this.canvases = [];
    this.available = [];
    this.inUse = new Set();

    // Pre-create all canvases
    for (let i = 0; i < poolSize; i++) {
      const canvas = new fabric.StaticCanvas(undefined, {
        width: this.size.width,
        height: this.size.height,
      });
      this.canvases.push(canvas);
      this.available.push(canvas);
    }
  }

  acquire(): fabric.StaticCanvas {
    if (this.available.length === 0) {
      throw new Error(
        `Canvas pool exhausted! Pool size: ${this.poolSize}, In use: ${this.inUse.size}. ` +
        `Increase PARALLEL_LIMIT or reduce concurrent requests.`
      );
    }

    const canvas = this.available.pop()!;
    this.inUse.add(canvas);
    return canvas;
  }

  release(canvas: fabric.StaticCanvas): void {
    if (!this.inUse.has(canvas)) {
      console.warn('[CanvasPool] Attempted to release canvas not in pool');
      return;
    }

    // Clear all objects from canvas
    canvas.clear();
    
    // Reset background color
    canvas.backgroundColor = '';
    
    // Reset background image if any
    canvas.backgroundImage = undefined;
    
    // Reset overlay color/image
    canvas.overlayColor = '';
    canvas.overlayImage = undefined;
    
    // Reset viewport transform to identity matrix
    canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
    
    // Reset zoom level
    canvas.setZoom(1);
    
    // Verify dimensions (should never change, but safety check)
    if (canvas.width !== this.size.width || canvas.height !== this.size.height) {
      console.warn('[CanvasPool] Canvas dimensions changed, resetting');
      canvas.setDimensions({ width: this.size.width, height: this.size.height });
    }

    // Return to pool
    this.inUse.delete(canvas);
    this.available.push(canvas);
  }

  cleanup(): void {
    // Dispose all canvases
    this.canvases.forEach(canvas => canvas.dispose());
    
    // Clear tracking
    this.canvases = [];
    this.available = [];
    this.inUse.clear();
  }

  getStats() {
    return {
      total: this.poolSize,
      available: this.available.length,
      inUse: this.inUse.size,
    };
  }
}
