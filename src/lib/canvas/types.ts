/**
 * Canvas Manager Types
 * 
 * Shared interfaces for the canvas management system.
 */

import * as fabric from 'fabric';
import { Element } from '@/types/editor';

/**
 * Canvas configuration options
 */
export interface CanvasConfig {
    width: number;
    height: number;
    backgroundColor?: string;
    zoom?: number;
}

/**
 * Element state change callback
 */
export type ElementChangeCallback = (elements: Element[]) => void;

/**
 * Selection change callback  
 */
export type SelectionChangeCallback = (selectedIds: string[]) => void;

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
    fps: number;
    frames: number;
    lastTime: number;
    snapCalcTime: number;
    lastSnapDuration: number;
}

/**
 * Canvas context passed to sub-managers
 */
export interface CanvasContext {
    getCanvas(): fabric.Canvas | null;
    getElementMap(): Map<string, fabric.FabricObject>;
    notifyElementsChanged(): void;
    notifySelectionChanged(): void;
}
